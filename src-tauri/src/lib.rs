mod auth;
mod calendar;
mod config;
mod gmail;
mod google;
mod openai;
mod tasks;

use auth::Account;
use calendar::{CalendarDto, EventDto};
use config::CredentialsStatus;
use gmail::EmailDto;
use openai::AiParse;
use tasks::TaskDto;

// ── Local credentials ─────────────────────────────────────────────
#[tauri::command]
fn credentials_status() -> CredentialsStatus {
    config::status()
}

#[tauri::command]
fn save_credentials(
    google_client_id: String,
    google_client_secret: String,
    openai_api_key: String,
) -> Result<CredentialsStatus, String> {
    config::save_credentials(google_client_id, google_client_secret, openai_api_key)
}

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

/// Open a URL (meeting link, etc.) in the user's default browser.
#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    open::that(url).map_err(|e| e.to_string())
}

/// Write a data export (JSON + CSV) to the user's Downloads folder. Returns the path.
#[tauri::command]
fn export_data(json: String, csv: String) -> Result<String, String> {
    use std::time::{SystemTime, UNIX_EPOCH};
    let home = std::env::var("HOME").map_err(|e| e.to_string())?;
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let dir = std::path::Path::new(&home).join("Downloads");
    let json_path = dir.join(format!("cadence-export-{ts}.json"));
    let csv_path = dir.join(format!("cadence-export-{ts}.csv"));
    std::fs::write(&json_path, json).map_err(|e| e.to_string())?;
    std::fs::write(&csv_path, csv).map_err(|e| e.to_string())?;
    Ok(json_path.to_string_lossy().to_string())
}

