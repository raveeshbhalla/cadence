use serde::Serialize;
use serde_json::{json, Value};

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
    pub calendar_id: String,
    pub color: String,
    pub location: Option<String>,
    pub description: Option<String>,
    pub hangout_link: Option<String>,
    pub declined: bool,        // the user declined this invite
    pub time_zone: Option<String>, // explicit IANA zone on the event start, if any
}

/// A calendar in the user's calendar list.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CalendarDto {
    pub id: String,
    pub summary: String,
    pub color: String,
    pub primary: bool,
}

/// The user's calendar list (for the sidebar).
pub fn list_calendars() -> Result<Vec<CalendarDto>, String> {
    let token = google::token()?;
    let v = google::get_json(&token, &format!("{BASE}/users/me/calendarList"))?;
    let empty = vec![];
    let mut out = Vec::new();
    for c in v["items"].as_array().unwrap_or(&empty) {
        let id = c["id"].as_str().unwrap_or_default().to_string();
        if id.is_empty() {
            continue;
        }
        out.push(CalendarDto {
            id,
            summary: c["summaryOverride"].as_str().or_else(|| c["summary"].as_str()).unwrap_or("Calendar").to_string(),
            color: c["backgroundColor"].as_str().unwrap_or("#5B9BFF").to_string(),
            primary: c["primary"].as_bool().unwrap_or(false),
        });
    }
    Ok(out)
}

/// List events across all of the user's calendars within [time_min, time_max].
pub fn list(time_min: &str, time_max: &str) -> Result<Vec<EventDto>, String> {
    let token = google::token()?;
    let cals = google::get_json(&token, &format!("{BASE}/users/me/calendarList"))?;
    let empty = vec![];
    let mut out = Vec::new();

    for c in cals["items"].as_array().unwrap_or(&empty) {
        let cal_id = c["id"].as_str().unwrap_or_default();
        if cal_id.is_empty() {
            continue;
        }
        let color = c["backgroundColor"].as_str().unwrap_or("#5B9BFF").to_string();
        let url = format!(
            "{BASE}/calendars/{}/events?singleEvents=true&orderBy=startTime&maxResults=250&timeMin={}&timeMax={}",
            urlencode(cal_id),
            urlencode(time_min),
            urlencode(time_max)
        );
        // Skip calendars we can't read rather than failing the whole load.
        let resp = match google::get_json(&token, &url) {
            Ok(v) => v,
            Err(_) => continue,
        };

        for ev in resp["items"].as_array().unwrap_or(&empty) {
            if let Some(dto) = build_event(ev, cal_id, &color) {
                out.push(dto);
            }
        }
    }
    Ok(out)
}

/// Search events across all calendars (q matches title/description/attendees).
pub fn search(q: &str, time_min: &str, time_max: &str) -> Result<Vec<EventDto>, String> {
    let token = google::token()?;
    let cals = google::get_json(&token, &format!("{BASE}/users/me/calendarList"))?;
    let empty = vec![];
    let mut out = Vec::new();
    for c in cals["items"].as_array().unwrap_or(&empty) {
        let cal_id = c["id"].as_str().unwrap_or_default();
        if cal_id.is_empty() {
            continue;
        }
        let color = c["backgroundColor"].as_str().unwrap_or("#5B9BFF").to_string();
        let url = format!(
            "{BASE}/calendars/{}/events?singleEvents=true&orderBy=startTime&maxResults=20&q={}&timeMin={}&timeMax={}",
            urlencode(cal_id),
            urlencode(q),
            urlencode(time_min),
            urlencode(time_max)
        );
        let resp = match google::get_json(&token, &url) {
            Ok(v) => v,
            Err(_) => continue,
        };
        for ev in resp["items"].as_array().unwrap_or(&empty) {
            if let Some(dto) = build_event(ev, cal_id, &color) {
                out.push(dto);
            }
        }
    }
    Ok(out)
}

