use tauri::State;

use crate::db::Db;
use crate::models::{NewTask, ProjectDto, TagDto, TaskDto, TaskPatch};

fn map_err(e: rusqlite::Error) -> String {
    e.to_string()
}

#[tauri::command]
pub fn list_tasks(db: State<'_, Db>) -> Result<Vec<TaskDto>, String> {
    db.list_tasks().map_err(map_err)
}

#[tauri::command]
pub fn create_task(input: NewTask, db: State<'_, Db>) -> Result<TaskDto, String> {
    db.create_task(input).map_err(map_err)
}

#[tauri::command]
pub fn update_task(patch: TaskPatch, db: State<'_, Db>) -> Result<TaskDto, String> {
    db.update_task(patch).map_err(map_err)
}

#[tauri::command]
pub fn delete_task(id: String, db: State<'_, Db>) -> Result<(), String> {
    db.delete_task(&id).map_err(map_err)
}

#[tauri::command]
pub fn set_task_tags(
    task_id: String,
    tag_ids: Vec<String>,
    db: State<'_, Db>,
) -> Result<TaskDto, String> {
    db.set_task_tags(&task_id, &tag_ids).map_err(map_err)
}

#[tauri::command]
pub fn reorder_tasks(ids: Vec<String>, db: State<'_, Db>) -> Result<(), String> {
    db.reorder_tasks(&ids).map_err(map_err)
}

#[tauri::command]
pub fn list_projects(db: State<'_, Db>) -> Result<Vec<ProjectDto>, String> {
    db.list_projects().map_err(map_err)
}

#[tauri::command]
pub fn create_project(
    name: String,
    color: Option<String>,
    alias: Option<String>,
    db: State<'_, Db>,
) -> Result<ProjectDto, String> {
    db.create_project(&name, color.as_deref(), alias.as_deref())
        .map_err(map_err)
}

#[tauri::command]
pub fn update_project(
    id: String,
    name: String,
    color: Option<String>,
    alias: Option<String>,
    db: State<'_, Db>,
) -> Result<ProjectDto, String> {
    db.update_project(&id, &name, color.as_deref(), alias.as_deref())
        .map_err(map_err)
}

#[tauri::command]
pub fn set_project_pinned(
    id: String,
    pinned: bool,
    db: State<'_, Db>,
) -> Result<ProjectDto, String> {
    db.set_project_pinned(&id, pinned).map_err(map_err)
}

#[tauri::command]
pub fn delete_project(id: String, db: State<'_, Db>) -> Result<(), String> {
    db.delete_project(&id).map_err(map_err)
}

#[tauri::command]
pub fn list_tags(db: State<'_, Db>) -> Result<Vec<TagDto>, String> {
    db.list_tags().map_err(map_err)
}

#[tauri::command]
pub fn create_tag(
    name: String,
    color: Option<String>,
    db: State<'_, Db>,
) -> Result<TagDto, String> {
    db.create_tag(&name, color.as_deref()).map_err(map_err)
}

#[tauri::command]
pub fn delete_tag(id: String, db: State<'_, Db>) -> Result<(), String> {
    db.delete_tag(&id).map_err(map_err)
}

#[tauri::command]
pub fn log_time(
    task_id: Option<String>,
    seconds: i64,
    kind: String,
    db: State<'_, Db>,
) -> Result<Option<TaskDto>, String> {
    db.log_time(task_id.as_deref(), seconds, &kind)
        .map_err(map_err)
}

#[tauri::command]
pub fn time_today(db: State<'_, Db>) -> Result<i64, String> {
    db.time_today().map_err(map_err)
}
