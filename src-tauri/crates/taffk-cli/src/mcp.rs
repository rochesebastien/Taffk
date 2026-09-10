//! A minimal MCP server over stdio (newline-delimited JSON-RPC 2.0), exposing
//! Taffk as tools. Hand-rolled on purpose: the surface we need (`initialize`,
//! `tools/list`, `tools/call`, `ping`) is small, and it keeps the CLI free of
//! an async runtime.

use std::io::{self, BufRead, Write};
use std::path::Path;

use serde_json::{json, Value};
use taffk_core::models::TaskDto;
use taffk_core::ops::{self, AddTask, EditTask, OpsError, TaskFilter};
use taffk_core::Db;

const LATEST_PROTOCOL: &str = "2025-06-18";
const SUPPORTED_PROTOCOLS: [&str; 3] = ["2025-06-18", "2025-03-26", "2024-11-05"];

const INSTRUCTIONS: &str = "Taffk est le gestionnaire de travail personnel et local de l'utilisateur \
(tâches, projets, étiquettes, temps de focus). Les identifiants acceptent un id complet, un préfixe \
unique (8 caractères suffisent) ou un nom/titre exact ; un projet se désigne aussi par son alias. \
Les dates sont au format YYYY-MM-DD, ou today / tomorrow. Un titre peut contenir `#etiquette` et \
`@projet`. list_tasks cache par défaut les tâches terminées et archivées. Ne supprime rien sans \
demande explicite de l'utilisateur ; préfère archive_task. L'application de bureau se rafraîchit \
d'elle-même après chaque écriture.";

pub fn serve(db: Db, path: &Path) -> io::Result<()> {
    eprintln!(
        "taffk-cli mcp : serveur prêt sur stdio (base : {})",
        path.display()
    );
    let stdin = io::stdin();
    let mut out = io::stdout().lock();
    for line in stdin.lock().lines() {
        let line = line?;
        if line.trim().is_empty() {
            continue;
        }
        let responses: Vec<Value> = match serde_json::from_str::<Value>(&line) {
            Err(e) => vec![error(Value::Null, -32700, format!("Parse error: {e}"))],
            Ok(Value::Array(batch)) => batch.into_iter().filter_map(|m| handle(&db, m)).collect(),
            Ok(msg) => handle(&db, msg).into_iter().collect(),
        };
        for r in responses {
            serde_json::to_writer(&mut out, &r)?;
            out.write_all(b"\n")?;
            out.flush()?;
        }
    }
    Ok(())
}

fn error(id: Value, code: i64, message: impl Into<String>) -> Value {
    json!({ "jsonrpc": "2.0", "id": id, "error": { "code": code, "message": message.into() } })
}

fn result(id: Value, result: Value) -> Value {
    json!({ "jsonrpc": "2.0", "id": id, "result": result })
}

/// Returns the response for a request, or `None` for a notification (or a
/// stray response, which a server never expects since it sends no requests).
fn handle(db: &Db, msg: Value) -> Option<Value> {
    let id = msg.get("id").cloned();
    let Some(method) = msg.get("method").and_then(Value::as_str) else {
        return id
            .filter(|_| msg.get("result").is_none() && msg.get("error").is_none())
            .map(|id| error(id, -32600, "Invalid Request: missing method"));
    };
    let params = msg.get("params").cloned().unwrap_or(Value::Null);
    let Some(id) = id else {
        // Notifications (`notifications/initialized`, `notifications/cancelled`…) need no reply.
        return None;
    };

    let res = match method {
        "initialize" => {
            let requested = params
                .get("protocolVersion")
                .and_then(Value::as_str)
                .unwrap_or(LATEST_PROTOCOL);
            let version = if SUPPORTED_PROTOCOLS.contains(&requested) {
                requested
            } else {
                LATEST_PROTOCOL
            };
            Ok(json!({
                "protocolVersion": version,
                "capabilities": { "tools": { "listChanged": false } },
                "serverInfo": { "name": "taffk", "title": "Taffk", "version": env!("CARGO_PKG_VERSION") },
                "instructions": INSTRUCTIONS,
            }))
        }
        "ping" => Ok(json!({})),
        "tools/list" => Ok(json!({ "tools": tools() })),
        "tools/call" => {
            let name = params
                .get("name")
                .and_then(Value::as_str)
                .unwrap_or_default();
            let args = params
                .get("arguments")
                .cloned()
                .unwrap_or_else(|| json!({}));
            Ok(match call(db, name, &Args(&args)) {
                Ok(value) => json!({
                    "content": [{ "type": "text", "text": serde_json::to_string_pretty(&value).unwrap_or_default() }],
                    "isError": false,
                }),
                Err(message) => json!({
                    "content": [{ "type": "text", "text": message }],
                    "isError": true,
                }),
            })
        }
        "resources/list" => Ok(json!({ "resources": [] })),
        "prompts/list" => Ok(json!({ "prompts": [] })),
        _ => Err((-32601, format!("Method not found: {method}"))),
    };
    Some(match res {
        Ok(value) => result(id, value),
        Err((code, message)) => error(id, code, message),
    })
}

