use std::io::{BufRead, BufReader, Write};
use std::net::TcpListener;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use rand::Rng;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::config;

const AUTH_ENDPOINT: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT: &str = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT: &str = "https://www.googleapis.com/oauth2/v2/userinfo";
const SCOPES: &str = "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/gmail.modify";

const KEYRING_SERVICE: &str = "com.cadence.app";
const KEYRING_USER: &str = "google-tokens";

/// Fixed loopback redirect port. Must be registered as an Authorized redirect
/// URI on the OAuth client: `http://127.0.0.1:8765` (a "Web application" client
/// requires this; a "Desktop app" client accepts any loopback port regardless).
const REDIRECT_PORT: u16 = 8765;

/// Persisted token set (stored as JSON in the OS keychain).
#[derive(Clone, Serialize, Deserialize)]
pub struct StoredTokens {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: u64, // unix seconds
    pub email: String,
}

/// What the frontend learns about the signed-in account (no secrets).
#[derive(Clone, Serialize)]
pub struct Account {
    pub email: String,
}

fn now_secs() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0)
}

fn keyring_entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new(KEYRING_SERVICE, KEYRING_USER).map_err(|e| e.to_string())
}

/// In-memory cache of the token set. The macOS Keychain re-prompts an unsigned
/// dev binary on every read, so we read it at most once per launch and serve
/// every subsequent API call from memory.
static CACHE: Mutex<Option<StoredTokens>> = Mutex::new(None);

fn load_tokens() -> Option<StoredTokens> {
    if let Some(t) = CACHE.lock().unwrap().as_ref() {
        return Some(t.clone());
    }
    let entry = keyring_entry().ok()?;
    let raw = entry.get_password().ok()?;
    let tokens: StoredTokens = serde_json::from_str(&raw).ok()?;
    *CACHE.lock().unwrap() = Some(tokens.clone());
    Some(tokens)
}

fn save_tokens(t: &StoredTokens) -> Result<(), String> {
    let raw = serde_json::to_string(t).map_err(|e| e.to_string())?;
    keyring_entry()?.set_password(&raw).map_err(|e| e.to_string())?;
    *CACHE.lock().unwrap() = Some(t.clone());
    Ok(())
}

pub fn clear_tokens() -> Result<(), String> {
    *CACHE.lock().unwrap() = None;
    if let Ok(entry) = keyring_entry() {
        let _ = entry.delete_credential();
    }
    Ok(())
}

/// The current account, if signed in.
pub fn account() -> Option<Account> {
    load_tokens().map(|t| Account { email: t.email })
}

fn b64url(bytes: &[u8]) -> String {
    URL_SAFE_NO_PAD.encode(bytes)
}

fn random_b64(len: usize) -> String {
    let mut buf = vec![0u8; len];
    rand::thread_rng().fill(&mut buf[..]);
    b64url(&buf)
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
    #[serde(default)]
    refresh_token: Option<String>,
    expires_in: u64,
}

#[derive(Deserialize)]
struct UserInfo {
    email: String,
}

/// Run the full installed-app OAuth flow: spin up a loopback listener, open the
/// system browser to Google's consent screen, capture the code, exchange it for
/// tokens, fetch the account email, and persist everything. Blocking.
pub fn sign_in() -> Result<Account, String> {
    let cfg = config::get();
    if cfg.google_client_id.is_empty() || cfg.google_client_secret.is_empty() {
        return Err("Google client ID/secret not configured (check ~/.config/cadence-env/.env.local)".into());
    }

    // PKCE + CSRF state.
    let verifier = random_b64(48);
    let challenge = b64url(Sha256::digest(verifier.as_bytes()).as_slice());
    let state = random_b64(24);

    // Loopback listener on a fixed, registered port.
    let listener = TcpListener::bind(("127.0.0.1", REDIRECT_PORT))
        .map_err(|e| format!("couldn't bind 127.0.0.1:{REDIRECT_PORT} ({e}). Close whatever is using it and retry."))?;
    let redirect = format!("http://127.0.0.1:{REDIRECT_PORT}");

    let auth_url = format!(
        "{AUTH_ENDPOINT}?client_id={cid}&redirect_uri={redirect}&response_type=code&scope={scope}&code_challenge={challenge}&code_challenge_method=S256&access_type=offline&prompt=consent&state={state}",
        cid = urlencoding(&cfg.google_client_id),
        redirect = urlencoding(&redirect),
        scope = urlencoding(SCOPES),
    );

    open::that(&auth_url).map_err(|e| format!("couldn't open browser: {e}"))?;

    // Wait for the redirect (ignore unrelated requests like /favicon.ico).
    let (code, got_state) = wait_for_code(&listener)?;
    if got_state != state {
        return Err("state mismatch — possible CSRF, aborting".into());
    }

    // Exchange the code for tokens.
    let client = reqwest::blocking::Client::new();
    let resp = client
        .post(TOKEN_ENDPOINT)
        .form(&[
            ("client_id", cfg.google_client_id.as_str()),
            ("client_secret", cfg.google_client_secret.as_str()),
            ("code", code.as_str()),
            ("code_verifier", verifier.as_str()),
            ("grant_type", "authorization_code"),
            ("redirect_uri", redirect.as_str()),
        ])
        .send()
        .map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("token exchange failed: {}", resp.text().unwrap_or_default()));
    }
    let tok: TokenResponse = resp.json().map_err(|e| e.to_string())?;
    let refresh_token = tok.refresh_token.ok_or("no refresh token returned (revoke prior grant and retry with prompt=consent)")?;

    // Fetch the account email.
    let email = fetch_email(&client, &tok.access_token)?;

    let stored = StoredTokens {
        access_token: tok.access_token,
        refresh_token,
        expires_at: now_secs() + tok.expires_in.saturating_sub(60),
        email: email.clone(),
    };
    save_tokens(&stored)?;
    Ok(Account { email })
}

