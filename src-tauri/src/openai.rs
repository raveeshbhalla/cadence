use std::time::Duration;

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::config;

const ENDPOINT: &str = "https://api.openai.com/v1/chat/completions";
const MODEL: &str = "gpt-4o-mini";

/// Structured result of parsing a natural-language capture line.
#[derive(Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AiParse {
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub date: Option<String>, // YYYY-MM-DD
    #[serde(default)]
    pub time: Option<i64>, // minutes from midnight (24h)
    #[serde(default)]
    pub duration_min: Option<i64>,
    #[serde(default)]
    pub list: Option<String>,
}

pub fn parse(text: &str, today: &str) -> Result<AiParse, String> {
    let key = config::get().openai_api_key.clone();
    if key.is_empty() {
        return Err("OPENAI_API_KEY not set".into());
    }

    let system = format!(
        "You parse one natural-language task entry into JSON. Today is {today} (the user's local date). \
         Return ONLY a JSON object with these keys: \
         title (string: the task name with any date/time/duration/list words removed), \
         date (string 'YYYY-MM-DD' or null — resolve relative words like 'today', 'tomorrow', 'thursday', 'next tuesday' against today; never pick a past date), \
         time (integer minutes from midnight in 24h, or null), \
         durationMin (integer minutes, or null), \
         list (string tag without '#', or null). \
         Use null for anything not present."
    );

    let body = json!({
        "model": MODEL,
        "temperature": 0,
        "response_format": { "type": "json_object" },
        "messages": [
            { "role": "system", "content": system },
            { "role": "user", "content": text }
        ]
    });

    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(8))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client.post(ENDPOINT).bearer_auth(&key).json(&body).send().map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("openai error: {}", resp.text().unwrap_or_default()));
    }
    let v: Value = resp.json().map_err(|e| e.to_string())?;
    let content = v["choices"][0]["message"]["content"].as_str().ok_or("no content from model")?;
    serde_json::from_str::<AiParse>(content).map_err(|e| format!("bad model json: {e}"))
}