fn build_event(ev: &Value, cal_id: &str, color: &str) -> Option<EventDto> {
    let start_obj = &ev["start"];
    let end_obj = &ev["end"];
    let (start, all_day) = match start_obj["dateTime"].as_str() {
        Some(dt) => (dt.to_string(), false),
        None => (start_obj["date"].as_str()?.to_string(), true),
    };
    let end = end_obj["dateTime"].as_str().or_else(|| end_obj["date"].as_str()).unwrap_or(&start).to_string();
    let declined = ev["attendees"]
        .as_array()
        .map(|atts| atts.iter().any(|a| a["self"].as_bool() == Some(true) && a["responseStatus"].as_str() == Some("declined")))
        .unwrap_or(false);

    Some(EventDto {
        id: ev["id"].as_str().unwrap_or_default().to_string(),
        title: ev["summary"].as_str().unwrap_or("(no title)").to_string(),
        start,
        end,
        all_day,
        cadence_task_id: ev["extendedProperties"]["private"]["cadenceTaskId"].as_str().map(|s| s.to_string()),
        calendar_id: cal_id.to_string(),
        color: color.to_string(),
        location: ev["location"].as_str().map(|s| s.to_string()),
        description: ev["description"].as_str().map(|s| s.to_string()),
        hangout_link: ev["hangoutLink"].as_str().or_else(|| ev["conferenceData"]["entryPoints"][0]["uri"].as_str()).map(|s| s.to_string()),
        declined,
        time_zone: ev["start"]["timeZone"].as_str().map(|s| s.to_string()),
    })
}

/// Create a plain calendar event (a meeting, not a task block). Returns the id.
pub fn create_meeting(title: &str, start: &str, end: &str) -> Result<String, String> {
    let token = google::token()?;
    let body = json!({ "summary": title, "start": { "dateTime": start }, "end": { "dateTime": end } });
    let v: Value = google::client()
        .post(format!("{BASE}/calendars/primary/events"))
        .bearer_auth(&token)
        .json(&body)
        .send()
        .map_err(|e| e.to_string())?
        .json()
        .map_err(|e| e.to_string())?;
    Ok(v["id"].as_str().unwrap_or_default().to_string())
}

/// Create a time-block event linked to a Cadence task. Returns the event id.
pub fn create(title: &str, start: &str, end: &str, task_id: &str) -> Result<String, String> {
    let token = google::token()?;
    let body = json!({
        "summary": title,
        "start": { "dateTime": start },
        "end": { "dateTime": end },
        "extendedProperties": { "private": { "cadenceTaskId": task_id } }
    });
    let v: Value = google::client()
        .post(format!("{BASE}/calendars/primary/events"))
        .bearer_auth(&token)
        .json(&body)
        .send()
        .map_err(|e| e.to_string())?
        .json()
        .map_err(|e| e.to_string())?;
    Ok(v["id"].as_str().unwrap_or_default().to_string())
}

/// Move/resize an existing block event.
pub fn update(event_id: &str, start: &str, end: &str) -> Result<(), String> {
    let token = google::token()?;
    let body = json!({ "start": { "dateTime": start }, "end": { "dateTime": end } });
    let resp = google::client()
        .patch(format!("{BASE}/calendars/primary/events/{event_id}"))
        .bearer_auth(&token)
        .json(&body)
        .send()
        .map_err(|e| e.to_string())?;
    if resp.status().is_success() {
        Ok(())
    } else {
        Err(resp.text().unwrap_or_default())
    }
}

/// Rename a block event's summary.
pub fn set_summary(event_id: &str, title: &str) -> Result<(), String> {
    let token = google::token()?;
    let resp = google::client()
        .patch(format!("{BASE}/calendars/primary/events/{event_id}"))
        .bearer_auth(&token)
        .json(&json!({ "summary": title }))
        .send()
        .map_err(|e| e.to_string())?;
    if resp.status().is_success() {
        Ok(())
    } else {
        Err(resp.text().unwrap_or_default())
    }
}

/// Delete a block event (e.g. when unscheduling).
pub fn delete(event_id: &str) -> Result<(), String> {
    let token = google::token()?;
    let resp = google::client()
        .delete(format!("{BASE}/calendars/primary/events/{event_id}"))
        .bearer_auth(&token)
        .send()
        .map_err(|e| e.to_string())?;
    // 200/204 on success; 410 (already gone) is fine too.
    if resp.status().is_success() || resp.status().as_u16() == 410 {
        Ok(())
    } else {
        Err(resp.text().unwrap_or_default())
    }
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
