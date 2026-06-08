import type { Backend, DataStats, NewTask, Project, Tag, Task, TaskPatch, TimeEntry, TimeKind } from './api';

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
let timeLog: TimeEntry[] = [];

function seed() {
  const createdAt = now();
  const inbox: Project = { id: uid(), name: 'Toutes les tâches', color: '#3d44ff', alias: 'inbox', pinned: false, sortOrder: 0, archived: false, createdAt };
  const site: Project = { id: uid(), name: 'Site web', color: '#22c55e', alias: 'site', pinned: false, sortOrder: 1, archived: false, createdAt };
  projects = [inbox, site];

  const urgent: Tag = { id: uid(), name: 'urgent', color: '#ef4444', createdAt };
  const deep: Tag = { id: uid(), name: 'deep-work', color: '#a855f7', createdAt };
  tags = [urgent, deep];

  const base = {
    notes: '', parentId: null, done: false, status: 'todo' as const,
    scheduledTime: null as string | null,
    dueDate: null, estimateMinutes: 0, spentMinutes: 0, createdAt, updatedAt: createdAt, completedAt: null, archived: false, customProps: {},
  };
  tasks = [
    { ...base, id: uid(), title: 'Préparer la revue de sprint', projectId: inbox.id, scheduledFor: today(), scheduledTime: '09:00', estimateMinutes: 30, sortOrder: 0, tagIds: [urgent.id] },
    { ...base, id: uid(), title: 'Refondre la page d\'accueil', projectId: site.id, scheduledFor: today(), scheduledTime: '10:30', estimateMinutes: 90, sortOrder: 1, tagIds: [deep.id], status: 'in_progress',
      notes: '## Objectifs\n\n- Hero plus clair\n- **CTA** unique au-dessus de la ligne de flottaison\n- Retirer le carrousel\n\n```ts\nconst hero = { title: "Taffk", cta: "Essayer" };\n```\n\n> Inspiration : Linear, Capacities.' },
    { ...base, id: uid(), title: 'Répondre aux emails', projectId: inbox.id, scheduledFor: today(), scheduledTime: '14:00', sortOrder: 2, tagIds: [] },
    { ...base, id: uid(), title: 'Lire la doc Tauri SQL', projectId: site.id, scheduledFor: null, sortOrder: 3, tagIds: [deep.id] },
    { ...base, id: uid(), title: 'Acheter un cadeau', projectId: inbox.id, scheduledFor: null, done: true, status: 'done', completedAt: now(), sortOrder: 4, tagIds: [] },
  ];

  const parent = tasks[1]; // Refondre la page d'accueil
  tasks.push(
    { ...base, id: uid(), title: 'Maquette hero', projectId: parent.projectId, parentId: parent.id, done: true, status: 'done', completedAt: now(), scheduledFor: null, sortOrder: 0, tagIds: [] },
    { ...base, id: uid(), title: 'Intégrer le nouveau CTA', projectId: parent.projectId, parentId: parent.id, scheduledFor: null, sortOrder: 1, tagIds: [] },
    { ...base, id: uid(), title: 'Supprimer le carrousel', projectId: parent.projectId, parentId: parent.id, scheduledFor: null, sortOrder: 2, tagIds: [] },
  );
}
seed();

/** Back-fill realistic work/break sessions across the past ~75 days so the
 *  time-management view has something to chart in browser preview. */
