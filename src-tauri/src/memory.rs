//! Long-term memory: key/value facts the agent saves and sees in later sessions.

use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

pub struct Memory {
    path: PathBuf,
    items: Mutex<BTreeMap<String, String>>,
}

impl Memory {
    pub fn open(path: PathBuf) -> Self {
        let items = std::fs::read_to_string(&path).ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or_default();
        Self { path, items: Mutex::new(items) }
    }

    pub fn all(&self) -> BTreeMap<String, String> {
        self.items.lock().unwrap().clone()
    }

    pub fn set(&self, key: &str, value: &str) -> anyhow::Result<()> {
        let mut items = self.items.lock().unwrap();
        items.insert(key.trim().to_string(), value.trim().to_string());
        persist(&self.path, &items)
    }

    pub fn remove(&self, key: &str) -> anyhow::Result<bool> {
        let mut items = self.items.lock().unwrap();
        let existed = items.remove(key).is_some();
        persist(&self.path, &items)?;
        Ok(existed)
    }

    pub fn clear(&self) -> anyhow::Result<()> {
        let mut items = self.items.lock().unwrap();
        items.clear();
        persist(&self.path, &items)
    }

    /// Block injected into the system prompt.
    pub fn prompt_block(&self) -> String {
        let items = self.items.lock().unwrap();
        if items.is_empty() {
            return String::new();
        }
        let mut s = String::from("\n## Saved memories\n");
        for (k, v) in items.iter() {
            s.push_str(&format!("- {k}: {v}\n"));
        }
        s
    }
}

fn persist(path: &Path, items: &BTreeMap<String, String>) -> anyhow::Result<()> {
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir)?;
    }
    std::fs::write(path, serde_json::to_vec_pretty(items)?)?;
    Ok(())
}
