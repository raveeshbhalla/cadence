use std::path::PathBuf;
use std::sync::OnceLock;

/// Secrets loaded from the environment. Never sent to the webview.
#[derive(Clone)]
pub struct Config {
    pub google_client_id: String,
    pub google_client_secret: String,
    pub openai_api_key: String,
}

static CONFIG: OnceLock<Config> = OnceLock::new();

/// Load env from `~/.config/cadence-env/.env.local` (and a local `.env` if present),
/// then read the keys. Idempotent — safe to call once at startup.
pub fn init() -> &'static Config {
    CONFIG.get_or_init(|| {
        if let Ok(home) = std::env::var("HOME") {
            let p = PathBuf::from(home).join(".config/cadence-env/.env.local");
            let _ = dotenvy::from_path(&p);
        }
        // Allow a project-local .env to override during development.
        let _ = dotenvy::dotenv();

        Config {
            google_client_id: std::env::var("GOOGLE_CLIENT_ID").unwrap_or_default(),
            google_client_secret: std::env::var("GOOGLE_CLIENT_SECRET").unwrap_or_default(),
            openai_api_key: std::env::var("OPENAI_API_KEY").unwrap_or_default(),
        }
    })
}

pub fn get() -> &'static Config {
    CONFIG.get().expect("config not initialised")
}
