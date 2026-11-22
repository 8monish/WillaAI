//! Optional WhatsApp remote control (desktop only).
//!
//! WhatsApp has no bot API for personal accounts, so this uses whatsapp-web.js,
//! which needs Node.js and a Chromium-based browser. Nothing is installed until the
//! user clicks Install: we use the system Node.js 18+ if present, otherwise download
//! a portable Node.js into the app's data folder. An installed Chrome/Chromium/Edge
//! is reused so Puppeteer doesn't need to download its own browser.

use crate::state::AppState;
use futures_util::StreamExt;
use serde_json::{json, Value};
use std::path::{Path, PathBuf};
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command;
use tokio::sync::mpsc;
use tokio_util::sync::CancellationToken;

const BRIDGE_JS: &str = include_str!("../../resources/whatsapp/bridge.js");
const BRIDGE_PKG: &str = include_str!("../../resources/whatsapp/package.json");

pub struct Bridge {
    stdin: mpsc::UnboundedSender<Value>,
    cancel: CancellationToken,
}

fn bridge_dir(state: &AppState) -> PathBuf {
    state.data_dir.join("whatsapp")
}
fn node_dir(state: &AppState) -> PathBuf {
    state.data_dir.join("node")
}

fn portable_node(state: &AppState) -> PathBuf {
    let d = node_dir(state);
    if cfg!(windows) {
        d.join("node.exe")
    } else {
        d.join("bin").join("node")
    }
}

pub fn is_installed(state: &AppState) -> bool {
    bridge_dir(state).join("node_modules").join("whatsapp-web.js").is_dir() && bridge_dir(state).join("bridge.js").is_file()
}

/// Node.js 18+ to use: the portable copy first, then the system one.
async fn find_node(state: &AppState) -> Option<PathBuf> {
    let portable = portable_node(state);
    if portable.is_file() {
        return Some(portable);
    }
    let sys = crate::shell::which("node")?;
    let out = Command::new(&sys).arg("--version").output().await.ok()?;
    let v = String::from_utf8_lossy(&out.stdout);
    let major: u32 = v.trim().trim_start_matches('v').split('.').next()?.parse().ok()?;
    (major >= 18).then_some(sys)
}

