import { create } from 'zustand';
import { api, type Project, type Tag, type Task, type TaskPatch, type TaskStatus, type TimeEntry } from './api';
import { isoDate } from './dates';
import { readSettings } from './settings';

export type View = 'today' | 'all' | 'project' | 'board' | 'calendar' | 'time' | 'tags' | 'settings';

export type SettingsSection =
  | 'general'
  | 'profile'
  | 'appearance'
  | 'archives'
  | 'data'
  | 'shortcuts'
  | 'updates'

export type QuickAddParsed = {
  title: string;
  tagNames: string[];
  projectName: string | null;
};

/** Initial values to pre-fill the quick-add spotlight (e.g. from a calendar slot). */
export type SpotlightPrefill = {
  date?: string | null;
  time?: string | null;
  estimateMinutes?: number;
  projectId?: string | null;
};

/** `Buy milk #errand @home` → title + tag names + project name. */
export function parseQuickAdd(raw: string): QuickAddParsed {
  const tagNames: string[] = [];
  let projectName: string | null = null;
  const words = raw.trim().split(/\s+/);
  const titleWords: string[] = [];
  for (const w of words) {
    if (w.length > 1 && w.startsWith('#')) {
      tagNames.push(w.slice(1).toLowerCase());
    } else if (w.length > 1 && w.startsWith('@')) {
      projectName = w.slice(1);
    } else {
      titleWords.push(w);
    }
  }
  return { title: titleWords.join(' ').trim(), tagNames, projectName };
}

const todayStr = () => isoDate(new Date());

type Store = {
  tasks: Task[];
  projects: Project[];
  tags: Tag[];
  timeEntries: TimeEntry[];
  view: View;
  prevView: View;
  prevProjectId: string | null;
  settingsSection: SettingsSection;
  activeProjectId: string | null;
  selectedTaskId: string | null;
  selectedTagId: string | null;
  spotlightOpen: boolean;
  spotlightPrefill: SpotlightPrefill | null;
  searchOpen: boolean;
  loaded: boolean;

  load: () => Promise<void>;
  reloadTimeEntries: () => Promise<void>;
  setView: (view: View) => void;
  openSettings: () => void;
  closeSettings: () => void;
  setSettingsSection: (section: SettingsSection) => void;
  openProject: (projectId: string) => void;
  selectTask: (id: string | null) => void;
  selectTag: (id: string | null) => void;
  openSpotlight: (prefill?: SpotlightPrefill) => void;
  closeSpotlight: () => void;
  openSearch: () => void;
  closeSearch: () => void;

  quickAdd: (
    raw: string,
    opts?: {
      scheduleToday?: boolean;
      date?: string | null;
      time?: string | null;
      projectId?: string | null;
      tagIds?: string[];
      estimateMinutes?: number;
    },
  ) => Promise<void>;
  addSubtask: (parentId: string, rawTitle: string) => Promise<void>;
  promoteSubtask: (id: string) => Promise<void>;
  duplicateTask: (id: string) => Promise<void>;
  moveTaskToTop: (id: string) => Promise<void>;
  /** Re-apply `#tag` / `@projet` syntax from an edited title (used by inline editing). */
  applyTaskText: (id: string, raw: string) => Promise<void>;
  ensureTags: (names: string[]) => Promise<string[]>;
  resolveProjectByHandle: (handle: string) => Promise<string | null>;
  toggleDone: (id: string, done: boolean) => Promise<void>;
  moveTask: (id: string, status: TaskStatus) => Promise<void>;
  patchTask: (patch: TaskPatch) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  archiveTask: (id: string, archived: boolean) => Promise<void>;
  setTaskTags: (taskId: string, tagIds: string[]) => Promise<void>;
  scheduleForToday: (id: string, on: boolean) => Promise<void>;

  addProject: (name: string, color?: string | null, alias?: string | null) => Promise<Project>;
  updateProject: (id: string, name: string, color: string | null, alias: string | null) => Promise<void>;
  toggleProjectPin: (id: string) => Promise<void>;
  archiveProject: (id: string, archived: boolean) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
  addTag: (name: string, color?: string | null) => Promise<Tag>;
  updateTag: (id: string, name: string, color: string | null) => Promise<void>;
  removeTag: (id: string) => Promise<void>;
};

