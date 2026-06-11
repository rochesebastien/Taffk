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
  Clock2,
  Columns3,
  Ellipsis,
  ExternalLink,
  FolderClock,
  FolderClosed,
  FolderHeart,
  HandMetal,
  Inbox,
  ListTodo,
  PanelLeftClose,
  PanelLeftOpen,
  PencilLine,
  Pin,
  PinOff,
  Plus,
  Search,
  Settings,
  SquarePen,
  StickyNote,
  Tag,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { useStore, type View } from '../lib/store';
import { useSettings } from '../lib/settings';
import { useTheme } from '../lib/theme';
import { useSidebar, SIDEBAR_COLLAPSED } from '../lib/sidebar';
import { confirm } from '../lib/confirm';
import { prompt } from '../lib/prompt';
import { todayIso } from '../lib/dates';
import { cn, isMac } from '../lib/utils';
import { PomodoroWidget } from './PomodoroWidget';
import { ProjectDialog } from './projects/ProjectDialog';
import { Kbd } from './ui/kbd';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { isTauri, openStickyNote, type Project } from '../lib/api';
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
import logoDark from '../assets/logo_navbar_dark.svg';
import logoLight from '../assets/logo_navbar_light.svg';
import logoAlone from '../assets/logo_alone.svg';

type ProjectSort = 'default' | 'recent' | 'created' | 'updated' | 'count' | 'completion';

const railBtn =
  'group flex w-full items-center justify-center rounded-md px-2 py-2 text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground';

type NavItemProps = {
  icon: LucideIcon;
  label: string;
  active: boolean;
  collapsed: boolean;
  count?: number;
  kbd?: string;
  external?: boolean;
  onClick: () => void;
};

