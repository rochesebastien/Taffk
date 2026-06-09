use std::path::Path;
use std::sync::{Arc, Mutex};

use rusqlite::{params, Connection, OptionalExtension, Result as SqlResult};
use uuid::Uuid;

use crate::models::{
    Backup, BackupSelection, NewTask, ProjectDto, TagDto, TaskDto, TaskPatch, TimeEntryDto,
};

/// rusqlite's `Connection` is `Send` but not `Sync`, so we guard it with a
/// `Mutex`. At this app's scale (500-2000 tasks, single user) a global lock is
/// the simplest correct choice.
#[derive(Clone)]
pub struct Db {
    conn: Arc<Mutex<Connection>>,
}

const BOOTSTRAP: &str = r#"
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, color TEXT, alias TEXT,
  pinned INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0, archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, color TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '',
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  parent_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  done INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'todo',
  scheduled_for TEXT, scheduled_time TEXT, due_date TEXT,
  estimate_minutes INTEGER NOT NULL DEFAULT 0, spent_minutes INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, completed_at TEXT,
  custom_props TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS task_tags (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);
CREATE TABLE IF NOT EXISTS time_entries (
  id TEXT PRIMARY KEY, task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL, ended_at TEXT, duration_seconds INTEGER NOT NULL DEFAULT 0,
  kind TEXT NOT NULL DEFAULT 'work'
);
"#;

fn new_id() -> String {
    Uuid::new_v4().to_string()
}

impl Db {
    pub fn open(path: &Path) -> SqlResult<Self> {
        let conn = Connection::open(path)?;
        Self::from_conn(conn)
    }

    #[cfg(test)]
    pub fn open_in_memory() -> SqlResult<Self> {
        let conn = Connection::open_in_memory()?;
        Self::from_conn(conn)
    }

    fn from_conn(conn: Connection) -> SqlResult<Self> {
        conn.execute_batch("PRAGMA foreign_keys = ON;")?;
        conn.execute_batch(BOOTSTRAP)?;
        // Idempotent column adds for DBs created before a column existed.
        // SQLite has no `ADD COLUMN IF NOT EXISTS`; the duplicate-column error
        // on an already-migrated DB is expected and ignored.
        let _ = conn.execute("ALTER TABLE tasks ADD COLUMN scheduled_time TEXT", []);
        let _ = conn.execute("ALTER TABLE projects ADD COLUMN alias TEXT", []);
        let _ = conn.execute("ALTER TABLE projects ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0", []);
        let _ = conn.execute("ALTER TABLE tasks ADD COLUMN archived INTEGER NOT NULL DEFAULT 0", []);
        let _ = conn.execute("ALTER TABLE tasks ADD COLUMN custom_props TEXT NOT NULL DEFAULT '{}'", []);
        Ok(Db {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    // ---- tasks ----------------------------------------------------------

    pub fn list_tasks(&self) -> SqlResult<Vec<TaskDto>> {
        let conn = self.conn.lock().unwrap();
        Self::query_tasks(&conn, None)
    }

    pub fn create_task(&self, input: NewTask) -> SqlResult<TaskDto> {
        let conn = self.conn.lock().unwrap();
        let id = new_id();
        conn.execute(
            "INSERT INTO tasks (id, title, notes, project_id, parent_id,
                scheduled_for, scheduled_time, estimate_minutes, sort_order, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, datetime('now'), datetime('now'))",
            params![
                id,
                input.title,
                input.notes.unwrap_or_default(),
                input.project_id,
                input.parent_id,
                input.scheduled_for,
                input.scheduled_time,
                input.estimate_minutes.unwrap_or(0),
                0_i64,
            ],
        )?;

        if let Some(tag_ids) = input.tag_ids {
            for tag_id in tag_ids {
                conn.execute(
                    "INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?1, ?2)",
                    params![id, tag_id],
                )?;
            }
        }

        Self::query_task(&conn, &id)
    }

    pub fn set_task_archived(&self, id: &str, archived: bool) -> SqlResult<TaskDto> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE tasks SET archived = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![archived as i64, id],
        )?;
        Self::query_task(&conn, id)
    }

