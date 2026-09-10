//! `taffk-cli`: drive the same SQLite file as the desktop app from a terminal,
//! a script (`--json`) or an AI agent (`taffk-cli mcp` runs an MCP server on
//! stdio). All business rules live in `taffk_core::ops`; this file only maps
//! argv onto them and prints the result.

mod mcp;
mod render;

use std::path::PathBuf;
use std::process::ExitCode;

use clap::{Args, Parser, Subcommand};
use serde::Serialize;
use serde_json::{json, Value};
use taffk_core::models::{Backup, BackupSelection};
use taffk_core::ops::{self, AddTask, EditTask, TaskFilter};
use taffk_core::{paths, Db};

const SKILL_MD: &str = include_str!("../../../../skills/taffk/SKILL.md");

#[derive(Parser)]
#[command(
    name = "taffk-cli",
    version,
    about = "Taffk en ligne de commande : tâches, projets, étiquettes, temps — et serveur MCP.",
    after_help = "Les identifiants acceptent un id complet, un préfixe unique ou un nom/titre exact.\n\
                  Base de données : $TAFFK_DB, sinon celle de l'application (voir `taffk-cli db path`)."
)]
struct Cli {
    /// Fichier SQLite à utiliser (défaut : celui de l'application, ou $TAFFK_DB)
    #[arg(long, global = true, value_name = "FICHIER")]
    db: Option<PathBuf>,
    /// Sortie JSON, pour les scripts et les agents
    #[arg(long, global = true)]
    json: bool,
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Tâches : lister, ajouter, modifier, terminer…
    #[command(subcommand)]
    Task(TaskCmd),
    /// Projets
    #[command(subcommand)]
    Project(ProjectCmd),
    /// Étiquettes
    #[command(subcommand)]
    Tag(TagCmd),
    /// Temps de travail (sessions de focus)
    #[command(subcommand)]
    Time(TimeCmd),
    /// Compteurs et emplacement de la base
    Stats,
    /// Exporte toute la base dans un fichier JSON
    Export {
        /// Fichier de destination
        path: PathBuf,
    },
    /// Remplace toute la base par un export JSON (irréversible)
    Import {
        /// Fichier exporté par `export` ou par l'application
        path: PathBuf,
    },
    /// Base de données
    #[command(subcommand)]
    Db(DbCmd),
    /// Lance le serveur MCP (stdio) pour les agents IA
    Mcp,
    /// Skill « taffk » pour Claude Code et les agents compatibles
    #[command(subcommand)]
    Skill(SkillCmd),
}

#[derive(Subcommand)]
enum TaskCmd {
    /// Liste les tâches (non terminées et non archivées par défaut)
    List(ListArgs),
    /// Ajoute une tâche ; le titre accepte `#etiquette` et `@projet`
    Add(AddArgs),
    /// Affiche une tâche, notes comprises
    Show { handle: String },
    /// Modifie une tâche
    Edit(EditArgs),
    /// Marque une tâche terminée
    Done { handle: String },
    /// Rouvre une tâche terminée
    Undone { handle: String },
    /// Passe une tâche « en cours »
    Start { handle: String },
    /// Change le statut (todo, in_progress, done)
    Status { handle: String, status: String },
    /// Archive (ou désarchive avec --undo) une tâche
    Archive {
        handle: String,
        #[arg(long)]
        undo: bool,
    },
    /// Supprime une tâche et ses sous-tâches
    Rm { handle: String },
}

#[derive(Args)]
struct ListArgs {
    /// Seulement les tâches planifiées aujourd'hui
    #[arg(long, conflicts_with = "date")]
    today: bool,
    /// Tâches planifiées à cette date (YYYY-MM-DD, today, tomorrow)
    #[arg(long, value_name = "DATE")]
    date: Option<String>,
    /// Filtre par projet (nom, alias ou id)
    #[arg(long, short, value_name = "PROJET")]
    project: Option<String>,
    /// Filtre par étiquette
    #[arg(long, short, value_name = "ETIQUETTE")]
    tag: Option<String>,
    /// Filtre par statut (todo, in_progress, done)
    #[arg(long, short, value_name = "STATUT")]
    status: Option<String>,
    /// Recherche dans le titre et les notes
    #[arg(long, short, value_name = "TEXTE")]
    query: Option<String>,
    /// Inclut les tâches terminées
    #[arg(long)]
    done: bool,
    /// Inclut les tâches archivées
    #[arg(long)]
    archived: bool,
}

