mod auth;
mod config;
mod google;
mod tasks;

use auth::Account;
use tasks::TaskDto;

// ── Auth ──────────────────────────────────────────────────────────
#[tauri::command]
async fn google_sign_in() -> Result<Account, String> {
    tauri::async_runtime::spawn_blocking(auth::sign_in)
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
fn auth_status() -> Option<Account> {
    auth::account()
}

#[tauri::command]
fn sign_out() -> Result<(), String> {
    auth::clear_tokens()
}

// ── Google Tasks ──────────────────────────────────────────────────
#[tauri::command]
async fn tasks_list() -> Result<Vec<TaskDto>, String> {
    tauri::async_runtime::spawn_blocking(tasks::list).await.map_err(|e| e.to_string())?
}

#[tauri::command]
async fn task_set_status(list_id: String, id: String, completed: bool) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || tasks::set_status(&list_id, &id, completed))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn task_create(list_id: String, title: String, due: Option<String>) -> Result<TaskDto, String> {
    tauri::async_runtime::spawn_blocking(move || tasks::create(&list_id, &title, due))
        .await
        .map_err(|e| e.to_string())?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    config::init();

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            google_sign_in,
            auth_status,
            sign_out,
            tasks_list,
            task_set_status,
            task_create,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
