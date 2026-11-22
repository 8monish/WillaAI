//! Runs the native agent for messages arriving from a remote chat
//! (Telegram / WhatsApp). Approvals are asked in the chat itself.

use crate::events::AgentEvent;
use crate::state::AppState;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::ipc::{Channel, InvokeResponseBody};
use tokio::sync::mpsc::UnboundedSender;
use tokio_util::sync::CancellationToken;

const MAX_HISTORY: usize = 40;

#[derive(Default)]
struct Session {
    history: Vec<Value>,
    pending_approval: Option<u64>,
    run: Option<CancellationToken>,
}

#[derive(Default)]
pub struct Remote {
    sessions: Mutex<HashMap<String, Session>>,
}

pub const HELP: &str = "WillaAI remote control\n\
Send any task or question and the agent works on your computer.\n\
/stop — cancel the current task\n\
/new — start a fresh conversation\n\
/help — this message\n\
When asked to approve a command, reply yes or no.";

/// Handle one message from the paired owner. Replies go to `out`.
pub fn handle(state: &AppState, key: &str, text: &str, out: UnboundedSender<String>) {
    let text = text.trim();
    if text.is_empty() {
        return;
    }
    let lower = text.to_lowercase();
    let mut sessions = state.hub.remote.sessions.lock().unwrap();
    let sess = sessions.entry(key.to_string()).or_default();

    if let Some(id) = sess.pending_approval {
        let answer = match lower.as_str() {
            "yes" | "y" | "allow" | "ok" | "approve" => Some(true),
            "no" | "n" | "deny" | "stop" => Some(false),
            _ => None,
        };
        if let Some(ok) = answer {
            sess.pending_approval = None;
            if let Some(tx) = state.approvals.lock().unwrap().remove(&id) {
                let _ = tx.send(ok);
            }
            let _ = out.send(if ok { "Approved." } else { "Denied." }.into());
            return;
        }
        let _ = out.send("Reply yes or no to the pending approval first (or /stop).".into());
        return;
    }

    match lower.as_str() {
        "/help" | "help" | "/start" => {
            let _ = out.send(HELP.into());
            return;
        }
        "/stop" => {
            match sess.run.take() {
                Some(t) => {
                    t.cancel();
                    let _ = out.send("Stopped.".into());
                }
                None => {
                    let _ = out.send("Nothing is running.".into());
                }
            }
            return;
        }
        "/new" | "/reset" => {
            if let Some(t) = sess.run.take() {
                t.cancel();
            }
            sess.history.clear();
            let _ = out.send("Started a new conversation.".into());
            return;
        }
        _ => {}
    }

    if sess.run.is_some() {
        let _ = out.send("Still working on the last task. Send /stop to cancel it.".into());
        return;
    }

    sess.history.push(json!({"role": "user", "content": text}));
    let history = sess.history.clone();
    let cancel = CancellationToken::new();
    sess.run = Some(cancel.clone());
    drop(sessions);

    let state = state.clone();
    let key = key.to_string();
    tauri::async_runtime::spawn(async move {
        let ch = event_channel(state.clone(), key.clone(), out.clone());
        let approval = Some(state.settings().remote_approval);
        let msgs = crate::agent::api::run(state.clone(), history, None, approval, ch, cancel).await;

        let reply = msgs
            .iter()
            .rev()
            .find(|m| m["role"] == "assistant" && m["content"].as_str().is_some_and(|c| !c.trim().is_empty()))
            .and_then(|m| m["content"].as_str())
            .map(str::to_string);
        if let Some(r) = reply {
            let _ = out.send(r);
        }

        let mut sessions = state.hub.remote.sessions.lock().unwrap();
        let sess = sessions.entry(key).or_default();
        sess.run = None;
        sess.pending_approval = None;
        sess.history.extend(msgs);
        trim_history(&mut sess.history);
    });
}

/// Forward the interesting agent events to the chat.
fn event_channel(state: AppState, key: String, out: UnboundedSender<String>) -> Channel<AgentEvent> {
    Channel::new(move |body| {
        let InvokeResponseBody::Json(s) = body else { return Ok(()) };
        let Ok(v) = serde_json::from_str::<Value>(&s) else { return Ok(()) };
        match v["type"].as_str() {
            Some("tool_call") => {
                let name = v["name"].as_str().unwrap_or("tool");
                let detail = crate::tools::summary(name, &v["args"]);
                let _ = out.send(format!("▶ {name}: {}", clip(&detail, 300)));
            }
            Some("approval_required") => {
                if let Some(id) = v["approval_id"].as_u64() {
                    if let Some(sess) = state.hub.remote.sessions.lock().unwrap().get_mut(&key) {
                        sess.pending_approval = Some(id);
                    }
                    let _ = out.send(format!("⚠️ Allow this?\n{}\n\nReply yes or no.", clip(v["summary"].as_str().unwrap_or(""), 1000)));
                }
            }
            Some("tool_result") if v["ok"] == false => {
                let _ = out.send(format!("✗ {}", clip(v["output"].as_str().unwrap_or(""), 600)));
            }
            Some("memory_saved") => {
                let _ = out.send(format!("Saved to memory: {}", v["key"].as_str().unwrap_or("")));
            }
            Some("error") => {
                let _ = out.send(format!("Error: {}", v["message"].as_str().unwrap_or("")));
            }
            _ => {}
        }
        Ok(())
    })
}

/// Keep the last messages, starting at a user turn so tool results never lose their call.
fn trim_history(h: &mut Vec<Value>) {
    if h.len() <= MAX_HISTORY {
        return;
    }
    let mut start = h.len() - MAX_HISTORY;
    while start < h.len() && h[start]["role"] != "user" {
        start += 1;
    }
    h.drain(..start);
}

pub fn clip(s: &str, max: usize) -> String {
    if s.chars().count() <= max {
        s.to_string()
    } else {
        format!("{}…", s.chars().take(max).collect::<String>())
    }
}

/// Split long replies for chat apps' message size limits.
pub fn chunks(s: &str, max: usize) -> Vec<String> {
    let mut out = vec![];
    let mut cur = String::new();
    for line in s.split_inclusive('\n') {
        if cur.chars().count() + line.chars().count() > max && !cur.is_empty() {
            out.push(std::mem::take(&mut cur));
        }
        if line.chars().count() > max {
            let chars: Vec<char> = line.chars().collect();
            for c in chars.chunks(max) {
                out.push(c.iter().collect());
            }
        } else {
            cur.push_str(line);
        }
    }
    if !cur.trim().is_empty() {
        out.push(cur);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trim_keeps_user_start() {
        let mut h: Vec<Value> =
            (0..50).map(|i| json!({"role": if i % 3 == 0 { "user" } else if i % 3 == 1 { "assistant" } else { "tool" }})).collect();
        trim_history(&mut h);
        assert!(h.len() <= MAX_HISTORY);
        assert_eq!(h[0]["role"], "user");
    }

    #[test]
    fn chunking() {
        let s = "a".repeat(10_000);
        let c = chunks(&s, 4000);
        assert_eq!(c.len(), 3);
        assert!(c.iter().all(|x| x.chars().count() <= 4000));
        assert_eq!(chunks("hi\nthere", 4000), vec!["hi\nthere".to_string()]);
    }
}
