use crate::notes::Note;
use memchr::memmem;
use serde::Serialize;

const SNIPPET_RADIUS: usize = 60;

#[derive(Serialize, Clone)]
pub struct Match {
    pub path: String,
    pub score: f32,
    pub snippet: String,
    /// UTF-16 code-unit offsets into `snippet` — directly usable by
    /// JavaScript `String.prototype.slice`. Kept off the Rust byte
    /// domain because JS strings are UTF-16.
    pub match_ranges: Vec<(u32, u32)>,
}

#[derive(Clone, Copy)]
pub enum SearchMode {
    Literal,
}

pub fn search(query: &str, notes: &[Note], mode: SearchMode) -> Vec<Match> {
    if query.is_empty() {
        return Vec::new();
    }
    match mode {
        SearchMode::Literal => search_literal(query, notes),
    }
}

fn search_literal(query: &str, notes: &[Note]) -> Vec<Match> {
    let finder = memmem::Finder::new(query.as_bytes());
    let mut results = Vec::new();

    for note in notes {
        let bytes = note.content.as_bytes();
        let positions: Vec<usize> = finder.find_iter(bytes).collect();
        if positions.is_empty() {
            continue;
        }
        let first = positions[0];
        let (s, e) = snippet_bounds(&note.content, first, query.len());
        let snippet = &note.content[s..e];
        let match_ranges: Vec<(u32, u32)> = positions
            .iter()
            .filter(|&&p| p >= s && p + query.len() <= e)
            .map(|&p| {
                let local_start = p - s;
                let local_end = local_start + query.len();
                (
                    utf16_offset(snippet, local_start),
                    utf16_offset(snippet, local_end),
                )
            })
            .collect();

        results.push(Match {
            path: note.path.to_string_lossy().into_owned(),
            score: 0.0,
            snippet: snippet.to_string(),
            match_ranges,
        });
    }

    results
}

fn snippet_bounds(content: &str, match_byte: usize, query_len: usize) -> (usize, usize) {
    let target_start = match_byte.saturating_sub(SNIPPET_RADIUS);
    let target_end = (match_byte + query_len + SNIPPET_RADIUS).min(content.len());
    let s = floor_boundary(content, target_start);
    let e = ceil_boundary(content, target_end);
    (s, e)
}

fn floor_boundary(s: &str, mut i: usize) -> usize {
    while i > 0 && !s.is_char_boundary(i) {
        i -= 1;
    }
    i
}

fn ceil_boundary(s: &str, mut i: usize) -> usize {
    while i < s.len() && !s.is_char_boundary(i) {
        i += 1;
    }
    i
}

fn utf16_offset(s: &str, byte_offset: usize) -> u32 {
    s[..byte_offset].encode_utf16().count() as u32
}