// ---- tool catalogue -----------------------------------------------------

fn tool(name: &str, description: &str, properties: Value, required: &[&str]) -> Value {
    json!({
        "name": name,
        "description": description,
        "inputSchema": {
            "type": "object",
            "properties": properties,
            "required": required,
            "additionalProperties": false,
        },
    })
}

fn s(desc: &str) -> Value {
    json!({ "type": "string", "description": desc })
}
fn s_or_null(desc: &str) -> Value {
    json!({ "type": ["string", "null"], "description": desc })
}
fn b(desc: &str, default: bool) -> Value {
    json!({ "type": "boolean", "description": desc, "default": default })
}
fn i(desc: &str) -> Value {
    json!({ "type": "integer", "description": desc })
}
fn strs(desc: &str) -> Value {
    json!({ "type": "array", "items": { "type": "string" }, "description": desc })
}
fn status_schema() -> Value {
    json!({ "type": "string", "enum": ops::STATUSES, "description": "Statut : todo, in_progress ou done. `done` coche la tâche, tout autre statut la décoche." })
}

const ID_DESC: &str = "Id de la tâche : id complet, préfixe unique ou titre exact.";
const PROJECT_DESC: &str = "Projet : nom, alias ou id (préfixe accepté).";
const DATE_DESC: &str = "Date YYYY-MM-DD, ou today / tomorrow.";

