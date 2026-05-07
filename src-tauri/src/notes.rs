use ignore::WalkBuilder;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::RwLock;

#[derive(Default, Clone, Debug, Deserialize, Serialize)]
pub struct Frontmatter {
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub id: Option<String>,
    #[serde(default)]
    pub code: Option<String>,
}

pub struct Note {
    pub path: PathBuf,
    pub content: String,
    pub body: String,
    pub frontmatter: Frontmatter,
}

#[derive(Serialize, Clone)]
pub struct NoteDto {
    pub path: String,
    pub content: String,
    pub body: String,
    pub frontmatter: Frontmatter,
}

impl From<&Note> for NoteDto {
    fn from(n: &Note) -> Self {
        Self {
            path: n.path.to_string_lossy().into_owned(),
            content: n.content.clone(),
            body: n.body.clone(),
            frontmatter: n.frontmatter.clone(),
        }
    }
}

#[derive(Serialize, Clone)]
pub struct NoteListEntry {
    pub path: String,
    pub name: String,
}

impl From<&Note> for NoteListEntry {
    fn from(n: &Note) -> Self {
        Self {
            path: n.path.to_string_lossy().into_owned(),
            name: n
                .path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("(unnamed)")
                .to_string(),
        }
    }
}

impl Note {
    pub fn from_disk(path: PathBuf, content: String) -> Self {
        let (frontmatter, body) = parse_frontmatter(&content);
        Self {
            path,
            content,
            body,
            frontmatter,
        }
    }
}

pub struct NotesStore {
    pub notes: RwLock<Vec<Note>>,
}

impl NotesStore {
    pub fn new() -> Self {
        Self {
            notes: RwLock::new(Vec::new()),
        }
    }

    pub fn load_all(&self, dir: &Path) {
        let mut loaded = Vec::new();
        let walker = WalkBuilder::new(dir)
            .git_ignore(false)
            .git_global(false)
            .git_exclude(false)
            .ignore(false)
            .hidden(false)
            .build();

        for result in walker {
            let entry = match result {
                Ok(e) => e,
                Err(_) => continue,
            };
            if !entry.file_type().map(|t| t.is_file()).unwrap_or(false) {
                continue;
            }
            let path = entry.path();
            if !is_target_file(path) {
                continue;
            }
            if let Ok(content) = std::fs::read_to_string(path) {
                loaded.push(Note::from_disk(path.to_path_buf(), content));
            }
        }

        *self.notes.write().unwrap() = loaded;
    }

    pub fn upsert_from_disk(&self, path: &Path) {
        if !is_target_file(path) {
            return;
        }
        let Ok(content) = std::fs::read_to_string(path) else {
            return;
        };
        let new_note = Note::from_disk(path.to_path_buf(), content);
        let mut notes = self.notes.write().unwrap();
        if let Some(existing) = notes.iter_mut().find(|n| n.path == path) {
            *existing = new_note;
        } else {
            notes.push(new_note);
        }
    }

    pub fn remove(&self, path: &Path) {
        let mut notes = self.notes.write().unwrap();
        notes.retain(|n| n.path != path);
    }
}

pub fn is_target_file(path: &Path) -> bool {
    matches!(
        path.extension().and_then(|e| e.to_str()),
        Some("md") | Some("txt")
    )
}

fn parse_frontmatter(content: &str) -> (Frontmatter, String) {
    let (yaml_opt, body) = split_frontmatter(content);
    let body = body.to_string();
    match yaml_opt {
        Some(yaml) => match serde_yaml::from_str::<Frontmatter>(yaml) {
            Ok(fm) => (fm, body),
            Err(_) => (Frontmatter::default(), content.to_string()),
        },
        None => (Frontmatter::default(), body),
    }
}

fn split_frontmatter(content: &str) -> (Option<&str>, &str) {
    let after_open_dashes = match content.strip_prefix("---") {
        Some(s) => s,
        None => return (None, content),
    };
    let after_open_eol = if let Some(s) = after_open_dashes.strip_prefix("\r\n") {
        s
    } else if let Some(s) = after_open_dashes.strip_prefix('\n') {
        s
    } else {
        return (None, content);
    };

    if after_open_eol.starts_with("---") {
        let after_close_dashes = &after_open_eol[3..];
        if after_close_dashes.is_empty() {
            return (Some(""), "");
        }
        if let Some(rest) = after_close_dashes.strip_prefix('\n') {
            return (Some(""), rest);
        }
        if let Some(rest) = after_close_dashes.strip_prefix("\r\n") {
            return (Some(""), rest);
        }
    }

    let mut search_from = 0;
    while search_from < after_open_eol.len() {
        let needle_pos = match after_open_eol[search_from..].find("\n---") {
            Some(p) => p,
            None => break,
        };
        let absolute_pos = search_from + needle_pos;
        let after_dashes = &after_open_eol[absolute_pos + 4..];
        if after_dashes.is_empty() {
            let yaml = &after_open_eol[..absolute_pos];
            return (Some(yaml), "");
        }
        if let Some(rest) = after_dashes.strip_prefix('\n') {
            let yaml = &after_open_eol[..absolute_pos];
            return (Some(yaml), rest);
        }
        if let Some(rest) = after_dashes.strip_prefix("\r\n") {
            let yaml = &after_open_eol[..absolute_pos];
            return (Some(yaml), rest);
        }
        search_from = absolute_pos + 4;
    }

    (None, content)
}