/// An installed Chromium-based browser Puppeteer can drive.
fn find_browser() -> Option<PathBuf> {
    let candidates: &[&str] = if cfg!(windows) {
        &[
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        ]
    } else if cfg!(target_os = "macos") {
        &[
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Chromium.app/Contents/MacOS/Chromium",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        ]
    } else {
        &[]
    };
    candidates.iter().map(PathBuf::from).find(|p| p.is_file()).or_else(|| {
        ["google-chrome-stable", "google-chrome", "chromium", "chromium-browser", "microsoft-edge", "brave"]
            .iter()
            .find_map(|n| crate::shell::which(n))
    })
}

/// npm-cli.js that ships next to a node binary (works for portable and most system installs).
fn npm_cli(node: &Path) -> Option<PathBuf> {
    let node = std::fs::canonicalize(node).ok()?;
    let dir = node.parent()?;
    [
        dir.join("node_modules/npm/bin/npm-cli.js"),        // Windows layout
        dir.join("../lib/node_modules/npm/bin/npm-cli.js"), // Unix layout
    ]
    .into_iter()
    .find(|p| p.is_file())
}

fn path_with(dir: &Path) -> std::ffi::OsString {
    let mut paths = vec![dir.to_path_buf()];
    if let Some(p) = std::env::var_os("PATH") {
        paths.extend(std::env::split_paths(&p));
    }
    std::env::join_paths(paths).unwrap_or_default()
}

pub fn install(state: AppState) {
    if state.hub.whatsapp.lock().unwrap().state == "installing" {
        return;
    }
    state.hub.update_whatsapp(|w| {
        w.state = "installing".into();
        w.message = Some("Installing WhatsApp support…".into());
        w.log.clear();
    });
    tauri::async_runtime::spawn(async move {
        match install_inner(&state).await {
            Ok(()) => {
                state.hub.update_whatsapp(|w| {
                    w.installed = true;
                    w.state = "off".into();
                    w.message = Some("Installed. Turn it on to link your phone.".into());
                });
                if state.settings().whatsapp.enabled {
                    start(state.clone());
                }
            }
            Err(e) => {
                state.hub.wa_log(format!("ERROR: {e}"));
                state.hub.update_whatsapp(|w| {
                    w.state = "error".into();
                    w.message = Some(format!("Install failed: {e}"));
                });
            }
        }
    });
}

async fn install_inner(state: &AppState) -> anyhow::Result<()> {
    let hub = &state.hub;
    let node = match find_node(state).await {
        Some(n) => {
            hub.wa_log(format!("Using Node.js at {}", n.display()));
            n
        }
        None => {
            hub.wa_log("Node.js 18+ not found — downloading a private copy (≈30 MB)…");
            download_node(state).await?;
            portable_node(state)
        }
    };

    let dir = bridge_dir(state);
    tokio::fs::create_dir_all(&dir).await?;
    tokio::fs::write(dir.join("bridge.js"), BRIDGE_JS).await?;
    tokio::fs::write(dir.join("package.json"), BRIDGE_PKG).await?;

    let browser = find_browser();
    match &browser {
        Some(b) => hub.wa_log(format!("Using your browser: {}", b.display())),
        None => hub.wa_log("No Chrome/Chromium/Edge found — Puppeteer will download Chromium (≈170 MB)."),
    }

    let node_bin_dir = node.parent().unwrap().to_path_buf();
    let mut cmd = match npm_cli(&node) {
        Some(cli) => {
            let mut c = Command::new(&node);
            c.arg(cli);
            c
        }
        None => Command::new(if cfg!(windows) { "npm.cmd" } else { "npm" }),
    };
    cmd.args(["install", "--omit=dev", "--no-audit", "--no-fund", "--loglevel=http"])
        .current_dir(&dir)
        .env("PATH", path_with(&node_bin_dir))
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    if browser.is_some() {
        cmd.env("PUPPETEER_SKIP_DOWNLOAD", "true");
    }
    #[cfg(windows)]
    cmd.creation_flags(0x0800_0000);

    hub.wa_log("Running npm install…");
    let mut child = cmd.spawn().map_err(|e| anyhow::anyhow!("couldn't run npm: {e}"))?;
    let mut out = BufReader::new(child.stdout.take().unwrap()).lines();
    let mut err = BufReader::new(child.stderr.take().unwrap()).lines();
    loop {
        tokio::select! {
            l = out.next_line() => match l? { Some(l) => if !l.trim().is_empty() { hub.wa_log(l) }, None => break },
            l = err.next_line() => if let Some(l) = l? { if !l.trim().is_empty() && !l.contains("npm http ") { hub.wa_log(l) } },
        }
    }
    while let Some(l) = err.next_line().await? {
        if !l.contains("npm http ") {
            hub.wa_log(l);
        }
    }
    let status = child.wait().await?;
    anyhow::ensure!(status.success(), "npm install exited with {status}");
    anyhow::ensure!(is_installed(state), "whatsapp-web.js is missing after npm install");
    hub.wa_log("Done.");
    Ok(())
}

async fn download_node(state: &AppState) -> anyhow::Result<()> {
    let hub = &state.hub;
    let index: Value = state.http.get("https://nodejs.org/dist/index.json").send().await?.error_for_status()?.json().await?;
    let version = index
        .as_array()
        .and_then(|a| a.iter().find(|r| r["lts"].is_string()))
        .and_then(|r| r["version"].as_str())
        .ok_or_else(|| anyhow::anyhow!("couldn't find a Node.js LTS release"))?
        .to_string();
    let os = match std::env::consts::OS {
        "windows" => "win",
        "macos" => "darwin",
        o => o,
    };
    let arch = match std::env::consts::ARCH {
        "x86_64" => "x64",
        "aarch64" => "arm64",
        a => a,
    };
    let ext = if cfg!(windows) { "zip" } else { "tar.gz" };
    let name = format!("node-{version}-{os}-{arch}");
    let url = format!("https://nodejs.org/dist/{version}/{name}.{ext}");
    hub.wa_log(format!("Downloading {url}"));

    let resp = state.http.get(&url).send().await?.error_for_status()?;
    let total = resp.content_length().unwrap_or(0);
    let mut bytes = Vec::with_capacity(total as usize);
    let mut stream = resp.bytes_stream();
    let mut last = 0u64;
    while let Some(chunk) = stream.next().await {
        bytes.extend_from_slice(&chunk?);
        let pct = (bytes.len() as u64 * 100).checked_div(total).unwrap_or(0);
        if pct >= last + 10 {
            last = pct;
            hub.wa_log(format!("  {pct}%"));
        }
    }

    let tmp = state.data_dir.join("node.tmp");
    let dest = node_dir(state);
    let _ = std::fs::remove_dir_all(&tmp);
    let (tmp2, dest2) = (tmp.clone(), dest.clone());
    tokio::task::spawn_blocking(move || -> anyhow::Result<()> {
        std::fs::create_dir_all(&tmp2)?;
        if cfg!(windows) {
            zip::ZipArchive::new(std::io::Cursor::new(bytes))?.extract(&tmp2)?;
        } else {
            tar::Archive::new(flate2::read::GzDecoder::new(&bytes[..])).unpack(&tmp2)?;
        }
        let _ = std::fs::remove_dir_all(&dest2);
        std::fs::rename(tmp2.join(&name), &dest2)?;
        let _ = std::fs::remove_dir_all(&tmp2);
        Ok(())
    })
    .await??;
    hub.wa_log(format!("Node.js {version} installed."));
    Ok(())
}

pub fn start(state: AppState) {
    if state.hub.wa.lock().unwrap().is_some() {
        return;
    }
    let cancel = CancellationToken::new();
    let (tx, rx) = mpsc::unbounded_channel::<Value>();
    *state.hub.wa.lock().unwrap() = Some(Bridge { stdin: tx.clone(), cancel: cancel.clone() });
    state.hub.update_whatsapp(|w| {
        w.state = "starting".into();
        w.message = Some("Starting WhatsApp…".into());
        w.qr_svg = None;
    });
    tauri::async_runtime::spawn(async move {
        let res = run(&state, tx, rx, &cancel).await;
        *state.hub.wa.lock().unwrap() = None;
        state.hub.update_whatsapp(|w| {
            w.qr_svg = None;
            match res {
                Err(e) => {
                    w.state = "error".into();
                    w.message = Some(e.to_string());
                }
                Ok(()) if w.state != "error" => {
                    w.state = "off".into();
                    w.message = Some("Stopped.".into());
                }
                _ => {}
            }
        });
    });
}

pub fn stop(state: &AppState) {
    if let Some(b) = state.hub.wa.lock().unwrap().take() {
        let _ = b.stdin.send(json!({"type": "quit"}));
        let c = b.cancel.clone();
        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_secs(3)).await;
            c.cancel();
        });
    }
}

