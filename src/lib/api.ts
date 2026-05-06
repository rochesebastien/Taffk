import { invoke } from '@tauri-apps/api/core';

export type Match = {
  path: string;
  score: number;
  snippet: string;
  /** UTF-16 offsets into `snippet`, usable directly with String.slice. */
  match_ranges: [number, number][];
};

export function search(query: string): Promise<Match[]> {
  return invoke<Match[]>('search', { query });
}