fn fetch_email(client: &reqwest::blocking::Client, access_token: &str) -> Result<String, String> {
    let info: UserInfo = client
        .get(USERINFO_ENDPOINT)
        .bearer_auth(access_token)
        .send()
        .map_err(|e| e.to_string())?
        .json()
        .map_err(|e| e.to_string())?;
    Ok(info.email)
}

fn wait_for_code(listener: &TcpListener) -> Result<(String, String), String> {
    for conn in listener.incoming() {
        let mut stream = match conn {
            Ok(s) => s,
            Err(_) => continue,
        };
        let mut reader = BufReader::new(&stream);
        let mut request_line = String::new();
        if reader.read_line(&mut request_line).is_err() {
            continue;
        }
        // "GET /?code=...&state=... HTTP/1.1"
        let path = request_line.split_whitespace().nth(1).unwrap_or("/");
        let parsed = url::Url::parse(&format!("http://127.0.0.1{path}")).map_err(|e| e.to_string())?;

        let mut code = None;
        let mut state = None;
        let mut err = None;
        for (k, v) in parsed.query_pairs() {
            match k.as_ref() {
                "code" => code = Some(v.to_string()),
                "state" => state = Some(v.to_string()),
                "error" => err = Some(v.to_string()),
                _ => {}
            }
        }

        if let Some(e) = err {
            respond(&mut stream, "Sign-in cancelled. You can close this window.");
            return Err(format!("authorization error: {e}"));
        }
        if let (Some(c), Some(s)) = (code, state) {
            respond(&mut stream, "Cadence is connected. You can close this window and return to the app.");
            return Ok((c, s));
        }
        // Unrelated request (e.g. favicon) — answer and keep waiting.
        respond(&mut stream, "Waiting for Google…");
    }
    Err("loopback listener closed before receiving a code".into())
}

fn respond(stream: &mut std::net::TcpStream, message: &str) {
    let body = format!(
        "<!doctype html><html><head><meta charset=utf-8><title>Cadence</title>\
         <style>body{{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;\
         font-family:-apple-system,system-ui,sans-serif;background:#0E0F13;color:#ECEDF0}}\
         .c{{text-align:center}}.s{{font-size:28px;color:#FF7A45;margin-bottom:12px}}</style></head>\
         <body><div class=c><div class=s>Cadence</div><div>{message}</div></div></body></html>"
    );
    let resp = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        body.len(),
        body
    );
    let _ = stream.write_all(resp.as_bytes());
    let _ = stream.flush();
}

/// Return a valid access token, refreshing it if expired. Used by API modules.
pub fn access_token() -> Result<String, String> {
    let mut tokens = load_tokens().ok_or("not signed in")?;
    if now_secs() < tokens.expires_at {
        return Ok(tokens.access_token);
    }
    // Refresh.
    let cfg = config::get();
    let client = reqwest::blocking::Client::new();
    let resp = client
        .post(TOKEN_ENDPOINT)
        .form(&[
            ("client_id", cfg.google_client_id.as_str()),
            ("client_secret", cfg.google_client_secret.as_str()),
            ("refresh_token", tokens.refresh_token.as_str()),
            ("grant_type", "refresh_token"),
        ])
        .send()
        .map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("token refresh failed: {}", resp.text().unwrap_or_default()));
    }
    let tok: TokenResponse = resp.json().map_err(|e| e.to_string())?;
    tokens.access_token = tok.access_token.clone();
    tokens.expires_at = now_secs() + tok.expires_in.saturating_sub(60);
    if let Some(rt) = tok.refresh_token {
        tokens.refresh_token = rt;
    }
    save_tokens(&tokens)?;
    Ok(tok.access_token)
}

/// Minimal percent-encoding for query values (RFC 3986 unreserved set kept).
fn urlencoding(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => out.push(b as char),
            _ => out.push_str(&format!("%{b:02X}")),
        }
    }
    out
}
