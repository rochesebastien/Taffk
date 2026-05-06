use crate::notes::NotesStore;
use crate::search::{search as run_search, Match, SearchMode};
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
