use serde::Serialize;
use serde_json::Value;

use crate::google;

const BASE: &str = "https://www.googleapis.com/calendar/v3";

/// A calendar event as the frontend consumes it. Times are raw RFC3339 strings;
/// the frontend converts them to local date + minutes.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventDto {
    pub id: String,
    pub title: String,
    pub start: String,   // RFC3339 dateTime, or YYYY-MM-DD for all-day
    pub end: String,
    pub all_day: bool,
    pub cadence_task_id: Option<String>, // set when this event is a Cadence time block
}

/// List events on the primary calendar within [time_min, time_max] (RFC3339).
pub fn list(time_min: &str, time_max: &str) -> Result<Vec<EventDto>, String> {
    let token = google::token()?;
    let url = format!(
        "{BASE}/calendars/primary/events?singleEvents=true&orderBy=startTime&maxResults=250&timeMin={}&timeMax={}",
        urlencode(time_min),
        urlencode(time_max)
    );
    let resp: Value = google::client()
        .get(url)
        .bearer_auth(&token)
        .send()
        .map_err(|e| e.to_string())?
        .json()
        .map_err(|e| e.to_string())?;

    let empty = vec![];
    let mut out = Vec::new();
    for ev in resp["items"].as_array().unwrap_or(&empty) {
        // Skip cancelled / transparent placeholders without a start.
        let start_obj = &ev["start"];
        let end_obj = &ev["end"];
        let (start, all_day) = match start_obj["dateTime"].as_str() {
            Some(dt) => (dt.to_string(), false),
            None => match start_obj["date"].as_str() {
                Some(d) => (d.to_string(), true),
                None => continue,
            },
        };
        let end = end_obj["dateTime"].as_str().or_else(|| end_obj["date"].as_str()).unwrap_or(&start).to_string();
        let cadence_task_id = ev["extendedProperties"]["private"]["cadenceTaskId"].as_str().map(|s| s.to_string());

        out.push(EventDto {
            id: ev["id"].as_str().unwrap_or_default().to_string(),
            title: ev["summary"].as_str().unwrap_or("(no title)").to_string(),
            start,
            end,
            all_day,
            cadence_task_id,
        });
    }
    Ok(out)
}

fn urlencode(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => out.push(b as char),
            _ => out.push_str(&format!("%{b:02X}")),
        }
    }
    out
}
