//! Agent engines: a native API tool-calling loop, and wrappers around agent CLIs.

pub mod api;
#[cfg(desktop)]
pub mod cli;

use crate::events::AgentEvent;
use crate::state::AppState;
use tauri::ipc::Channel;
use tokio::sync::oneshot;
use tokio_util::sync::CancellationToken;

pub fn system_prompt(state: &AppState) -> String {
    let s = state.settings();
    let os = std::env::consts::OS;
    let shell = if cfg!(windows) { "PowerShell" } else { "sh" };
    let mut p = format!(
        "You are Willa, an agentic assistant running inside the WillaAI desktop app on the user's own {os} machine.\n\
         Current working directory: {cwd}\n\
         Commands run through {shell}.\n\n\
         ## How to work\n\
         - For questions and explanations, answer directly in concise Markdown.\n\
         - When the user asks you to inspect, change, build, install or run something, use the tools. \
           Check results before claiming success; if a step fails, read the error and fix it.\n\
         - Prefer small, reversible steps. Never run destructive commands (rm -rf, disk formatting, force pushes) unless the user explicitly asked.\n\
         - Use `remember` only for durable facts the user would want kept across sessions.\n\
         - Finish with a short summary of what you did.\n",
        cwd = state.cwd().display(),
    );
    p.push_str(&state.memory.prompt_block());
    if !s.extra_instructions.trim().is_empty() {
        p.push_str("\n## User instructions\n");
        p.push_str(s.extra_instructions.trim());
        p.push('\n');
    }
    p
}

/// Ask the UI to approve a tool call. Returns false if denied or cancelled.
pub async fn request_approval(
    state: &AppState,
    ch: &Channel<AgentEvent>,
    cancel: &CancellationToken,
    tool: &str,
    summary: String,
) -> bool {
    let id = state.next_id();
    let (tx, rx) = oneshot::channel();
    state.approvals.lock().unwrap().insert(id, tx);
    let _ = ch.send(AgentEvent::ApprovalRequired { approval_id: id, tool: tool.into(), summary });
    let approved = tokio::select! {
        r = rx => r.unwrap_or(false),
        _ = cancel.cancelled() => false,
    };
    state.approvals.lock().unwrap().remove(&id);
    approved
}

/// Turn chat history into a single prompt for CLI engines that take one prompt.
pub fn flatten_history(messages: &[serde_json::Value]) -> String {
    let texts: Vec<(String, String)> = messages
        .iter()
        .filter_map(|m| {
            let role = m.get("role")?.as_str()?;
            let content = m.get("content")?.as_str()?;
            (matches!(role, "user" | "assistant") && !content.trim().is_empty()).then(|| (role.to_string(), content.to_string()))
        })
        .collect();
    let Some((_, last)) = texts.last() else { return String::new() };
    if texts.len() == 1 {
        return last.clone();
    }
    let start = texts.len().saturating_sub(7);
    let ctx: Vec<String> = texts[start..texts.len() - 1]
        .iter()
        .map(|(r, c)| format!("[{}]: {}", if r == "user" { "User" } else { "Assistant" }, c))
        .collect();
    format!("Previous conversation context:\n{}\n\n[User's latest request]:\n{}", ctx.join("\n"), last)
}
