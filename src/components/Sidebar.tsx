import { useMemo, useState } from 'react';
import {
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
  ListTodo,
  Moon,
  PencilLine,
  Plus,
  Settings,
  Sun,
  type LucideIcon,
} from 'lucide-react';
import { useStore, type View } from '../lib/store';
import { useTheme } from '../lib/theme';
import { todayIso } from '../lib/dates';
import { cn } from '../lib/utils';
import { PomodoroWidget } from './PomodoroWidget';
import { ProjectDialog } from './ProjectDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [projectsCollapsed, setProjectsCollapsed] = useState(false);
  const [projectSort, setProjectSort] = useState<ProjectSort>('default');

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
    const arr = [...projects];
    switch (projectSort) {
      case 'recent':
        return arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      case 'created':
        return arr.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      case 'updated':
        return arr.sort((a, b) => lastActivity(b.id).localeCompare(lastActivity(a.id)));
      case 'count':
        return arr.sort((a, b) => total(b.id) - total(a.id));
      case 'completion':
        return arr.sort((a, b) => completed(b.id) - completed(a.id));
      default:
        return arr.sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
    }
  }, [projects, tasks, top, projectSort]);

  const nav: { view: View; icon: LucideIcon; label: string; count?: number }[] = [
    { view: 'today', icon: CalendarCheck, label: "Aujourd'hui", count: todayCount },
    { view: 'all', icon: ListTodo, label: 'Toutes les tâches', count: allCount },
    { view: 'board', icon: Columns3, label: 'Tableau' },
    { view: 'calendar', icon: CalendarDays, label: 'Planning' },
  ];

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 text-sidebar-foreground">
      <div className="px-2 pb-4">
        <img className="h-8 w-auto" src={theme === 'light' ? logoDark : logoLight} alt="Taffk" />
      </div>

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
            onClick={() => setProjectDialogOpen(true)}
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
                <button
                  key={p.id}
                  onClick={() => openProject(p.id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md py-1.5 pl-6 pr-2.5 text-left text-sm transition-colors',
                    active
                      ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                  )}
                >
                  <span className="shrink-0 text-muted-foreground">-</span>
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  {count ? <span className="font-mono text-xs text-muted-foreground">{count}</span> : null}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <ProjectDialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen} />

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
