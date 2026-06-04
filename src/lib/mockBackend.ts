import type { Backend, NewTask, Project, Tag, Task, TaskPatch } from './api';

/**
 * In-memory backend used when the app runs outside the Tauri shell (plain
 * browser). Mirrors the Rust command behaviour closely enough for the UI to be
 * exercised and screenshotted. Not persisted — reseeded on every page load.
 */

const now = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);
const uid = () =>
  (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)) as string;

let projects: Project[] = [];
let tags: Tag[] = [];
let tasks: Task[] = [];

function seed() {
  const createdAt = now();
  const inbox: Project = { id: uid(), name: 'Inbox', color: '#3d44ff', sortOrder: 0, archived: false, createdAt };
  const site: Project = { id: uid(), name: 'Site web', color: '#22c55e', sortOrder: 1, archived: false, createdAt };
  projects = [inbox, site];

  const urgent: Tag = { id: uid(), name: 'urgent', color: '#ef4444', createdAt };
  const deep: Tag = { id: uid(), name: 'deep-work', color: '#a855f7', createdAt };
  tags = [urgent, deep];

  const base = {
    notes: '', parentId: null, done: false, status: 'todo' as const,
    dueDate: null, estimateMinutes: 0, spentMinutes: 0, createdAt, updatedAt: createdAt, completedAt: null,
  };
  tasks = [
    { ...base, id: uid(), title: 'Préparer la revue de sprint', projectId: inbox.id, scheduledFor: today(), estimateMinutes: 30, sortOrder: 0, tagIds: [urgent.id] },
    { ...base, id: uid(), title: 'Refondre la page d\'accueil', projectId: site.id, scheduledFor: today(), estimateMinutes: 90, sortOrder: 1, tagIds: [deep.id],
      notes: '## Objectifs\n\n- Hero plus clair\n- **CTA** unique au-dessus de la ligne de flottaison\n- Retirer le carrousel\n\n```ts\nconst hero = { title: "Taffk", cta: "Essayer" };\n```\n\n> Inspiration : Linear, Capacities.' },
    { ...base, id: uid(), title: 'Répondre aux emails', projectId: inbox.id, scheduledFor: today(), sortOrder: 2, tagIds: [] },
    { ...base, id: uid(), title: 'Lire la doc Tauri SQL', projectId: site.id, scheduledFor: null, sortOrder: 3, tagIds: [deep.id] },
    { ...base, id: uid(), title: 'Acheter un cadeau', projectId: inbox.id, scheduledFor: null, done: true, status: 'done', completedAt: now(), sortOrder: 4, tagIds: [] },
  ];
}
seed();

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export const mockBackend: Backend = {
  async listTasks() {
    return clone(tasks);
  },
  async createTask(input: NewTask) {
    const ts = now();
    const task: Task = {
      id: uid(),
      title: input.title,
      notes: input.notes ?? '',
      projectId: input.projectId ?? null,
      parentId: input.parentId ?? null,
      done: false,
      status: 'todo',
      scheduledFor: input.scheduledFor ?? null,
      dueDate: null,
      estimateMinutes: input.estimateMinutes ?? 0,
      spentMinutes: 0,
      sortOrder: tasks.length,
      createdAt: ts,
      updatedAt: ts,
      completedAt: null,
      tagIds: input.tagIds ?? [],
    };
    tasks.push(task);
    return clone(task);
  },
  async updateTask(patch: TaskPatch) {
    const t = tasks.find((x) => x.id === patch.id);
    if (!t) throw new Error('task not found');
    const { id: _id, ...rest } = patch;
    Object.assign(t, rest);
    if (patch.done !== undefined) {
      t.status = patch.done ? 'done' : 'todo';
      t.completedAt = patch.done ? now() : null;
    }
    t.updatedAt = now();
    return clone(t);
  },
  async deleteTask(id: string) {
    tasks = tasks.filter((t) => t.id !== id);
  },
  async setTaskTags(taskId: string, tagIds: string[]) {
    const t = tasks.find((x) => x.id === taskId);
    if (!t) throw new Error('task not found');
    t.tagIds = tagIds;
    t.updatedAt = now();
    return clone(t);
  },
  async reorderTasks(ids: string[]) {
    ids.forEach((id, i) => {
      const t = tasks.find((x) => x.id === id);
      if (t) t.sortOrder = i;
    });
  },

  async listProjects() {
    return clone(projects);
  },
  async createProject(name: string, color: string | null) {
    const p: Project = { id: uid(), name, color, sortOrder: projects.length, archived: false, createdAt: now() };
    projects.push(p);
    return clone(p);
  },
  async updateProject(id: string, name: string, color: string | null) {
    const p = projects.find((x) => x.id === id);
    if (!p) throw new Error('project not found');
    p.name = name;
    p.color = color;
    return clone(p);
  },
  async deleteProject(id: string) {
    projects = projects.filter((p) => p.id !== id);
    tasks.forEach((t) => {
      if (t.projectId === id) t.projectId = null;
    });
  },

  async listTags() {
    return clone(tags);
  },
  async createTag(name: string, color: string | null) {
    const existing = tags.find((t) => t.name === name);
    if (existing) return clone(existing);
    const tag: Tag = { id: uid(), name, color, createdAt: now() };
    tags.push(tag);
    return clone(tag);
  },
  async deleteTag(id: string) {
    tags = tags.filter((t) => t.id !== id);
    tasks.forEach((t) => {
      t.tagIds = t.tagIds.filter((x) => x !== id);
    });
  },
};
