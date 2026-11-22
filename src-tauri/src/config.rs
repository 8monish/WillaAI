//! Persistent settings, stored as JSON in the OS config directory.

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::Path;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Approval {
    /// Ask before running commands or writing files.
    Ask,
    /// Run everything without asking (the old behaviour).
    Auto,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct Settings {
    /// openrouter | openai | anthropic | gemini | groq | ollama | custom
    pub provider: String,
    /// Only used when provider == "custom".
    pub custom_base_url: String,
    /// One key per provider, so switching providers doesn't lose keys.
    pub api_keys: BTreeMap<String, String>,
    pub model: String,
    /// Default engine: api | agy | codex
    pub engine: String,
    /// Model passed to `agy --model`.
    pub agy_model: String,
    pub workspace: String,
    pub approval: Approval,
    pub max_steps: u32,
    pub command_timeout_secs: u64,
    pub temperature: Option<f32>,
    pub extra_instructions: String,
    pub theme: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            provider: "openrouter".into(),
            custom_base_url: String::new(),
            api_keys: BTreeMap::new(),
            model: String::new(),
            engine: "api".into(),
            agy_model: "gemini-3.8-flash-high".into(),
            workspace: String::new(),
            approval: Approval::Ask,
            max_steps: 25,
            command_timeout_secs: 60,
            temperature: None,
            extra_instructions: String::new(),
            theme: "dark".into(),
        }
    }
}

impl Settings {
    pub fn base_url(&self) -> String {
        let url = match self.provider.as_str() {
            "openrouter" => "https://openrouter.ai/api/v1",
            "openai" => "https://api.openai.com/v1",
            "anthropic" => "https://api.anthropic.com/v1",
            "gemini" => "https://generativelanguage.googleapis.com/v1beta/openai",
            "groq" => "https://api.groq.com/openai/v1",
            "ollama" => "http://localhost:11434/v1",
            _ => self.custom_base_url.as_str(),
        };
        url.trim_end_matches('/').to_string()
    }

    pub fn api_key(&self) -> Option<&str> {
        self.api_keys
            .get(&self.provider)
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
    }

    pub fn load(path: &Path) -> Self {
        std::fs::read_to_string(path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    }

    pub fn save(&self, path: &Path) -> anyhow::Result<()> {
        if let Some(dir) = path.parent() {
            std::fs::create_dir_all(dir)?;
        }
        let tmp = path.with_extension("json.tmp");
        std::fs::write(&tmp, serde_json::to_vec_pretty(self)?)?;
        std::fs::rename(tmp, path)?;
        Ok(())
    }
}