    pub fn update_task(&self, patch: TaskPatch) -> SqlResult<TaskDto> {
        let conn = self.conn.lock().unwrap();

        if let Some(v) = patch.title {
            conn.execute(
                "UPDATE tasks SET title = ?1 WHERE id = ?2",
                params![v, patch.id],
            )?;
        }
        if let Some(v) = patch.notes {
            conn.execute(
                "UPDATE tasks SET notes = ?1 WHERE id = ?2",
                params![v, patch.id],
            )?;
        }
        if let Some(v) = patch.project_id {
            conn.execute(
                "UPDATE tasks SET project_id = ?1 WHERE id = ?2",
                params![v, patch.id],
            )?;
        }
        if let Some(v) = patch.parent_id {
            conn.execute(
                "UPDATE tasks SET parent_id = ?1 WHERE id = ?2",
                params![v, patch.id],
            )?;
        }
        if let Some(v) = patch.status {
            conn.execute(
                "UPDATE tasks SET status = ?1 WHERE id = ?2",
                params![v, patch.id],
            )?;
        }
        if let Some(v) = patch.scheduled_for {
            conn.execute(
                "UPDATE tasks SET scheduled_for = ?1 WHERE id = ?2",
                params![v, patch.id],
            )?;
        }
        if let Some(v) = patch.scheduled_time {
            conn.execute(
                "UPDATE tasks SET scheduled_time = ?1 WHERE id = ?2",
                params![v, patch.id],
            )?;
        }
        if let Some(v) = patch.due_date {
            conn.execute(
                "UPDATE tasks SET due_date = ?1 WHERE id = ?2",
                params![v, patch.id],
            )?;
        }
        if let Some(v) = patch.estimate_minutes {
            conn.execute(
                "UPDATE tasks SET estimate_minutes = ?1 WHERE id = ?2",
                params![v, patch.id],
            )?;
        }
        if let Some(v) = patch.spent_minutes {
            conn.execute(
                "UPDATE tasks SET spent_minutes = ?1 WHERE id = ?2",
                params![v, patch.id],
            )?;
        }
        if let Some(v) = patch.sort_order {
            conn.execute(
                "UPDATE tasks SET sort_order = ?1 WHERE id = ?2",
                params![v, patch.id],
            )?;
        }
        if let Some(v) = &patch.custom_props {
            let json = serde_json::to_string(v).unwrap_or_else(|_| "{}".into());
            conn.execute(
                "UPDATE tasks SET custom_props = ?1 WHERE id = ?2",
                params![json, patch.id],
            )?;
        }
        if let Some(done) = patch.done {
            // Keep completed_at in sync with the done flag.
            if done {
                conn.execute(
                    "UPDATE tasks SET done = 1, completed_at = datetime('now') WHERE id = ?1",
                    params![patch.id],
                )?;
            } else {
                conn.execute(
                    "UPDATE tasks SET done = 0, completed_at = NULL WHERE id = ?1",
                    params![patch.id],
                )?;
            }
        }

        conn.execute(
            "UPDATE tasks SET updated_at = datetime('now') WHERE id = ?1",
            params![patch.id],
        )?;

        Self::query_task(&conn, &patch.id)
    }

    pub fn delete_task(&self, id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM tasks WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn set_task_tags(&self, task_id: &str, tag_ids: &[String]) -> SqlResult<TaskDto> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM task_tags WHERE task_id = ?1", params![task_id])?;
        for tag_id in tag_ids {
            conn.execute(
                "INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?1, ?2)",
                params![task_id, tag_id],
            )?;
        }
        Self::query_task(&conn, task_id)
    }

