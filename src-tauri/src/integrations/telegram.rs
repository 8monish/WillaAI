//! Telegram remote control over the Bot HTTP API (pure Rust, nothing to install).
//! The first private chat that sends `/start <pair code>` becomes the owner;
//! every other chat is ignored.

use crate::state::AppState;
use serde_json::{json, Value};
use std::time::Duration;
use tokio::sync::mpsc;
use tokio_util::sync::CancellationToken;

const API: &str = "https://api.telegram.org";

pub fn stop(state: &AppState) {
    if let Some(t) = state.hub.tg_cancel.lock().unwrap().take() {
        t.cancel();
    }
    state.hub.update_telegram(|s| {
        s.running = false;
        s.pair_code = None;
    });
}

pub fn restart(state: AppState) {
    stop(&state);
    let cancel = CancellationToken::new();
    *state.hub.tg_cancel.lock().unwrap() = Some(cancel.clone());
    tauri::async_runtime::spawn(async move {
        if let Err(e) = run(&state, &cancel).await {
            state.hub.update_telegram(|s| {
                s.running = false;
                s.error = Some(e.to_string());
            });
        }
    });
}

fn pair_code() -> String {
    let n = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().subsec_nanos() ^ std::process::id().rotate_left(13);
    format!("{:06}", n % 1_000_000)
}

async fn call(state: &AppState, token: &str, method: &str, body: Value, timeout: Duration) -> anyhow::Result<Value> {
    let v: Value = state.http.post(format!("{API}/bot{token}/{method}")).json(&body).timeout(timeout).send().await?.json().await?;
    if v["ok"] != true {
        anyhow::bail!("{}", v["description"].as_str().unwrap_or("Telegram API error"));
    }
    Ok(v["result"].clone())
}

async fn run(state: &AppState, cancel: &CancellationToken) -> anyhow::Result<()> {
    let token = state.settings().telegram.bot_token.trim().to_string();
    let me =
        call(state, &token, "getMe", json!({}), Duration::from_secs(20)).await.map_err(|e| match e.downcast_ref::<reqwest::Error>() {
            Some(_) => anyhow::anyhow!("Couldn't reach Telegram. Check your internet connection."),
            None => anyhow::anyhow!("Bot token rejected by Telegram: {e}"),
        })?;
    let owner = state.settings().telegram.owner_chat_id;
    let code = pair_code();
    state.hub.update_telegram(|s| {
        s.running = true;
        s.error = None;
        s.bot_username = me["username"].as_str().map(str::to_string);
        s.paired = owner.is_some();
        s.pair_code = if owner.is_some() { None } else { Some(code.clone()) };
    });

    // Outgoing messages are queued so the agent never waits on the network.
    let (tx, mut rx) = mpsc::unbounded_channel::<(i64, String)>();
    {
        let state = state.clone();
        let token = token.clone();
        let cancel = cancel.clone();
        tauri::async_runtime::spawn(async move {
            loop {
                let msg = tokio::select! { m = rx.recv() => m, _ = cancel.cancelled() => None };
                let Some((chat, text)) = msg else { break };
                for part in super::remote::chunks(&text, 4000) {
                    let _ = call(&state, &token, "sendMessage", json!({"chat_id": chat, "text": part}), Duration::from_secs(30)).await;
                }
            }
        });
    }

    let mut offset: i64 = 0;
    let mut failures = 0u32;
    loop {
        let res = tokio::select! {
            r = call(state, &token, "getUpdates", json!({"offset": offset, "timeout": 50, "allowed_updates": ["message"]}), Duration::from_secs(65)) => r,
            _ = cancel.cancelled() => return Ok(()),
        };
        let updates = match res {
            Ok(u) => {
                failures = 0;
                u
            }
            Err(e) => {
                failures += 1;
                if failures >= 3 {
                    state.hub.update_telegram(|s| s.error = Some(format!("Connection problem: {e}")));
                }
                tokio::select! { _ = tokio::time::sleep(Duration::from_secs(5)) => continue, _ = cancel.cancelled() => return Ok(()) }
            }
        };
        if failures == 0 && state.hub.telegram.lock().unwrap().error.is_some() {
            state.hub.update_telegram(|s| s.error = None);
        }

        for u in updates.as_array().into_iter().flatten() {
            offset = offset.max(u["update_id"].as_i64().unwrap_or(0) + 1);
            let msg = &u["message"];
            let (Some(chat), Some(text)) = (msg["chat"]["id"].as_i64(), msg["text"].as_str()) else { continue };
            let private = msg["chat"]["type"] == "private";

            match state.settings().telegram.owner_chat_id {
                Some(owner) if owner == chat => {
                    let out = forward(tx.clone(), chat);
                    super::remote::handle(state, &format!("tg:{chat}"), text, out);
                }
                Some(_) => {} // not the owner: ignore silently
                None => {
                    let t = text.trim();
                    if private && (t == code || t == format!("/start {code}")) {
                        let mut s = state.settings();
                        s.telegram.owner_chat_id = Some(chat);
                        state.save_settings(s)?;
                        state.hub.update_telegram(|s| {
                            s.paired = true;
                            s.pair_code = None;
                        });
                        let _ = tx.send((chat, format!("Paired with WillaAI ✅\n\n{}", super::remote::HELP)));
                    } else if private {
                        let _ = tx.send((chat, "Send the 6-digit pairing code shown in WillaAI → Settings → Telegram.".into()));
                    }
                }
            }
        }
    }
}

/// Adapter: remote::handle sends plain strings; tag them with the chat id.
fn forward(tx: mpsc::UnboundedSender<(i64, String)>, chat: i64) -> mpsc::UnboundedSender<String> {
    let (t, mut r) = mpsc::unbounded_channel::<String>();
    tauri::async_runtime::spawn(async move {
        while let Some(m) = r.recv().await {
            if tx.send((chat, m)).is_err() {
                break;
            }
        }
    });
    t
}