/// Set the macOS menu-bar (tray) title — the frontend pushes the next item here.
#[tauri::command]
fn set_tray_title(app: tauri::AppHandle, text: String) -> Result<(), String> {
    if let Some(tray) = app.tray_by_id("main") {
        tray.set_title(Some(text)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ── Google Tasks ──────────────────────────────────────────────────
#[tauri::command]
async fn tasks_list() -> Result<Vec<TaskDto>, String> {
    tauri::async_runtime::spawn_blocking(tasks::list)
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn task_set_status(list_id: String, id: String, completed: bool) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || tasks::set_status(&list_id, &id, completed))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn task_create(
    list_id: String,
    title: String,
    due: Option<String>,
    notes: Option<String>,
) -> Result<TaskDto, String> {
    tauri::async_runtime::spawn_blocking(move || tasks::create(&list_id, &title, due, notes))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn task_set_title(list_id: String, id: String, title: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || tasks::set_title(&list_id, &id, &title))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn task_set_due(list_id: String, id: String, due: Option<String>) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || tasks::set_due(&list_id, &id, due))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn task_set_notes(list_id: String, id: String, notes: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || tasks::set_notes(&list_id, &id, &notes))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn task_delete(list_id: String, id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || tasks::delete(&list_id, &id))
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
async fn calendars_list() -> Result<Vec<CalendarDto>, String> {
    tauri::async_runtime::spawn_blocking(calendar::list_calendars)
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn events_search(
    q: String,
    time_min: String,
    time_max: String,
) -> Result<Vec<EventDto>, String> {
    tauri::async_runtime::spawn_blocking(move || calendar::search(&q, &time_min, &time_max))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn event_create(
    title: String,
    start: String,
    end: String,
    task_id: String,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || calendar::create(&title, &start, &end, &task_id))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn event_create_meeting(title: String, start: String, end: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || calendar::create_meeting(&title, &start, &end))
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
async fn event_set_title(event_id: String, title: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || calendar::set_summary(&event_id, &title))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn event_delete(event_id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || calendar::delete(&event_id))
        .await
        .map_err(|e| e.to_string())?
}

// ── Gmail ─────────────────────────────────────────────────────────
#[tauri::command]
async fn gmail_unreplied() -> Result<Vec<EmailDto>, String> {
    tauri::async_runtime::spawn_blocking(gmail::unreplied)
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn gmail_archive(thread_id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || gmail::archive(&thread_id))
        .await
        .map_err(|e| e.to_string())?
}

// ── OpenAI capture parsing ────────────────────────────────────────
#[tauri::command]
async fn ai_parse(text: String, today: String, locale: String) -> Result<AiParse, String> {
    tauri::async_runtime::spawn_blocking(move || openai::parse(&text, &today, &locale))
        .await
        .map_err(|e| e.to_string())?
}

/// One row in the menu-bar dropdown (today's schedule, pushed by the frontend).
#[derive(serde::Deserialize)]
pub struct AgendaItem {
    /// Typed id, e.g. "event:abc" or "task:n123" — routed back to the webview on click.
    id: String,
    label: String,
}

/// Build the tray dropdown: an optional header, today's items, then app actions.
fn build_tray_menu<R: tauri::Runtime>(
    app: &impl tauri::Manager<R>,
    header: &str,
    items: &[AgendaItem],
) -> Result<tauri::menu::Menu<R>, tauri::Error> {
    use tauri::menu::{MenuBuilder, MenuItemBuilder};

    let mut b = MenuBuilder::new(app);

    // Header (next item / status) — non-clickable.
    let header_item;
    if !header.is_empty() {
        header_item = MenuItemBuilder::with_id("header", header)
            .enabled(false)
            .build(app)?;
        b = b.item(&header_item).separator();
    }

    // Today's schedule, in order. Keep the handles alive until build().
    let mut rows = Vec::with_capacity(items.len());
    for it in items {
        rows.push(MenuItemBuilder::with_id(format!("agenda:{}", it.id), &it.label).build(app)?);
    }
    if rows.is_empty() && !header.is_empty() {
        let none = MenuItemBuilder::with_id("none", "Nothing scheduled today")
            .enabled(false)
            .build(app)?;
        b = b.item(&none);
    }
    for r in &rows {
        b = b.item(r);
    }

    let join = MenuItemBuilder::with_id("join", "Join next meeting").build(app)?;
    let open = MenuItemBuilder::with_id("open", "Open Cadence").build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "Quit Cadence").build(app)?;
    b.separator().item(&join).item(&open).item(&quit).build()
}

/// Replace the tray menu with today's agenda (pushed from the webview).
#[tauri::command]
fn set_tray_agenda(
    app: tauri::AppHandle,
    header: String,
    items: Vec<AgendaItem>,
) -> Result<(), String> {
    if let Some(tray) = app.tray_by_id("main") {
        let menu = build_tray_menu(&app, &header, &items).map_err(|e| e.to_string())?;
        tray.set_menu(Some(menu)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn setup_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    use tauri::tray::TrayIconBuilder;
    use tauri::{Emitter, Manager};

    let menu = build_tray_menu(app, "", &[])?;

    TrayIconBuilder::with_id("main")
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        // Left-click opens the dropdown (Granola-style) rather than hiding the app.
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| {
            let id = event.id().as_ref();
            // A clicked agenda row → open the app and focus that item in the webview.
            if let Some(item) = id.strip_prefix("agenda:") {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
                let _ = app.emit("tray-open-item", item.to_string());
                return;
            }
            match id {
                "join" => {
                    let _ = app.emit("join-next", ());
                }
                "open" => {
                    if let Some(w) = app.get_webview_window("main") {
                        let _ = w.show();
                        let _ = w.set_focus();
                    }
                }
                "quit" => app.exit(0),
                _ => {}
            }
        })
        .build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    config::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            setup_tray(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            // Keep Cadence alive in the menu bar when its window is closed.
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            credentials_status,
            save_credentials,
            google_sign_in,
            auth_status,
            sign_out,
            open_url,
            export_data,
            set_tray_title,
            set_tray_agenda,
            tasks_list,
            task_set_status,
            task_create,
            task_set_title,
            task_set_due,
            task_set_notes,
            task_delete,
            events_list,
            calendars_list,
            events_search,
            event_create,
            event_create_meeting,
            event_update,
            event_set_title,
            event_delete,
            gmail_unreplied,
            gmail_archive,
            ai_parse,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
