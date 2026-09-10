//! Operations shared by the CLI and the MCP server: resolving projects, tags
//! and tasks from human handles (name, alias, id prefix), the `#tag @projet`
//! quick-add syntax, and the `done`/`status` invariant. The desktop app keeps
//! its own copy of these rules in `src/lib/store.ts`; both must stay aligned.

use std::collections::HashMap;
use std::fmt;

use serde::Serialize;

use crate::db::Db;
use crate::models::{NewTask, ProjectDto, TagDto, TaskDto, TaskPatch};

pub const STATUSES: [&str; 3] = ["todo", "in_progress", "done"];

#[derive(Debug)]
pub enum OpsError {
    NotFound {
        kind: &'static str,
        handle: String,
    },
    Ambiguous {
        kind: &'static str,
        handle: String,
        candidates: Vec<String>,
    },
    Invalid(String),
    Db(rusqlite::Error),
}

impl fmt::Display for OpsError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            OpsError::NotFound { kind, handle } => write!(f, "{kind} introuvable : « {handle} »"),
            OpsError::Ambiguous {
                kind,
                handle,
                candidates,
            } => write!(
                f,
                "{kind} ambigu : « {handle} » correspond à {} éléments ({})",
                candidates.len(),
                candidates.join(", ")
            ),
            OpsError::Invalid(msg) => write!(f, "{msg}"),
            OpsError::Db(e) => write!(f, "erreur SQLite : {e}"),
        }
    }
}

impl std::error::Error for OpsError {}

impl From<rusqlite::Error> for OpsError {
    fn from(e: rusqlite::Error) -> Self {
        OpsError::Db(e)
    }
}

pub type OpsResult<T> = Result<T, OpsError>;

// ---- parsing ------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct QuickAdd {
    pub title: String,
    pub tag_names: Vec<String>,
    pub project_name: Option<String>,
}

/// `Buy milk #errand @home` → title + tag names + project name.
pub fn parse_quick_add(raw: &str) -> QuickAdd {
    let mut tag_names = Vec::new();
    let mut project_name = None;
    let mut title_words = Vec::new();
    for w in raw.split_whitespace() {
        if w.len() > 1 && w.starts_with('#') {
            tag_names.push(w[1..].to_lowercase());
        } else if w.len() > 1 && w.starts_with('@') {
            project_name = Some(w[1..].to_string());
        } else {
            title_words.push(w);
        }
    }
    QuickAdd {
        title: title_words.join(" "),
        tag_names,
        project_name,
    }
}

pub fn validate_status(status: &str) -> OpsResult<String> {
    if STATUSES.contains(&status) {
        Ok(status.to_string())
    } else {
        Err(OpsError::Invalid(format!(
            "statut invalide « {status} » (attendu : {})",
            STATUSES.join(", ")
        )))
    }
}

/// Accepts `YYYY-MM-DD`, `today`/`aujourd'hui`, `tomorrow`/`demain`.
pub fn resolve_date(db: &Db, raw: &str) -> OpsResult<String> {
    match raw.trim().to_lowercase().as_str() {
        "today" | "aujourd'hui" | "aujourdhui" => Ok(db.local_date(0)?),
        "tomorrow" | "demain" => Ok(db.local_date(1)?),
        "yesterday" | "hier" => Ok(db.local_date(-1)?),
        s => {
            let ok = s.len() == 10
                && s.bytes().enumerate().all(|(i, b)| match i {
                    4 | 7 => b == b'-',
                    _ => b.is_ascii_digit(),
                });
            if ok {
                Ok(s.to_string())
            } else {
                Err(OpsError::Invalid(format!(
                    "date invalide « {raw} » (attendu : YYYY-MM-DD, today, tomorrow)"
                )))
            }
        }
    }
}

