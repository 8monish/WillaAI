//! Cross-platform command execution with timeout, output cap and `cd` tracking.

use std::path::{Path, PathBuf};
use std::time::Duration;

const MAX_OUTPUT: usize = 24 * 1024;

pub struct ShellOutput {
    pub output: String,
    pub ok: bool,
    pub cwd: PathBuf,
}

/// Resolve `p` against `cwd`, expanding a leading `~`.
pub fn resolve(cwd: &Path, p: &str) -> PathBuf {
    let p = p.trim();
    let expanded = if p == "~" || p.starts_with("~/") || p.starts_with("~\\") {
        home().map(|h| h.join(p.trim_start_matches('~').trim_start_matches(['/', '\\'])))
    } else {
        None
    };
    let path = expanded.unwrap_or_else(|| PathBuf::from(p));
    if path.is_absolute() { path } else { cwd.join(path) }
}

fn home() -> Option<PathBuf> {
    std::env::var_os(if cfg!(windows) { "USERPROFILE" } else { "HOME" }).map(PathBuf::from)
}

pub fn truncate(mut s: String) -> String {
    if s.len() > MAX_OUTPUT {
        let mut cut = MAX_OUTPUT;
        while !s.is_char_boundary(cut) {
            cut -= 1;
        }
        let dropped = s.len() - cut;
        s.truncate(cut);
        s.push_str(&format!("\n… [output truncated, {dropped} more bytes]"));
    }
    s
}

#[cfg(target_os = "ios")]
pub async fn run(command: &str, cwd: &Path, _timeout: Duration) -> ShellOutput {
    let _ = command;
    ShellOutput { output: "Running commands is not supported on iOS.".into(), ok: false, cwd: cwd.to_path_buf() }
}

#[cfg(not(target_os = "ios"))]
pub async fn run(command: &str, cwd: &Path, timeout: Duration) -> ShellOutput {
    let cmd = command.trim();

    // A bare `cd` changes the session's working directory.
    if cmd == "cd" || cmd.starts_with("cd ") {
        let target = cmd.strip_prefix("cd").unwrap().trim().trim_matches(['"', '\'']);
        let dir = if target.is_empty() { home().unwrap_or_else(|| cwd.to_path_buf()) } else { resolve(cwd, target) };
        return match std::fs::canonicalize(&dir) {
            Ok(d) if d.is_dir() => ShellOutput { output: format!("cwd: {}", d.display()), ok: true, cwd: d },
            _ => ShellOutput { output: format!("No such directory: {}", dir.display()), ok: false, cwd: cwd.to_path_buf() },
        };
    }

    let mut c = if cfg!(windows) {
        let mut c = tokio::process::Command::new("powershell");
        c.args(["-NoProfile", "-NonInteractive", "-Command", cmd]);
        c
    } else {
        let mut c = tokio::process::Command::new("sh");
        c.args(["-c", cmd]);
        c
    };
    c.current_dir(cwd).stdin(std::process::Stdio::null()).kill_on_drop(true);
    #[cfg(windows)]
    {
        // CREATE_NO_WINDOW: don't flash a console window.
        c.creation_flags(0x0800_0000);
    }

    // On timeout the future is dropped, and kill_on_drop kills the child.
    let child = tokio::time::timeout(timeout, c.output()).await;
    let (output, ok) = match child {
        Err(_) => (format!("Command timed out after {}s.", timeout.as_secs()), false),
        Ok(Err(e)) => (format!("Failed to start command: {e}"), false),
        Ok(Ok(out)) => {
            let mut s = String::from_utf8_lossy(&out.stdout).into_owned();
            let err = String::from_utf8_lossy(&out.stderr);
            if !err.trim().is_empty() {
                if !s.is_empty() && !s.ends_with('\n') {
                    s.push('\n');
                }
                s.push_str("[stderr]\n");
                s.push_str(&err);
            }
            let ok = out.status.success();
            if !ok {
                s.push_str(&format!("\n[exit code: {}]", out.status.code().map_or("signal".into(), |c| c.to_string())));
            }
            if s.trim().is_empty() {
                s = "(no output)".into();
            }
            (s, ok)
        }
    };
    ShellOutput { output: truncate(output), ok, cwd: cwd.to_path_buf() }
}

/// Find an executable on PATH (used to detect agent CLIs).
pub fn which(name: &str) -> Option<PathBuf> {
    let path = std::env::var_os("PATH")?;
    let exts: &[&str] = if cfg!(windows) { &[".exe", ".cmd", ".bat", ""] } else { &[""] };
    std::env::split_paths(&path).find_map(|dir| {
        exts.iter().map(|e| dir.join(format!("{name}{e}"))).find(|p| p.is_file())
    })
}