fn tools() -> Vec<Value> {
    vec![
        tool(
            "list_tasks",
            "Liste les tâches de l'utilisateur. Par défaut : uniquement les tâches non terminées et non archivées, tous projets confondus. Combine les filtres pour cibler (ex. scheduledFor=today pour le plan du jour, query pour une recherche).",
            json!({
                "query": s("Recherche insensible à la casse dans le titre et les notes."),
                "project": s(PROJECT_DESC),
                "tag": s("Étiquette : nom ou id."),
                "status": status_schema(),
                "scheduledFor": s(&format!("Ne garder que les tâches planifiées ce jour-là. {DATE_DESC}")),
                "includeDone": b("Inclure les tâches terminées.", false),
                "includeArchived": b("Inclure les tâches archivées.", false),
                "limit": i("Nombre maximum de tâches renvoyées (défaut 100)."),
            }),
            &[],
        ),
        tool(
            "get_task",
            "Renvoie une tâche complète (notes markdown, projet, étiquettes, dates, temps passé).",
            json!({ "id": s(ID_DESC) }),
            &["id"],
        ),
        tool(
            "create_task",
            "Crée une tâche. Le titre accepte la syntaxe rapide `#etiquette` (créée si absente) et `@projet` (créé si absent). Pour la mettre dans le plan du jour : scheduledFor=today.",
            json!({
                "title": s("Titre, éventuellement avec `#etiquette` et `@projet`."),
                "notes": s("Notes en markdown."),
                "project": s(&format!("{PROJECT_DESC} Doit exister (contrairement à `@projet` dans le titre).")),
                "tags": strs("Noms d'étiquettes, créées si absentes."),
                "scheduledFor": s(&format!("Jour planifié. {DATE_DESC}")),
                "scheduledTime": s("Heure planifiée HH:MM (nécessite scheduledFor)."),
                "dueDate": s(&format!("Échéance. {DATE_DESC}")),
                "estimateMinutes": i("Estimation en minutes."),
                "parent": s("Tâche parente (en fait une sous-tâche ; hérite du projet)."),
            }),
            &["title"],
        ),
        tool(
            "update_task",
            "Modifie une tâche : seuls les champs fournis changent. Passer null à project, scheduledFor, scheduledTime, dueDate ou parent efface la valeur. `tags` remplace l'ensemble des étiquettes.",
            json!({
                "id": s(ID_DESC),
                "title": s("Nouveau titre."),
                "notes": s("Nouvelles notes (remplacent les anciennes)."),
                "project": s_or_null(&format!("{PROJECT_DESC} null pour détacher.")),
                "tags": strs("Nouvel ensemble d'étiquettes (noms)."),
                "status": status_schema(),
                "scheduledFor": s_or_null(&format!("{DATE_DESC} null pour déplanifier.")),
                "scheduledTime": s_or_null("HH:MM, null pour retirer l'heure."),
                "dueDate": s_or_null(&format!("{DATE_DESC} null pour retirer l'échéance.")),
                "estimateMinutes": i("Estimation en minutes."),
                "parent": s_or_null("Nouvelle tâche parente, null pour en faire une tâche de premier niveau."),
            }),
            &["id"],
        ),
        tool(
            "complete_task",
            "Marque une tâche terminée (ou la rouvre avec done=false). Un parent entraîne ses sous-tâches ; un parent se termine quand toutes ses sous-tâches le sont.",
            json!({ "id": s(ID_DESC), "done": b("true pour terminer, false pour rouvrir.", true) }),
            &["id"],
        ),
        tool(
            "archive_task",
            "Archive une tâche (elle disparaît des listes sans être supprimée) ou la désarchive.",
            json!({ "id": s(ID_DESC), "archived": b("true pour archiver, false pour restaurer.", true) }),
            &["id"],
        ),
        tool(
            "delete_task",
            "Supprime définitivement une tâche et ses sous-tâches. Uniquement sur demande explicite de l'utilisateur.",
            json!({ "id": s(ID_DESC) }),
            &["id"],
        ),
        tool(
            "list_projects",
            "Liste les projets avec leur nombre de tâches ouvertes.",
            json!({ "includeArchived": b("Inclure les projets archivés.", false) }),
            &[],
        ),
        tool(
            "create_project",
            "Crée un projet.",
            json!({
                "name": s("Nom du projet."),
                "alias": s("Raccourci utilisable avec `@alias` dans un titre."),
                "color": s("Couleur hex, ex. #1218fc."),
            }),
            &["name"],
        ),
        tool(
            "update_project",
            "Modifie un projet : nom, alias, couleur, épinglage, archivage.",
            json!({
                "id": s(PROJECT_DESC),
                "name": s("Nouveau nom."),
                "alias": s_or_null("Nouvel alias, null pour le retirer."),
                "color": s_or_null("Nouvelle couleur hex, null pour la retirer."),
                "pinned": json!({ "type": "boolean", "description": "Épingler dans la barre latérale." }),
                "archived": json!({ "type": "boolean", "description": "Archiver le projet." }),
            }),
            &["id"],
        ),
        tool(
            "delete_project",
            "Supprime un projet ; ses tâches sont conservées sans projet. Uniquement sur demande explicite.",
            json!({ "id": s(PROJECT_DESC) }),
            &["id"],
        ),
        tool("list_tags", "Liste les étiquettes.", json!({}), &[]),
        tool(
            "create_tag",
            "Crée une étiquette (les noms sont uniques, insensibles à la casse).",
            json!({ "name": s("Nom, sans le #."), "color": s("Couleur hex.") }),
            &["name"],
        ),
        tool(
            "delete_tag",
            "Supprime une étiquette et la retire des tâches. Uniquement sur demande explicite.",
            json!({ "id": s("Étiquette : nom ou id.") }),
            &["id"],
        ),
        tool(
            "log_time",
            "Enregistre une session de travail (ou de pause) terminée. Une session de travail liée à une tâche incrémente son temps passé.",
            json!({
                "task": s("Tâche concernée (optionnel pour une session sans tâche)."),
                "minutes": i("Durée en minutes (> 0)."),
                "kind": json!({ "type": "string", "enum": ["work", "break"], "default": "work", "description": "work ou break." }),
            }),
            &["minutes"],
        ),
        tool(
            "time_summary",
            "Temps de travail et de pause d'une journée, avec la répartition par tâche.",
            json!({ "date": s("Jour YYYY-MM-DD (défaut : aujourd'hui).") }),
            &[],
        ),
        tool(
            "stats",
            "Compteurs globaux (projets, étiquettes, tâches, entrées de temps), date du jour et emplacement du fichier SQLite.",
            json!({}),
            &[],
        ),
    ]
}

// ---- tool execution -----------------------------------------------------

struct Args<'a>(&'a Value);