#[derive(Args)]
struct AddArgs {
    /// Titre (les mots sont joints) ; `#etiquette` et `@projet` sont interprétés
    #[arg(required = true, num_args = 1.., value_name = "TITRE")]
    text: Vec<String>,
    /// Projet existant (nom, alias ou id)
    #[arg(long, short, value_name = "PROJET")]
    project: Option<String>,
    /// Étiquette (répétable), créée si besoin
    #[arg(long, short, value_name = "ETIQUETTE")]
    tag: Vec<String>,
    /// Jour planifié (YYYY-MM-DD, today, tomorrow)
    #[arg(long, short, value_name = "DATE")]
    date: Option<String>,
    /// Heure planifiée (HH:MM)
    #[arg(long, value_name = "HEURE")]
    time: Option<String>,
    /// Échéance (YYYY-MM-DD)
    #[arg(long, value_name = "DATE")]
    due: Option<String>,
    /// Estimation en minutes
    #[arg(long, short, value_name = "MINUTES")]
    estimate: Option<i64>,
    /// Notes (markdown)
    #[arg(long, short, value_name = "TEXTE")]
    notes: Option<String>,
    /// Tâche parente (en fait une sous-tâche)
    #[arg(long, value_name = "TACHE")]
    parent: Option<String>,
}

#[derive(Args)]
struct EditArgs {
    handle: String,
    #[arg(long, value_name = "TITRE")]
    title: Option<String>,
    #[arg(long, value_name = "TEXTE")]
    notes: Option<String>,
    /// Rattache à un projet existant
    #[arg(long, short, value_name = "PROJET", conflicts_with = "no_project")]
    project: Option<String>,
    /// Détache du projet
    #[arg(long)]
    no_project: bool,
    /// Remplace toutes les étiquettes (séparées par des virgules)
    #[arg(long, value_delimiter = ',', value_name = "A,B,C")]
    tags: Option<Vec<String>>,
    /// Statut : todo, in_progress, done
    #[arg(long, short, value_name = "STATUT")]
    status: Option<String>,
    #[arg(long, short, value_name = "DATE", conflicts_with = "no_date")]
    date: Option<String>,
    /// Retire la date planifiée
    #[arg(long)]
    no_date: bool,
    #[arg(long, value_name = "HEURE", conflicts_with = "no_time")]
    time: Option<String>,
    #[arg(long)]
    no_time: bool,
    #[arg(long, value_name = "DATE", conflicts_with = "no_due")]
    due: Option<String>,
    #[arg(long)]
    no_due: bool,
    #[arg(long, short, value_name = "MINUTES")]
    estimate: Option<i64>,
    #[arg(long, value_name = "TACHE", conflicts_with = "no_parent")]
    parent: Option<String>,
    /// Transforme la sous-tâche en tâche de premier niveau
    #[arg(long)]
    no_parent: bool,
}

#[derive(Subcommand)]
enum ProjectCmd {
    /// Liste les projets
    List {
        /// Inclut les projets archivés
        #[arg(long)]
        archived: bool,
    },
    /// Crée un projet
    Add {
        name: String,
        /// Couleur (hex, ex. #1218fc)
        #[arg(long)]
        color: Option<String>,
        /// Raccourci utilisable avec `@alias`
        #[arg(long)]
        alias: Option<String>,
    },
    /// Modifie un projet
    Edit {
        handle: String,
        #[arg(long)]
        name: Option<String>,
        #[arg(long)]
        color: Option<String>,
        #[arg(long)]
        alias: Option<String>,
    },
    /// Épingle (ou désépingle avec --undo) un projet dans la barre latérale
    Pin {
        handle: String,
        #[arg(long)]
        undo: bool,
    },
    /// Archive (ou désarchive avec --undo) un projet
    Archive {
        handle: String,
        #[arg(long)]
        undo: bool,
    },
    /// Supprime un projet (ses tâches sont conservées, sans projet)
    Rm { handle: String },
}

#[derive(Subcommand)]
enum TagCmd {
    /// Liste les étiquettes
    List,
    /// Crée une étiquette
    Add {
        name: String,
        #[arg(long)]
        color: Option<String>,
    },
    /// Renomme ou recolore une étiquette
    Edit {
        handle: String,
        #[arg(long)]
        name: Option<String>,
        #[arg(long)]
        color: Option<String>,
    },
    /// Supprime une étiquette (retirée des tâches)
    Rm { handle: String },
}

#[derive(Subcommand)]
enum TimeCmd {
    /// Enregistre des minutes de travail sur une tâche (ou sans tâche avec `-`)
    Log {
        /// Tâche, ou `-` pour une session sans tâche
        task: String,
        minutes: i64,
        /// Enregistre une pause plutôt que du travail
        #[arg(long = "break")]
        is_break: bool,
    },
    /// Résumé du jour (ou d'une date avec --date)
    Summary {
        #[arg(long, value_name = "YYYY-MM-DD")]
        date: Option<String>,
    },
}

