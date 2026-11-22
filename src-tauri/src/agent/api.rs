//! Native agent loop over any OpenAI-compatible Chat Completions API
//! (OpenRouter, OpenAI, Anthropic, Gemini, Groq, Ollama, LM Studio, vLLM, …).

use crate::config::Approval;
use crate::events::AgentEvent;
use crate::state::AppState;
use crate::tools;
use futures_util::StreamExt;
use serde_json::{json, Value};
use tauri::ipc::Channel;
use tokio_util::sync::CancellationToken;

#[derive(Default, Clone)]
struct PendingCall {
    id: String,
    name: String,
    args: String,
}

pub async fn run(
    state: AppState,
    history: Vec<Value>,
    model_override: Option<String>,
    ch: Channel<AgentEvent>,
    cancel: CancellationToken,
) -> Vec<Value> {
    let mut new_msgs: Vec<Value> = vec![];
    if let Err(e) = run_inner(&state, history, model_override, &ch, &cancel, &mut new_msgs).await {
        let _ = ch.send(AgentEvent::Error { message: e.to_string() });
    }
    new_msgs
}

async fn run_inner(
    state: &AppState,
    history: Vec<Value>,
    model_override: Option<String>,
    ch: &Channel<AgentEvent>,
    cancel: &CancellationToken,
    new_msgs: &mut Vec<Value>,
) -> anyhow::Result<()> {
    let settings = state.settings();
    let model = model_override.filter(|m| !m.trim().is_empty()).unwrap_or(settings.model.clone());
    anyhow::ensure!(!model.trim().is_empty(), "No model set. Open Settings and choose a provider and model.");
    let base = settings.base_url();
    anyhow::ensure!(!base.is_empty(), "No API base URL set for the custom provider.");
    let key = settings.api_key().map(str::to_string);
    if key.is_none() && settings.provider != "ollama" && settings.provider != "custom" {
        anyhow::bail!("No API key for {}. Add one in Settings.", settings.provider);
    }

    let tool_defs = tools::definitions();
    let url = format!("{base}/chat/completions");

    for step in 0..settings.max_steps.max(1) {
        if cancel.is_cancelled() {
            return Ok(());
        }
        let mut messages = vec![json!({"role": "system", "content": super::system_prompt(state)})];
        messages.extend(history.iter().cloned());
        messages.extend(new_msgs.iter().cloned());

        let mut body = json!({
            "model": model,
            "messages": messages,
            "tools": tool_defs,
            "stream": true,
        });
        if let Some(t) = settings.temperature {
            body["temperature"] = json!(t);
        }

        let _ =
            ch.send(AgentEvent::Status { message: if step == 0 { format!("Thinking with {model}…") } else { "Continuing…".into() } });

        let mut req = state.http.post(&url).json(&body).header("HTTP-Referer", "https://github.com/willa-ai").header("X-Title", "WillaAI");
        if let Some(k) = &key {
            req = req.bearer_auth(k);
        }

        let resp = tokio::select! {
            r = req.send() => r?,
            _ = cancel.cancelled() => return Ok(()),
        };
        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            anyhow::bail!("API error {status}: {}", api_error_message(&text));
        }

        let mut content = String::new();
        let mut calls: Vec<PendingCall> = vec![];
        let mut buf = String::new();
        let mut stream = resp.bytes_stream();

        'stream: loop {
            let chunk = tokio::select! {
                c = stream.next() => c,
                _ = cancel.cancelled() => break 'stream,
            };
            let Some(chunk) = chunk else { break };
            buf.push_str(&String::from_utf8_lossy(&chunk?));
            while let Some(pos) = buf.find('\n') {
                let line: String = buf.drain(..=pos).collect();
                let line = line.trim();
                let Some(data) = line.strip_prefix("data:") else { continue };
                let data = data.trim();
                if data == "[DONE]" {
                    break 'stream;
                }
                let Ok(v) = serde_json::from_str::<Value>(data) else { continue };
                if let Some(err) = v.get("error") {
                    anyhow::bail!("API error: {}", err.get("message").and_then(Value::as_str).unwrap_or(&err.to_string()));
                }
                let Some(delta) = v.pointer("/choices/0/delta") else { continue };
                if let Some(t) = delta.get("content").and_then(Value::as_str) {
                    if !t.is_empty() {
                        content.push_str(t);
                        let _ = ch.send(AgentEvent::Delta { content: t.into() });
                    }
                }
                for k in ["reasoning", "reasoning_content"] {
                    if let Some(t) = delta.get(k).and_then(Value::as_str) {
                        if !t.is_empty() {
                            let _ = ch.send(AgentEvent::Reasoning { content: t.into() });
                        }
                    }
                }
                if let Some(tcs) = delta.get("tool_calls").and_then(Value::as_array) {
                    for tc in tcs {
                        let idx = tc.get("index").and_then(Value::as_u64).unwrap_or(calls.len() as u64) as usize;
                        if calls.len() <= idx {
                            calls.resize(idx + 1, PendingCall::default());
                        }
                        let c = &mut calls[idx];
                        if let Some(id) = tc.get("id").and_then(Value::as_str) {
                            c.id = id.into();
                        }
                        if let Some(n) = tc.pointer("/function/name").and_then(Value::as_str) {
                            c.name.push_str(n);
                        }
                        if let Some(a) = tc.pointer("/function/arguments").and_then(Value::as_str) {
                            c.args.push_str(a);
                        }
                    }
                }
            }
        }

        let calls: Vec<PendingCall> = calls
            .into_iter()
            .filter(|c| !c.name.is_empty())
            .enumerate()
            .map(|(i, mut c)| {
                if c.id.is_empty() {
                    c.id = format!("call_{step}_{i}");
                }
                if c.args.trim().is_empty() {
                    c.args = "{}".into();
                }
                c
            })
            .collect();

        let mut assistant = json!({"role": "assistant", "content": if content.is_empty() { Value::Null } else { json!(content) }});
        if !calls.is_empty() {
            assistant["tool_calls"] = json!(calls
                .iter()
                .map(|c| json!({"id": c.id, "type": "function", "function": {"name": c.name, "arguments": c.args}}))
                .collect::<Vec<_>>());
        }
        if !content.is_empty() || !calls.is_empty() {
            new_msgs.push(assistant);
        }

        if cancel.is_cancelled() || calls.is_empty() {
            return Ok(());
        }

        for c in calls {
            let args: Value = serde_json::from_str(&c.args).unwrap_or_else(|_| json!({}));
            let _ = ch.send(AgentEvent::ToolCall { id: c.id.clone(), name: c.name.clone(), args: args.clone() });

            let approved = if tools::needs_approval(&c.name) && state.settings().approval == Approval::Ask {
                super::request_approval(state, ch, cancel, &c.name, tools::summary(&c.name, &args)).await
            } else {
                true
            };

            let (output, ok) = if cancel.is_cancelled() {
                ("Cancelled by the user.".to_string(), false)
            } else if !approved {
                ("The user denied this action. Ask them how they'd like to proceed, or try another approach.".to_string(), false)
            } else {
                let out = tools::execute(state, &c.name, &args).await;
                if let Some((key, value)) = out.memory {
                    let _ = ch.send(AgentEvent::MemorySaved { key, value });
                }
                (out.output, out.ok)
            };
            let _ = ch.send(AgentEvent::ToolResult { id: c.id.clone(), output: output.clone(), ok });
            new_msgs.push(json!({"role": "tool", "tool_call_id": c.id, "content": output}));
            if cancel.is_cancelled() {
                return Ok(());
            }
        }
    }

    let _ = ch.send(AgentEvent::Status { message: format!("Stopped after {} steps (limit in Settings).", settings.max_steps) });
    Ok(())
}

