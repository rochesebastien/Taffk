import { useMemo, useState } from 'react';
import {
  Archive,
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CirclePlus,
  Clock,
  Columns3,
  Ellipsis,
  FolderClock,
  FolderClosed,
  FolderHeart,
  Inbox,
  ListTodo,
  Moon,
  PencilLine,
  Pin,
  PinOff,
  Plus,
  Settings,
  SquarePen,
  Sun,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { useStore, type View } from '../lib/store';
import { useTheme } from '../lib/theme';
import { confirm } from '../lib/confirm';
import { prompt } from '../lib/prompt';
import { todayIso } from '../lib/dates';
import { cn } from '../lib/utils';
import { PomodoroWidget } from './PomodoroWidget';
import { ProjectDialog } from './ProjectDialog';
import { Kbd } from './ui/kbd';
import type { Project } from '../lib/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import logoDark from '../assets/logo_navbar_dark.png';
import logoLight from '../assets/logo_navbar_light.png';

type ProjectSort = 'default' | 'recent' | 'created' | 'updated' | 'count' | 'completion';

type NavItemProps = {
  icon: LucideIcon;
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
};

function NavItem({ icon: Icon, label, active, count, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors',
        active
          ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
      )}
    >
      <Icon size={17} className={cn('shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count ? <span className="font-mono text-xs text-muted-foreground">{count}</span> : null}
    </button>
  );
}

function SortItem({
  icon: Icon,
  label,
  value,
  active,
  onPick,
}: {
  icon: LucideIcon;
  label: string;
  value: ProjectSort;
  active: ProjectSort;
  onPick: (v: ProjectSort) => void;
}) {
  return (
    <DropdownMenuItem onSelect={() => onPick(value)}>
      <Icon /> {label}
      {active === value && <Check className="ml-auto text-foreground" />}
    </DropdownMenuItem>
  );
}

export function Sidebar() {
  const { theme, toggle } = useTheme();
  const view = useStore((s) => s.view);
  const activeProjectId = useStore((s) => s.activeProjectId);
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const setView = useStore((s) => s.setView);
  const openProject = useStore((s) => s.openProject);
  const openSpotlight = useStore((s) => s.openSpotlight);
  const toggleProjectPin = useStore((s) => s.toggleProjectPin);
  const updateProject = useStore((s) => s.updateProject);
  const removeProject = useStore((s) => s.removeProject);

  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectsCollapsed, setProjectsCollapsed] = useState(false);
  const [projectSort, setProjectSort] = useState<ProjectSort>('default');

  function openProjectDialog(project: Project | null) {
    setEditingProject(project);
    setProjectDialogOpen(true);
  }

  async function renameProject(p: Project) {
    const name = await prompt({ title: 'Renommer le projet', initialValue: p.name, confirmLabel: 'Renommer' });
    if (name?.trim()) await updateProject(p.id, name.trim(), p.color, p.alias);
  }

  async function confirmRemoveProject(p: Project) {
    const ok = await confirm({
      title: 'Retirer le projet ?',
      description: `« ${p.name} » sera supprimé. Ses tâches sont conservées mais ne seront plus rattachées à aucun projet.`,
      confirmLabel: 'Retirer',
      destructive: true,
    });
    if (ok) await removeProject(p.id);
  }

  const today = todayIso();
  const top = tasks.filter((t) => t.parentId === null);
  const todayCount = top.filter((t) => !t.done && t.scheduledFor === today).length;
  const allCount = top.filter((t) => !t.done).length;

  const sortedProjects = useMemo(() => {
    const lastActivity = (id: string) => {
      const ts = tasks.filter((t) => t.projectId === id).map((t) => t.updatedAt);
      return ts.length ? ts.reduce((a, b) => (a > b ? a : b)) : '';
    };
    const total = (id: string) => top.filter((t) => t.projectId === id).length;
    const completed = (id: string) => top.filter((t) => t.projectId === id && t.done).length;
    const cmp: (a: Project, b: Project) => number =
      projectSort === 'recent'
        ? (a, b) => b.createdAt.localeCompare(a.createdAt)
        : projectSort === 'created'
          ? (a, b) => a.createdAt.localeCompare(b.createdAt)
          : projectSort === 'updated'
            ? (a, b) => lastActivity(b.id).localeCompare(lastActivity(a.id))
            : projectSort === 'count'
              ? (a, b) => total(b.id) - total(a.id)
              : projectSort === 'completion'
                ? (a, b) => completed(b.id) - completed(a.id)
                : (a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt);
    // Pinned projects always float to the top, regardless of the active order.
    return [...projects].sort(cmp).sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }, [projects, tasks, top, projectSort]);

  const nav: { view: View; icon: LucideIcon; label: string; count?: number }[] = [
    { view: 'today', icon: CalendarCheck, label: "Aujourd'hui", count: todayCount },
    { view: 'all', icon: Inbox, label: 'Toutes les tâches', count: allCount },
    { view: 'board', icon: Columns3, label: 'Tableau' },
    { view: 'calendar', icon: CalendarDays, label: 'Planning' },
  ];

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 text-sidebar-foreground">
      <div className="px-2 pb-4">
        <img className="h-8 w-auto" src={theme === 'light' ? logoDark : logoLight} alt="Taffk" />
      </div>

      <button
        onClick={openSpotlight}
        className="group mb-1.5 flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      >
        <SquarePen size={17} className="shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate">Nouvelle tâche</span>
        <Kbd className="hidden shrink-0 px-1.5 group-hover:inline-flex">Ctrl+Space</Kbd>
      </button>

      <nav className="flex flex-col gap-0.5">
        {nav.map((n) => (
          <NavItem
            key={n.view}
            icon={n.icon}
            label={n.label}
            count={n.count}
            active={view === n.view}
            onClick={() => setView(n.view)}
          />
        ))}
      </nav>

      <div className="mt-6 flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm text-sidebar-foreground/80">
          <button
            className="flex min-w-0 flex-1 items-center gap-2.5 text-left transition-colors hover:text-sidebar-foreground"
            onClick={() => setProjectsCollapsed((c) => !c)}
          >
            <FolderClosed size={17} className="shrink-0 text-muted-foreground" />
            <span className="truncate">Projets</span>
            {projectsCollapsed ? (
              <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
            )}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                title="Options des projets"
              >
                <Ellipsis size={15} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2">
                  <FolderClosed /> Organiser par
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <SortItem icon={FolderHeart} label="Projets" value="default" active={projectSort} onPick={setProjectSort} />
                  <SortItem icon={FolderClock} label="Projets récents" value="recent" active={projectSort} onPick={setProjectSort} />
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2">
                  <Clock /> Trier par
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <SortItem icon={CirclePlus} label="Créé" value="created" active={projectSort} onPick={setProjectSort} />
                  <SortItem icon={PencilLine} label="Mis à jour" value="updated" active={projectSort} onPick={setProjectSort} />
                  <SortItem icon={ListTodo} label="Nombre de tâches" value="count" active={projectSort} onPick={setProjectSort} />
                  <SortItem icon={CircleCheck} label="Complétion" value="completion" active={projectSort} onPick={setProjectSort} />
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            className="flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            title="Nouveau projet"
            onClick={() => openProjectDialog(null)}
          >
            <Plus size={15} />
          </button>
        </div>

        {!projectsCollapsed && (
          <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
            {sortedProjects.map((p) => {
              const count = top.filter((t) => !t.done && t.projectId === p.id).length;
              const active = view === 'project' && activeProjectId === p.id;
              return (
                <div
                  key={p.id}
                  className={cn(
                    'group flex items-center gap-2 rounded-md py-1.5 pl-4 pr-2.5 text-sm transition-colors',
                    active
                      ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                  )}
                >
                  <button onClick={() => openProject(p.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    {p.pinned ? (
                      <Pin size={12} className="shrink-0 text-primary" />
                    ) : (
                      <span className="shrink-0 text-muted-foreground">-</span>
                    )}
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  </button>

                  {count ? (
                    <span className="font-mono text-xs text-muted-foreground group-hover:hidden group-has-[[data-state=open]]:hidden">
                      {count}
                    </span>
                  ) : null}

                  <div className="hidden items-center gap-0.5 group-hover:flex group-has-[[data-state=open]]:flex">
                    <button
                      className="flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      title="Modifier le projet"
                      onClick={() => openProjectDialog(p)}
                    >
                      <SquarePen size={14} />
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                          title="Options"
                        >
                          <Ellipsis size={14} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onSelect={() => void toggleProjectPin(p.id)}>
                          {p.pinned ? <PinOff /> : <Pin />} {p.pinned ? 'Désépingler' : 'Épingler le projet'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => void renameProject(p)}>
                          <PencilLine /> Renommer le projet
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled>
                          <Archive /> Archiver
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={() => void confirmRemoveProject(p)}>
                          <Trash2 /> Retirer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ProjectDialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen} project={editingProject} />

      <div className="mt-2 flex flex-col gap-1 border-t border-sidebar-border pt-3">
        <PomodoroWidget />
        <button
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          onClick={toggle}
          title="Changer de thème"
        >
          {theme === 'dark' ? (
            <Moon size={16} className="text-muted-foreground" />
          ) : (
            <Sun size={16} className="text-muted-foreground" />
          )}
          <span>{theme === 'dark' ? 'Sombre' : 'Clair'}</span>
        </button>
        <NavItem
          icon={Settings}
          label="Paramètres"
          active={view === 'settings'}
          onClick={() => setView('settings')}
        />
      </div>
    </aside>
  );
}