#[derive(Subcommand)]
enum DbCmd {
    /// Affiche le chemin du fichier SQLite utilisé
    Path,
}

#[derive(Subcommand)]
enum SkillCmd {
    /// Affiche le contenu du skill (SKILL.md)
    Show,
    /// Installe le skill (défaut : ~/.claude/skills/taffk)
    Install {
        /// Dossier de skills cible
        #[arg(long, value_name = "DOSSIER")]
        dir: Option<PathBuf>,
    },
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Stats {
    path: String,
    file_bytes: u64,
    projects: i64,
    tags: i64,
    tasks: i64,
    time_entries: i64,
}

type CmdResult = Result<Value, Box<dyn std::error::Error>>;

fn main() -> ExitCode {
    let cli = Cli::parse();
    let json = cli.json;
    match run(cli) {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            if json {
                println!("{}", json!({ "error": e.to_string() }));
            } else {
                eprintln!("erreur : {e}");
            }
            ExitCode::FAILURE
        }
    }
}

fn open_db(explicit: Option<PathBuf>) -> Result<(Db, PathBuf), Box<dyn std::error::Error>> {
    let path = paths::resolve_db_path(explicit)
        .ok_or("impossible de déterminer le dossier de données de l'application")?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    Ok((Db::open(&path)?, path))
}

fn run(cli: Cli) -> Result<(), Box<dyn std::error::Error>> {
    // The skill is static: no need to touch the database.
    if let Command::Skill(cmd) = &cli.command {
        return skill(cmd, cli.json);
    }

    let (db, path) = open_db(cli.db)?;

    if let Command::Mcp = cli.command {
        return mcp::serve(db, &path).map_err(Into::into);
    }

    let value = match cli.command {
        Command::Task(cmd) => task(&db, cmd, cli.json)?,
        Command::Project(cmd) => project(&db, cmd, cli.json)?,
        Command::Tag(cmd) => tag(&db, cmd, cli.json)?,
        Command::Time(cmd) => time(&db, cmd, cli.json)?,
        Command::Stats => {
            let (projects, tags, tasks, time_entries) = db.counts()?;
            let stats = Stats {
                path: path.to_string_lossy().into_owned(),
                file_bytes: std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0),
                projects,
                tags,
                tasks,
                time_entries,
            };
            if !cli.json {
                render::stats(
                    &stats.path,
                    stats.file_bytes,
                    stats.projects,
                    stats.tags,
                    stats.tasks,
                    stats.time_entries,
                );
            }
            serde_json::to_value(stats)?
        }
        Command::Export { path: out } => {
            let backup = db.export_backup(ALL)?;
            std::fs::write(&out, serde_json::to_string_pretty(&backup)?)?;
            if !cli.json {
                println!(
                    "Exporté : {} projets, {} étiquettes, {} tâches, {} entrées de temps → {}",
                    backup.projects.len(),
                    backup.tags.len(),
                    backup.tasks.len(),
                    backup.time_entries.len(),
                    out.display()
                );
            }
            json!({ "path": out, "tasks": backup.tasks.len(), "projects": backup.projects.len() })
        }
        Command::Import { path: src } => {
            let backup: Backup = serde_json::from_str(&std::fs::read_to_string(&src)?)?;
            db.import_backup(&backup, ALL)?;
            if !cli.json {
                println!(
                    "Importé depuis {} ({} tâches).",
                    src.display(),
                    backup.tasks.len()
                );
            }
            json!({ "path": src, "tasks": backup.tasks.len() })
        }
        Command::Db(DbCmd::Path) => {
            if !cli.json {
                println!("{}", path.display());
            }
            json!({ "path": path })
        }
        Command::Mcp | Command::Skill(_) => unreachable!("handled above"),
    };

    if cli.json {
        println!("{}", serde_json::to_string_pretty(&value)?);
    }
    Ok(())
}

const ALL: BackupSelection = BackupSelection {
    projects: true,
    tags: true,
    tasks: true,
    time_entries: true,
};

