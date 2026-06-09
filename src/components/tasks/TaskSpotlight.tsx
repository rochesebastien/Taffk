import { useEffect, useMemo, useRef, useState } from 'react';
import { AtSign, CalendarCheck, Check, Clock, CornerDownLeft, Hash, Hourglass, Inbox, Plus, Sunrise, Tag as TagIcon, X } from 'lucide-react';
import { fr } from 'date-fns/locale';
import { parseQuickAdd, useStore } from '../../lib/store';
import { useSettings } from '../../lib/settings';
import { ESTIMATE_OPTIONS, formatEstimate, isoDate, todayIso, tomorrowIso } from '../../lib/dates';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';
import { Calendar } from '../ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

function parseLocalDate(iso: string | null): Date | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** The `#`/`@` token currently under the caret, for inline autocompletion. */
function triggerAt(text: string, caret: number): { sigil: '#' | '@'; query: string; start: number } | null {
  const m = /(^|\s)([#@])([^\s#@]*)$/.exec(text.slice(0, caret));
  if (!m) return null;
  return { sigil: m[2] as '#' | '@', query: m[3], start: caret - m[3].length - 1 };
}

type AcItem =
  | { kind: 'tag'; id: string; label: string; color: string | null }
  | { kind: 'project'; id: string; label: string; color: string | null }
  | { kind: 'create-tag'; label: string }
  | { kind: 'create-project'; label: string };

const chip =
  'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-accent data-[state=open]:bg-accent';

export function TaskSpotlight() {
  const close = useStore((s) => s.closeSpotlight);
  const quickAdd = useStore((s) => s.quickAdd);
  const addTag = useStore((s) => s.addTag);
  const addProject = useStore((s) => s.addProject);
  const projects = useStore((s) => s.projects);
  const tags = useStore((s) => s.tags);
  const view = useStore((s) => s.view);
  const activeProjectId = useStore((s) => s.activeProjectId);
  const prefill = useStore((s) => s.spotlightPrefill);
  const keepOpen = useSettings((s) => s.keepSpotlightOpen);

  const inputRef = useRef<HTMLInputElement>(null);

  const [value, setValue] = useState('');
  const [caret, setCaret] = useState(0);
  // `undefined` → infer from text (`@projet`); `null` → no project; else explicit id.
  const [projectId, setProjectId] = useState<string | null | undefined>(
    prefill?.projectId !== undefined ? prefill.projectId : view === 'project' ? activeProjectId : undefined,
  );
  const [date, setDate] = useState<string | null>(prefill?.date !== undefined ? prefill.date : todayIso());
  const [time, setTime] = useState<string | null>(prefill?.time ?? null);
  const [estimate, setEstimate] = useState(prefill?.estimateMinutes ?? 0);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [acIndex, setAcIndex] = useState(0);
  const [acHidden, setAcHidden] = useState(false);

  useEffect(() => inputRef.current?.focus(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const parsed = parseQuickAdd(value);
  const trigger = acHidden ? null : triggerAt(value, Math.min(caret, value.length));

  const acItems = useMemo<AcItem[]>(() => {
    if (!trigger) return [];
    const q = trigger.query.toLowerCase();
    if (trigger.sigil === '#') {
      const items: AcItem[] = tags
        .filter((t) => t.name.toLowerCase().includes(q) && !tagIds.includes(t.id))
        .map((t) => ({ kind: 'tag', id: t.id, label: t.name, color: t.color }));
      if (q && !tags.some((t) => t.name.toLowerCase() === q)) items.push({ kind: 'create-tag', label: q });
      return items;
    }
    const items: AcItem[] = projects
      .filter((p) => p.name.toLowerCase().includes(q) || (p.alias?.toLowerCase().includes(q) ?? false))
      .map((p) => ({ kind: 'project', id: p.id, label: p.name, color: p.color }));
    if (q && !projects.some((p) => p.name.toLowerCase() === q || p.alias?.toLowerCase() === q))
      items.push({ kind: 'create-project', label: q });
    return items;
  }, [trigger, tags, projects, tagIds]);

  useEffect(() => setAcIndex(0), [trigger?.sigil, trigger?.query]);

  const handle = parsed.projectName?.toLowerCase();
  const effectiveProject =
    projectId === undefined
      ? projects.find((p) => p.name.toLowerCase() === handle || p.alias?.toLowerCase() === handle) ?? null
      : projects.find((p) => p.id === projectId) ?? null;
  const projectLabel = effectiveProject
    ? effectiveProject.name
    : projectId === undefined && parsed.projectName
      ? parsed.projectName
      : 'Toutes les tâches';

  const dateLabel = !date
    ? 'Quand ?'
    : date === todayIso()
      ? "Aujourd'hui"
      : date === tomorrowIso()
        ? 'Demain'
        : parseLocalDate(date)!.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  const selectedTags = tagIds.map((id) => tags.find((t) => t.id === id)).filter((t): t is NonNullable<typeof t> => Boolean(t));

  function focusInput(pos: number) {
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(pos, pos);
      setCaret(pos);
    });
  }

  /** Drop the active `#`/`@` token from the title once it is accepted as a chip. */
  function consumeToken() {
    if (!trigger) return;
    const before = value.slice(0, trigger.start);
    const after = value.slice(Math.min(caret, value.length));
    const next = (before + after).replace(/ {2,}/g, ' ');
    setValue(next);
    focusInput(before.length);
  }

  async function accept(item: AcItem) {
    if (item.kind === 'tag') setTagIds((ids) => [...new Set([...ids, item.id])]);
    else if (item.kind === 'project') setProjectId(item.id);
    else if (item.kind === 'create-tag') {
      const tag = await addTag(item.label);
      setTagIds((ids) => [...new Set([...ids, tag.id])]);
    } else {
      const p = await addProject(item.label, null, item.label.toLowerCase());
      setProjectId(p.id);
    }
    consumeToken();
  }

  function toggleTag(id: string) {
    setTagIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  function submit() {
    if (!parsed.title.trim()) return;
    void quickAdd(value, { projectId, tagIds, date, time, estimateMinutes: estimate || undefined });
    if (keepOpen) {
      setValue('');
      setTagIds([]);
      focusInput(0);
    } else {
      close();
    }
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (acItems.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAcIndex((i) => (i + 1) % acItems.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAcIndex((i) => (i - 1 + acItems.length) % acItems.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        void accept(acItems[Math.min(acIndex, acItems.length - 1)]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.nativeEvent.stopImmediatePropagation();
        setAcHidden(true);
        return;
      }
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px] duration-150 animate-in fade-in-0"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="mx-auto mt-[12vh] w-full max-w-2xl px-4">
        <div className="overflow-hidden rounded-2xl border bg-background shadow-2xl duration-200 animate-in zoom-in-95 slide-in-from-top-2">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setCaret(e.target.selectionStart ?? e.target.value.length);
                setAcHidden(false);
              }}
              onKeyDown={onInputKeyDown}
              onKeyUp={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
              onClick={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
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

          {acItems.length > 0 && (
            <div className="border-t border-border/60 p-1">
              <div className="px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/50">
                {trigger?.sigil === '#' ? 'Tags' : 'Projets'}
              </div>
              {acItems.map((item, i) => (
                <button
                  key={item.kind + ('id' in item ? item.id : item.label)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    void accept(item);
                  }}
                  onMouseEnter={() => setAcIndex(i)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                    i === Math.min(acIndex, acItems.length - 1) ? 'bg-accent text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {item.kind === 'create-tag' || item.kind === 'create-project' ? (
                    <>
                      <Plus size={15} className="shrink-0" />
                      Créer {item.kind === 'create-tag' ? `#${item.label}` : `« ${item.label} »`}
                    </>
                  ) : item.kind === 'tag' ? (
                    <>
                      <Hash size={15} className="shrink-0" style={item.color ? { color: item.color } : undefined} />
                      {item.label}
                    </>
                  ) : (
                    <>
                      <AtSign size={15} className="shrink-0" style={item.color ? { color: item.color } : undefined} />
                      {item.label}
                    </>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1 border-t border-border/60 px-3 py-2 text-muted-foreground">
            <DropdownMenu>
              <DropdownMenuTrigger className={cn(chip, effectiveProject && 'text-foreground')}>
                <Inbox size={15} /> {projectLabel}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-72 w-52">
                <DropdownMenuItem onSelect={() => setProjectId(null)}>
                  <Inbox size={14} /> Toutes les tâches
                </DropdownMenuItem>
                {projects.length > 0 && <DropdownMenuSeparator />}
                {projects.map((p) => (
                  <DropdownMenuItem key={p.id} onSelect={() => setProjectId(p.id)}>
                    <AtSign size={14} style={p.color ? { color: p.color } : undefined} />
                    {p.name}
                    {effectiveProject?.id === p.id && <Check size={14} className="ml-auto" />}
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
                <DropdownMenuItem onSelect={() => setDate(tomorrowIso())}>
                  <Sunrise size={14} /> Demain
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

            {date && (
              <label className={cn(chip, time && 'text-foreground', 'cursor-text')}>
                <Clock size={15} />
                <input
                  type="time"
                  value={time ?? ''}
                  onChange={(e) => setTime(e.target.value || null)}
                  className="w-[4.25rem] bg-transparent text-sm outline-none"
                />
              </label>
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

            <DropdownMenu>
              <DropdownMenuTrigger className={cn(chip, tagIds.length > 0 && 'text-foreground')}>
                <TagIcon size={15} /> {tagIds.length > 0 ? `${tagIds.length} tag${tagIds.length > 1 ? 's' : ''}` : 'Tags'}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-72 w-52">
                {tags.length === 0 ? (
                  <DropdownMenuItem disabled>Aucun tag — tape #nom</DropdownMenuItem>
                ) : (
                  tags.map((t) => (
                    <DropdownMenuItem key={t.id} onSelect={(e) => { e.preventDefault(); toggleTag(t.id); }}>
                      <Hash size={14} style={t.color ? { color: t.color } : undefined} />
                      {t.name}
                      {tagIds.includes(t.id) && <Check size={14} className="ml-auto" />}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {selectedTags.length > 0 && (
              <div className="ml-1 flex flex-wrap items-center gap-1">
                {selectedTags.map((t) => (
                  <Badge key={t.id} variant="secondary" className="gap-1 pr-1 text-xs" style={t.color ? { color: t.color } : undefined}>
                    #{t.name}
                    <button onClick={() => toggleTag(t.id)} className="text-muted-foreground hover:text-foreground">
                      <X size={12} />
                    </button>
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
