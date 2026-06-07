import { useEffect, useRef, useState } from 'react';
import { CalendarCheck, CornerDownLeft, Hourglass, Inbox, X } from 'lucide-react';
import { fr } from 'date-fns/locale';
import { parseQuickAdd, useStore } from '../lib/store';
import { ESTIMATE_OPTIONS, formatEstimate, isoDate, todayIso } from '../lib/dates';
import { cn } from '../lib/utils';
import { Badge } from './ui/badge';
import { Calendar } from './ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

function parseLocalDate(iso: string | null): Date | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const chip =
  'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-accent data-[state=open]:bg-accent';

export function TaskSpotlight() {
  const close = useStore((s) => s.closeSpotlight);
  const quickAdd = useStore((s) => s.quickAdd);
  const projects = useStore((s) => s.projects);
  const view = useStore((s) => s.view);
  const activeProjectId = useStore((s) => s.activeProjectId);

  const inputRef = useRef<HTMLInputElement>(null);

  const [value, setValue] = useState('');
  // `undefined` → infer from text (`@projet`); `null` → Inbox; else explicit id.
  const [projectId, setProjectId] = useState<string | null | undefined>(
    view === 'project' ? activeProjectId : undefined,
  );
  const [date, setDate] = useState<string | null>(todayIso());
  const [estimate, setEstimate] = useState(0);

  useEffect(() => inputRef.current?.focus(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const parsed = parseQuickAdd(value);

  const handle = parsed.projectName?.toLowerCase();
  const effectiveProject =
    projectId === undefined
      ? projects.find((p) => p.name.toLowerCase() === handle || p.alias?.toLowerCase() === handle) ?? null
      : projects.find((p) => p.id === projectId) ?? null;
  const projectLabel = effectiveProject
    ? effectiveProject.name
    : projectId === undefined && parsed.projectName
      ? parsed.projectName
      : 'Inbox';

  const dateLabel = !date
    ? 'Quand ?'
    : date === todayIso()
      ? "Aujourd'hui"
      : parseLocalDate(date)!.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  function submit() {
    if (!parsed.title.trim()) return;
    void quickAdd(value, { projectId, date, estimateMinutes: estimate || undefined });
    setValue('');
    inputRef.current?.focus();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px] duration-150 animate-in fade-in-0"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="mx-auto mt-[12vh] w-full max-w-2xl px-4">
        <div className="overflow-hidden rounded-2xl border bg-background shadow-2xl duration-200 animate-in zoom-in-95 slide-in-from-top-2">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Un titre de tâche   #tag   @projet"
              className="flex-1 bg-transparent text-lg outline-none placeholder:text-muted-foreground/50"
            />
            <button
              onClick={submit}
              disabled={!parsed.title.trim()}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
              title="Ajouter (Entrée)"
            >
              <CornerDownLeft size={17} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1 border-t border-border/60 px-3 py-2 text-muted-foreground">
            <DropdownMenu>
              <DropdownMenuTrigger className={cn(chip, effectiveProject && 'text-foreground')}>
                <Inbox size={15} /> {projectLabel}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-72 w-48">
                <DropdownMenuItem onSelect={() => setProjectId(null)}>
                  <Inbox size={14} /> Inbox
                </DropdownMenuItem>
                {projects.length > 0 && <DropdownMenuSeparator />}
                {projects.map((p) => (
                  <DropdownMenuItem key={p.id} onSelect={() => setProjectId(p.id)}>
                    <span className="size-2 rounded-full" style={{ background: p.color ?? 'var(--muted-foreground)' }} />
                    {p.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger className={cn(chip, date && 'text-foreground')}>
                <CalendarCheck size={15} /> {dateLabel}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-auto p-2" onCloseAutoFocus={(e) => e.preventDefault()}>
                <DropdownMenuItem onSelect={() => setDate(todayIso())}>
                  <CalendarCheck size={14} /> Aujourd'hui
                </DropdownMenuItem>
                {date && (
                  <DropdownMenuItem onSelect={() => setDate(null)}>
                    <X size={14} /> Retirer
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <Calendar
                  mode="single"
                  locale={fr}
                  selected={parseLocalDate(date)}
                  onSelect={(d) => d && setDate(isoDate(d))}
                />
              </DropdownMenuContent>
            </DropdownMenu>
            {date && (
              <button
                onClick={() => setDate(null)}
                className="-ml-1 inline-flex size-6 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-foreground"
                title="Retirer la date"
              >
                <X size={13} />
              </button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger className={cn(chip, estimate > 0 && 'text-foreground')}>
                <Hourglass size={15} /> {estimate > 0 ? formatEstimate(estimate) : 'Estimation'}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-32">
                {estimate > 0 && (
                  <DropdownMenuItem onSelect={() => setEstimate(0)}>
                    <X size={14} /> Aucune
                  </DropdownMenuItem>
                )}
                {ESTIMATE_OPTIONS.map((m) => (
                  <DropdownMenuItem key={m} onSelect={() => setEstimate(m)}>
                    {formatEstimate(m)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {parsed.tagNames.length > 0 && (
              <div className="ml-1 flex flex-wrap items-center gap-1">
                {parsed.tagNames.map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs">
                    #{t}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