pub fn validate_time(raw: &str) -> OpsResult<String> {
    let s = raw.trim();
    let ok = s.len() == 5
        && s.bytes().enumerate().all(|(i, b)| {
            if i == 2 {
                b == b':'
            } else {
                b.is_ascii_digit()
            }
        })
        && s[..2].parse::<u8>().map(|h| h < 24).unwrap_or(false)
        && s[3..].parse::<u8>().map(|m| m < 60).unwrap_or(false);
    if ok {
        Ok(s.to_string())
    } else {
        Err(OpsError::Invalid(format!(
            "heure invalide « {raw} » (attendu : HH:MM)"
        )))
    }
}

// ---- resolving handles --------------------------------------------------

fn unique<T>(
    kind: &'static str,
    handle: &str,
    mut found: Vec<T>,
    label: impl Fn(&T) -> String,
) -> OpsResult<Option<T>> {
    match found.len() {
        0 => Ok(None),
        1 => Ok(found.pop()),
        _ => Err(OpsError::Ambiguous {
            kind,
            handle: handle.to_string(),
            candidates: found.iter().map(label).collect(),
        }),
    }
}

pub fn short_id(id: &str) -> &str {
    id.get(..8).unwrap_or(id)
}

/// Project by id, alias, name (case-insensitive), then id or name prefix.
pub fn resolve_project(db: &Db, handle: &str) -> OpsResult<ProjectDto> {
    let handle = handle.trim();
    let h = handle.to_lowercase();
    let mut projects = db.list_projects()?;

    if let Some(i) = projects.iter().position(|p| p.id == handle) {
        return Ok(projects.swap_remove(i));
    }
    if let Some(i) = projects.iter().position(|p| {
        p.alias.as_deref().map(|a| a.to_lowercase()) == Some(h.clone())
            || p.name.to_lowercase() == h
    }) {
        return Ok(projects.swap_remove(i));
    }
    let label = |p: &ProjectDto| format!("{} ({})", p.name, short_id(&p.id));
    let by_id: Vec<ProjectDto> = projects
        .iter()
        .filter(|p| p.id.starts_with(handle))
        .cloned()
        .collect();
    if let Some(p) = unique("projet", handle, by_id, label)? {
        return Ok(p);
    }
    let by_name: Vec<ProjectDto> = projects
        .iter()
        .filter(|p| p.name.to_lowercase().starts_with(&h))
        .cloned()
        .collect();
    if let Some(p) = unique("projet", handle, by_name, label)? {
        return Ok(p);
    }
    Err(OpsError::NotFound {
        kind: "projet",
        handle: handle.to_string(),
    })
}

/// Like the app's `@projet` handling: reuse the project matching the handle or
/// create it (the lowercased handle becomes its alias).
pub fn ensure_project(db: &Db, handle: &str) -> OpsResult<ProjectDto> {
    match resolve_project(db, handle) {
        Ok(p) => Ok(p),
        Err(OpsError::NotFound { .. }) => {
            Ok(db.create_project(handle, None, Some(&handle.to_lowercase()))?)
        }
        Err(e) => Err(e),
    }
}

/// Tag by id, name (case-insensitive), then id or name prefix.
pub fn resolve_tag(db: &Db, handle: &str) -> OpsResult<TagDto> {
    let handle = handle.trim().trim_start_matches('#');
    let h = handle.to_lowercase();
    let mut tags = db.list_tags()?;
    if let Some(i) = tags
        .iter()
        .position(|t| t.id == handle || t.name.to_lowercase() == h)
    {
        return Ok(tags.swap_remove(i));
    }
    let label = |t: &TagDto| format!("{} ({})", t.name, short_id(&t.id));
    let found: Vec<TagDto> = tags
        .iter()
        .filter(|t| t.id.starts_with(handle) || t.name.to_lowercase().starts_with(&h))
        .cloned()
        .collect();
    unique("étiquette", handle, found, label)?.ok_or_else(|| OpsError::NotFound {
        kind: "étiquette",
        handle: handle.to_string(),
    })
}

