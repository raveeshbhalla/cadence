mod auth;
mod calendar;
mod config;
mod gmail;
mod google;
mod openai;
mod tasks;

use auth::Account;
use calendar::EventDto;
use gmail::EmailDto;
use openai::AiParse;
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

// ── Google Calendar ───────────────────────────────────────────────
#[tauri::command]
async fn events_list(time_min: String, time_max: String) -> Result<Vec<EventDto>, String> {
    tauri::async_runtime::spawn_blocking(move || calendar::list(&time_min, &time_max))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn event_create(title: String, start: String, end: String, task_id: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || calendar::create(&title, &start, &end, &task_id))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn event_update(event_id: String, start: String, end: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || calendar::update(&event_id, &start, &end))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn event_delete(event_id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || calendar::delete(&event_id)).await.map_err(|e| e.to_string())?
}

// ── Gmail ─────────────────────────────────────────────────────────
#[tauri::command]
async fn gmail_unreplied() -> Result<Vec<EmailDto>, String> {
    tauri::async_runtime::spawn_blocking(gmail::unreplied).await.map_err(|e| e.to_string())?
}

// ── OpenAI capture parsing ────────────────────────────────────────
#[tauri::command]
async fn ai_parse(text: String, today: String) -> Result<AiParse, String> {
    tauri::async_runtime::spawn_blocking(move || openai::parse(&text, &today))
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
            events_list,
            event_create,
            event_update,
            event_delete,
            gmail_unreplied,
            ai_parse,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
