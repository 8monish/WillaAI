//! Events streamed from the Rust core to the UI over a Tauri channel.

use serde::Serialize;
use serde_json::Value;

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum AgentEvent {
    Status {
        message: String,
    },
    /// Assistant text, token by token.
    Delta {
        content: String,
    },
    /// Model "thinking" text, if the provider streams it.
    Reasoning {
        content: String,
    },
    ToolCall {
        id: String,
        name: String,
        args: Value,
    },
    /// The UI must call `resolve_approval(approval_id, bool)`.
    ApprovalRequired {
        approval_id: u64,
        tool: String,
        summary: String,
    },
    ToolResult {
        id: String,
        output: String,
        ok: bool,
    },
    MemorySaved {
        key: String,
        value: String,
    },
    Error {
        message: String,
    },
    /// End of the run. `messages` are the new API-format messages to append to history.
    Done {
        messages: Vec<Value>,
    },
}
