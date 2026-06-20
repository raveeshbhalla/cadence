use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::google;

const BASE: &str = "https://gmail.googleapis.com/gmail/v1/users/me";

/// An unreplied Primary message surfaced as a lightweight task.
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EmailDto {
    pub id: String,
    pub thread_id: String,
    pub sender: String,
    pub subject: String,
}

/// Archive a thread (remove it from the inbox).
pub fn archive(thread_id: &str) -> Result<(), String> {
    let token = google::token()?;
    let resp = google::client()
        .post(format!("{BASE}/threads/{thread_id}/modify"))
        .bearer_auth(&token)
        .json(&json!({ "removeLabelIds": ["INBOX"] }))
        .send()
        .map_err(|e| e.to_string())?;
    if resp.status().is_success() {
        Ok(())
    } else {
        Err(resp.text().unwrap_or_default())
    }
}

/// Recent Primary-inbox messages from other people (approximating "needs reply").
pub fn unreplied() -> Result<Vec<EmailDto>, String> {
    let token = google::token()?;
    let client = google::client();

    let q = "in:inbox category:primary -from:me newer_than:30d";
    let list = google::get_json(
        &token,
        &format!("{BASE}/messages?maxResults=15&q={}", urlencode(q)),
    )?;

    let empty = vec![];
    let mut out = Vec::new();
    for m in list["messages"].as_array().unwrap_or(&empty) {
        let id = m["id"].as_str().unwrap_or_default().to_string();
        let thread_id = m["threadId"].as_str().unwrap_or_default().to_string();
        if id.is_empty() {
            continue;
        }
        let msg: Value = client
            .get(format!(
                "{BASE}/messages/{id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject"
            ))
            .bearer_auth(&token)
            .send()
            .map_err(|e| e.to_string())?
            .json()
            .map_err(|e| e.to_string())?;

        let mut sender = String::new();
        let mut subject = String::from("(no subject)");
        for h in msg["payload"]["headers"].as_array().unwrap_or(&empty) {
            match h["name"].as_str().unwrap_or_default() {
                "From" => sender = display_name(h["value"].as_str().unwrap_or_default()),
                "Subject" => {
                    let s = h["value"].as_str().unwrap_or_default().trim();
                    if !s.is_empty() {
                        subject = s.to_string();
                    }
                }
                _ => {}
            }
        }
        out.push(EmailDto {
            id,
            thread_id,
            sender,
            subject,
        });
    }
    Ok(out)
}

/// "Sam Rivera <sam@x.com>" -> "Sam Rivera"; bare address -> the address.
fn display_name(from: &str) -> String {
    if let Some(i) = from.find('<') {
        let name = from[..i].trim().trim_matches('"').trim();
        if !name.is_empty() {
            return name.to_string();
        }
        return from[i + 1..].trim_end_matches('>').to_string();
    }
    from.trim().to_string()
}

fn urlencode(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(b as char)
            }
            _ => out.push_str(&format!("%{b:02X}")),
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::display_name;

    #[test]
    fn parses_from_header() {
        assert_eq!(display_name("Sam Rivera <sam@x.com>"), "Sam Rivera");
        assert_eq!(display_name("\"Dana Lee\" <dana@x.com>"), "Dana Lee");
        assert_eq!(display_name("bob@x.com"), "bob@x.com");
        assert_eq!(display_name("<solo@x.com>"), "solo@x.com");
    }
}
