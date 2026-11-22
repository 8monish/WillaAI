//! Optional remote control: drive the agent from Telegram or WhatsApp.

pub mod remote;
pub mod telegram;
pub mod whatsapp;

use serde::Serialize;
use std::sync::{Mutex, OnceLock};
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Default, Serialize)]
pub struct TelegramStatus {
    pub running: bool,
    pub bot_username: Option<String>,
    pub paired: bool,
    /// Shown in the app until a chat pairs with `/start <code>`.
    pub pair_code: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct WhatsAppStatus {
    pub supported: bool,
    pub installed: bool,
    /// off | installing | starting | qr | ready | error
    pub state: String,
    pub qr_svg: Option<String>,
    pub me: Option<String>,
    pub message: Option<String>,
    pub log: Vec<String>,
}

impl Default for WhatsAppStatus {
    fn default() -> Self {
        Self { supported: true, installed: false, state: "off".into(), qr_svg: None, me: None, message: None, log: vec![] }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct IntegrationStatus {
    pub telegram: TelegramStatus,
    pub whatsapp: WhatsAppStatus,
}

#[derive(Default)]
pub struct Hub {
    app: OnceLock<AppHandle>,
    pub remote: remote::Remote,
    pub telegram: Mutex<TelegramStatus>,
    pub tg_cancel: Mutex<Option<tokio_util::sync::CancellationToken>>,
    pub whatsapp: Mutex<WhatsAppStatus>,
    pub wa: Mutex<Option<whatsapp::Bridge>>,
}

impl Hub {
    pub fn set_app(&self, app: AppHandle) {
        let _ = self.app.set(app);
    }

    pub fn status(&self) -> IntegrationStatus {
        IntegrationStatus { telegram: self.telegram.lock().unwrap().clone(), whatsapp: self.whatsapp.lock().unwrap().clone() }
    }

    /// Push the current status to the UI.
    pub fn notify(&self) {
        if let Some(app) = self.app.get() {
            let _ = app.emit("integrations", self.status());
        }
    }

    pub fn update_telegram(&self, f: impl FnOnce(&mut TelegramStatus)) {
        f(&mut self.telegram.lock().unwrap());
        self.notify();
    }

    pub fn update_whatsapp(&self, f: impl FnOnce(&mut WhatsAppStatus)) {
        f(&mut self.whatsapp.lock().unwrap());
        self.notify();
    }

    pub fn wa_log(&self, line: impl Into<String>) {
        self.update_whatsapp(|s| {
            s.log.push(line.into());
            let n = s.log.len();
            if n > 40 {
                s.log.drain(..n - 40);
            }
        });
    }
}

/// Start whatever is enabled in Settings. Called at startup and after Settings change.
pub fn sync(state: &crate::state::AppState) {
    let s = state.settings();
    let tg_running = state.hub.tg_cancel.lock().unwrap().is_some();
    if s.telegram.enabled && !s.telegram.bot_token.trim().is_empty() {
        telegram::restart(state.clone());
    } else if tg_running {
        telegram::stop(state);
    }
    {
        let installed = whatsapp::is_installed(state);
        state.hub.update_whatsapp(|w| w.installed = installed);
        let running = state.hub.wa.lock().unwrap().is_some();
        if s.whatsapp.enabled && installed && !running {
            whatsapp::start(state.clone());
        } else if !s.whatsapp.enabled && running {
            whatsapp::stop(state);
        }
    }
}