/// Reuse tags by name (case-insensitive) or create them; returns ids in order.
pub fn ensure_tags(db: &Db, names: &[String]) -> OpsResult<Vec<String>> {
    let mut existing = db.list_tags()?;
    let mut ids: Vec<String> = Vec::new();
    for name in names {
        let name = name.trim().trim_start_matches('#');
        if name.is_empty() {
            continue;
        }
        let lower = name.to_lowercase();
        let id = match existing.iter().find(|t| t.name.to_lowercase() == lower) {
            Some(t) => t.id.clone(),
            None => {
                let tag = db.create_tag(name, None)?;
                let id = tag.id.clone();
                existing.push(tag);
                id
            }
        };
        if !ids.contains(&id) {
            ids.push(id);
        }
    }
    Ok(ids)
}

/// Task by id, id prefix, exact title (case-insensitive), then title substring.
pub fn resolve_task(db: &Db, handle: &str) -> OpsResult<TaskDto> {
    let handle = handle.trim();
    if let Some(t) = db.get_task(handle)? {
        return Ok(t);
    }
    let h = handle.to_lowercase();
    let tasks = db.list_tasks()?;
    let label = |t: &TaskDto| format!("{} · {}", short_id(&t.id), t.title);

    let by_id: Vec<TaskDto> = tasks
        .iter()
        .filter(|t| t.id.starts_with(handle))
        .cloned()
        .collect();
    if let Some(t) = unique("tâche", handle, by_id, label)? {
        return Ok(t);
    }
    let exact: Vec<TaskDto> = tasks
        .iter()
        .filter(|t| t.title.to_lowercase() == h)
        .cloned()
        .collect();
    if let Some(t) = unique("tâche", handle, exact, label)? {
        return Ok(t);
    }
    let contains: Vec<TaskDto> = tasks
        .iter()
        .filter(|t| t.title.to_lowercase().contains(&h))
        .cloned()
        .collect();
    if let Some(t) = unique("tâche", handle, contains, label)? {
        return Ok(t);
    }
    Err(OpsError::NotFound {
        kind: "tâche",
        handle: handle.to_string(),
    })
}

// ---- tasks --------------------------------------------------------------

#[derive(Debug, Default, Clone)]
pub struct AddTask {
    /// Title, may carry inline `#tag` / `@projet` tokens.
    pub text: String,
    pub notes: Option<String>,
    /// Project handle; must exist (unlike an inline `@projet`, which is created).
    pub project: Option<String>,
    /// Tag names, created when missing.
    pub tags: Vec<String>,
    pub scheduled_for: Option<String>,
    pub scheduled_time: Option<String>,
    pub due_date: Option<String>,
    pub estimate_minutes: Option<i64>,
    /// Parent task handle (subtask); the project is inherited when unset.
    pub parent: Option<String>,
}

pub fn add_task(db: &Db, input: AddTask) -> OpsResult<TaskDto> {
    let parsed = parse_quick_add(&input.text);
    if parsed.title.is_empty() {
        return Err(OpsError::Invalid("le titre de la tâche est vide".into()));
    }

    let parent = input
        .parent
        .as_deref()
        .map(|h| resolve_task(db, h))
        .transpose()?;

    let project_id = if let Some(handle) = input.project.as_deref() {
        Some(resolve_project(db, handle)?.id)
    } else if let Some(name) = parsed.project_name.as_deref() {
        Some(ensure_project(db, name)?.id)
    } else {
        parent.as_ref().and_then(|p| p.project_id.clone())
    };

    let mut tag_names = parsed.tag_names.clone();
    tag_names.extend(input.tags.iter().cloned());
    let tag_ids = ensure_tags(db, &tag_names)?;

    let scheduled_for = input
        .scheduled_for
        .as_deref()
        .map(|d| resolve_date(db, d))
        .transpose()?;
    let scheduled_time = input
        .scheduled_time
        .as_deref()
        .map(validate_time)
        .transpose()?;
    let due_date = input
        .due_date
        .as_deref()
        .map(|d| resolve_date(db, d))
        .transpose()?;

    let task = db.create_task(NewTask {
        title: parsed.title,
        notes: input.notes,
        project_id,
        parent_id: parent.map(|p| p.id),
        scheduled_for,
        scheduled_time,
        estimate_minutes: input.estimate_minutes,
        tag_ids: Some(tag_ids),
    })?;

    if due_date.is_some() {
        return Ok(db.update_task(TaskPatch {
            due_date: Some(due_date),
            ..patch_for(&task.id)
        })?);
    }
    Ok(task)
}