impl Args<'_> {
    fn str(&self, key: &str) -> Option<String> {
        self.0.get(key).and_then(Value::as_str).map(str::to_string)
    }
    fn required(&self, key: &str) -> Result<String, String> {
        self.str(key)
            .filter(|v| !v.trim().is_empty())
            .ok_or_else(|| format!("paramètre requis manquant : {key}"))
    }
    /// Absent → `None`; `null` → `Some(None)`; string → `Some(Some(_))`.
    fn nullable(&self, key: &str) -> Option<Option<String>> {
        match self.0.get(key) {
            None => None,
            Some(Value::Null) => Some(None),
            Some(v) => Some(v.as_str().map(str::to_string)),
        }
    }
    fn bool(&self, key: &str, default: bool) -> bool {
        self.0.get(key).and_then(Value::as_bool).unwrap_or(default)
    }
    fn opt_bool(&self, key: &str) -> Option<bool> {
        self.0.get(key).and_then(Value::as_bool)
    }
    fn int(&self, key: &str) -> Option<i64> {
        self.0.get(key).and_then(Value::as_i64)
    }
    fn strs(&self, key: &str) -> Option<Vec<String>> {
        self.0.get(key).and_then(Value::as_array).map(|a| {
            a.iter()
                .filter_map(Value::as_str)
                .map(str::to_string)
                .collect()
        })
    }
}

fn call(db: &Db, name: &str, a: &Args) -> Result<Value, String> {
    run(db, name, a).map_err(|e| e.to_string())
}

