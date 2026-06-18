use serde::Serialize;
use serde_json::{json, Value};

use crate::google;

const BASE: &str = "https://tasks.googleapis.com/tasks/v1";

/// A task as the frontend consumes it (camelCase JSON).
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskDto {
    pub id: String,
    pub list_id: String,
    pub list_title: String,
    pub title: String,
    pub status: String,                // "needsAction" | "completed"
    pub due: Option<String>,           // YYYY-MM-DD
    pub completed: Option<String>,     // RFC3339
    pub notes: Option<String>,
    pub from_email: bool,              // created from / linked to a Gmail message
    pub email_thread_id: Option<String>, // best-effort Gmail thread id
}

/// Detect whether a task came from an email and recover its thread id.
fn email_link(t: &Value) -> (bool, Option<String>) {
    let mut from_email = false;
    let mut thread_id = None;
    if let Some(links) = t["links"].as_array() {
        for l in links {
            if l["type"].as_str() == Some("email") {
                from_email = true;
                if let Some(link) = l["link"].as_str() {
                    let seg = link.rsplit('/').next().unwrap_or("");
                    let seg = seg.split(['?', '#']).next().unwrap_or(seg);
                    if !seg.is_empty() {
                        thread_id = Some(seg.to_string());
                    }
                }
            }
        }
    }
    // Cadence stores the real thread id in notes when it creates the task itself.
    if let Some(notes) = t["notes"].as_str() {
        if let Some(p) = notes.find("[cadence-email:") {
            let rest = &notes[p + "[cadence-email:".len()..];
            if let Some(end) = rest.find(']') {
                from_email = true;
                thread_id = Some(rest[..end].to_string());
            }
        }
    }
    (from_email, thread_id)
}

/// Read every task across all of the user's task lists.
pub fn list() -> Result<Vec<TaskDto>, String> {
    let token = google::token()?;
    let lists = google::get_json(&token, &format!("{BASE}/users/@me/lists"))?;

    let mut out = Vec::new();
    let empty = vec![];
    for l in lists["items"].as_array().unwrap_or(&empty) {
        let list_id = l["id"].as_str().unwrap_or_default().to_string();
        let list_title = l["title"].as_str().unwrap_or_default().to_string();
        if list_id.is_empty() {
            continue;
        }

        let tasks = google::get_json(
            &token,
            &format!("{BASE}/lists/{list_id}/tasks?showCompleted=true&showHidden=true&maxResults=100"),
        )?;

        for t in tasks["items"].as_array().unwrap_or(&empty) {
            let id = t["id"].as_str().unwrap_or_default().to_string();
            let title = t["title"].as_str().unwrap_or_default().trim().to_string();
            if id.is_empty() || title.is_empty() {
                continue; // skip section headers / blanks
            }
            let (from_email, email_thread_id) = email_link(t);
            out.push(TaskDto {
                id,
                list_id: list_id.clone(),
                list_title: list_title.clone(),
                title,
                status: t["status"].as_str().unwrap_or("needsAction").to_string(),
                due: t["due"].as_str().and_then(google::date_part),
                completed: t["completed"].as_str().map(|s| s.to_string()),
                notes: t["notes"].as_str().map(|s| s.to_string()),
                from_email,
                email_thread_id,
            });
        }
    }
    Ok(out)
}

/// Mark a task complete / incomplete.
pub fn set_status(list_id: &str, id: &str, completed: bool) -> Result<(), String> {
    let token = google::token()?;
    let body = if completed {
        json!({ "status": "completed" })
    } else {
        json!({ "status": "needsAction", "completed": Value::Null })
    };
    let resp = google::client()
        .patch(format!("{BASE}/lists/{list_id}/tasks/{id}"))
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

/// Rename a task.
pub fn set_title(list_id: &str, id: &str, title: &str) -> Result<(), String> {
    let token = google::token()?;
    let resp = google::client()
        .patch(format!("{BASE}/lists/{list_id}/tasks/{id}"))
        .bearer_auth(&token)
        .json(&json!({ "title": title }))
        .send()
        .map_err(|e| e.to_string())?;
    if resp.status().is_success() {
        Ok(())
    } else {
        Err(resp.text().unwrap_or_default())
    }
}

/// Set a task's due date (YYYY-MM-DD), or clear it with None.
pub fn set_due(list_id: &str, id: &str, due: Option<String>) -> Result<(), String> {
    let token = google::token()?;
    let body = match due {
        Some(d) => json!({ "due": format!("{d}T00:00:00.000Z") }),
        None => json!({ "due": Value::Null }),
    };
    let resp = google::client()
        .patch(format!("{BASE}/lists/{list_id}/tasks/{id}"))
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

/// Delete a task.
pub fn delete(list_id: &str, id: &str) -> Result<(), String> {
    let token = google::token()?;
    let resp = google::client()
        .delete(format!("{BASE}/lists/{list_id}/tasks/{id}"))
        .bearer_auth(&token)
        .send()
        .map_err(|e| e.to_string())?;
    if resp.status().is_success() || resp.status().as_u16() == 410 {
        Ok(())
    } else {
        Err(resp.text().unwrap_or_default())
    }
}

/// Create a task in a list (use "@default" for the default list). `notes` may
/// carry a `[cadence-email:<threadId>]` marker for email-derived tasks.
pub fn create(list_id: &str, title: &str, due: Option<String>, notes: Option<String>) -> Result<TaskDto, String> {
    let token = google::token()?;
    let mut body = json!({ "title": title });
    if let Some(d) = &due {
        body["due"] = json!(format!("{d}T00:00:00.000Z"));
    }
    if let Some(n) = &notes {
        body["notes"] = json!(n);
    }
    let t: Value = google::client()
        .post(format!("{BASE}/lists/{list_id}/tasks"))
        .bearer_auth(&token)
        .json(&body)
        .send()
        .map_err(|e| e.to_string())?
        .json()
        .map_err(|e| e.to_string())?;

    let (from_email, email_thread_id) = email_link(&t);
    Ok(TaskDto {
        id: t["id"].as_str().unwrap_or_default().to_string(),
        list_id: list_id.to_string(),
        list_title: String::new(),
        title: t["title"].as_str().unwrap_or(title).to_string(),
        status: t["status"].as_str().unwrap_or("needsAction").to_string(),
        due: t["due"].as_str().and_then(google::date_part).or(due),
        completed: None,
        notes,
        from_email,
        email_thread_id,
    })
}
