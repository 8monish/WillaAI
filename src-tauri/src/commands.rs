//! Tauri commands exposed to the UI.

use crate::config::Settings;
use crate::events::AgentEvent;
use crate::state::AppState;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;
use std::time::Duration;
use tauri::ipc::Channel;
use tauri::State;
use tokio_util::sync::CancellationToken;

type Res<T> = Result<T, String>;
fn err(e: impl std::fmt::Display) -> String { e.to_string() }

#[derive(Deserialize)]
pub struct ChatRequest {
    /// api | agy | codex (defaults to the engine in Settings)
    pub engine: Option<String>,
    /// API-format history: {role, content, tool_calls?, tool_call_id?}
    pub messages: Vec<Value>,
    pub model: Option<String>,
}

/// Starts an agent run and returns its id immediately; events stream over `on_event`.
#[tauri::command]
pub async fn chat(state: State<'_, AppState>, req: ChatRequest, on_event: Channel<AgentEvent>) -> Res<u64> {
    let state: AppState = state.inner().clone();
    let id = state.next_id();
    let cancel = CancellationToken::new();
    state.runs.lock().unwrap().insert(id, cancel.clone());
    let engine = req.engine.unwrap_or_else(|| state.settings().engine);

    tauri::async_runtime::spawn(async move {
        let ch = on_event.clone();
        let msgs = match engine.as_str() {
            #[cfg(desktop)]
            "agy" => {
                let model = req.model.filter(|m| !m.is_empty()).unwrap_or_else(|| state.settings().agy_model);
                crate::agent::cli::run_agy(state.clone(), crate::agent::flatten_history(&req.messages), model, ch, cancel.clone()).await
            }
            #[cfg(desktop)]
            "codex" => crate::agent::cli::run_codex(state.clone(), crate::agent::flatten_history(&req.messages), ch, cancel.clone()).await,
            _ => crate::agent::api::run(state.clone(), req.messages, req.model, ch, cancel.clone()).await,
        };
        state.runs.lock().unwrap().remove(&id);
        let _ = on_event.send(AgentEvent::Done { messages: msgs });
    });
    Ok(id)
}

#[tauri::command]
pub fn cancel_run(state: State<'_, AppState>, id: u64) {
    if let Some(t) = state.runs.lock().unwrap().get(&id) {
        t.cancel();
    }
}

#[tauri::command]
pub fn resolve_approval(state: State<'_, AppState>, id: u64, approved: bool) {
    if let Some(tx) = state.approvals.lock().unwrap().remove(&id) {
        let _ = tx.send(approved);
    }
}

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> Settings { state.settings() }

#[tauri::command]
pub fn save_settings(state: State<'_, AppState>, settings: Settings) -> Res<()> {
    state.save_settings(settings).map_err(err)
}

#[tauri::command]
pub fn list_memories(state: State<'_, AppState>) -> BTreeMap<String, String> { state.memory.all() }

#[tauri::command]
pub fn set_memory(state: State<'_, AppState>, key: String, value: String) -> Res<()> {
    state.memory.set(&key, &value).map_err(err)
}

#[tauri::command]
pub fn delete_memory(state: State<'_, AppState>, key: String) -> Res<()> {
    state.memory.remove(&key).map(|_| ()).map_err(err)
}

#[tauri::command]
pub fn clear_memories(state: State<'_, AppState>) -> Res<()> { state.memory.clear().map_err(err) }

#[derive(Serialize)]
pub struct TermResult { output: String, ok: bool, cwd: String }

/// Built-in terminal: runs one command in the session's working directory.
#[tauri::command]
pub async fn terminal_exec(state: State<'_, AppState>, command: String) -> Res<TermResult> {
    let timeout = Duration::from_secs(state.settings().command_timeout_secs.max(1));
    let out = crate::shell::run(&command, &state.cwd(), timeout).await;
    state.set_cwd(out.cwd.clone());
    Ok(TermResult { output: out.output, ok: out.ok, cwd: out.cwd.display().to_string() })
}

#[tauri::command]
pub fn get_cwd(state: State<'_, AppState>) -> String { state.cwd().display().to_string() }

#[derive(Serialize)]
pub struct Stats { cpu: f32, mem_used: u64, mem_total: u64, disk_used: u64, disk_total: u64, os: String, host: String }

#[tauri::command]
pub fn system_stats(state: State<'_, AppState>) -> Stats {
    let (mut cpu, mut mem_used, mut mem_total) = (0.0, 0, 0);
    if let Some(sys) = state.sys.lock().unwrap().as_mut() {
        sys.refresh_cpu_usage();
        sys.refresh_memory();
        cpu = sys.global_cpu_usage();
        mem_used = sys.used_memory();
        mem_total = sys.total_memory();
    }
    // The disk holding the working directory, else the largest one.
    let (disk_total, disk_free): (u64, u64) = sysinfo::Disks::new_with_refreshed_list()
        .ok()
        .and_then(|disks| {
            let cwd = state.cwd();
            let list: &[sysinfo::Disk] = &disks;
            list.iter()
                .filter(|d| cwd.starts_with(d.mount_point()))
                .max_by_key(|d| d.mount_point().as_os_str().len())
                .or_else(|| list.iter().max_by_key(|d| d.total_space()))
                .map(|d| (d.total_space(), d.available_space()))
        })
        .unwrap_or((0, 0));
    Stats {
        cpu,
        mem_used,
        mem_total,
        disk_used: disk_total.saturating_sub(disk_free),
        disk_total,
        os: sysinfo::System::long_os_version().unwrap_or_else(|_| std::env::consts::OS.into()),
        host: sysinfo::System::host_name().unwrap_or_default(),
    }
}

#[derive(Serialize)]
pub struct EngineStatus { api_ready: bool, agy: bool, codex: bool, desktop: bool, platform: &'static str }

#[tauri::command]
pub fn engine_status(state: State<'_, AppState>) -> EngineStatus {
    let s = state.settings();
    let desktop = cfg!(desktop);
    EngineStatus {
        api_ready: !s.model.is_empty() && (s.api_key().is_some() || matches!(s.provider.as_str(), "ollama" | "custom")),
        agy: desktop && crate::shell::which("agy").is_some(),
        codex: desktop && crate::shell::which("codex").is_some(),
        desktop,
        platform: std::env::consts::OS,
    }
}

/// Lists models from the provider's /models endpoint, for the Settings picker.
#[tauri::command]
pub async fn list_models(state: State<'_, AppState>) -> Res<Vec<String>> {
    let s = state.settings();
    let mut req = state.http.get(format!("{}/models", s.base_url())).timeout(Duration::from_secs(20));
    if let Some(k) = s.api_key() {
        req = req.bearer_auth(k);
    }
    let resp = req.send().await.map_err(err)?;
    if !resp.status().is_success() {
        return Err(format!("{} returned {}", s.base_url(), resp.status()));
    }
    let v: Value = resp.json().await.map_err(err)?;
    let mut ids: Vec<String> = v
        .get("data")
        .and_then(Value::as_array)
        .map(|a| a.iter().filter_map(|m| m.get("id")?.as_str().map(|s| s.trim_start_matches("models/").to_string())).collect())
        .unwrap_or_default();
    ids.sort();
    Ok(ids)
}
