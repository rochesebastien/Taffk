use std::collections::HashMap;

use serde::{Deserialize, Deserializer, Serialize};

/// Deserialize a nullable, optional column so we can tell apart the three cases:
/// key absent (`None` — leave column), key present `null` (`Some(None)` — clear),
/// key present value (`Some(Some(v))` — set). Plain `Option<Option<T>>` collapses
/// `null` to `None`, which would make clearing a column impossible over IPC.
fn double_option<'de, T, D>(de: D) -> Result<Option<Option<T>>, D::Error>
where
    T: Deserialize<'de>,
    D: Deserializer<'de>,
{
    Deserialize::deserialize(de).map(Some)
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskDto {
    pub id: String,
    pub title: String,
    pub notes: String,
    pub project_id: Option<String>,
    pub parent_id: Option<String>,
    pub done: bool,
    pub status: String,
    pub scheduled_for: Option<String>,
    pub scheduled_time: Option<String>,
    pub due_date: Option<String>,
    pub estimate_minutes: i64,
    pub spent_minutes: i64,
    pub sort_order: i64,
    pub created_at: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
    #[serde(default)]
    pub archived: bool,
    #[serde(default)]
    pub custom_props: HashMap<String, String>,
    pub tag_ids: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectDto {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub alias: Option<String>,
    pub pinned: bool,
    pub sort_order: i64,
    pub archived: bool,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagDto {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimeEntryDto {
    pub id: String,
    pub task_id: Option<String>,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub duration_seconds: i64,
    pub kind: String,
}

/// A full snapshot of the database, used for JSON export / import.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Backup {
    pub version: u32,
    pub exported_at: String,
    pub projects: Vec<ProjectDto>,
    pub tags: Vec<TagDto>,
    pub tasks: Vec<TaskDto>,
    pub time_entries: Vec<TimeEntryDto>,
}

/// Which entity categories an export/import should cover. Lets the user back up
/// or restore a subset (e.g. tags only) from the data settings dialog.
#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupSelection {
    pub projects: bool,
    pub tags: bool,
    pub tasks: bool,
    pub time_entries: bool,
}

/// Lightweight stats shown in the Data settings panel.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DataStats {
    pub path: String,
    pub file_bytes: i64,
    pub projects: i64,
    pub tags: i64,
    pub tasks: i64,
    pub time_entries: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewTask {
    pub title: String,
    #[serde(default)]
    pub notes: Option<String>,
    #[serde(default)]
    pub project_id: Option<String>,
    #[serde(default)]
    pub parent_id: Option<String>,
    #[serde(default)]
    pub scheduled_for: Option<String>,
    #[serde(default)]
    pub scheduled_time: Option<String>,
    #[serde(default)]
    pub estimate_minutes: Option<i64>,
    #[serde(default)]
    pub tag_ids: Option<Vec<String>>,
}

/// Distinguishes "field absent in patch" from "field present" (incl. explicit null).
/// `None` => key not sent, leave column untouched.
/// `Some(inner)` => key sent; for nullable columns `inner` itself is `Option`,
/// so an explicit JSON `null` clears the column.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskPatch {
    pub id: String,
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub notes: Option<String>,
    #[serde(default, deserialize_with = "double_option")]
    pub project_id: Option<Option<String>>,
    #[serde(default, deserialize_with = "double_option")]
    pub parent_id: Option<Option<String>>,
    #[serde(default)]
    pub done: Option<bool>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default, deserialize_with = "double_option")]
    pub scheduled_for: Option<Option<String>>,
    #[serde(default, deserialize_with = "double_option")]
    pub scheduled_time: Option<Option<String>>,
    #[serde(default, deserialize_with = "double_option")]
    pub due_date: Option<Option<String>>,
    #[serde(default)]
    pub estimate_minutes: Option<i64>,
    #[serde(default)]
    pub spent_minutes: Option<i64>,
    #[serde(default)]
    pub sort_order: Option<i64>,
    #[serde(default)]
    pub custom_props: Option<HashMap<String, String>>,
}