export const useStore = create<Store>((set, get) => ({
  tasks: [],
  projects: [],
  tags: [],
  timeEntries: [],
  view: readSettings().startupView,
  prevView: 'today',
  prevProjectId: null,
  settingsSection: 'general',
  activeProjectId: null,
  selectedTaskId: null,
  selectedTagId: null,
  spotlightOpen: false,
  spotlightPrefill: null,
  searchOpen: false,
  loaded: false,

  async load() {
    const [tasks, projects, tags, timeEntries] = await Promise.all([
      api.listTasks(),
      api.listProjects(),
      api.listTags(),
      api.listTimeEntries(),
    ]);
    set({ tasks, projects, tags, timeEntries, loaded: true });
  },

  async reloadTimeEntries() {
    set({ timeEntries: await api.listTimeEntries() });
  },

  setView(view) {
    set({
      view,
      activeProjectId: view === 'project' ? get().activeProjectId : null,
      selectedTagId: view === 'tags' ? get().selectedTagId : null,
    });
  },
  openSettings() {
    set({ prevView: get().view, prevProjectId: get().activeProjectId, view: 'settings' });
  },
  closeSettings() {
    const v = get().prevView;
    set({ view: v, activeProjectId: v === 'project' ? get().prevProjectId : null });
  },
  setSettingsSection(section) {
    set({ settingsSection: section });
  },
  openProject(projectId) {
    set({ view: 'project', activeProjectId: projectId });
  },
  selectTask(id) {
    set({ selectedTaskId: id });
  },
  selectTag(id) {
    set({ selectedTagId: id });
  },
  openSpotlight(prefill) {
    set({ spotlightOpen: true, spotlightPrefill: prefill ?? null });
  },
  closeSpotlight() {
    set({ spotlightOpen: false, spotlightPrefill: null });
  },
  openSearch() {
    set({ searchOpen: true });
  },
  closeSearch() {
    set({ searchOpen: false });
  },

  async quickAdd(raw, opts) {
    const parsed = parseQuickAdd(raw);
    if (!parsed.title) return;

    const parsedTagIds = await get().ensureTags(parsed.tagNames);
    const tagIds = [...new Set([...(opts?.tagIds ?? []), ...parsedTagIds])];

    let projectId: string | null;
    if (opts?.projectId !== undefined) {
      projectId = opts.projectId;
    } else if (parsed.projectName) {
      projectId = await get().resolveProjectByHandle(parsed.projectName);
    } else if (get().view === 'project') {
      projectId = get().activeProjectId;
    } else {
      projectId = null;
    }

    const scheduledFor =
      opts?.date !== undefined ? opts.date : opts?.scheduleToday ? todayStr() : null;
    const scheduledTime = opts?.time ?? null;
    const task = await api.createTask({
      title: parsed.title,
      projectId,
      tagIds,
      scheduledFor,
      scheduledTime,
      estimateMinutes: opts?.estimateMinutes,
    });
    set({ tasks: [...get().tasks, task] });
  },

  async addSubtask(parentId, rawTitle) {
    const parsed = parseQuickAdd(rawTitle);
    const title = parsed.title.trim();
    if (!title) return;
    const parent = get().tasks.find((t) => t.id === parentId);
    const tagIds = await get().ensureTags(parsed.tagNames);
    const task = await api.createTask({
      title,
      parentId,
      projectId: parent?.projectId ?? null,
      tagIds,
    });
    set({ tasks: [...get().tasks, task] });
  },

  async applyTaskText(id, raw) {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const parsed = parseQuickAdd(raw);
    const patch: TaskPatch = { id, title: parsed.title || task.title };
    if (task.parentId === null && parsed.projectName) {
      patch.projectId = await get().resolveProjectByHandle(parsed.projectName);
    }
    await get().patchTask(patch);
    if (parsed.tagNames.length) {
      const newIds = await get().ensureTags(parsed.tagNames);
      const merged = [...new Set([...task.tagIds, ...newIds])];
      if (merged.length !== task.tagIds.length) await get().setTaskTags(id, merged);
    }
  },

  async ensureTags(names) {
    const ids: string[] = [];
    for (const name of names) {
      const tag = await get().addTag(name);
      if (!ids.includes(tag.id)) ids.push(tag.id);
    }
    return ids;
  },

  async resolveProjectByHandle(handle) {
    const h = handle.toLowerCase();
    const existing = get().projects.find(
      (p) => p.alias?.toLowerCase() === h || p.name.toLowerCase() === h,
    );
    if (existing) return existing.id;
    return (await get().addProject(handle, null, h)).id;
  },

  async promoteSubtask(id) {
    const task = get().tasks.find((t) => t.id === id);
    if (!task || task.parentId === null) return;
    const parent = get().tasks.find((t) => t.id === task.parentId);
    // Freeze the inherited project + tags onto the task so they persist once detached.
    if (parent && parent.tagIds.length) await get().setTaskTags(id, parent.tagIds);
    await get().patchTask({ id, parentId: null, projectId: parent?.projectId ?? task.projectId });
  },

  async duplicateTask(id) {
    const src = get().tasks.find((t) => t.id === id);
    if (!src) return;
    const copy = await api.createTask({
      title: `${src.title} (copie)`,
      notes: src.notes,
      projectId: src.projectId,
      parentId: src.parentId,
      scheduledFor: src.scheduledFor,
      scheduledTime: src.scheduledTime,
      estimateMinutes: src.estimateMinutes,
      tagIds: src.tagIds,
    });
    set({ tasks: [...get().tasks, copy] });
    const subs = get().tasks.filter((t) => t.parentId === id);
    for (const sub of subs) {
      const subCopy = await api.createTask({
        title: sub.title,
        notes: sub.notes,
        projectId: sub.projectId,
        parentId: copy.id,
        scheduledFor: sub.scheduledFor,
        scheduledTime: sub.scheduledTime,
        estimateMinutes: sub.estimateMinutes,
        tagIds: sub.tagIds,
      });
      set({ tasks: [...get().tasks, subCopy] });
    }
  },

  async moveTaskToTop(id) {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const siblings = get().tasks.filter((t) => t.parentId === task.parentId);
    const minSort = Math.min(...siblings.map((t) => t.sortOrder));
    await get().patchTask({ id, sortOrder: minSort - 1 });
  },

  async toggleDone(id, done) {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const status: TaskStatus = done ? 'done' : 'todo';
    const updated = [await api.updateTask({ id, done, status })];

    // Completing/uncompleting a parent cascades to its subtasks.
    for (const child of get().tasks.filter((t) => t.parentId === id)) {
      if (child.done !== done) updated.push(await api.updateTask({ id: child.id, done, status }));
    }

    // Toggling a subtask: the parent is done iff every sibling is done.
    if (task.parentId) {
      const siblings = get().tasks.filter((t) => t.parentId === task.parentId);
      const allDone = siblings.every((s) => (s.id === id ? done : s.done));
      const parent = get().tasks.find((t) => t.id === task.parentId);
      if (parent && parent.done !== allDone) {
        updated.push(
          await api.updateTask({ id: parent.id, done: allDone, status: allDone ? 'done' : 'todo' }),
        );
      }
    }

    const byId = new Map(updated.map((t) => [t.id, t]));
    set({ tasks: get().tasks.map((t) => byId.get(t.id) ?? t) });
  },

  async moveTask(id, status) {
    const task = await api.updateTask({ id, status, done: status === 'done' });
    set({ tasks: get().tasks.map((t) => (t.id === id ? task : t)) });
  },

  async patchTask(patch) {
    const task = await api.updateTask(patch);
    set({ tasks: get().tasks.map((t) => (t.id === patch.id ? task : t)) });
  },

  async deleteTask(id) {
    await api.deleteTask(id);
    // Backend cascades on parent_id; mirror that locally.
    set({
      tasks: get().tasks.filter((t) => t.id !== id && t.parentId !== id),
      selectedTaskId: get().selectedTaskId === id ? null : get().selectedTaskId,
    });
  },

  async archiveTask(id, archived) {
    const task = await api.setTaskArchived(id, archived);
    set({
      tasks: get().tasks.map((t) => (t.id === id ? task : t)),
      selectedTaskId: archived && get().selectedTaskId === id ? null : get().selectedTaskId,
    });
  },

  async setTaskTags(taskId, tagIds) {
    const task = await api.setTaskTags(taskId, tagIds);
    set({ tasks: get().tasks.map((t) => (t.id === taskId ? task : t)) });
  },

  async scheduleForToday(id, on) {
    await get().patchTask({ id, scheduledFor: on ? todayStr() : null });
  },

  async addProject(name, color = null, alias = null) {
    const project = await api.createProject(name, color, alias);
    set({ projects: [...get().projects, project] });
    return project;
  },
  async updateProject(id, name, color, alias) {
    const project = await api.updateProject(id, name, color, alias);
    set({ projects: get().projects.map((p) => (p.id === id ? project : p)) });
  },
  async toggleProjectPin(id) {
    const current = get().projects.find((p) => p.id === id);
    if (!current) return;
    const project = await api.setProjectPinned(id, !current.pinned);
    set({ projects: get().projects.map((p) => (p.id === id ? project : p)) });
  },
  async archiveProject(id, archived) {
    const project = await api.setProjectArchived(id, archived);
    set({
      projects: get().projects.map((p) => (p.id === id ? project : p)),
      view: archived && get().activeProjectId === id ? 'today' : get().view,
      activeProjectId: archived && get().activeProjectId === id ? null : get().activeProjectId,
    });
  },
  async removeProject(id) {
    await api.deleteProject(id);
    set({
      projects: get().projects.filter((p) => p.id !== id),
      tasks: get().tasks.map((t) => (t.projectId === id ? { ...t, projectId: null } : t)),
      view: get().activeProjectId === id ? 'today' : get().view,
      activeProjectId: get().activeProjectId === id ? null : get().activeProjectId,
    });
  },
  async addTag(name, color = null) {
    const existing = get().tags.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    const tag = await api.createTag(name, color);
    set({ tags: [...get().tags, tag] });
    return tag;
  },
  async updateTag(id, name, color) {
    const tag = await api.updateTag(id, name, color);
    set({ tags: get().tags.map((t) => (t.id === id ? tag : t)) });
  },
  async removeTag(id) {
    await api.deleteTag(id);
    // Backend cascades the task_tags rows; mirror that locally.
    set({
      tags: get().tags.filter((t) => t.id !== id),
      tasks: get().tasks.map((t) =>
        t.tagIds.includes(id) ? { ...t, tagIds: t.tagIds.filter((x) => x !== id) } : t,
      ),
      selectedTagId: get().selectedTagId === id ? null : get().selectedTagId,
    });
  },
}));

export const TODAY = todayStr;
