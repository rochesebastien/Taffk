use ignore::WalkBuilder;
use std::path::{Path, PathBuf};
use std::sync::RwLock;

pub struct Note {
    pub path: PathBuf,
    pub content: String,
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
                loaded.push(Note {
                    path: path.to_path_buf(),
                    content,
                });
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
        let mut notes = self.notes.write().unwrap();
        if let Some(existing) = notes.iter_mut().find(|n| n.path == path) {
            existing.content = content;
        } else {
            notes.push(Note {
                path: path.to_path_buf(),
                content,
            });
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
