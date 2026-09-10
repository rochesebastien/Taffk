//! Human-readable output (the `--json` path bypasses all of this).

use taffk_core::models::{ProjectDto, TagDto, TaskDto};
use taffk_core::ops::{short_id, TaskView, TimeSummary};

fn mark(t: &TaskDto) -> &'static str {
    match (t.done, t.status.as_str()) {
        (true, _) => "[x]",
        (_, "in_progress") => "[~]",
        _ => "[ ]",
    }
}

fn details(v: &TaskView) -> String {
    let t = &v.task;
    let mut parts: Vec<String> = Vec::new();
    if let Some(p) = &v.project_name {
        parts.push(format!("@{p}"));
    }
    for tag in &v.tag_names {
        parts.push(format!("#{tag}"));
    }
    if let Some(d) = &t.scheduled_for {
        match &t.scheduled_time {
            Some(h) => parts.push(format!("{d} {h}")),
            None => parts.push(d.clone()),
        }
    }
    if let Some(d) = &t.due_date {
        parts.push(format!("échéance {d}"));
    }
    if t.estimate_minutes > 0 {
        parts.push(format!("~{}", minutes(t.estimate_minutes)));
    }
    if t.spent_minutes > 0 {
        parts.push(format!("{} passées", minutes(t.spent_minutes)));
    }
    if t.archived {
        parts.push("archivée".into());
    }
    parts.join("  ")
}

pub fn minutes(m: i64) -> String {
    if m >= 60 {
        format!("{}h{:02}", m / 60, m % 60)
    } else {
        format!("{m}min")
    }
}

pub fn task_line(v: &TaskView) {
    let indent = if v.task.parent_id.is_some() {
        "  └ "
    } else {
        ""
    };
    let d = details(v);
    if d.is_empty() {
        println!("{} {}  {indent}{}", mark(&v.task), v.short_id, v.task.title);
    } else {
        println!(
            "{} {}  {indent}{}  ·  {d}",
            mark(&v.task),
            v.short_id,
            v.task.title
        );
    }
}

pub fn tasks(views: &[TaskView]) {
    if views.is_empty() {
        println!("Aucune tâche.");
        return;
    }
    // Parents first, each followed by its subtasks, so the tree reads top-down.
    let top: Vec<&TaskView> = views
        .iter()
        .filter(|v| v.task.parent_id.is_none())
        .collect();
    let orphans: Vec<&TaskView> = views
        .iter()
        .filter(|v| {
            v.task
                .parent_id
                .as_deref()
                .map_or(false, |p| !views.iter().any(|x| x.task.id == p))
        })
        .collect();
    for v in top.iter().chain(orphans.iter()) {
        task_line(v);
        for child in views
            .iter()
            .filter(|c| c.task.parent_id.as_deref() == Some(v.task.id.as_str()))
        {
            task_line(child);
        }
    }
}

pub fn task_detail(v: &TaskView) {
    let t = &v.task;
    println!("{}  {}", mark(t), t.title);
    println!("id         {}", t.id);
    println!(
        "statut     {}{}",
        t.status,
        if t.archived { " (archivée)" } else { "" }
    );
    println!("projet     {}", v.project_name.as_deref().unwrap_or("—"));
    println!(
        "étiquettes {}",
        if v.tag_names.is_empty() {
            "—".to_string()
        } else {
            v.tag_names
                .iter()
                .map(|n| format!("#{n}"))
                .collect::<Vec<_>>()
                .join(" ")
        }
    );
    println!(
        "planifiée  {}{}",
        t.scheduled_for.as_deref().unwrap_or("—"),
        t.scheduled_time
            .as_deref()
            .map(|h| format!(" {h}"))
            .unwrap_or_default()
    );
    println!("échéance   {}", t.due_date.as_deref().unwrap_or("—"));
    println!(
        "estimation {}",
        if t.estimate_minutes > 0 {
            minutes(t.estimate_minutes)
        } else {
            "—".into()
        }
    );
    println!(
        "passé      {}",
        if t.spent_minutes > 0 {
            minutes(t.spent_minutes)
        } else {
            "—".into()
        }
    );
    if let Some(p) = &t.parent_id {
        println!("parente    {}", short_id(p));
    }
    println!("créée      {}", t.created_at);
    if let Some(c) = &t.completed_at {
        println!("terminée   {c}");
    }
    if !t.notes.trim().is_empty() {
        println!("\n{}", t.notes.trim_end());
    }
}

pub fn projects(projects: &[ProjectDto], tasks: &[TaskDto]) {
    if projects.is_empty() {
        println!("Aucun projet.");
        return;
    }
    for p in projects {
        let open = tasks
            .iter()
            .filter(|t| t.project_id.as_deref() == Some(p.id.as_str()) && !t.done && !t.archived)
            .count();
        let mut extra: Vec<String> = Vec::new();
        if let Some(a) = &p.alias {
            extra.push(format!("@{a}"));
        }
        if p.pinned {
            extra.push("épinglé".into());
        }
        if p.archived {
            extra.push("archivé".into());
        }
        let extra = if extra.is_empty() {
            String::new()
        } else {
            format!("  ·  {}", extra.join("  "))
        };
        println!("{}  {}  ({open} à faire){extra}", short_id(&p.id), p.name);
    }
}

pub fn tags(tags: &[TagDto], tasks: &[TaskDto]) {
    if tags.is_empty() {
        println!("Aucune étiquette.");
        return;
    }
    for t in tags {
        let n = tasks
            .iter()
            .filter(|x| x.tag_ids.iter().any(|id| id == &t.id) && !x.archived)
            .count();
        println!("{}  #{}  ({n} tâches)", short_id(&t.id), t.name);
    }
}

pub fn time_summary(s: &TimeSummary) {
    println!(
        "{} — travail {}, pauses {}",
        s.date,
        minutes(s.work_seconds / 60),
        minutes(s.break_seconds / 60)
    );
    for t in &s.per_task {
        println!(
            "  {}  {}",
            minutes(t.seconds / 60),
            t.title.as_deref().unwrap_or("(sans tâche)")
        );
    }
}

pub fn stats(path: &str, bytes: u64, projects: i64, tags: i64, tasks: i64, entries: i64) {
    println!("base       {path}");
    println!(
        "taille     {}",
        if bytes < 1024 * 1024 {
            format!("{} Ko", bytes / 1024)
        } else {
            format!("{:.1} Mo", bytes as f64 / 1024.0 / 1024.0)
        }
    );
    println!("projets    {projects}");
    println!("étiquettes {tags}");
    println!("tâches     {tasks}");
    println!("temps      {entries} entrées");
}
