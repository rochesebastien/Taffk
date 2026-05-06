use crate::notes::{NoteDto, NotesStore};
use crate::search::{search as run_search, Match, SearchMode};
use std::path::PathBuf;
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub fn search(
    query: String,
    mode: String,
    state: State<'_, Arc<NotesStore>>,
) -> Vec<Match> {
    let mode = match mode.as_str() {
        "fuzzy" => SearchMode::Fuzzy,
        _ => SearchMode::Literal,
    };
    let notes = state.notes.read().unwrap();
    run_search(&query, notes.as_slice(), mode)
}

#[tauri::command]
pub fn get_note(path: String, state: State<'_, Arc<NotesStore>>) -> Option<NoteDto> {
    let target = PathBuf::from(&path);
    let notes = state.notes.read().unwrap();
    notes
        .iter()
        .find(|n| n.path == target)
        .map(NoteDto::from)
}

#[tauri::command]
pub fn save_note(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|e| e.to_string())
}
