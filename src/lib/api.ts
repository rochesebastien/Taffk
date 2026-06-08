import { invoke } from '@tauri-apps/api/core';
import { mockBackend } from './mockBackend';

/**
 * The only boundary between the React frontend and the Rust commands.
 * Types here mirror the Rust DTOs field-for-field (serde `rename_all = "camelCase"`).
 *
 * When the app runs outside the Tauri shell (plain browser, e.g. for previews
 * or screenshots), `window.__TAURI_INTERNALS__` is absent and we transparently
 * fall back to an in-memory mock so every view still renders with demo data.
 */

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export type TimeKind = 'work' | 'break';

export type Task = {
  id: string;
  title: string;
  notes: string;
  projectId: string | null;
  parentId: string | null;
  done: boolean;
  status: TaskStatus;
  scheduledFor: string | null;
  scheduledTime: string | null;
  dueDate: string | null;
  estimateMinutes: number;
  spentMinutes: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  archived: boolean;
  customProps: Record<string, string>;
  tagIds: string[];
};

export type Project = {
  id: string;
  name: string;
  color: string | null;
  alias: string | null;
  pinned: boolean;
  sortOrder: number;
  archived: boolean;
  createdAt: string;
};

export type Tag = {
  id: string;
  name: string;
  color: string | null;
  createdAt: string;
};

export type TimeEntry = {
  id: string;
  taskId: string | null;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  kind: TimeKind;
};

export type NewTask = {
  title: string;
  notes?: string;
  projectId?: string | null;
  parentId?: string | null;
  scheduledFor?: string | null;
  scheduledTime?: string | null;
  estimateMinutes?: number;
  tagIds?: string[];
};

export type TaskPatch = {
  id: string;
  title?: string;
  notes?: string;
  projectId?: string | null;
  parentId?: string | null;
  done?: boolean;
  status?: TaskStatus;
  scheduledFor?: string | null;
  scheduledTime?: string | null;
  dueDate?: string | null;
  estimateMinutes?: number;
  spentMinutes?: number;
  sortOrder?: number;
  customProps?: Record<string, string>;
};

export type DataStats = {
  path: string;
  fileBytes: number;
  projects: number;
  tags: number;
  tasks: number;
  timeEntries: number;
};

export interface Backend {
  listTasks(): Promise<Task[]>;
  createTask(input: NewTask): Promise<Task>;
  updateTask(patch: TaskPatch): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  setTaskArchived(id: string, archived: boolean): Promise<Task>;
  setTaskTags(taskId: string, tagIds: string[]): Promise<Task>;
  reorderTasks(ids: string[]): Promise<void>;

  listProjects(): Promise<Project[]>;
  createProject(name: string, color: string | null, alias: string | null): Promise<Project>;
  updateProject(id: string, name: string, color: string | null, alias: string | null): Promise<Project>;
  setProjectPinned(id: string, pinned: boolean): Promise<Project>;
  setProjectArchived(id: string, archived: boolean): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  listTags(): Promise<Tag[]>;
  createTag(name: string, color: string | null): Promise<Tag>;
  deleteTag(id: string): Promise<void>;

  /** Persist a finished timer session. Returns the updated task when a work
   *  session was tied to a task (its spentMinutes is incremented), else null. */
  logTime(taskId: string | null, seconds: number, kind: TimeKind): Promise<Task | null>;
  /** All recorded time entries (work + break), oldest first. */
  listTimeEntries(): Promise<TimeEntry[]>;
  /** Total work seconds logged today (local date). */
  timeToday(): Promise<number>;

  /** File path + row counts for the SQLite database. */
  dataStats(): Promise<DataStats>;
  /** Serialize the whole DB to a JSON file at `path`. */
  exportData(path: string): Promise<void>;
  /** Replace the whole DB with the JSON backup at `path`. */
  importData(path: string): Promise<void>;
  /** Wipe all tasks/projects/tags/time entries. */
  resetData(): Promise<void>;
}

const tauriBackend: Backend = {
  listTasks: () => invoke('list_tasks'),
  createTask: (input) => invoke('create_task', { input }),
  updateTask: (patch) => invoke('update_task', { patch }),
  deleteTask: (id) => invoke('delete_task', { id }),
  setTaskArchived: (id, archived) => invoke('set_task_archived', { id, archived }),
  setTaskTags: (taskId, tagIds) => invoke('set_task_tags', { taskId, tagIds }),
  reorderTasks: (ids) => invoke('reorder_tasks', { ids }),

  listProjects: () => invoke('list_projects'),
  createProject: (name, color, alias) => invoke('create_project', { name, color, alias }),
  updateProject: (id, name, color, alias) => invoke('update_project', { id, name, color, alias }),
  setProjectPinned: (id, pinned) => invoke('set_project_pinned', { id, pinned }),
  setProjectArchived: (id, archived) => invoke('set_project_archived', { id, archived }),
  deleteProject: (id) => invoke('delete_project', { id }),

  listTags: () => invoke('list_tags'),
  createTag: (name, color) => invoke('create_tag', { name, color }),
  deleteTag: (id) => invoke('delete_tag', { id }),

  logTime: (taskId, seconds, kind) => invoke('log_time', { taskId, seconds, kind }),
  listTimeEntries: () => invoke('list_time_entries'),
  timeToday: () => invoke('time_today'),

  dataStats: () => invoke('data_stats'),
  exportData: (path) => invoke('export_data', { path }),
  importData: (path) => invoke('import_data', { path }),
  resetData: () => invoke('reset_data'),
};

export const isTauri =
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export const api: Backend = isTauri ? tauriBackend : mockBackend;

/** Open a URL in the user's default browser (system shell in Tauri, new tab in a plain browser). */
export async function openExternal(url: string): Promise<void> {
  if (isTauri) {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/** Reveal a file in the OS file manager (no-op outside Tauri). */
export async function revealPath(path: string): Promise<void> {
  if (!isTauri) return;
  const { revealItemInDir } = await import('@tauri-apps/plugin-opener');
  await revealItemInDir(path);
}

/** Re-register the global show/hide shortcut (no-op outside Tauri). */
export async function setToggleShortcut(accelerator: string): Promise<void> {
  if (!isTauri) return;
  await invoke('set_toggle_shortcut', { accelerator });
}

/** Native "save as" dialog for a JSON file. Returns the chosen path, or null if cancelled. */
export async function pickSavePath(defaultName: string): Promise<string | null> {
  if (!isTauri) return null;
  const { save } = await import('@tauri-apps/plugin-dialog');
  return (await save({ defaultPath: defaultName, filters: [{ name: 'JSON', extensions: ['json'] }] })) ?? null;
}

/** Native "open file" dialog for a JSON file. Returns the chosen path, or null if cancelled. */
export async function pickOpenPath(): Promise<string | null> {
  if (!isTauri) return null;
  const { open } = await import('@tauri-apps/plugin-dialog');
  const res = await open({ multiple: false, filters: [{ name: 'JSON', extensions: ['json'] }] });
  return typeof res === 'string' ? res : null;
}
