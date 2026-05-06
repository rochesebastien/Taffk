use crate::notes::Note;

pub struct ParsedQuery {
    pub free_text: String,
    pub filters: Vec<Filter>,
}

#[derive(Debug)]
pub enum Filter {
    Tag(String),
    Id(String),
    Code(String),
}

pub fn parse(input: &str) -> ParsedQuery {
    let mut filters = Vec::new();
    let mut free_parts: Vec<&str> = Vec::new();

    for token in input.split_whitespace() {
        if let Some(rest) = token.strip_prefix("tag:") {
            if !rest.is_empty() {
                filters.push(Filter::Tag(rest.to_string()));
            }
        } else if let Some(rest) = token.strip_prefix("id:") {
            if !rest.is_empty() {
                filters.push(Filter::Id(rest.to_string()));
            }
        } else if let Some(rest) = token.strip_prefix("code:") {
            if !rest.is_empty() {
                filters.push(Filter::Code(rest.to_string()));
            }
        } else {
            free_parts.push(token);
        }
    }

    ParsedQuery {
        free_text: free_parts.join(" "),
        filters,
    }
}

pub fn matches_filters(note: &Note, filters: &[Filter]) -> bool {
    filters.iter().all(|f| match f {
        Filter::Tag(t) => note
            .frontmatter
            .tags
            .iter()
            .any(|nt| nt.eq_ignore_ascii_case(t)),
        Filter::Id(id) => note
            .frontmatter
            .id
            .as_deref()
            .map_or(false, |nid| nid.eq_ignore_ascii_case(id)),
        Filter::Code(code) => note
            .frontmatter
            .code
            .as_deref()
            .map_or(false, |nc| nc.eq_ignore_ascii_case(code)),
    })
}
