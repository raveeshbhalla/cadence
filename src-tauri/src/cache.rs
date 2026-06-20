use std::fs;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{params, Connection};
use serde::de::DeserializeOwned;
use serde::Serialize;

use crate::calendar::{CalendarDto, EventDto};
use crate::gmail::EmailDto;
use crate::tasks::TaskDto;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncSnapshotDto {
    pub tasks: Vec<TaskDto>,
    pub calendars: Vec<CalendarDto>,
    pub events: Vec<EventDto>,
    pub emails: Vec<EmailDto>,
    pub synced_at: Option<i64>,
}

pub struct FreshSync {
    pub tasks: Option<Vec<TaskDto>>,
    pub calendars: Option<Vec<CalendarDto>>,
    pub events: Option<Vec<EventDto>>,
    pub emails: Option<Vec<EmailDto>>,
}

pub fn read_snapshot(path: &Path, account: &str) -> Result<SyncSnapshotDto, String> {
    let conn = open(path)?;
    Ok(SyncSnapshotDto {
        tasks: read_json_rows(&conn, "tasks", account)?,
        calendars: read_json_rows(&conn, "calendars", account)?,
        events: read_json_rows(&conn, "events", account)?,
        emails: read_json_rows(&conn, "emails", account)?,
        synced_at: read_meta_i64(&conn, account, "synced_at")?,
    })
}

pub fn write_fresh(
    path: &Path,
    account: &str,
    fresh: FreshSync,
) -> Result<SyncSnapshotDto, String> {
    let mut conn = open(path)?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    if let Some(tasks) = fresh.tasks {
        replace_json_rows(&tx, "tasks", account, tasks, |t| t.id.clone())?;
    }
    if let Some(calendars) = fresh.calendars {
        replace_json_rows(&tx, "calendars", account, calendars, |c| c.id.clone())?;
    }
    if let Some(events) = fresh.events {
        replace_json_rows(&tx, "events", account, events, |e| {
            format!("{}:{}", e.calendar_id, e.id)
        })?;
    }
    if let Some(emails) = fresh.emails {
        replace_json_rows(&tx, "emails", account, emails, |e| e.id.clone())?;
    }
    write_meta_i64(&tx, account, "synced_at", now_millis())?;
    tx.commit().map_err(|e| e.to_string())?;
    read_snapshot(path, account)
}

fn open(path: &Path) -> Result<Connection, String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    conn.pragma_update(None, "journal_mode", "WAL")
        .map_err(|e| e.to_string())?;
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS meta (
          account TEXT NOT NULL,
          key TEXT NOT NULL,
          value TEXT NOT NULL,
          PRIMARY KEY (account, key)
        );
        CREATE TABLE IF NOT EXISTS tasks (
          account TEXT NOT NULL,
          id TEXT NOT NULL,
          json TEXT NOT NULL,
          PRIMARY KEY (account, id)
        );
        CREATE TABLE IF NOT EXISTS calendars (
          account TEXT NOT NULL,
          id TEXT NOT NULL,
          json TEXT NOT NULL,
          PRIMARY KEY (account, id)
        );
        CREATE TABLE IF NOT EXISTS events (
          account TEXT NOT NULL,
          id TEXT NOT NULL,
          json TEXT NOT NULL,
          PRIMARY KEY (account, id)
        );
        CREATE TABLE IF NOT EXISTS emails (
          account TEXT NOT NULL,
          id TEXT NOT NULL,
          json TEXT NOT NULL,
          PRIMARY KEY (account, id)
        );
        ",
    )
    .map_err(|e| e.to_string())?;
    Ok(conn)
}

fn read_json_rows<T: DeserializeOwned>(
    conn: &Connection,
    table: &str,
    account: &str,
) -> Result<Vec<T>, String> {
    let sql = format!("SELECT json FROM {table} WHERE account = ?1 ORDER BY id");
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![account], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?;

    let mut out = Vec::new();
    for row in rows {
        let json = row.map_err(|e| e.to_string())?;
        out.push(serde_json::from_str(&json).map_err(|e| e.to_string())?);
    }
    Ok(out)
}

fn replace_json_rows<T, F>(
    conn: &Connection,
    table: &str,
    account: &str,
    rows: Vec<T>,
    id: F,
) -> Result<(), String>
where
    T: Serialize,
    F: Fn(&T) -> String,
{
    conn.execute(
        &format!("DELETE FROM {table} WHERE account = ?1"),
        params![account],
    )
    .map_err(|e| e.to_string())?;
    let sql = format!("INSERT OR REPLACE INTO {table} (account, id, json) VALUES (?1, ?2, ?3)");
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    for item in rows {
        let key = id(&item);
        if key.is_empty() {
            continue;
        }
        let json = serde_json::to_string(&item).map_err(|e| e.to_string())?;
        stmt.execute(params![account, key, json])
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn read_meta_i64(conn: &Connection, account: &str, key: &str) -> Result<Option<i64>, String> {
    let mut stmt = conn
        .prepare("SELECT value FROM meta WHERE account = ?1 AND key = ?2")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt
        .query(params![account, key])
        .map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let raw: String = row.get(0).map_err(|e| e.to_string())?;
        Ok(raw.parse().ok())
    } else {
        Ok(None)
    }
}

fn write_meta_i64(conn: &Connection, account: &str, key: &str, value: i64) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO meta (account, key, value) VALUES (?1, ?2, ?3)",
        params![account, key, value.to_string()],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn now_millis() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}