    pub fn reorder_tasks(&self, ids: &[String]) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        for (index, id) in ids.iter().enumerate() {
            conn.execute(
                "UPDATE tasks SET sort_order = ?1 WHERE id = ?2",
                params![index as i64, id],
            )?;
        }
        Ok(())
    }

    fn tag_ids_for(conn: &Connection, task_id: &str) -> SqlResult<Vec<String>> {
        let mut stmt =
            conn.prepare("SELECT tag_id FROM task_tags WHERE task_id = ?1 ORDER BY tag_id")?;
        let rows = stmt.query_map(params![task_id], |r| r.get::<_, String>(0))?;
        rows.collect()
    }

    fn query_task(conn: &Connection, id: &str) -> SqlResult<TaskDto> {
        let mut tasks = Self::query_tasks(conn, Some(id))?;
        tasks.pop().ok_or(rusqlite::Error::QueryReturnedNoRows)
    }

    fn query_tasks(conn: &Connection, only_id: Option<&str>) -> SqlResult<Vec<TaskDto>> {
        let base = "SELECT id, title, notes, project_id, parent_id, done, status,
                scheduled_for, due_date, estimate_minutes, spent_minutes, sort_order,
                created_at, updated_at, completed_at, scheduled_time, archived, custom_props
             FROM tasks";

        let map_row = |row: &rusqlite::Row| -> SqlResult<(TaskDto, String)> {
            let id: String = row.get(0)?;
            Ok((
                TaskDto {
                    id: id.clone(),
                    title: row.get(1)?,
                    notes: row.get(2)?,
                    project_id: row.get(3)?,
                    parent_id: row.get(4)?,
                    done: row.get::<_, i64>(5)? != 0,
                    status: row.get(6)?,
                    scheduled_for: row.get(7)?,
                    scheduled_time: row.get(15)?,
                    due_date: row.get(8)?,
                    estimate_minutes: row.get(9)?,
                    spent_minutes: row.get(10)?,
                    sort_order: row.get(11)?,
                    created_at: row.get(12)?,
                    updated_at: row.get(13)?,
                    completed_at: row.get(14)?,
                    archived: row.get::<_, i64>(16)? != 0,
                    custom_props: serde_json::from_str(&row.get::<_, String>(17)?).unwrap_or_default(),
                    tag_ids: Vec::new(),
                },
                id,
            ))
        };

        let mut tasks: Vec<TaskDto> = Vec::new();
        if let Some(id) = only_id {
            let sql = format!("{base} WHERE id = ?1");
            let mut stmt = conn.prepare(&sql)?;
            if let Some((task, _)) = stmt.query_row(params![id], map_row).optional()? {
                tasks.push(task);
            }
        } else {
            let sql = format!("{base} ORDER BY sort_order, created_at");
            let mut stmt = conn.prepare(&sql)?;
            let rows = stmt.query_map([], map_row)?;
            for row in rows {
                tasks.push(row?.0);
            }
        }

        for task in tasks.iter_mut() {
            task.tag_ids = Self::tag_ids_for(conn, &task.id)?;
        }
        Ok(tasks)
    }

    // ---- time entries ---------------------------------------------------

    pub fn log_time(
        &self,
        task_id: Option<&str>,
        seconds: i64,
        kind: &str,
    ) -> SqlResult<Option<TaskDto>> {
        let conn = self.conn.lock().unwrap();
        let id = new_id();
        conn.execute(
            "INSERT INTO time_entries
                (id, task_id, started_at, ended_at, duration_seconds, kind)
             VALUES (?1, ?2, datetime('now', '-' || ?3 || ' seconds'),
                     datetime('now'), ?3, ?4)",
            params![id, task_id, seconds, kind],
        )?;

        match (kind, task_id) {
            ("work", Some(task_id)) => {
                let minutes = ((seconds as f64) / 60.0).round() as i64;
                conn.execute(
                    "UPDATE tasks SET spent_minutes = spent_minutes + ?1,
                        updated_at = datetime('now') WHERE id = ?2",
                    params![minutes, task_id],
                )?;
                Ok(Some(Self::query_task(&conn, task_id)?))
            }
            _ => Ok(None),
        }
    }

    pub fn list_time_entries(&self) -> SqlResult<Vec<TimeEntryDto>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, task_id, started_at, ended_at, duration_seconds, kind
             FROM time_entries ORDER BY started_at",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(TimeEntryDto {
                id: row.get(0)?,
                task_id: row.get(1)?,
                started_at: row.get(2)?,
                ended_at: row.get(3)?,
                duration_seconds: row.get(4)?,
                kind: row.get(5)?,
            })
        })?;
        rows.collect()
    }

    pub fn time_today(&self) -> SqlResult<i64> {
        let conn = self.conn.lock().unwrap();
        conn.query_row(
            "SELECT COALESCE(SUM(duration_seconds), 0) FROM time_entries
             WHERE kind = 'work'
               AND date(COALESCE(ended_at, started_at)) = date('now')",
            [],
            |row| row.get(0),
        )
    }

    // ---- projects -------------------------------------------------------

    pub fn list_projects(&self) -> SqlResult<Vec<ProjectDto>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, color, alias, pinned, sort_order, archived, created_at
             FROM projects ORDER BY sort_order, created_at",
        )?;
        let rows = stmt.query_map([], Self::map_project)?;
        rows.collect()
    }

    pub fn set_project_pinned(&self, id: &str, pinned: bool) -> SqlResult<ProjectDto> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE projects SET pinned = ?1 WHERE id = ?2",
            params![pinned as i64, id],
        )?;
        Self::query_project(&conn, id)
    }

    pub fn set_project_archived(&self, id: &str, archived: bool) -> SqlResult<ProjectDto> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE projects SET archived = ?1 WHERE id = ?2",
            params![archived as i64, id],
        )?;
        Self::query_project(&conn, id)
    }

    pub fn create_project(
        &self,
        name: &str,
        color: Option<&str>,
        alias: Option<&str>,
    ) -> SqlResult<ProjectDto> {
        let conn = self.conn.lock().unwrap();
        let id = new_id();
        conn.execute(
            "INSERT INTO projects (id, name, color, alias, created_at)
             VALUES (?1, ?2, ?3, ?4, datetime('now'))",
            params![id, name, color, alias],
        )?;
        Self::query_project(&conn, &id)
    }

    pub fn update_project(
        &self,
        id: &str,
        name: &str,
        color: Option<&str>,
        alias: Option<&str>,
    ) -> SqlResult<ProjectDto> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE projects SET name = ?1, color = ?2, alias = ?3 WHERE id = ?4",
            params![name, color, alias, id],
        )?;
        Self::query_project(&conn, id)
    }

    pub fn delete_project(&self, id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM projects WHERE id = ?1", params![id])?;
        Ok(())
    }

    fn map_project(row: &rusqlite::Row) -> SqlResult<ProjectDto> {
        Ok(ProjectDto {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
            alias: row.get(3)?,
            pinned: row.get::<_, i64>(4)? != 0,
            sort_order: row.get(5)?,
            archived: row.get::<_, i64>(6)? != 0,
            created_at: row.get(7)?,
        })
    }

    fn query_project(conn: &Connection, id: &str) -> SqlResult<ProjectDto> {
        conn.query_row(
            "SELECT id, name, color, alias, pinned, sort_order, archived, created_at
             FROM projects WHERE id = ?1",
            params![id],
            Self::map_project,
        )
    }

    // ---- tags -----------------------------------------------------------

    pub fn list_tags(&self) -> SqlResult<Vec<TagDto>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt =
            conn.prepare("SELECT id, name, color, created_at FROM tags ORDER BY created_at")?;
        let rows = stmt.query_map([], Self::map_tag)?;
        rows.collect()
    }

    pub fn create_tag(&self, name: &str, color: Option<&str>) -> SqlResult<TagDto> {
        let conn = self.conn.lock().unwrap();
        let id = new_id();
        conn.execute(
            "INSERT INTO tags (id, name, color, created_at)
             VALUES (?1, ?2, ?3, datetime('now'))",
            params![id, name, color],
        )?;
        conn.query_row(
            "SELECT id, name, color, created_at FROM tags WHERE id = ?1",
            params![id],
            Self::map_tag,
        )
    }

    pub fn update_tag(&self, id: &str, name: &str, color: Option<&str>) -> SqlResult<TagDto> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE tags SET name = ?1, color = ?2 WHERE id = ?3",
            params![name, color, id],
        )?;
        conn.query_row(
            "SELECT id, name, color, created_at FROM tags WHERE id = ?1",
            params![id],
            Self::map_tag,
        )
    }

    pub fn delete_tag(&self, id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM tags WHERE id = ?1", params![id])?;
        Ok(())
    }

    fn map_tag(row: &rusqlite::Row) -> SqlResult<TagDto> {
        Ok(TagDto {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
            created_at: row.get(3)?,
        })
    }

    // ---- data (export / import / reset) ---------------------------------

    pub fn counts(&self) -> SqlResult<(i64, i64, i64, i64)> {
        let conn = self.conn.lock().unwrap();
        let one = |sql: &str| conn.query_row(sql, [], |r| r.get::<_, i64>(0));
        Ok((
            one("SELECT COUNT(*) FROM projects")?,
            one("SELECT COUNT(*) FROM tags")?,
            one("SELECT COUNT(*) FROM tasks")?,
            one("SELECT COUNT(*) FROM time_entries")?,
        ))
    }

    pub fn export_backup(&self, sel: BackupSelection) -> SqlResult<Backup> {
        let exported_at = {
            let conn = self.conn.lock().unwrap();
            conn.query_row("SELECT datetime('now')", [], |r| r.get::<_, String>(0))?
        };
        Ok(Backup {
            version: 1,
            exported_at,
            projects: if sel.projects { self.list_projects()? } else { Vec::new() },
            tags: if sel.tags { self.list_tags()? } else { Vec::new() },
            tasks: if sel.tasks { self.list_tasks()? } else { Vec::new() },
            time_entries: if sel.time_entries { self.list_time_entries()? } else { Vec::new() },
        })
    }

    /// Restore the selected categories from a backup, replacing each selected
    /// category wholesale. Unselected categories are left untouched, and any
    /// reference to a missing project/tag/task is dropped so foreign keys hold.
    pub fn import_backup(&self, backup: &Backup, sel: BackupSelection) -> SqlResult<()> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;

        let exists = |table: &str, id: &str| -> SqlResult<bool> {
            tx.query_row(
                &format!("SELECT 1 FROM {table} WHERE id = ?1"),
                params![id],
                |_| Ok(()),
            )
            .optional()
            .map(|o| o.is_some())
        };

        if sel.projects {
            tx.execute("DELETE FROM projects", [])?;
            for p in &backup.projects {
                tx.execute(
                    "INSERT INTO projects (id, name, color, alias, pinned, sort_order, archived, created_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                    params![p.id, p.name, p.color, p.alias, p.pinned as i64, p.sort_order, p.archived as i64, p.created_at],
                )?;
            }
        }
        if sel.tags {
            tx.execute("DELETE FROM tags", [])?;
            for t in &backup.tags {
                tx.execute(
                    "INSERT INTO tags (id, name, color, created_at) VALUES (?1, ?2, ?3, ?4)",
                    params![t.id, t.name, t.color, t.created_at],
                )?;
            }
        }
        if sel.tasks {
            tx.execute("DELETE FROM tasks", [])?;
            for t in &backup.tasks {
                let project_id = match &t.project_id {
                    Some(pid) if exists("projects", pid)? => Some(pid.as_str()),
                    _ => None,
                };
                tx.execute(
                    "INSERT INTO tasks (id, title, notes, project_id, parent_id, done, status,
                       scheduled_for, scheduled_time, due_date, estimate_minutes, spent_minutes,
                       sort_order, created_at, updated_at, completed_at, archived, custom_props)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)",
                    params![
                        t.id, t.title, t.notes, project_id, t.parent_id, t.done as i64, t.status,
                        t.scheduled_for, t.scheduled_time, t.due_date, t.estimate_minutes,
                        t.spent_minutes, t.sort_order, t.created_at, t.updated_at, t.completed_at,
                        t.archived as i64, serde_json::to_string(&t.custom_props).unwrap_or_else(|_| "{}".into())
                    ],
                )?;
                for tag_id in &t.tag_ids {
                    if exists("tags", tag_id)? {
                        tx.execute(
                            "INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?1, ?2)",
                            params![t.id, tag_id],
                        )?;
                    }
                }
            }
        }
        if sel.time_entries {
            tx.execute("DELETE FROM time_entries", [])?;
            for e in &backup.time_entries {
                let task_id = match &e.task_id {
                    Some(tid) if exists("tasks", tid)? => Some(tid.as_str()),
                    _ => None,
                };
                tx.execute(
                    "INSERT INTO time_entries (id, task_id, started_at, ended_at, duration_seconds, kind)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                    params![e.id, task_id, e.started_at, e.ended_at, e.duration_seconds, e.kind],
                )?;
            }
        }
        tx.commit()
    }

    pub fn reset(&self) -> SqlResult<()> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;
        for table in ["task_tags", "time_entries", "tasks", "projects", "tags"] {
            tx.execute(&format!("DELETE FROM {table}"), [])?;
        }
        tx.commit()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{NewTask, TaskPatch};

    #[test]
    fn task_project_round_trip() {
        let db = Db::open_in_memory().expect("open in-memory db");

        let project = db.create_project("Inbox", Some("#3b82f6"), Some("inbox")).unwrap();
        assert_eq!(project.name, "Inbox");
        assert_eq!(project.color.as_deref(), Some("#3b82f6"));

        let new_task = NewTask {
            title: "Write tests".into(),
            notes: Some("body".into()),
            project_id: Some(project.id.clone()),
            parent_id: None,
            scheduled_for: None,
            scheduled_time: None,
            estimate_minutes: Some(30),
            tag_ids: None,
        };
        let created = db.create_task(new_task).unwrap();
        assert_eq!(created.title, "Write tests");
        assert_eq!(created.project_id.as_deref(), Some(project.id.as_str()));
        assert_eq!(created.estimate_minutes, 30);
        assert!(!created.done);
        assert!(created.completed_at.is_none());

        let listed = db.list_tasks().unwrap();
        assert_eq!(listed.len(), 1);
        assert_eq!(listed[0].id, created.id);

        let patch = TaskPatch {
            id: created.id.clone(),
            title: None,
            notes: None,
            project_id: None,
            parent_id: None,
            done: Some(true),
            status: None,
            scheduled_for: None,
            scheduled_time: None,
            due_date: None,
            estimate_minutes: None,
            spent_minutes: None,
            sort_order: None,
            custom_props: None,
        };
        let toggled = db.update_task(patch).unwrap();
        assert!(toggled.done);
        assert!(toggled.completed_at.is_some());

        // Round-trip via a fresh list to confirm persistence in the connection.
        let listed = db.list_tasks().unwrap();
        assert!(listed[0].done);
    }

    #[test]
    fn log_time_work_and_break() {
        let db = Db::open_in_memory().expect("open in-memory db");

        let task = db
            .create_task(NewTask {
                title: "Focus".into(),
                notes: None,
                project_id: None,
                parent_id: None,
                scheduled_for: None,
                scheduled_time: None,
                estimate_minutes: None,
                tag_ids: None,
            })
            .unwrap();
        assert_eq!(task.spent_minutes, 0);

        let updated = db.log_time(Some(&task.id), 1500, "work").unwrap();
        let updated = updated.expect("work entry tied to a task returns the task");
        assert_eq!(updated.spent_minutes, 25);
        assert!(db.time_today().unwrap() >= 1500);

        // A break entry without a task touches no task and returns None.
        let none = db.log_time(None, 300, "break").unwrap();
        assert!(none.is_none());

        let listed = db.list_tasks().unwrap();
        assert_eq!(listed.len(), 1);
        assert_eq!(listed[0].spent_minutes, 25);
    }
}
