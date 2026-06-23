use tauri::{AppHandle, Manager, State, WebviewUrl, WebviewWindowBuilder};

use crate::db::Db;
use crate::models::{
    Backup, BackupSelection, DataStats, NewTask, ProjectDto, TagDto, TaskDto, TaskPatch,
    TimeEntryDto,
};

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
pub fn set_task_archived(id: String, archived: bool, db: State<'_, Db>) -> Result<TaskDto, String> {
    db.set_task_archived(&id, archived).map_err(map_err)
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
pub fn set_project_archived(
    id: String,
    archived: bool,
    db: State<'_, Db>,
) -> Result<ProjectDto, String> {
    db.set_project_archived(&id, archived).map_err(map_err)
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
pub fn update_tag(
    id: String,
    name: String,
    color: Option<String>,
    db: State<'_, Db>,
) -> Result<TagDto, String> {
    db.update_tag(&id, &name, color.as_deref()).map_err(map_err)
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
pub fn list_time_entries(db: State<'_, Db>) -> Result<Vec<TimeEntryDto>, String> {
    db.list_time_entries().map_err(map_err)
}

#[tauri::command]
pub fn time_today(db: State<'_, Db>) -> Result<i64, String> {
    db.time_today().map_err(map_err)
}

fn db_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|d| d.join("taffk.db"))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn data_stats(app: AppHandle, db: State<'_, Db>) -> Result<DataStats, String> {
    let path = db_path(&app)?;
    let file_bytes = std::fs::metadata(&path).map(|m| m.len() as i64).unwrap_or(0);
    let (projects, tags, tasks, time_entries) = db.counts().map_err(map_err)?;
    Ok(DataStats {
        path: path.to_string_lossy().into_owned(),
        file_bytes,
        projects,
        tags,
        tasks,
        time_entries,
    })
}

#[tauri::command]
pub fn export_data(
    path: String,
    selection: BackupSelection,
    db: State<'_, Db>,
) -> Result<(), String> {
    let backup = db.export_backup(selection).map_err(map_err)?;
    let json = serde_json::to_string_pretty(&backup).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_data(
    path: String,
    selection: BackupSelection,
    db: State<'_, Db>,
) -> Result<(), String> {
    let json = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let backup: Backup = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    db.import_backup(&backup, selection).map_err(map_err)
}

#[tauri::command]
pub fn reset_data(db: State<'_, Db>) -> Result<(), String> {
    db.reset().map_err(map_err)
}

/// Opens (or refocuses) a small frameless, interactive widget window for one
/// task. The frontend detects the `?sticky=<taskId>` query in `main.tsx` and
/// renders the widget instead of the full app shell. With `on_desktop`, the
/// widget sits at the normal window level — interactive, but covered whenever
/// another app comes forward, so it only shows through when nothing is on top.
/// Otherwise it floats above every window. On macOS it follows the user across
/// every Space in both modes.
#[tauri::command]
pub fn open_sticky_note(app: AppHandle, task_id: String, on_desktop: bool) -> Result<(), String> {
    let label = format!("sticky-{task_id}");
    if let Some(w) = app.get_webview_window(&label) {
        let _ = w.show();
        let _ = w.set_focus();
        return Ok(());
    }
    let mut builder = WebviewWindowBuilder::new(
        &app,
        &label,
        WebviewUrl::App(format!("index.html?sticky={task_id}").into()),
    )
    .title("Taffk Widget")
    .inner_size(300.0, 300.0)
    .min_inner_size(220.0, 180.0)
    .decorations(false)
    .resizable(true)
    .transparent(true)
    .skip_taskbar(true);

    // "Premier plan" floats above every app; "Bureau" keeps the normal window
    // level, so any app brought forward simply covers it.
    if !on_desktop {
        builder = builder.always_on_top(true);
    }

    let _window = builder.build().map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    follow_all_spaces(&_window);

    Ok(())
}

/// Makes the widget follow the user across every Space (so it stays visible
/// whichever desktop is active) while keeping it interactive. Only the
/// collection behavior is tweaked here — the window level (floating vs. normal)
/// is chosen by the builder — which AppKit exposes nowhere in Tauri.
#[cfg(target_os = "macos")]
fn follow_all_spaces(window: &tauri::WebviewWindow) {
    let w = window.clone();
    let _ = window.run_on_main_thread(move || {
        let Ok(ptr) = w.ns_window() else { return };
        use objc2::msg_send;
        use objc2::runtime::AnyObject;
        // canJoinAllSpaces | managed (participates in normal window management)
        const COLLECTION_BEHAVIOR: usize = (1 << 0) | (1 << 2);
        let ns_window = ptr as *mut AnyObject;
        unsafe {
            let _: () = msg_send![ns_window, setCollectionBehavior: COLLECTION_BEHAVIOR];
        }
    });
}