fn task(db: &Db, cmd: TaskCmd, json: bool) -> CmdResult {
    match cmd {
        TaskCmd::List(a) => {
            let scheduled_for = if a.today {
                Some(db.local_date(0)?)
            } else {
                a.date
                    .as_deref()
                    .map(|d| ops::resolve_date(db, d))
                    .transpose()?
            };
            let filter = TaskFilter {
                query: a.query,
                project_id: a
                    .project
                    .as_deref()
                    .map(|p| ops::resolve_project(db, p).map(|p| p.id))
                    .transpose()?,
                tag_id: a
                    .tag
                    .as_deref()
                    .map(|t| ops::resolve_tag(db, t).map(|t| t.id))
                    .transpose()?,
                status: a.status.as_deref().map(ops::validate_status).transpose()?,
                scheduled_for,
                include_done: a.done,
                include_archived: a.archived,
            };
            let views = ops::task_views(db, ops::filter_tasks(db.list_tasks()?, &filter))?;
            if !json {
                render::tasks(&views);
            }
            Ok(serde_json::to_value(views)?)
        }
        TaskCmd::Add(a) => {
            let task = ops::add_task(
                db,
                AddTask {
                    text: a.text.join(" "),
                    notes: a.notes,
                    project: a.project,
                    tags: a.tag,
                    scheduled_for: a.date,
                    scheduled_time: a.time,
                    due_date: a.due,
                    estimate_minutes: a.estimate,
                    parent: a.parent,
                },
            )?;
            one_task(db, task, json, "Ajoutée")
        }
        TaskCmd::Show { handle } => {
            let view = ops::task_view(db, ops::resolve_task(db, &handle)?)?;
            if !json {
                render::task_detail(&view);
            }
            Ok(serde_json::to_value(view)?)
        }
        TaskCmd::Edit(a) => {
            let edit = EditTask {
                title: a.title,
                notes: a.notes,
                project: if a.no_project {
                    Some(None)
                } else {
                    a.project.map(Some)
                },
                tags: a.tags,
                status: a.status,
                scheduled_for: if a.no_date {
                    Some(None)
                } else {
                    a.date.map(Some)
                },
                scheduled_time: if a.no_time {
                    Some(None)
                } else {
                    a.time.map(Some)
                },
                due_date: if a.no_due {
                    Some(None)
                } else {
                    a.due.map(Some)
                },
                estimate_minutes: a.estimate,
                parent: if a.no_parent {
                    Some(None)
                } else {
                    a.parent.map(Some)
                },
            };
            one_task(db, ops::edit_task(db, &a.handle, edit)?, json, "Modifiée")
        }
        TaskCmd::Done { handle } => {
            one_task(db, ops::set_done(db, &handle, true)?, json, "Terminée")
        }
        TaskCmd::Undone { handle } => {
            one_task(db, ops::set_done(db, &handle, false)?, json, "Rouverte")
        }
        TaskCmd::Start { handle } => one_task(
            db,
            ops::set_status(db, &handle, "in_progress")?,
            json,
            "En cours",
        ),
        TaskCmd::Status { handle, status } => one_task(
            db,
            ops::set_status(db, &handle, &status)?,
            json,
            "Statut mis à jour",
        ),
        TaskCmd::Archive { handle, undo } => {
            let task = ops::resolve_task(db, &handle)?;
            one_task(
                db,
                db.set_task_archived(&task.id, !undo)?,
                json,
                if undo { "Désarchivée" } else { "Archivée" },
            )
        }
        TaskCmd::Rm { handle } => {
            let task = ops::resolve_task(db, &handle)?;
            db.delete_task(&task.id)?;
            if !json {
                println!("Supprimée : {}", task.title);
            }
            Ok(json!({ "deleted": task.id }))
        }
    }
}

fn one_task(db: &Db, task: taffk_core::models::TaskDto, json: bool, verb: &str) -> CmdResult {
    let view = ops::task_view(db, task)?;
    if !json {
        print!("{verb} : ");
        render::task_line(&view);
    }
    Ok(serde_json::to_value(view)?)
}

