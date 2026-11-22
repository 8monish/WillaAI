mod agent;
mod commands;
mod config;
mod events;
mod integrations;
mod memory;
mod shell;
mod state;
mod tools;

use std::sync::Arc;
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            let paths = app.path();
            let config_dir = paths.app_config_dir()?;
            let data_dir = paths.app_data_dir()?;
            let workspace = paths.home_dir().unwrap_or_else(|_| data_dir.clone());
            let st: state::AppState = Arc::new(state::Inner::new(config_dir, data_dir, workspace));
            st.hub.set_app(app.handle().clone());
            app.manage(st.clone());
            // Start Telegram/WhatsApp if they were left on.
            tauri::async_runtime::spawn(async move { integrations::sync(&st) });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::chat,
            commands::cancel_run,
            commands::resolve_approval,
            commands::get_settings,
            commands::save_settings,
            commands::list_memories,
            commands::set_memory,
            commands::delete_memory,
            commands::clear_memories,
            commands::terminal_exec,
            commands::get_cwd,
            commands::system_stats,
            commands::engine_status,
            commands::list_models,
            commands::integration_status,
            commands::telegram_unpair,
            commands::whatsapp_install,
            commands::whatsapp_logout,
            commands::whatsapp_restart,
        ])
        .build(tauri::generate_context!())
        .expect("error while building WillaAI")
        .run(|app, event| {
            // Shut the WhatsApp bridge down cleanly so Chromium doesn't linger.
            if let tauri::RunEvent::Exit = event {
                if let Some(st) = app.try_state::<state::AppState>() {
                    integrations::whatsapp::stop(&st);
                }
            }
        });
}
