import { invoke } from '@tauri-apps/api/core';

export type SearchMode = 'literal' | 'fuzzy';

export type Match = {
  path: string;
  score: number;
  snippet: string;
  /** UTF-16 offsets into `snippet`, usable directly with String.slice. */
  match_ranges: [number, number][];
};

export type Frontmatter = {
  tags: string[];
  id: string | null;
  code: string | null;
};

export type NoteDto = {
  path: string;
  content: string;
  frontmatter: Frontmatter;
};

export function search(query: string, mode: SearchMode): Promise<Match[]> {
  return invoke<Match[]>('search', { query, mode });
}

export function getNote(path: string): Promise<NoteDto | null> {
  return invoke<NoteDto | null>('get_note', { path });
}

export function saveNote(path: string, content: string): Promise<void> {
  return invoke<void>('save_note', { path, content });
}
