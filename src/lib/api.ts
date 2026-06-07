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
  tagIds: string[];
};

export type Project = {
  id: string;
  name: string;
  color: string | null;
  alias: string | null;
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
};

export interface Backend {
  listTasks(): Promise<Task[]>;
  createTask(input: NewTask): Promise<Task>;
  updateTask(patch: TaskPatch): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  setTaskTags(taskId: string, tagIds: string[]): Promise<Task>;
  reorderTasks(ids: string[]): Promise<void>;

  listProjects(): Promise<Project[]>;
  createProject(name: string, color: string | null, alias: string | null): Promise<Project>;
  updateProject(id: string, name: string, color: string | null, alias: string | null): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  listTags(): Promise<Tag[]>;
  createTag(name: string, color: string | null): Promise<Tag>;
  deleteTag(id: string): Promise<void>;

  /** Persist a finished timer session. Returns the updated task when a work
   *  session was tied to a task (its spentMinutes is incremented), else null. */
  logTime(taskId: string | null, seconds: number, kind: TimeKind): Promise<Task | null>;
  /** Total work seconds logged today (local date). */
  timeToday(): Promise<number>;
}

const tauriBackend: Backend = {
  listTasks: () => invoke('list_tasks'),
  createTask: (input) => invoke('create_task', { input }),
  updateTask: (patch) => invoke('update_task', { patch }),
  deleteTask: (id) => invoke('delete_task', { id }),
  setTaskTags: (taskId, tagIds) => invoke('set_task_tags', { taskId, tagIds }),
  reorderTasks: (ids) => invoke('reorder_tasks', { ids }),

  listProjects: () => invoke('list_projects'),
  createProject: (name, color, alias) => invoke('create_project', { name, color, alias }),
  updateProject: (id, name, color, alias) => invoke('update_project', { id, name, color, alias }),
  deleteProject: (id) => invoke('delete_project', { id }),

  listTags: () => invoke('list_tags'),
  createTag: (name, color) => invoke('create_tag', { name, color }),
  deleteTag: (id) => invoke('delete_tag', { id }),

  logTime: (taskId, seconds, kind) => invoke('log_time', { taskId, seconds, kind }),
  timeToday: () => invoke('time_today'),
};

export const isTauri =
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export const api: Backend = isTauri ? tauriBackend : mockBackend;
