import { invoke } from '@tauri-apps/api/core';

export type Match = {
  path: string;
  score: number;
  snippet: string;
  match_ranges: [number, number][];
};

export function search(query: string): Promise<Match[]> {
  return invoke<Match[]>('search', { query });
}
