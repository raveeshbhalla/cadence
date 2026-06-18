use crate::auth;

/// Shared blocking HTTP client + bearer token for Google REST calls.
pub fn client() -> reqwest::blocking::Client {
    reqwest::blocking::Client::new()
}

pub fn token() -> Result<String, String> {
    auth::access_token()
}

/// Pull just the date (YYYY-MM-DD) out of an RFC3339 timestamp.
pub fn date_part(rfc3339: &str) -> Option<String> {
    if rfc3339.len() >= 10 {
        Some(rfc3339[..10].to_string())
    } else {
        None
    }
}
