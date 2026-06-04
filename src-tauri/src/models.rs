use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
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
    pub due_date: Option<String>,
    pub estimate_minutes: i64,
    pub spent_minutes: i64,
    pub sort_order: i64,
    pub created_at: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
    pub tag_ids: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectDto {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub sort_order: i64,
    pub archived: bool,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TagDto {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub created_at: String,
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
    #[serde(default)]
    pub project_id: Option<Option<String>>,
    #[serde(default)]
    pub done: Option<bool>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub scheduled_for: Option<Option<String>>,
    #[serde(default)]
    pub due_date: Option<Option<String>>,
    #[serde(default)]
    pub estimate_minutes: Option<i64>,
    #[serde(default)]
    pub spent_minutes: Option<i64>,
    #[serde(default)]
    pub sort_order: Option<i64>,
}