export function NavItem({ icon: Icon, label, active, collapsed, count, kbd, external, onClick }: NavItemProps) {
  const button = (
    <button
      onClick={onClick}
      className={cn(
        'group flex w-full items-center rounded-md text-left text-sm transition-colors',
        collapsed ? 'justify-center px-2 py-2' : 'gap-2.5 px-2.5 py-1.5',
        active
          ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
      )}
    >
      <Icon size={17} className={cn('shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {!collapsed && kbd ? <Kbd className="hidden shrink-0 px-1.5 group-hover:inline-flex">{kbd}</Kbd> : null}
      {!collapsed && count ? <span className="font-mono text-xs text-muted-foreground">{count}</span> : null}
      {!collapsed && external ? (
        <ExternalLink size={13} className="shrink-0 text-muted-foreground/60" />
      ) : null}
    </button>
  );
  if (!collapsed) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

// Desktop sticky notes need macOS (NSWindow desktop layer); the browser
// preview keeps the entry visible so the widget can be developed anywhere.
const stickyNotesAvailable = isMac || !isTauri;

function StickyNotePicker({ collapsed }: { collapsed: boolean }) {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const today = todayIso();
  const candidates = tasks
    .filter((t) => !t.done && !t.archived && t.parentId === null)
    .sort(
      (a, b) =>
        Number(b.scheduledFor === today) - Number(a.scheduledFor === today) ||
        a.sortOrder - b.sortOrder,
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'group flex w-full items-center rounded-md text-left text-sm transition-colors',
            collapsed ? 'justify-center px-2 py-2' : 'gap-2.5 px-2.5 py-1.5',
            'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
          )}
          title="Épingler une tâche sur le bureau"
        >
          <StickyNote size={17} className="shrink-0 text-muted-foreground" />
          {!collapsed && <span className="min-w-0 flex-1 truncate">Post-it</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" className="max-h-80 w-64 overflow-y-auto">
        {candidates.length === 0 ? (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">Aucune tâche à épingler</div>
        ) : (
          candidates.map((t) => {
            const project = projects.find((p) => p.id === t.projectId);
            return (
              <DropdownMenuItem key={t.id} onSelect={() => void openStickyNote(t.id)}>
                <span className="min-w-0 flex-1 truncate">{t.title}</span>
                {project && (
                  <span className="shrink-0 text-xs text-muted-foreground">{project.name}</span>
                )}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
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
  const { theme } = useTheme();
  const profileName = useSettings((s) => s.profileName);
  const profileEmoji = useSettings((s) => s.profileEmoji);
  const { width, setWidth, collapsed, setCollapsed, toggleCollapsed } = useSidebar();
  const view = useStore((s) => s.view);
  const activeProjectId = useStore((s) => s.activeProjectId);
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const tags = useStore((s) => s.tags);
  const setView = useStore((s) => s.setView);
  const openSettings = useStore((s) => s.openSettings);
  const openProject = useStore((s) => s.openProject);
  const openSpotlight = useStore((s) => s.openSpotlight);
  const openSearch = useStore((s) => s.openSearch);
  const toggleProjectPin = useStore((s) => s.toggleProjectPin);
  const archiveProject = useStore((s) => s.archiveProject);
  const updateProject = useStore((s) => s.updateProject);
  const removeProject = useStore((s) => s.removeProject);

  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectsCollapsed, setProjectsCollapsed] = useState(false);
  const [projectSort, setProjectSort] = useState<ProjectSort>('default');
  const [dragging, setDragging] = useState(false);

  function startResize(e: React.MouseEvent) {
    e.preventDefault();
    setDragging(true);
    const onMove = (ev: MouseEvent) => setWidth(ev.clientX);
    const onUp = () => {
      setDragging(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }

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
    return [...projects]
      .filter((p) => !p.archived)
      .sort(cmp)
      .sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }, [projects, tasks, top, projectSort]);

  const nav: { view: View; icon: LucideIcon; label: string; count?: number }[] = [
    { view: 'today', icon: CalendarCheck, label: "Aujourd'hui", count: todayCount },
    { view: 'all', icon: Inbox, label: 'Toutes les tâches', count: allCount },
    { view: 'board', icon: Columns3, label: 'Tableau' },
    { view: 'calendar', icon: CalendarDays, label: 'Planning' },
  ];

  return (
    <aside
      style={{ width: collapsed ? SIDEBAR_COLLAPSED : width }}
      className={cn(
        'relative flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar py-4 text-sidebar-foreground',
        collapsed ? 'px-2' : 'px-3',
        !dragging && 'transition-[width] duration-200 ease-out',
      )}
    >
      {collapsed ? (
        <div className="mb-2 flex flex-col items-center gap-2">
          <img className="size-8" src={logoAlone} alt="Taffk" />
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={toggleCollapsed} className={railBtn} title="Déployer le menu">
                <PanelLeftOpen size={18} className="text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Déployer le menu</TooltipContent>
          </Tooltip>
        </div>
      ) : (
        <div className="flex items-center justify-between pb-4 pl-2 pr-1">
          <img className="h-8 w-auto" src={theme === 'light' ? logoDark : logoLight} alt="Taffk" />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleCollapsed}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                <PanelLeftClose size={18} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Réduire le menu</TooltipContent>
          </Tooltip>
        </div>
      )}

      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => openSpotlight()} className={cn(railBtn, 'mb-1.5')}>
              <SquarePen size={17} className="shrink-0 text-primary" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Nouvelle tâche</TooltipContent>
        </Tooltip>
      ) : (
        <button
          onClick={() => openSpotlight()}
          className="group mb-1.5 flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        >
          <SquarePen size={17} className="shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate">Nouvelle tâche</span>
          <Kbd className="hidden shrink-0 px-1.5 group-hover:inline-flex">Ctrl+Space</Kbd>
        </button>
      )}

      <nav className="flex flex-col gap-0.5">
        {nav.map((n) => (
          <NavItem
            key={n.view}
            icon={n.icon}
            label={n.label}
            count={n.count}
            collapsed={collapsed}
            active={view === n.view}
            onClick={() => setView(n.view)}
          />
        ))}
      </nav>

      <div className="mt-6 flex min-h-0 flex-1 flex-col">
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => setCollapsed(false)} className={railBtn} title="Projets">
                <FolderClosed size={17} className="text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Projets</TooltipContent>
          </Tooltip>
        ) : (
          <div className="flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-sm text-sidebar-foreground/80">
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
        )}

        {!collapsed && !projectsCollapsed && (
          <div className="flex min-h-0 flex-col gap-0.5 overflow-y-auto">
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
                        <DropdownMenuItem onSelect={() => void archiveProject(p.id, true)}>
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

        <nav className="mt-6 flex shrink-0 flex-col gap-0.5">
          <NavItem icon={Search} label="Recherche" active={false} collapsed={collapsed} kbd="Ctrl+F" onClick={openSearch} />
          <NavItem
            icon={Tag}
            label="Étiquettes"
            active={view === 'tags'}
            count={tags.length}
            collapsed={collapsed}
            onClick={() => setView('tags')}
          />
          <NavItem
            icon={Clock2}
            label="Gestion du temps"
            active={view === 'time'}
            collapsed={collapsed}
            onClick={() => setView('time')}
          />
          {stickyNotesAvailable && <StickyNotePicker collapsed={collapsed} />}
        </nav>

        <div className="flex-1" />
      </div>

      <ProjectDialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen} project={editingProject} />

      <div className="mt-2 flex flex-col gap-1 border-t border-sidebar-border pt-3">
        <PomodoroWidget collapsed={collapsed} />
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center px-2 py-2">
                {profileEmoji.trim() ? (
                  <span className="text-base leading-none">{profileEmoji.trim()}</span>
                ) : (
                  <HandMetal size={16} className="text-muted-foreground" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">{profileName.trim() || 'Profil'}</TooltipContent>
          </Tooltip>
        ) : (
          <div className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm text-sidebar-foreground/80">
            {profileEmoji.trim() ? (
              <span className="text-base leading-none">{profileEmoji.trim()}</span>
            ) : (
              <HandMetal size={16} className="text-muted-foreground" />
            )}
            <span className="min-w-0 flex-1 truncate">{profileName.trim() || 'Profil'}</span>
          </div>
        )}
        <NavItem
          icon={Settings}
          label="Paramètres"
          active={view === 'settings'}
          collapsed={collapsed}
          onClick={openSettings}
        />
      </div>

      {!collapsed && (
        <div
          onMouseDown={startResize}
          className="absolute right-0 top-0 z-10 h-full w-1 cursor-col-resize transition-colors hover:bg-primary/40"
          title="Redimensionner"
        />
      )}
    </aside>
  );
}