fn run(db: &Db, name: &str, a: &Args) -> Result<Value, Box<dyn std::error::Error>> {
    match name {
        "list_tasks" => {
            let filter = TaskFilter {
                query: a.str("query"),
                project_id: a
                    .str("project")
                    .map(|p| ops::resolve_project(db, &p).map(|p| p.id))
                    .transpose()?,
                tag_id: a
                    .str("tag")
                    .map(|t| ops::resolve_tag(db, &t).map(|t| t.id))
                    .transpose()?,
                status: a
                    .str("status")
                    .map(|s| ops::validate_status(&s))
                    .transpose()?,
                scheduled_for: a
                    .str("scheduledFor")
                    .map(|d| ops::resolve_date(db, &d))
                    .transpose()?,
                include_done: a.bool("includeDone", false),
                include_archived: a.bool("includeArchived", false),
            };
            let limit = a.int("limit").filter(|n| *n > 0).unwrap_or(100) as usize;
            let mut tasks = ops::filter_tasks(db.list_tasks()?, &filter);
            let total = tasks.len();
            tasks.truncate(limit);
            let views = ops::task_views(db, tasks)?;
            Ok(json!({ "total": total, "returned": views.len(), "tasks": views }))
        }
        "get_task" => {
            let task = ops::resolve_task(db, &a.required("id")?)?;
            Ok(serde_json::to_value(ops::task_view(db, task)?)?)
        }
        "create_task" => {
            let task = ops::add_task(
                db,
                AddTask {
                    text: a.required("title")?,
                    notes: a.str("notes"),
                    project: a.str("project"),
                    tags: a.strs("tags").unwrap_or_default(),
                    scheduled_for: a.str("scheduledFor"),
                    scheduled_time: a.str("scheduledTime"),
                    due_date: a.str("dueDate"),
                    estimate_minutes: a.int("estimateMinutes"),
                    parent: a.str("parent"),
                },
            )?;
            task_json(db, task)
        }
        "update_task" => {
            let edit = EditTask {
                title: a.str("title"),
                notes: a.str("notes"),
                project: a.nullable("project"),
                tags: a.strs("tags"),
                status: a.str("status"),
                scheduled_for: a.nullable("scheduledFor"),
                scheduled_time: a.nullable("scheduledTime"),
                due_date: a.nullable("dueDate"),
                estimate_minutes: a.int("estimateMinutes"),
                parent: a.nullable("parent"),
            };
            task_json(db, ops::edit_task(db, &a.required("id")?, edit)?)
        }
        "complete_task" => task_json(
            db,
            ops::set_done(db, &a.required("id")?, a.bool("done", true))?,
        ),
        "archive_task" => {
            let task = ops::resolve_task(db, &a.required("id")?)?;
            task_json(
                db,
                db.set_task_archived(&task.id, a.bool("archived", true))?,
            )
        }
        "delete_task" => {
            let task = ops::resolve_task(db, &a.required("id")?)?;
            db.delete_task(&task.id)?;
            Ok(json!({ "deleted": task.id, "title": task.title }))
        }
        "list_projects" => {
            let include_archived = a.bool("includeArchived", false);
            let tasks = db.list_tasks()?;
            let projects: Vec<Value> = db
                .list_projects()?
                .into_iter()
                .filter(|p| include_archived || !p.archived)
                .map(|p| {
                    let open = tasks
                        .iter()
                        .filter(|t| {
                            t.project_id.as_deref() == Some(p.id.as_str()) && !t.done && !t.archived
                        })
                        .count();
                    let mut v = serde_json::to_value(&p).unwrap_or_default();
                    v["openTasks"] = json!(open);
                    v
                })
                .collect();
            Ok(json!({ "projects": projects }))
        }
        "create_project" => {
            let p = db.create_project(
                &a.required("name")?,
                a.str("color").as_deref(),
                a.str("alias").as_deref(),
            )?;
            Ok(to_json(&p))
        }
        "update_project" => {
            let p = ops::resolve_project(db, &a.required("id")?)?;
            let name = a.str("name").unwrap_or_else(|| p.name.clone());
            let alias = match a.nullable("alias") {
                Some(v) => v,
                None => p.alias.clone(),
            };
            let color = match a.nullable("color") {
                Some(v) => v,
                None => p.color.clone(),
            };
            let mut updated =
                db.update_project(&p.id, &name, color.as_deref(), alias.as_deref())?;
            if let Some(pinned) = a.opt_bool("pinned") {
                updated = db.set_project_pinned(&p.id, pinned)?;
            }
            if let Some(archived) = a.opt_bool("archived") {
                updated = db.set_project_archived(&p.id, archived)?;
            }
            Ok(to_json(&updated))
        }
        "delete_project" => {
            let p = ops::resolve_project(db, &a.required("id")?)?;
            db.delete_project(&p.id)?;
            Ok(json!({ "deleted": p.id, "name": p.name }))
        }
        "list_tags" => Ok(json!({ "tags": db.list_tags()? })),
        "create_tag" => {
            let name = a.required("name")?;
            let ids = ops::ensure_tags(db, &[name])?;
            let tag = ops::resolve_tag(db, &ids[0])?;
            if let Some(color) = a.str("color") {
                return Ok(to_json(&db.update_tag(&tag.id, &tag.name, Some(&color))?));
            }
            Ok(to_json(&tag))
        }
        "delete_tag" => {
            let t = ops::resolve_tag(db, &a.required("id")?)?;
            db.delete_tag(&t.id)?;
            Ok(json!({ "deleted": t.id, "name": t.name }))
        }
        "log_time" => {
            let minutes = a
                .int("minutes")
                .ok_or("paramètre requis manquant : minutes")?;
            if minutes <= 0 {
                return Err(Box::new(OpsError::Invalid("minutes doit être > 0".into())));
            }
            let kind = a.str("kind").unwrap_or_else(|| "work".into());
            if kind != "work" && kind != "break" {
                return Err(Box::new(OpsError::Invalid(
                    "kind doit être work ou break".into(),
                )));
            }
            let task_id = a
                .str("task")
                .map(|t| ops::resolve_task(db, &t).map(|t| t.id))
                .transpose()?;
            let task = db.log_time(task_id.as_deref(), minutes * 60, &kind)?;
            let task = task.map(|t| ops::task_view(db, t)).transpose()?;
            Ok(json!({ "minutes": minutes, "kind": kind, "task": task }))
        }
        "time_summary" => {
            let date = match a.str("date") {
                Some(d) => ops::resolve_date(db, &d)?,
                None => db.utc_date(0)?,
            };
            Ok(serde_json::to_value(ops::time_summary(db, &date)?)?)
        }
        "stats" => {
            let (projects, tags, tasks, time_entries) = db.counts()?;
            Ok(json!({
                "projects": projects, "tags": tags, "tasks": tasks, "timeEntries": time_entries,
                "today": db.local_date(0)?,
                "workSecondsToday": db.time_today()?,
            }))
        }
        _ => Err(format!("outil inconnu : {name}").into()),
    }
}

fn task_json(db: &Db, task: TaskDto) -> Result<Value, Box<dyn std::error::Error>> {
    Ok(serde_json::to_value(ops::task_view(db, task)?)?)
}

fn to_json<T: serde::Serialize>(v: &T) -> Value {
    serde_json::to_value(v).unwrap_or_default()
}