fn patch_for(id: &str) -> TaskPatch {
    TaskPatch {
        id: id.to_string(),
        title: None,
        notes: None,
        project_id: None,
        parent_id: None,
        done: None,
        status: None,
        scheduled_for: None,
        scheduled_time: None,
        due_date: None,
        estimate_minutes: None,
        spent_minutes: None,
        sort_order: None,
        custom_props: None,
    }
}

/// Every field is "absent = untouched"; the `Option<Option<_>>` ones accept an
/// explicit `None` inside to clear the column.
#[derive(Debug, Default, Clone)]
pub struct EditTask {
    pub title: Option<String>,
    pub notes: Option<String>,
    pub project: Option<Option<String>>,
    /// Replaces the whole tag set (names, created when missing).
    pub tags: Option<Vec<String>>,
    pub status: Option<String>,
    pub scheduled_for: Option<Option<String>>,
    pub scheduled_time: Option<Option<String>>,
    pub due_date: Option<Option<String>>,
    pub estimate_minutes: Option<i64>,
    pub parent: Option<Option<String>>,
}

pub fn edit_task(db: &Db, handle: &str, edit: EditTask) -> OpsResult<TaskDto> {
    let task = resolve_task(db, handle)?;
    let mut patch = patch_for(&task.id);

    if let Some(title) = edit.title {
        let title = title.trim().to_string();
        if title.is_empty() {
            return Err(OpsError::Invalid("le titre de la tâche est vide".into()));
        }
        patch.title = Some(title);
    }
    patch.notes = edit.notes;
    if let Some(project) = edit.project {
        patch.project_id = Some(
            project
                .as_deref()
                .map(|h| resolve_project(db, h).map(|p| p.id))
                .transpose()?,
        );
    }
    if let Some(status) = edit.status {
        let status = validate_status(&status)?;
        // `done` and `status` never drift (see AGENTS.md).
        patch.done = Some(status == "done");
        patch.status = Some(status);
    }
    if let Some(d) = edit.scheduled_for {
        patch.scheduled_for = Some(d.as_deref().map(|d| resolve_date(db, d)).transpose()?);
    }
    if let Some(t) = edit.scheduled_time {
        patch.scheduled_time = Some(t.as_deref().map(validate_time).transpose()?);
    }
    if let Some(d) = edit.due_date {
        patch.due_date = Some(d.as_deref().map(|d| resolve_date(db, d)).transpose()?);
    }
    patch.estimate_minutes = edit.estimate_minutes;
    if let Some(parent) = edit.parent {
        let parent_id = parent
            .as_deref()
            .map(|h| resolve_task(db, h).map(|t| t.id))
            .transpose()?;
        if parent_id.as_deref() == Some(task.id.as_str()) {
            return Err(OpsError::Invalid(
                "une tâche ne peut pas être sa propre parente".into(),
            ));
        }
        patch.parent_id = Some(parent_id);
    }

    let mut updated = db.update_task(patch)?;
    if let Some(names) = edit.tags {
        let ids = ensure_tags(db, &names)?;
        updated = db.set_task_tags(&task.id, &ids)?;
    }
    Ok(updated)
}