fn api_error_message(body: &str) -> String {
    serde_json::from_str::<Value>(body)
        .ok()
        .and_then(|v| v.pointer("/error/message").or_else(|| v.pointer("/0/error/message")).and_then(Value::as_str).map(str::to_string))
        .unwrap_or_else(|| body.chars().take(500).collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{Approval, Settings};
    use std::sync::{Arc, Mutex};
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    /// Minimal OpenAI-compatible SSE server: first reply calls a tool, second replies with text.
    async fn mock_server() -> (String, Arc<Mutex<Vec<Value>>>) {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        let bodies = Arc::new(Mutex::new(vec![]));
        let seen = bodies.clone();
        tokio::spawn(async move {
            let mut n = 0;
            loop {
                let (mut sock, _) = listener.accept().await.unwrap();
                let mut buf = vec![0u8; 1 << 20];
                let mut len = 0;
                // read headers + body (Content-Length)
                loop {
                    len += sock.read(&mut buf[len..]).await.unwrap();
                    let s = String::from_utf8_lossy(&buf[..len]).to_string();
                    if let Some(h) = s.find("\r\n\r\n") {
                        let cl: usize = s
                            .lines()
                            .find_map(|l| l.to_lowercase().strip_prefix("content-length:").map(|v| v.trim().parse().unwrap()))
                            .unwrap_or(0);
                        if len >= h + 4 + cl {
                            seen.lock().unwrap().push(serde_json::from_slice(&buf[h + 4..h + 4 + cl]).unwrap());
                            break;
                        }
                    }
                }
                let events: Vec<String> = if n == 0 {
                    vec![
                        json!({"choices":[{"delta":{"content":"Let me check."}}]}).to_string(),
                        json!({"choices":[{"delta":{"tool_calls":[{"index":0,"id":"c1","function":{"name":"run_command","arguments":"{\"comm"}}]}}]}).to_string(),
                        json!({"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"and\":\"echo hello-willa\"}"}}]}}]}).to_string(),
                    ]
                } else {
                    vec![json!({"choices":[{"delta":{"content":"Done: it printed hello-willa."}}]}).to_string()]
                };
                let mut body = String::new();
                for e in events {
                    body.push_str(&format!("data: {e}\n\n"));
                }
                body.push_str("data: [DONE]\n\n");
                let resp = format!(
                    "HTTP/1.1 200 OK\r\ncontent-type: text/event-stream\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}",
                    body.len()
                );
                sock.write_all(resp.as_bytes()).await.unwrap();
                n += 1;
            }
        });
        (format!("http://{addr}/v1"), bodies)
    }

    #[tokio::test]
    async fn tool_loop_runs_command_and_finishes() {
        let (url, bodies) = mock_server().await;
        let tmp = std::env::temp_dir().join(format!("willa-test-{}", std::process::id()));
        std::fs::create_dir_all(&tmp).unwrap();
        let state: AppState = Arc::new(crate::state::Inner::new(tmp.clone(), tmp.clone(), tmp.clone()));
        state
            .save_settings(Settings {
                provider: "custom".into(),
                custom_base_url: url,
                model: "mock".into(),
                approval: Approval::Auto,
                ..Default::default()
            })
            .unwrap();

        let events = Arc::new(Mutex::new(Vec::<Value>::new()));
        let ev = events.clone();
        let ch: Channel<AgentEvent> = Channel::new(move |body| {
            if let tauri::ipc::InvokeResponseBody::Json(s) = body {
                ev.lock().unwrap().push(serde_json::from_str(&s).unwrap());
            }
            Ok(())
        });

        let msgs = run(state, vec![json!({"role":"user","content":"say hi"})], None, ch, CancellationToken::new()).await;

        let ev = events.lock().unwrap();
        let result = ev.iter().find(|e| e["type"] == "tool_result").expect("tool_result event");
        assert!(result["output"].as_str().unwrap().contains("hello-willa"), "{result}");
        assert_eq!(result["ok"], true);
        assert!(!ev.iter().any(|e| e["type"] == "error"), "{ev:?}");
        // assistant(tool_call) + tool + assistant(text)
        assert_eq!(msgs.len(), 3, "{msgs:?}");
        assert_eq!(msgs[0]["tool_calls"][0]["function"]["arguments"], "{\"command\":\"echo hello-willa\"}");
        assert_eq!(msgs[2]["content"], "Done: it printed hello-willa.");
        // Second request must carry the tool result back to the model.
        let second = &bodies.lock().unwrap()[1];
        let last = second["messages"].as_array().unwrap().last().unwrap().clone();
        assert_eq!(last["role"], "tool");
        assert_eq!(last["tool_call_id"], "c1");
        std::fs::remove_dir_all(tmp).ok();
    }

    #[tokio::test]
    async fn approval_denied_is_reported_to_model() {
        let (url, _) = mock_server().await;
        let tmp = std::env::temp_dir().join(format!("willa-test-deny-{}", std::process::id()));
        std::fs::create_dir_all(&tmp).unwrap();
        let state: AppState = Arc::new(crate::state::Inner::new(tmp.clone(), tmp.clone(), tmp.clone()));
        state
            .save_settings(Settings { provider: "custom".into(), custom_base_url: url, model: "mock".into(), ..Default::default() })
            .unwrap();

        let st = state.clone();
        let ch: Channel<AgentEvent> = Channel::new(move |body| {
            if let tauri::ipc::InvokeResponseBody::Json(s) = body {
                let v: Value = serde_json::from_str(&s).unwrap();
                if v["type"] == "approval_required" {
                    let id = v["approval_id"].as_u64().unwrap();
                    if let Some(tx) = st.approvals.lock().unwrap().remove(&id) {
                        let _ = tx.send(false);
                    }
                }
            }
            Ok(())
        });
        let msgs = run(state, vec![json!({"role":"user","content":"x"})], None, ch, CancellationToken::new()).await;
        assert!(msgs[1]["content"].as_str().unwrap().contains("denied"), "{msgs:?}");
        std::fs::remove_dir_all(tmp).ok();
    }
}
