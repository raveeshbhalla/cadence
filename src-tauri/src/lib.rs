mod auth;
mod config;

use auth::Account;

/// Begin the Google OAuth flow (opens the system browser). Resolves once the
/// user has consented and tokens are stored.
#[tauri::command]
async fn google_sign_in() -> Result<Account, String> {
    tauri::async_runtime::spawn_blocking(auth::sign_in)
        .await
        .map_err(|e| e.to_string())?
}

/// The currently signed-in account, or null.
#[tauri::command]
fn auth_status() -> Option<Account> {
    auth::account()
}

/// Forget stored tokens.
#[tauri::command]
fn sign_out() -> Result<(), String> {
    auth::clear_tokens()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    config::init();

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![google_sign_in, auth_status, sign_out])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