/// Unlink the phone: logs out and deletes the saved session.
pub fn logout(state: &AppState) {
    if let Some(b) = state.hub.wa.lock().unwrap().as_ref() {
        let _ = b.stdin.send(json!({"type": "logout"}));
    } else {
        let _ = std::fs::remove_dir_all(bridge_dir(state).join("session"));
    }
    state.hub.update_whatsapp(|w| {
        w.me = None;
        w.message = Some("Unlinked.".into());
    });
}

async fn run(
    state: &AppState,
    tx: mpsc::UnboundedSender<Value>,
    mut rx: mpsc::UnboundedReceiver<Value>,
    cancel: &CancellationToken,
) -> anyhow::Result<()> {
    let node = find_node(state).await.ok_or_else(|| anyhow::anyhow!("Node.js not found. Click Install again."))?;
    let dir = bridge_dir(state);
    let mut cmd = Command::new(&node);
    cmd.arg("bridge.js")
        .current_dir(&dir)
        .env("WA_DATA", dir.join("session"))
        .env("PATH", path_with(node.parent().unwrap()))
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    if let Some(b) = find_browser() {
        cmd.env("WA_CHROME", b);
    }
    #[cfg(windows)]
    cmd.creation_flags(0x0800_0000);
    let mut child = cmd.spawn()?;
    let mut stdin = child.stdin.take().unwrap();
    let mut lines = BufReader::new(child.stdout.take().unwrap()).lines();
    let mut errs = BufReader::new(child.stderr.take().unwrap()).lines();

    // Replies from the agent go to the bridge.
    let (out_tx, mut out_rx) = mpsc::unbounded_channel::<String>();
    {
        let tx = tx.clone();
        tauri::async_runtime::spawn(async move {
            while let Some(text) = out_rx.recv().await {
                for part in super::remote::chunks(&text, 3500) {
                    if tx.send(json!({"type": "send", "text": part})).is_err() {
                        return;
                    }
                }
            }
        });
    }

    loop {
        tokio::select! {
            _ = cancel.cancelled() => { let _ = child.kill().await; return Ok(()); }
            cmd = rx.recv() => if let Some(c) = cmd {
                stdin.write_all(format!("{c}\n").as_bytes()).await?;
                stdin.flush().await?;
            },
            l = errs.next_line() => if let Ok(Some(l)) = l { if !l.trim().is_empty() { state.hub.wa_log(l) } },
            l = lines.next_line() => {
                let Some(line) = l? else { break };
                let Ok(v) = serde_json::from_str::<Value>(&line) else { state.hub.wa_log(line); continue };
                match v["type"].as_str() {
                    Some("qr") => {
                        let svg = qrcode::QrCode::new(v["data"].as_str().unwrap_or("").as_bytes())
                            .map(|q| q.render::<qrcode::render::svg::Color>().min_dimensions(240, 240).build())
                            .ok();
                        state.hub.update_whatsapp(|w| {
                            w.state = "qr".into();
                            w.qr_svg = svg;
                            w.message = Some("Scan with WhatsApp → Linked devices → Link a device".into());
                        });
                    }
                    Some("status") => state.hub.update_whatsapp(|w| w.message = v["message"].as_str().map(str::to_string)),
                    Some("ready") => {
                        let me = v["me"].as_str().map(str::to_string);
                        state.hub.update_whatsapp(|w| {
                            w.state = "ready".into();
                            w.qr_svg = None;
                            w.me = me;
                            w.message = Some("Connected. Message yourself on WhatsApp to control WillaAI.".into());
                        });
                    }
                    Some("message") => {
                        let body = v["body"].as_str().unwrap_or("").to_string();
                        super::remote::handle(state, "wa:self", &body, out_tx.clone());
                    }
                    Some("disconnected") => {
                        state.hub.update_whatsapp(|w| { w.me = None; w.message = Some(format!("Disconnected: {}", v["reason"].as_str().unwrap_or(""))); });
                    }
                    Some("error") => {
                        let m = v["message"].as_str().unwrap_or("error").to_string();
                        state.hub.wa_log(m.clone());
                        state.hub.update_whatsapp(|w| { w.state = "error".into(); w.message = Some(m); });
                    }
                    _ => {}
                }
            }
        }
    }
    let status = child.wait().await?;
    if !status.success() && state.hub.whatsapp.lock().unwrap().state != "error" {
        anyhow::bail!("WhatsApp bridge exited with {status}");
    }
    Ok(())
}