/// Complete / reopen a task with the same cascade as the app: a parent
/// propagates to its subtasks, and a parent is done iff every subtask is.
pub fn set_done(db: &Db, handle: &str, done: bool) -> OpsResult<TaskDto> {
    let task = resolve_task(db, handle)?;
    let status = if done { "done" } else { "todo" };
    let flip = |id: &str| -> OpsResult<TaskDto> {
        Ok(db.update_task(TaskPatch {
            done: Some(done),
            status: Some(status.into()),
            ..patch_for(id)
        })?)
    };
    let updated = flip(&task.id)?;

    let all = db.list_tasks()?;
    for child in all
        .iter()
        .filter(|t| t.parent_id.as_deref() == Some(task.id.as_str()))
    {
        if child.done != done {
            flip(&child.id)?;
        }
    }
    if let Some(parent_id) = task.parent_id.as_deref() {
        let all_done = all
            .iter()
            .filter(|t| t.parent_id.as_deref() == Some(parent_id))
            .all(|s| if s.id == task.id { done } else { s.done });
        if let Some(parent) = all.iter().find(|t| t.id == parent_id) {
            if parent.done != all_done {
                let status = if all_done { "done" } else { "todo" };
                db.update_task(TaskPatch {
                    done: Some(all_done),
                    status: Some(status.into()),
                    ..patch_for(parent_id)
                })?;
            }
        }
    }
    Ok(updated)
}

pub fn set_status(db: &Db, handle: &str, status: &str) -> OpsResult<TaskDto> {
    let status = validate_status(status)?;
    if status == "done" {
        return set_done(db, handle, true);
    }
    let task = resolve_task(db, handle)?;
    Ok(db.update_task(TaskPatch {
        done: Some(false),
        status: Some(status),
        ..patch_for(&task.id)
    })?)
}

#[derive(Debug, Default, Clone)]
pub struct TaskFilter {
    /// Case-insensitive substring over title and notes.
    pub query: Option<String>,
    pub project_id: Option<String>,
    pub tag_id: Option<String>,
    pub status: Option<String>,
    pub scheduled_for: Option<String>,
    pub include_done: bool,
    pub include_archived: bool,
}

pub fn filter_tasks(tasks: Vec<TaskDto>, f: &TaskFilter) -> Vec<TaskDto> {
    let q = f
        .query
        .as_deref()
        .map(|q| q.to_lowercase())
        .filter(|q| !q.is_empty());
    let include_done = f.include_done || f.status.as_deref() == Some("done");
    tasks
        .into_iter()
        .filter(|t| f.include_archived || !t.archived)
        .filter(|t| include_done || !t.done)
        .filter(|t| f.status.as_deref().map_or(true, |s| t.status == s))
        .filter(|t| {
            f.project_id
                .as_deref()
                .map_or(true, |p| t.project_id.as_deref() == Some(p))
        })
        .filter(|t| {
            f.tag_id
                .as_deref()
                .map_or(true, |tag| t.tag_ids.iter().any(|x| x == tag))
        })
        .filter(|t| {
            f.scheduled_for
                .as_deref()
                .map_or(true, |d| t.scheduled_for.as_deref() == Some(d))
        })
        .filter(|t| {
            q.as_deref().map_or(true, |q| {
                t.title.to_lowercase().contains(q) || t.notes.to_lowercase().contains(q)
            })
        })
        .collect()
}

// ---- views (resolved names for humans and agents) -----------------------

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskView {
    #[serde(flatten)]
    pub task: TaskDto,
    pub short_id: String,
    pub project_name: Option<String>,
    pub tag_names: Vec<String>,
}

pub fn task_views(db: &Db, tasks: Vec<TaskDto>) -> OpsResult<Vec<TaskView>> {
    let projects: HashMap<String, String> = db
        .list_projects()?
        .into_iter()
        .map(|p| (p.id, p.name))
        .collect();
    let tags: HashMap<String, String> = db
        .list_tags()?
        .into_iter()
        .map(|t| (t.id, t.name))
        .collect();
    Ok(tasks
        .into_iter()
        .map(|task| TaskView {
            short_id: short_id(&task.id).to_string(),
            project_name: task
                .project_id
                .as_deref()
                .and_then(|id| projects.get(id).cloned()),
            tag_names: task
                .tag_ids
                .iter()
                .filter_map(|id| tags.get(id).cloned())
                .collect(),
            task,
        })
        .collect())
}

