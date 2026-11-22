//! Shared application state.

use crate::config::Settings;
use crate::memory::Memory;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex, RwLock};
use tokio::sync::oneshot;
use tokio_util::sync::CancellationToken;

pub type AppState = Arc<Inner>;

pub struct Inner {
    settings: RwLock<Settings>,
    settings_path: PathBuf,
    cwd: Mutex<PathBuf>,
    pub memory: Memory,
    pub http: reqwest::Client,
    pub runs: Mutex<HashMap<u64, CancellationToken>>,
    pub approvals: Mutex<HashMap<u64, oneshot::Sender<bool>>>,
    /// None on platforms where sysinfo is unsupported (e.g. sandboxed mobile).
    pub sys: Mutex<Option<sysinfo::System>>,
    pub data_dir: PathBuf,
    pub hub: crate::integrations::Hub,
    next_id: AtomicU64,
}

impl Inner {
    pub fn new(config_dir: PathBuf, data_dir: PathBuf, default_workspace: PathBuf) -> Self {
        let settings_path = config_dir.join("settings.json");
        let settings = Settings::load(&settings_path);
        let cwd = workspace_or(&settings, &default_workspace);
        let http = reqwest::Client::builder()
            .user_agent(concat!("WillaAI/", env!("CARGO_PKG_VERSION")))
            .connect_timeout(std::time::Duration::from_secs(15))
            .build()
            .expect("http client");
        Self {
            settings: RwLock::new(settings),
            settings_path,
            cwd: Mutex::new(cwd),
            memory: Memory::open(data_dir.join("memories.json")),
            data_dir: data_dir.clone(),
            http,
            runs: Mutex::new(HashMap::new()),
            approvals: Mutex::new(HashMap::new()),
            sys: Mutex::new(sysinfo::System::new().ok()),
            hub: Default::default(),
            next_id: AtomicU64::new(1),
        }
    }

    pub fn settings(&self) -> Settings {
        self.settings.read().unwrap().clone()
    }

    pub fn save_settings(&self, new: Settings) -> anyhow::Result<()> {
        new.save(&self.settings_path)?;
        let ws_changed = self.settings.read().unwrap().workspace != new.workspace;
        if ws_changed && !new.workspace.trim().is_empty() {
            let p = PathBuf::from(new.workspace.trim());
            if p.is_dir() {
                self.set_cwd(p);
            }
        }
        *self.settings.write().unwrap() = new;
        Ok(())
    }

    pub fn cwd(&self) -> PathBuf {
        self.cwd.lock().unwrap().clone()
    }

    pub fn set_cwd(&self, p: PathBuf) {
        *self.cwd.lock().unwrap() = p;
    }

    pub fn next_id(&self) -> u64 {
        self.next_id.fetch_add(1, Ordering::Relaxed)
    }
}

fn workspace_or(s: &Settings, fallback: &std::path::Path) -> PathBuf {
    let p = PathBuf::from(s.workspace.trim());
    if !s.workspace.trim().is_empty() && p.is_dir() { p } else { fallback.to_path_buf() }
}
