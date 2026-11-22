//! Wrappers around agent CLIs that run their own tool loops:
//! the Antigravity CLI (`agy`) and the OpenAI Codex CLI (`codex exec`).
//! Desktop only. These CLIs run with their own approvals turned off.

use crate::events::AgentEvent;
use crate::state::AppState;
use serde_json::{json, Value};
use std::process::Stdio;
use tauri::ipc::Channel;
use tokio::io::{AsyncBufReadExt, AsyncReadExt, BufReader};
use tokio::process::Command;
use tokio_util::sync::CancellationToken;

pub async fn run_agy(state: AppState, prompt: String, model: String, ch: Channel<AgentEvent>, cancel: CancellationToken) -> Vec<Value> {
    let _ = ch.send(AgentEvent::Status { message: format!("Running agy ({model})…") });
    let mut cmd = Command::new("agy");
    cmd.args(["--model", &model, "--dangerously-skip-permissions", "--output-format", "stream-json", "-p", &prompt]);
    let mut text = String::new();
    let mut tool_n = 0u32;
    let res = stream_lines(&state, cmd, &cancel, |line| {
        let Ok(v) = serde_json::from_str::<Value>(line) else { return };
        match v.get("event").and_then(Value::as_str) {
            Some("step_update") => {
                let su = &v["step_update"];
                match su.get("step_type").and_then(Value::as_str) {
                    Some("agent_response") => {
                        if let Some(d) = su.get("text_delta").and_then(Value::as_str) {
                            text.push_str(d);
                            let _ = ch.send(AgentEvent::Delta { content: d.into() });
                        }
                    }
                    Some("tool") => {
                        let info = &su["tool_info"];
                        let name = su.get("tool_name").and_then(Value::as_str).unwrap_or("tool").to_string();
                        match su.get("state").and_then(Value::as_str) {
                            Some("ACTIVE") => {
                                tool_n += 1;
                                let cmdline = info.pointer("/parameters/CommandLine").cloned().unwrap_or(json!(name));
                                let _ = ch.send(AgentEvent::ToolCall {
                                    id: format!("agy_{tool_n}"),
                                    name,
                                    args: json!({ "command": cmdline }),
                                });
                            }
                            Some("DONE") => {
                                let out = info.get("output").and_then(Value::as_str).unwrap_or("").to_string();
                                let _ = ch.send(AgentEvent::ToolResult { id: format!("agy_{tool_n}"), output: out, ok: true });
                            }
                            _ => {}
                        }
                    }
                    _ => {}
                }
            }
            Some("result") if text.is_empty() => {
                if let Some(r) = v.pointer("/result/response").and_then(Value::as_str) {
                    text = r.into();
                    let _ = ch.send(AgentEvent::Delta { content: r.into() });
                }
            }
            _ => {}
        }
    })
    .await;
    finish(res, text, &ch)
}

pub async fn run_codex(state: AppState, prompt: String, ch: Channel<AgentEvent>, cancel: CancellationToken) -> Vec<Value> {
    let _ = ch.send(AgentEvent::Status { message: "Running codex…".into() });
    let mut cmd = Command::new("codex");
    cmd.args(["exec", "--dangerously-bypass-approvals-and-sandbox", "--skip-git-repo-check", "--color", "never", &prompt]);
    let mut text = String::new();
    let mut capture = false;
    let mut tool_n = 0u32;
    let res = stream_lines(&state, cmd, &cancel, |line| {
        let t = line.trim();
        if t.starts_with("exec") {
            tool_n += 1;
            let _ = ch.send(AgentEvent::ToolCall { id: format!("codex_{tool_n}"), name: "exec".into(), args: json!({ "command": t }) });
        } else if t.contains("succeeded in") || t.contains("failed in") {
            let _ = ch.send(AgentEvent::ToolResult { id: format!("codex_{tool_n}"), output: t.into(), ok: t.contains("succeeded") });
        } else if t == "codex" {
            capture = true;
        } else if t.starts_with("tokens used") {
            capture = false;
        } else if capture {
            let piece = format!("{line}\n");
            text.push_str(&piece);
            let _ = ch.send(AgentEvent::Delta { content: piece });
        }
    })
    .await;
    finish(res, text.trim().to_string(), &ch)
}

fn finish(res: anyhow::Result<()>, text: String, ch: &Channel<AgentEvent>) -> Vec<Value> {
    if let Err(e) = res {
        let _ = ch.send(AgentEvent::Error { message: e.to_string() });
    }
    if text.is_empty() {
        vec![]
    } else {
        vec![json!({"role": "assistant", "content": text})]
    }
}

async fn stream_lines(state: &AppState, mut cmd: Command, cancel: &CancellationToken, mut on_line: impl FnMut(&str)) -> anyhow::Result<()> {
    cmd.current_dir(state.cwd()).stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::piped()).kill_on_drop(true);
    #[cfg(windows)]
    cmd.creation_flags(0x0800_0000);
    let mut child = cmd.spawn().map_err(|e| anyhow::anyhow!("Couldn't start the CLI ({e}). Is it installed and on PATH?"))?;
    let mut stdout = BufReader::new(child.stdout.take().unwrap()).lines();
    let mut stderr = child.stderr.take().unwrap();
    let err_task = tokio::spawn(async move {
        let mut s = String::new();
        let _ = stderr.read_to_string(&mut s).await;
        s
    });
    loop {
        tokio::select! {
            line = stdout.next_line() => match line? {
                Some(l) => on_line(&l),
                None => break,
            },
            _ = cancel.cancelled() => {
                let _ = child.kill().await;
                return Ok(());
            }
        }
    }
    let status = child.wait().await?;
    let err = err_task.await.unwrap_or_default();
    if !status.success() {
        let tail: String = err.lines().rev().take(8).collect::<Vec<_>>().into_iter().rev().collect::<Vec<_>>().join("\n");
        anyhow::bail!("CLI exited with {status}.{}", if tail.is_empty() { String::new() } else { format!("\n{tail}") });
    }
    Ok(())
}
