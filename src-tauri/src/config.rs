use serde::Serialize;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{OnceLock, RwLock};

/// Secrets loaded from the environment. Never sent to the webview.
#[derive(Clone, Default)]
pub struct Config {
    pub google_client_id: String,
    pub google_client_secret: String,
    pub openai_api_key: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CredentialsStatus {
    pub google_configured: bool,
    pub openai_configured: bool,
    pub env_path: String,
}

static CONFIG: OnceLock<RwLock<Config>> = OnceLock::new();

/// Load env from `~/.config/cadence-env/.env.local` (and a local `.env` if present),
/// then read the keys. Idempotent — safe to call once at startup.
pub fn init() {
    CONFIG.get_or_init(|| RwLock::new(load()));
}

pub fn get() -> Config {
    CONFIG
        .get()
        .expect("config not initialised")
        .read()
        .unwrap()
        .clone()
}

pub fn status() -> CredentialsStatus {
    let cfg = get();
    CredentialsStatus {
        google_configured: !cfg.google_client_id.is_empty() && !cfg.google_client_secret.is_empty(),
        openai_configured: !cfg.openai_api_key.is_empty(),
        env_path: env_path().to_string_lossy().to_string(),
    }
}

pub fn save_credentials(
    google_client_id: String,
    google_client_secret: String,
    openai_api_key: String,
) -> Result<CredentialsStatus, String> {
    let next = Config {
        google_client_id: google_client_id.trim().to_string(),
        google_client_secret: google_client_secret.trim().to_string(),
        openai_api_key: openai_api_key.trim().to_string(),
    };

    if next.google_client_id.is_empty() {
        return Err("Google client ID is required.".into());
    }
    if next.google_client_secret.is_empty() {
        return Err("Google client secret is required.".into());
    }
    if next.openai_api_key.is_empty() {
        return Err("OPENAI_API_KEY is required.".into());
    }

    let path = env_path();
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }

    let body = format!(
        "# Cadence local credentials. Do not commit this file.\nGOOGLE_CLIENT_ID={}\nGOOGLE_CLIENT_SECRET={}\nOPENAI_API_KEY={}\n",
        env_value(&next.google_client_id),
        env_value(&next.google_client_secret),
        env_value(&next.openai_api_key),
    );
    std::fs::write(&path, body).map_err(|e| e.to_string())?;
    set_private_permissions(&path);

    let lock = CONFIG.get_or_init(|| RwLock::new(Config::default()));
    *lock.write().unwrap() = next;
    Ok(status())
}

fn load() -> Config {
    let mut values = HashMap::new();

    values.extend(read_env_file(&env_path()));

    // Allow a project-local .env to override during development.
    if let Ok(p) = std::env::current_dir().map(|dir| dir.join(".env")) {
        values.extend(read_env_file(&p));
    }

    for key in ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "OPENAI_API_KEY"] {
        if let Ok(value) = std::env::var(key) {
            values.insert(key.to_string(), value);
        }
    }

    Config {
        google_client_id: values.remove("GOOGLE_CLIENT_ID").unwrap_or_default(),
        google_client_secret: values.remove("GOOGLE_CLIENT_SECRET").unwrap_or_default(),
        openai_api_key: values.remove("OPENAI_API_KEY").unwrap_or_default(),
    }
}

fn env_path() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".into());
    PathBuf::from(home).join(".config/cadence-env/.env.local")
}

fn read_env_file(path: &Path) -> HashMap<String, String> {
    let Ok(source) = std::fs::read_to_string(path) else {
        return HashMap::new();
    };
    source.lines().filter_map(parse_env_line).collect()
}

fn parse_env_line(line: &str) -> Option<(String, String)> {
    let line = line.trim();
    if line.is_empty() || line.starts_with('#') {
        return None;
    }
    let (key, value) = line.split_once('=')?;
    let key = key.trim().to_string();
    if key.is_empty() {
        return None;
    }
    Some((key, unquote(value.trim())))
}

fn unquote(value: &str) -> String {
    if value.len() >= 2 && value.starts_with('"') && value.ends_with('"') {
        return value[1..value.len() - 1]
            .replace("\\n", "\n")
            .replace("\\r", "\r")
            .replace("\\\"", "\"")
            .replace("\\\\", "\\");
    }
    if value.len() >= 2 && value.starts_with('\'') && value.ends_with('\'') {
        return value[1..value.len() - 1].to_string();
    }
    value.to_string()
}

fn env_value(value: &str) -> String {
    let escaped = value
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\n', "\\n")
        .replace('\r', "\\r");
    format!("\"{escaped}\"")
}

fn set_private_permissions(path: &Path) {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o600));
    }
}
