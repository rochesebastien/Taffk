import type { Project, Tag, Task } from './api';

export type TaskReportScope = 'current' | 'all';

type TaskReportInput = {
  tasks: Task[];
  projects: Project[];
  tags: Tag[];
  scope: TaskReportScope;
  projectId?: string | null;
  generatedAt?: Date;
};

const STATUS_LABELS = {
  todo: 'À faire',
  in_progress: 'En cours',
  done: 'Terminées',
} as const;

function escapeInline(value: string): string {
  return value.replace(/\s+/g, ' ').trim().replace(/([\\`*_{}\[\]()#+.!|>-])/g, '\\$1');
}

function formatDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

function completion(tasks: Task[]): number {
  return tasks.length ? Math.round((tasks.filter((task) => task.done).length / tasks.length) * 100) : 0;
}

function taskMetadata(task: Task, tagsById: Map<string, Tag>): string[] {
  const metadata: string[] = [];
  if (task.scheduledFor) {
    const time = task.scheduledTime ? ` à ${task.scheduledTime}` : '';
    metadata.push(`Planifiée : ${formatDate(task.scheduledFor)}${time}`);
  }
  if (task.dueDate) metadata.push(`Échéance : ${formatDate(task.dueDate)}`);
  if (task.tagIds.length) {
    const names = task.tagIds
      .map((id) => tagsById.get(id)?.name)
      .filter((name): name is string => Boolean(name))
      .map((name) => `#${escapeInline(name)}`);
    if (names.length) metadata.push(`Tags : ${names.join(', ')}`);
  }
  if (task.estimateMinutes > 0) metadata.push(`Estimation : ${formatMinutes(task.estimateMinutes)}`);
  if (task.spentMinutes > 0) metadata.push(`Temps passé : ${formatMinutes(task.spentMinutes)}`);
  return metadata;
}

function renderTask(
  task: Task,
  childrenByParent: Map<string, Task[]>,
  tagsById: Map<string, Tag>,
  depth = 0,
): string[] {
  const indent = '  '.repeat(depth);
  const marker = task.done ? 'x' : ' ';
  const status = task.status === 'in_progress' ? ' — *en cours*' : '';
  const lines = [`${indent}- [${marker}] **${escapeInline(task.title)}**${status}`];
  const metadata = taskMetadata(task, tagsById);
  if (metadata.length) lines.push(`${indent}  - ${metadata.join(' · ')}`);
  if (task.notes.trim()) {
    lines.push(`${indent}  - Notes :`);
    for (const line of task.notes.trim().split('\n')) lines.push(`${indent}    > ${line}`);
  }
  for (const child of childrenByParent.get(task.id) ?? []) {
    lines.push(...renderTask(child, childrenByParent, tagsById, depth + 1));
  }
  return lines;
}

function renderProject(name: string, tasks: Task[], tagsById: Map<string, Tag>): string[] {
  const sorted = [...tasks].sort(
    (a, b) => a.sortOrder - b.sortOrder || b.createdAt.localeCompare(a.createdAt),
  );
  const taskIds = new Set(sorted.map((task) => task.id));
  const childrenByParent = new Map<string, Task[]>();
  for (const task of sorted) {
    if (!task.parentId || !taskIds.has(task.parentId)) continue;
    const children = childrenByParent.get(task.parentId) ?? [];
    children.push(task);
    childrenByParent.set(task.parentId, children);
  }
  const roots = sorted.filter((task) => !task.parentId || !taskIds.has(task.parentId));
  const estimate = tasks.reduce((sum, task) => sum + task.estimateMinutes, 0);
  const spent = tasks.reduce((sum, task) => sum + task.spentMinutes, 0);
  const lines = [
    `## ${escapeInline(name)}`,
    '',
    `**${tasks.length} tâche${tasks.length === 1 ? '' : 's'} · ${completion(tasks)} % terminées · ${formatMinutes(estimate)} estimées · ${formatMinutes(spent)} passées**`,
    '',
  ];

  if (!tasks.length) return [...lines, '_Aucune tâche._', ''];

  for (const [status, label] of Object.entries(STATUS_LABELS)) {
    const matchingRoots = roots.filter((task) => task.status === status);
    if (!matchingRoots.length) continue;
    lines.push(`### ${label}`, '');
    for (const task of matchingRoots) lines.push(...renderTask(task, childrenByParent, tagsById));
    lines.push('');
  }
  return lines;
}

export function createTaskReport({
  tasks,
  projects,
  tags,
  scope,
  projectId = null,
  generatedAt = new Date(),
}: TaskReportInput): string {
  const activeProjects = projects
    .filter((project) => !project.archived)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
  const activeProjectIds = new Set(activeProjects.map((project) => project.id));
  const activeTasks = tasks.filter(
    (task) => !task.archived && (task.projectId === null || activeProjectIds.has(task.projectId)),
  );
  const currentProject = scope === 'current' ? projects.find((project) => project.id === projectId) : null;
  const reportTasks = currentProject
    ? activeTasks.filter((task) => task.projectId === currentProject.id)
    : activeTasks;
  const tagsById = new Map(tags.map((tag) => [tag.id, tag]));
  const title = currentProject ? `Rapport — ${escapeInline(currentProject.name)}` : 'Rapport de tous les projets';
  const generatedLabel = generatedAt.toLocaleString('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
  const open = reportTasks.filter((task) => !task.done).length;
  const done = reportTasks.length - open;
  const estimate = reportTasks.reduce((sum, task) => sum + task.estimateMinutes, 0);
  const spent = reportTasks.reduce((sum, task) => sum + task.spentMinutes, 0);
  const lines = [
    `# ${title}`,
    '',
    `*Généré le ${generatedLabel}*`,
    '',
    '## Synthèse',
    '',
    `| Total | À terminer | Terminées | Avancement | Estimation | Temps passé |`,
    `| ---: | ---: | ---: | ---: | ---: | ---: |`,
    `| ${reportTasks.length} | ${open} | ${done} | ${completion(reportTasks)} % | ${formatMinutes(estimate)} | ${formatMinutes(spent)} |`,
    '',
  ];

  if (currentProject) {
    lines.push(...renderProject(currentProject.name, reportTasks, tagsById));
  } else {
    for (const project of activeProjects) {
      lines.push(...renderProject(project.name, reportTasks.filter((task) => task.projectId === project.id), tagsById));
    }
    const unassigned = reportTasks.filter(
      (task) => task.projectId === null || !activeProjects.some((project) => project.id === task.projectId),
    );
    if (unassigned.length) lines.push(...renderProject('Sans projet', unassigned, tagsById));
  }

  return `${lines.join('\n').trim()}\n`;
}

export function taskReportFileName(project: Project | null, date: string): string {
  const scope = project?.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'tous-les-projets';
  return `taffk-rapport-${scope}-${date}.md`;
}
