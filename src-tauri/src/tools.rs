//! Tools the API agent can call.

use crate::state::AppState;
use serde_json::{json, Value};
use std::time::Duration;

pub fn definitions() -> Value {
    let mut tools = vec![];
    tools.push(func(
        "run_command",
        "Run a shell command in the current working directory and return stdout/stderr. \
         Uses `sh -c` on Linux/macOS and PowerShell on Windows. `cd <dir>` changes the working directory for later calls.",
        json!({"command": {"type": "string", "description": "The command to run"}}),
        &["command"],
    ));
    tools.push(func(
        "read_file",
        "Read a UTF-8 text file. Relative paths resolve against the working directory.",
        json!({"path": {"type": "string"}}),
        &["path"],
    ));
    tools.push(func(
        "write_file",
        "Create or overwrite a text file with the given content. Parent folders are created.",
        json!({"path": {"type": "string"}, "content": {"type": "string"}}),
        &["path", "content"],
    ));
    tools.push(func("list_dir", "List the entries of a directory (default: working directory).", json!({"path": {"type": "string"}}), &[]));
    tools.push(func(
        "remember",
        "Save a durable fact about the user or their system to long-term memory.",
        json!({"key": {"type": "string"}, "value": {"type": "string"}}),
        &["key", "value"],
    ));
    tools.push(func("forget", "Delete a fact from long-term memory.", json!({"key": {"type": "string"}}), &["key"]));
    Value::Array(tools)
}

fn func(name: &str, desc: &str, props: Value, required: &[&str]) -> Value {
    json!({
        "type": "function",
        "function": {
            "name": name,
            "description": desc,
            "parameters": {"type": "object", "properties": props, "required": required}
        }
    })
}

/// Whether a tool call changes the system and needs approval in "ask" mode.
pub fn needs_approval(name: &str) -> bool {
    matches!(name, "run_command" | "write_file")
}

pub fn summary(name: &str, args: &Value) -> String {
    let s = |k: &str| args.get(k).and_then(Value::as_str).unwrap_or("").to_string();
    match name {
        "run_command" => s("command"),
        "write_file" => format!("write {} ({} bytes)", s("path"), s("content").len()),
        _ => format!("{name} {args}"),
    }
}

pub struct ToolOutcome {
    pub output: String,
    pub ok: bool,
    pub memory: Option<(String, String)>,
}

impl ToolOutcome {
    fn ok(output: impl Into<String>) -> Self {
        Self { output: output.into(), ok: true, memory: None }
    }
    fn err(output: impl Into<String>) -> Self {
        Self { output: output.into(), ok: false, memory: None }
    }
}

pub async fn execute(state: &AppState, name: &str, args: &Value) -> ToolOutcome {
    let s = |k: &str| args.get(k).and_then(Value::as_str).unwrap_or("").to_string();
    let cwd = state.cwd();
    match name {
        "run_command" => {
            let timeout = Duration::from_secs(state.settings().command_timeout_secs.max(1));
            let out = crate::shell::run(&s("command"), &cwd, timeout).await;
            state.set_cwd(out.cwd);
            ToolOutcome { output: out.output, ok: out.ok, memory: None }
        }
        "read_file" => {
            let path = crate::shell::resolve(&cwd, &s("path"));
            match tokio::fs::read(&path).await {
                Ok(bytes) => ToolOutcome::ok(crate::shell::truncate(String::from_utf8_lossy(&bytes).into_owned())),
                Err(e) => ToolOutcome::err(format!("Can't read {}: {e}", path.display())),
            }
        }
        "write_file" => {
            let path = crate::shell::resolve(&cwd, &s("path"));
            if let Some(dir) = path.parent() {
                let _ = tokio::fs::create_dir_all(dir).await;
            }
            let content = s("content");
            match tokio::fs::write(&path, &content).await {
                Ok(()) => ToolOutcome::ok(format!("Wrote {} bytes to {}", content.len(), path.display())),
                Err(e) => ToolOutcome::err(format!("Can't write {}: {e}", path.display())),
            }
        }
        "list_dir" => {
            let p = s("path");
            let path = if p.is_empty() { cwd } else { crate::shell::resolve(&cwd, &p) };
            match std::fs::read_dir(&path) {
                Ok(rd) => {
                    let mut names: Vec<String> = rd
                        .flatten()
                        .map(|e| {
                            let dir = e.file_type().map(|t| t.is_dir()).unwrap_or(false);
                            format!("{}{}", e.file_name().to_string_lossy(), if dir { "/" } else { "" })
                        })
                        .collect();
                    names.sort();
                    ToolOutcome::ok(crate::shell::truncate(if names.is_empty() { "(empty)".into() } else { names.join("\n") }))
                }
                Err(e) => ToolOutcome::err(format!("Can't list {}: {e}", path.display())),
            }
        }
        "remember" => {
            let (k, v) = (s("key"), s("value"));
            if k.trim().is_empty() {
                return ToolOutcome::err("key is required");
            }
            match state.memory.set(&k, &v) {
                Ok(()) => ToolOutcome { output: format!("Saved memory '{k}'"), ok: true, memory: Some((k, v)) },
                Err(e) => ToolOutcome::err(format!("Couldn't save memory: {e}")),
            }
        }
        "forget" => match state.memory.remove(&s("key")) {
            Ok(true) => ToolOutcome::ok("Deleted"),
            Ok(false) => ToolOutcome::err("No such memory"),
            Err(e) => ToolOutcome::err(e.to_string()),
        },
        other => ToolOutcome::err(format!("Unknown tool: {other}")),
    }
}