function seedTimeEntries() {
  const uidLocal = uid;
  const workTasks = tasks.filter((t) => t.parentId === null);
  let rng = 7;
  const next = () => {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff;
    return rng / 0x7fffffff;
  };
  const entries: TimeEntry[] = [];
  for (let dayOffset = 75; dayOffset >= 0; dayOffset--) {
    const d = new Date();
    d.setDate(d.getDate() - dayOffset);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) {
      if (next() > 0.25) continue; // mostly skip weekends
    } else if (next() > 0.8) {
      continue; // occasional weekday off
    }
    const sessions = 1 + Math.floor(next() * 4);
    for (let s = 0; s < sessions; s++) {
      const task = workTasks[Math.floor(next() * workTasks.length)];
      const minutes = 20 + Math.floor(next() * 50);
      const start = new Date(d);
      start.setHours(9 + s, Math.floor(next() * 50), 0, 0);
      const end = new Date(start.getTime() + minutes * 60_000);
      entries.push({
        id: uidLocal(),
        taskId: task?.id ?? null,
        startedAt: start.toISOString(),
        endedAt: end.toISOString(),
        durationSeconds: minutes * 60,
        kind: 'work',
      });
      if (next() > 0.6) {
        const bStart = new Date(end.getTime());
        const bMin = 5 + Math.floor(next() * 10);
        entries.push({
          id: uidLocal(),
          taskId: null,
          startedAt: bStart.toISOString(),
          endedAt: new Date(bStart.getTime() + bMin * 60_000).toISOString(),
          durationSeconds: bMin * 60,
          kind: 'break',
        });
      }
    }
  }
  timeLog = entries;
}
seedTimeEntries();

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
      scheduledTime: input.scheduledTime ?? null,
      dueDate: null,
      estimateMinutes: input.estimateMinutes ?? 0,
      spentMinutes: 0,
      sortOrder: 0,
      createdAt: ts,
      updatedAt: ts,
      completedAt: null,
      archived: false,
      customProps: {},
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
  async setTaskArchived(id: string, archived: boolean) {
    const t = tasks.find((x) => x.id === id);
    if (!t) throw new Error('task not found');
    t.archived = archived;
    t.updatedAt = now();
    return clone(t);
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
  async createProject(name: string, color: string | null, alias: string | null) {
    const p: Project = { id: uid(), name, color, alias, pinned: false, sortOrder: projects.length, archived: false, createdAt: now() };
    projects.push(p);
    return clone(p);
  },
  async updateProject(id: string, name: string, color: string | null, alias: string | null) {
    const p = projects.find((x) => x.id === id);
    if (!p) throw new Error('project not found');
    p.name = name;
    p.color = color;
    p.alias = alias;
    return clone(p);
  },
  async setProjectPinned(id: string, pinned: boolean) {
    const p = projects.find((x) => x.id === id);
    if (!p) throw new Error('project not found');
    p.pinned = pinned;
    return clone(p);
  },
  async setProjectArchived(id: string, archived: boolean) {
    const p = projects.find((x) => x.id === id);
    if (!p) throw new Error('project not found');
    p.archived = archived;
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

  async logTime(taskId: string | null, seconds: number, kind: TimeKind) {
    const ts = now();
    timeLog.push({
      id: uid(),
      taskId,
      startedAt: new Date(Date.now() - seconds * 1000).toISOString(),
      endedAt: ts,
      durationSeconds: seconds,
      kind,
    });
    if (kind === 'work' && taskId) {
      const t = tasks.find((x) => x.id === taskId);
      if (t) {
        t.spentMinutes += Math.round(seconds / 60);
        t.updatedAt = now();
        return clone(t);
      }
    }
    return null;
  },
  async listTimeEntries() {
    return clone(timeLog);
  },
  async timeToday() {
    const day = today();
    return timeLog
      .filter((e) => e.kind === 'work' && (e.endedAt ?? e.startedAt).slice(0, 10) === day)
      .reduce((sum, e) => sum + e.durationSeconds, 0);
  },

  async dataStats(): Promise<DataStats> {
    return {
      path: '(aperçu navigateur — données en mémoire)',
      fileBytes: 0,
      projects: projects.length,
      tags: tags.length,
      tasks: tasks.length,
      timeEntries: timeLog.length,
    };
  },
  async exportData() {
    /* no-op in browser preview */
  },
  async importData() {
    /* no-op in browser preview */
  },
  async resetData() {
    projects = [];
    tags = [];
    tasks = [];
    timeLog = [];
  },
};
