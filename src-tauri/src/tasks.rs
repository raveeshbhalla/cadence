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
}

/// Read every task across all of the user's task lists.
pub fn list() -> Result<Vec<TaskDto>, String> {
    let token = google::token()?;
    let client = google::client();

    let lists: Value = client
        .get(format!("{BASE}/users/@me/lists"))
        .bearer_auth(&token)
        .send()
        .map_err(|e| e.to_string())?
        .json()
        .map_err(|e| e.to_string())?;

    let mut out = Vec::new();
    let empty = vec![];
    for l in lists["items"].as_array().unwrap_or(&empty) {
        let list_id = l["id"].as_str().unwrap_or_default().to_string();
        let list_title = l["title"].as_str().unwrap_or_default().to_string();
        if list_id.is_empty() {
            continue;
        }

        let tasks: Value = client
            .get(format!("{BASE}/lists/{list_id}/tasks?showCompleted=true&showHidden=true&maxResults=100"))
            .bearer_auth(&token)
            .send()
            .map_err(|e| e.to_string())?
            .json()
            .map_err(|e| e.to_string())?;

        for t in tasks["items"].as_array().unwrap_or(&empty) {
            let id = t["id"].as_str().unwrap_or_default().to_string();
            let title = t["title"].as_str().unwrap_or_default().trim().to_string();
            if id.is_empty() || title.is_empty() {
                continue; // skip section headers / blanks
            }
            out.push(TaskDto {
                id,
                list_id: list_id.clone(),
                list_title: list_title.clone(),
                title,
                status: t["status"].as_str().unwrap_or("needsAction").to_string(),
                due: t["due"].as_str().and_then(google::date_part),
                completed: t["completed"].as_str().map(|s| s.to_string()),
                notes: t["notes"].as_str().map(|s| s.to_string()),
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

/// Create a task in a list (use "@default" for the default list).
pub fn create(list_id: &str, title: &str, due: Option<String>) -> Result<TaskDto, String> {
    let token = google::token()?;
    let mut body = json!({ "title": title });
    if let Some(d) = &due {
        body["due"] = json!(format!("{d}T00:00:00.000Z"));
    }
    let t: Value = google::client()
        .post(format!("{BASE}/lists/{list_id}/tasks"))
        .bearer_auth(&token)
        .json(&body)
        .send()
        .map_err(|e| e.to_string())?
        .json()
        .map_err(|e| e.to_string())?;

    Ok(TaskDto {
        id: t["id"].as_str().unwrap_or_default().to_string(),
        list_id: list_id.to_string(),
        list_title: String::new(),
        title: t["title"].as_str().unwrap_or(title).to_string(),
        status: t["status"].as_str().unwrap_or("needsAction").to_string(),
        due: t["due"].as_str().and_then(google::date_part).or(due),
        completed: None,
        notes: None,
    })
}