fn project(db: &Db, cmd: ProjectCmd, json: bool) -> CmdResult {
    let done = |p: taffk_core::models::ProjectDto, verb: &str| -> CmdResult {
        if !json {
            println!("{verb} : {} ({})", p.name, ops::short_id(&p.id));
        }
        Ok(serde_json::to_value(p)?)
    };
    match cmd {
        ProjectCmd::List { archived } => {
            let projects: Vec<_> = db
                .list_projects()?
                .into_iter()
                .filter(|p| archived || !p.archived)
                .collect();
            if !json {
                let tasks = db.list_tasks()?;
                render::projects(&projects, &tasks);
            }
            Ok(serde_json::to_value(projects)?)
        }
        ProjectCmd::Add { name, color, alias } => done(
            db.create_project(&name, color.as_deref(), alias.as_deref())?,
            "Créé",
        ),
        ProjectCmd::Edit {
            handle,
            name,
            color,
            alias,
        } => {
            let p = ops::resolve_project(db, &handle)?;
            let updated = db.update_project(
                &p.id,
                name.as_deref().unwrap_or(&p.name),
                color.as_deref().or(p.color.as_deref()),
                alias.as_deref().or(p.alias.as_deref()),
            )?;
            done(updated, "Modifié")
        }
        ProjectCmd::Pin { handle, undo } => {
            let p = ops::resolve_project(db, &handle)?;
            done(
                db.set_project_pinned(&p.id, !undo)?,
                if undo { "Désépinglé" } else { "Épinglé" },
            )
        }
        ProjectCmd::Archive { handle, undo } => {
            let p = ops::resolve_project(db, &handle)?;
            done(
                db.set_project_archived(&p.id, !undo)?,
                if undo { "Désarchivé" } else { "Archivé" },
            )
        }
        ProjectCmd::Rm { handle } => {
            let p = ops::resolve_project(db, &handle)?;
            db.delete_project(&p.id)?;
            if !json {
                println!("Supprimé : {}", p.name);
            }
            Ok(json!({ "deleted": p.id }))
        }
    }
}

fn tag(db: &Db, cmd: TagCmd, json: bool) -> CmdResult {
    match cmd {
        TagCmd::List => {
            let tags = db.list_tags()?;
            if !json {
                let tasks = db.list_tasks()?;
                render::tags(&tags, &tasks);
            }
            Ok(serde_json::to_value(tags)?)
        }
        TagCmd::Add { name, color } => {
            let t = db.create_tag(name.trim_start_matches('#'), color.as_deref())?;
            if !json {
                println!("Créée : #{}", t.name);
            }
            Ok(serde_json::to_value(t)?)
        }
        TagCmd::Edit {
            handle,
            name,
            color,
        } => {
            let t = ops::resolve_tag(db, &handle)?;
            let updated = db.update_tag(
                &t.id,
                name.as_deref().unwrap_or(&t.name),
                color.as_deref().or(t.color.as_deref()),
            )?;
            if !json {
                println!("Modifiée : #{}", updated.name);
            }
            Ok(serde_json::to_value(updated)?)
        }
        TagCmd::Rm { handle } => {
            let t = ops::resolve_tag(db, &handle)?;
            db.delete_tag(&t.id)?;
            if !json {
                println!("Supprimée : #{}", t.name);
            }
            Ok(json!({ "deleted": t.id }))
        }
    }
}

fn time(db: &Db, cmd: TimeCmd, json: bool) -> CmdResult {
    match cmd {
        TimeCmd::Log {
            task,
            minutes,
            is_break,
        } => {
            if minutes <= 0 {
                return Err("le nombre de minutes doit être positif".into());
            }
            let task_id = if task == "-" {
                None
            } else {
                Some(ops::resolve_task(db, &task)?.id)
            };
            let kind = if is_break { "break" } else { "work" };
            let updated = db.log_time(task_id.as_deref(), minutes * 60, kind)?;
            if !json {
                match &updated {
                    Some(t) => println!(
                        "{minutes} min de travail sur « {} » (total : {} min)",
                        t.title, t.spent_minutes
                    ),
                    None => println!(
                        "{minutes} min de {} enregistrées",
                        if is_break { "pause" } else { "travail" }
                    ),
                }
            }
            Ok(json!({ "minutes": minutes, "kind": kind, "task": updated }))
        }
        TimeCmd::Summary { date } => {
            let date = match date {
                Some(d) => ops::resolve_date(db, &d)?,
                None => db.utc_date(0)?,
            };
            let summary = ops::time_summary(db, &date)?;
            if !json {
                render::time_summary(&summary);
            }
            Ok(serde_json::to_value(summary)?)
        }
    }
}

fn skill(cmd: &SkillCmd, json: bool) -> Result<(), Box<dyn std::error::Error>> {
    match cmd {
        SkillCmd::Show => {
            if json {
                println!("{}", json!({ "name": "taffk", "content": SKILL_MD }));
            } else {
                print!("{SKILL_MD}");
            }
        }
        SkillCmd::Install { dir } => {
            let dir = match dir {
                Some(d) => d.clone(),
                None => dirs::home_dir()
                    .ok_or("dossier personnel introuvable")?
                    .join(".claude")
                    .join("skills")
                    .join("taffk"),
            };
            std::fs::create_dir_all(&dir)?;
            let file = dir.join("SKILL.md");
            std::fs::write(&file, SKILL_MD)?;
            if json {
                println!("{}", json!({ "installed": file }));
            } else {
                println!("Skill installé : {}", file.display());
            }
        }
    }
    Ok(())
}
