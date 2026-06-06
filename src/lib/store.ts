import { create } from 'zustand';
import { api, type Project, type Tag, type Task, type TaskPatch, type TaskStatus } from './api';

export type View = 'today' | 'all' | 'project' | 'board' | 'calendar';

export type QuickAddParsed = {
  title: string;
  tagNames: string[];
  projectName: string | null;
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

const todayStr = () => new Date().toISOString().slice(0, 10);

type Store = {
  tasks: Task[];
  projects: Project[];
  tags: Tag[];
  view: View;
  activeProjectId: string | null;
  selectedTaskId: string | null;
  loaded: boolean;

  load: () => Promise<void>;
  setView: (view: View) => void;
  openProject: (projectId: string) => void;
  selectTask: (id: string | null) => void;

  quickAdd: (
    raw: string,
    opts?: { scheduleToday?: boolean; date?: string | null; time?: string | null },
  ) => Promise<void>;
  addSubtask: (parentId: string, title: string) => Promise<void>;
  toggleDone: (id: string, done: boolean) => Promise<void>;
  moveTask: (id: string, status: TaskStatus) => Promise<void>;
  patchTask: (patch: TaskPatch) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  setTaskTags: (taskId: string, tagIds: string[]) => Promise<void>;
  scheduleForToday: (id: string, on: boolean) => Promise<void>;

  addProject: (name: string, color?: string | null) => Promise<Project>;
  removeProject: (id: string) => Promise<void>;
  addTag: (name: string, color?: string | null) => Promise<Tag>;
};

export const useStore = create<Store>((set, get) => ({
  tasks: [],
  projects: [],
  tags: [],
  view: 'today',
  activeProjectId: null,
  selectedTaskId: null,
  loaded: false,

  async load() {
    const [tasks, projects, tags] = await Promise.all([
      api.listTasks(),
      api.listProjects(),
      api.listTags(),
    ]);
    set({ tasks, projects, tags, loaded: true });
  },

  setView(view) {
    set({ view, activeProjectId: view === 'project' ? get().activeProjectId : null });
  },
  openProject(projectId) {
    set({ view: 'project', activeProjectId: projectId });
  },
  selectTask(id) {
    set({ selectedTaskId: id });
  },

  async quickAdd(raw, opts) {
    const parsed = parseQuickAdd(raw);
    if (!parsed.title) return;

    const tagIds: string[] = [];
    for (const name of parsed.tagNames) {
      const tagId = await get().addTag(name).then((t) => t.id);
      if (!tagIds.includes(tagId)) tagIds.push(tagId);
    }

    let projectId: string | null = null;
    if (parsed.projectName) {
      const existing = get().projects.find(
        (p) => p.name.toLowerCase() === parsed.projectName!.toLowerCase(),
      );
      projectId = existing ? existing.id : (await get().addProject(parsed.projectName)).id;
    } else if (get().view === 'project') {
      projectId = get().activeProjectId;
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
    });
    set({ tasks: [...get().tasks, task] });
  },

  async addSubtask(parentId, title) {
    const trimmed = title.trim();
    if (!trimmed) return;
    const parent = get().tasks.find((t) => t.id === parentId);
    const task = await api.createTask({
      title: trimmed,
      parentId,
      projectId: parent?.projectId ?? null,
    });
    set({ tasks: [...get().tasks, task] });
  },

  async toggleDone(id, done) {
    const task = await api.updateTask({ id, done, status: done ? 'done' : 'todo' });
    set({ tasks: get().tasks.map((t) => (t.id === id ? task : t)) });
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

  async setTaskTags(taskId, tagIds) {
    const task = await api.setTaskTags(taskId, tagIds);
    set({ tasks: get().tasks.map((t) => (t.id === taskId ? task : t)) });
  },

  async scheduleForToday(id, on) {
    await get().patchTask({ id, scheduledFor: on ? todayStr() : null });
  },

  async addProject(name, color = null) {
    const project = await api.createProject(name, color);
    set({ projects: [...get().projects, project] });
    return project;
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
}));

export const TODAY = todayStr;