pub fn task_view(db: &Db, task: TaskDto) -> OpsResult<TaskView> {
    Ok(task_views(db, vec![task])?
        .pop()
        .expect("one task in, one view out"))
}

// ---- time ---------------------------------------------------------------

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TimeSummary {
    pub date: String,
    pub work_seconds: i64,
    pub break_seconds: i64,
    pub per_task: Vec<TaskTime>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskTime {
    pub task_id: Option<String>,
    pub title: Option<String>,
    pub seconds: i64,
}

/// Work/break totals for one UTC day (`YYYY-MM-DD`, the storage timezone of
/// `time_entries`), plus a per-task breakdown of the work.
pub fn time_summary(db: &Db, date: &str) -> OpsResult<TimeSummary> {
    let entries = db.list_time_entries()?;
    let titles: HashMap<String, String> = db
        .list_tasks()?
        .into_iter()
        .map(|t| (t.id, t.title))
        .collect();
    let mut work = 0;
    let mut brk = 0;
    let mut per_task: Vec<TaskTime> = Vec::new();
    for e in entries {
        let day = e.ended_at.as_deref().unwrap_or(&e.started_at);
        if !day.starts_with(date) {
            continue;
        }
        if e.kind == "work" {
            work += e.duration_seconds;
            match per_task.iter_mut().find(|t| t.task_id == e.task_id) {
                Some(t) => t.seconds += e.duration_seconds,
                None => per_task.push(TaskTime {
                    title: e.task_id.as_deref().and_then(|id| titles.get(id).cloned()),
                    task_id: e.task_id,
                    seconds: e.duration_seconds,
                }),
            }
        } else {
            brk += e.duration_seconds;
        }
    }
    per_task.sort_by(|a, b| b.seconds.cmp(&a.seconds));
    Ok(TimeSummary {
        date: date.to_string(),
        work_seconds: work,
        break_seconds: brk,
        per_task,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn quick_add_parsing() {
        let q = parse_quick_add("Acheter du lait #courses @Maison");
        assert_eq!(q.title, "Acheter du lait");
        assert_eq!(q.tag_names, vec!["courses"]);
        assert_eq!(q.project_name.as_deref(), Some("Maison"));
        assert_eq!(parse_quick_add("# seul").title, "# seul");
    }

    #[test]
    fn add_task_creates_inline_project_and_tags() {
        let db = Db::open_in_memory().unwrap();
        let task = add_task(
            &db,
            AddTask {
                text: "Relire le rapport #urgent @Client".into(),
                scheduled_for: Some("today".into()),
                ..Default::default()
            },
        )
        .unwrap();
        assert_eq!(task.title, "Relire le rapport");
        assert_eq!(
            task.scheduled_for.as_deref(),
            Some(db.local_date(0).unwrap().as_str())
        );
        let view = task_view(&db, task).unwrap();
        assert_eq!(view.project_name.as_deref(), Some("Client"));
        assert_eq!(view.tag_names, vec!["urgent"]);

        let project = resolve_project(&db, "client").unwrap();
        assert_eq!(project.alias.as_deref(), Some("client"));
        // An explicit --project must not create anything.
        let err = add_task(
            &db,
            AddTask {
                text: "x".into(),
                project: Some("Inconnu".into()),
                ..Default::default()
            },
        )
        .unwrap_err();
        assert!(matches!(err, OpsError::NotFound { .. }));
    }

    #[test]
    fn resolve_task_by_prefix_and_title() {
        let db = Db::open_in_memory().unwrap();
        let a = add_task(
            &db,
            AddTask {
                text: "Écrire les tests".into(),
                ..Default::default()
            },
        )
        .unwrap();
        let _b = add_task(
            &db,
            AddTask {
                text: "Écrire la doc".into(),
                ..Default::default()
            },
        )
        .unwrap();
        assert_eq!(resolve_task(&db, &a.id[..8]).unwrap().id, a.id);
        assert_eq!(resolve_task(&db, "écrire les tests").unwrap().id, a.id);
        assert!(matches!(
            resolve_task(&db, "Écrire").unwrap_err(),
            OpsError::Ambiguous { .. }
        ));
        assert!(matches!(
            resolve_task(&db, "zzz").unwrap_err(),
            OpsError::NotFound { .. }
        ));
    }

    #[test]
    fn status_and_done_stay_in_sync_with_cascade() {
        let db = Db::open_in_memory().unwrap();
        let parent = add_task(
            &db,
            AddTask {
                text: "Parent".into(),
                ..Default::default()
            },
        )
        .unwrap();
        let child = add_task(
            &db,
            AddTask {
                text: "Enfant".into(),
                parent: Some(parent.id.clone()),
                ..Default::default()
            },
        )
        .unwrap();

        let moved = set_status(&db, &parent.id, "in_progress").unwrap();
        assert_eq!(moved.status, "in_progress");
        assert!(!moved.done);

        let done_child = set_done(&db, &child.id, true).unwrap();
        assert!(done_child.done);
        assert_eq!(done_child.status, "done");
        let parent_now = db.get_task(&parent.id).unwrap().unwrap();
        assert!(
            parent_now.done,
            "parent completes when its only subtask is done"
        );

        set_done(&db, &parent.id, false).unwrap();
        let child_now = db.get_task(&child.id).unwrap().unwrap();
        assert!(!child_now.done);
        assert_eq!(child_now.status, "todo");

        assert!(matches!(
            set_status(&db, &parent.id, "bogus").unwrap_err(),
            OpsError::Invalid(_)
        ));
    }

    #[test]
    fn filter_hides_done_and_archived_by_default() {
        let db = Db::open_in_memory().unwrap();
        let a = add_task(
            &db,
            AddTask {
                text: "A".into(),
                ..Default::default()
            },
        )
        .unwrap();
        let b = add_task(
            &db,
            AddTask {
                text: "B".into(),
                ..Default::default()
            },
        )
        .unwrap();
        let c = add_task(
            &db,
            AddTask {
                text: "C".into(),
                ..Default::default()
            },
        )
        .unwrap();
        set_done(&db, &b.id, true).unwrap();
        db.set_task_archived(&c.id, true).unwrap();

        let visible = filter_tasks(db.list_tasks().unwrap(), &TaskFilter::default());
        assert_eq!(
            visible.iter().map(|t| t.id.as_str()).collect::<Vec<_>>(),
            vec![a.id.as_str()]
        );

        let done = filter_tasks(
            db.list_tasks().unwrap(),
            &TaskFilter {
                status: Some("done".into()),
                ..Default::default()
            },
        );
        assert_eq!(done.len(), 1);
        let all = filter_tasks(
            db.list_tasks().unwrap(),
            &TaskFilter {
                include_done: true,
                include_archived: true,
                ..Default::default()
            },
        );
        assert_eq!(all.len(), 3);
    }

    #[test]
    fn dates_and_times_are_validated() {
        let db = Db::open_in_memory().unwrap();
        assert_eq!(resolve_date(&db, "2026-09-10").unwrap(), "2026-09-10");
        assert!(resolve_date(&db, "10/09/2026").is_err());
        assert_eq!(
            resolve_date(&db, "demain").unwrap(),
            db.local_date(1).unwrap()
        );
        assert_eq!(validate_time("09:30").unwrap(), "09:30");
        assert!(validate_time("9h30").is_err());
        assert!(validate_time("25:00").is_err());
    }
}
