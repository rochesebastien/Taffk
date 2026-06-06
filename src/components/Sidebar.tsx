import { useState } from 'react';
import {
  CalendarCheck,
  CalendarDays,
  Columns3,
  ListTodo,
  Moon,
  Plus,
  Sun,
  type LucideIcon,
} from 'lucide-react';
import { useStore, type View } from '../lib/store';
import { useTheme } from '../lib/theme';
import { todayIso } from '../lib/dates';
import { cn } from '../lib/utils';
import { PomodoroWidget } from './PomodoroWidget';
import logoDark from '../assets/logo_navbar_dark.png';
import logoLight from '../assets/logo_navbar_light.png';

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

export function Sidebar() {
  const { theme, toggle } = useTheme();
  const view = useStore((s) => s.view);
  const activeProjectId = useStore((s) => s.activeProjectId);
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const setView = useStore((s) => s.setView);
  const openProject = useStore((s) => s.openProject);
  const addProject = useStore((s) => s.addProject);

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const today = todayIso();
  const top = tasks.filter((t) => t.parentId === null);
  const todayCount = top.filter((t) => !t.done && t.scheduledFor === today).length;
  const allCount = top.filter((t) => !t.done).length;

  async function submitProject(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) {
      const p = await addProject(trimmed);
      openProject(p.id);
    }
    setName('');
    setAdding(false);
  }

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
        <div className="flex items-center justify-between px-2.5 pb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Projets
          </span>
          <button
            className="flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            title="Nouveau projet"
            onClick={() => setAdding(true)}
          >
            <Plus size={15} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
          {projects.map((p) => {
            const count = top.filter((t) => !t.done && t.projectId === p.id).length;
            const active = view === 'project' && activeProjectId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => openProject(p.id)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors',
                  active
                    ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                )}
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: p.color ?? 'var(--muted-foreground)' }}
                />
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                {count ? <span className="font-mono text-xs text-muted-foreground">{count}</span> : null}
              </button>
            );
          })}
          {adding && (
            <form onSubmit={submitProject} className="px-1 py-1">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={submitProject}
                placeholder="Nom du projet"
                className="w-full rounded-md border border-ring/60 bg-background px-2.5 py-1.5 text-sm outline-none"
              />
            </form>
          )}
        </div>
      </div>

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
      </div>
    </aside>
  );
}
