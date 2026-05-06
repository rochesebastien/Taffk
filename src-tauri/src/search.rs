use crate::notes::Note;
use memchr::memmem;
use nucleo_matcher::pattern::{CaseMatching, Normalization, Pattern};
use nucleo_matcher::{Config, Matcher, Utf32Str};
use serde::Serialize;

const SNIPPET_RADIUS: usize = 60;
const FILENAME_BOOST: f32 = 1.5;

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
    Fuzzy,
}

pub fn search(query: &str, notes: &[Note], mode: SearchMode) -> Vec<Match> {
    if query.is_empty() {
        return Vec::new();
    }
    match mode {
        SearchMode::Literal => search_literal(query, notes),
        SearchMode::Fuzzy => search_fuzzy(query, notes),
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

fn search_fuzzy(query: &str, notes: &[Note]) -> Vec<Match> {
    let mut matcher = Matcher::new(Config::DEFAULT);
    let pattern = Pattern::parse(query, CaseMatching::Smart, Normalization::Smart);

    let mut results = Vec::new();
    let mut name_buf: Vec<char> = Vec::new();
    let mut content_buf: Vec<char> = Vec::new();
    let mut name_indices: Vec<u32> = Vec::new();
    let mut content_indices: Vec<u32> = Vec::new();

    for note in notes {
        let filename = note
            .path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("");

        name_indices.clear();
        let name_haystack = Utf32Str::new(filename, &mut name_buf);
        let name_score = pattern.indices(name_haystack, &mut matcher, &mut name_indices);

        content_indices.clear();
        let content_haystack = Utf32Str::new(&note.content, &mut content_buf);
        let content_score = pattern.indices(content_haystack, &mut matcher, &mut content_indices);

        let name_combined = name_score.map(|s| s as f32 * FILENAME_BOOST).unwrap_or(0.0);
        let content_combined = content_score.map(|s| s as f32).unwrap_or(0.0);
        let total_score = name_combined.max(content_combined);

        if total_score == 0.0 {
            continue;
        }

        let (snippet, match_ranges) = if !content_indices.is_empty() {
            fuzzy_content_snippet(&note.content, &content_indices)
        } else {
            (
                filename.to_string(),
                ranges_from_char_indices(filename, &name_indices),
            )
        };

        results.push(Match {
            path: note.path.to_string_lossy().into_owned(),
            score: total_score,
            snippet,
            match_ranges,
        });
    }

    results.sort_by(|a, b| {
        b.score
            .partial_cmp(&a.score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    results
}

fn fuzzy_content_snippet(content: &str, char_indices: &[u32]) -> (String, Vec<(u32, u32)>) {
    let first_char_idx = char_indices[0] as usize;
    let first_byte = content
        .char_indices()
        .nth(first_char_idx)
        .map(|(b, _)| b)
        .unwrap_or(0);
    let first_char_byte_len = content[first_byte..]
        .chars()
        .next()
        .map(|c| c.len_utf8())
        .unwrap_or(0);

    let (s, e) = snippet_bounds(content, first_byte, first_char_byte_len);
    let snippet = content[s..e].to_string();

    let chars_before = content[..s].chars().count() as u32;
    let snippet_char_count = snippet.chars().count() as u32;
    let utf16_offsets = build_utf16_offsets(&snippet);

    let ranges: Vec<(u32, u32)> = char_indices
        .iter()
        .filter_map(|&c| {
            if c >= chars_before && c < chars_before + snippet_char_count {
                let local = (c - chars_before) as usize;
                Some((utf16_offsets[local], utf16_offsets[local + 1]))
            } else {
                None
            }
        })
        .collect();

    (snippet, ranges)
}

fn ranges_from_char_indices(s: &str, char_indices: &[u32]) -> Vec<(u32, u32)> {
    let utf16_offsets = build_utf16_offsets(s);
    let total = utf16_offsets.len() - 1;
    char_indices
        .iter()
        .filter_map(|&c| {
            let i = c as usize;
            if i < total {
                Some((utf16_offsets[i], utf16_offsets[i + 1]))
            } else {
                None
            }
        })
        .collect()
}

fn build_utf16_offsets(s: &str) -> Vec<u32> {
    let mut offsets = Vec::with_capacity(s.chars().count() + 1);
    offsets.push(0);
    let mut acc: u32 = 0;
    for c in s.chars() {
        acc += c.len_utf16() as u32;
        offsets.push(acc);
    }
    offsets
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
