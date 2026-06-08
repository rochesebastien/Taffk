import { useEffect, useMemo, useRef, useState } from 'react';
import { AtSign, CheckCircle2, Circle, FileText, Hash, Search } from 'lucide-react';
import { useStore } from '../../lib/store';
import { cn } from '../../lib/utils';

type MatchKind = 'title' | 'project' | 'tag' | 'notes';

type Result = {
  id: string;
  title: string;
  done: boolean;
  projectName: string | null;
  projectColor: string | null;
  tagNames: string[];
  notesSnippet: string | null;
  rank: number;
  matched: Set<MatchKind>;
};

function snippet(notes: string, q: string): string | null {
  const i = notes.toLowerCase().indexOf(q);
  if (i < 0) return null;
  const start = Math.max(0, i - 30);
  const end = Math.min(notes.length, i + q.length + 50);
  const core = notes.slice(start, end).replace(/\s+/g, ' ').trim();
  return `${start > 0 ? '…' : ''}${core}${end < notes.length ? '…' : ''}`;
}

/** Split `text` around (case-insensitive) `q` so the match can be emphasised. */
function highlight(text: string, q: string) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q);
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-primary/20 text-foreground">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

export function SearchSpotlight() {
  const close = useStore((s) => s.closeSearch);
  const selectTask = useStore((s) => s.selectTask);
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const tags = useStore((s) => s.tags);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);

  useEffect(() => inputRef.current?.focus(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const projectById = new Map(projects.map((p) => [p.id, p]));
    const tagById = new Map(tags.map((t) => [t.id, t]));

    const out: Result[] = [];
    for (const t of tasks) {
      const matched = new Set<MatchKind>();
      if (t.title.toLowerCase().includes(q)) matched.add('title');

      const project = t.projectId ? projectById.get(t.projectId) : null;
      if (project?.name.toLowerCase().includes(q)) matched.add('project');

      const tagNames = t.tagIds
        .map((id) => tagById.get(id)?.name)
        .filter((n): n is string => Boolean(n));
      if (tagNames.some((n) => n.toLowerCase().includes(q))) matched.add('tag');

      if (t.notes.toLowerCase().includes(q)) matched.add('notes');

      if (matched.size === 0) continue;
      const rank = matched.has('title') ? 0 : matched.has('project') || matched.has('tag') ? 1 : 2;
      out.push({
        id: t.id,
        title: t.title,
        done: t.done,
        projectName: project?.name ?? null,
        projectColor: project?.color ?? null,
        tagNames,
        notesSnippet: matched.has('notes') && !matched.has('title') ? snippet(t.notes, q) : null,
        rank,
        matched,
      });
    }
    return out.sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title)).slice(0, 50);
  }, [query, tasks, projects, tags]);

  useEffect(() => setIndex(0), [query]);

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  function open(id: string) {
    selectTask(id);
    close();
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      open(results[Math.min(index, results.length - 1)].id);
    }
  }

  const q = query.trim().toLowerCase();

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
            <Search size={18} className="shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="Rechercher une tâche, un tag, un projet, des notes…"
              className="flex-1 bg-transparent text-lg outline-none placeholder:text-muted-foreground/50"
            />
          </div>

          {q && (
            <div ref={listRef} className="max-h-[55vh] overflow-y-auto border-t border-border/60 p-1">
              {results.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  Aucun résultat pour « {query.trim()} »
                </div>
              ) : (
                results.map((r, i) => {
                  const active = i === Math.min(index, results.length - 1);
                  return (
                    <button
                      key={r.id}
                      data-active={active}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        open(r.id);
                      }}
                      onMouseEnter={() => setIndex(i)}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition-colors',
                        active ? 'bg-accent' : 'hover:bg-accent/60',
                      )}
                    >
                      {r.done ? (
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
                      ) : (
                        <Circle size={16} className="mt-0.5 shrink-0 text-muted-foreground/60" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div
                          className={cn(
                            'truncate text-sm',
                            r.done ? 'text-muted-foreground line-through' : 'text-foreground',
                          )}
                        >
                          {highlight(r.title, q)}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                          {r.projectName && (
                            <span className="inline-flex items-center gap-1">
                              <AtSign size={11} style={r.projectColor ? { color: r.projectColor } : undefined} />
                              {highlight(r.projectName, q)}
                            </span>
                          )}
                          {r.tagNames.map((n) => (
                            <span key={n} className="inline-flex items-center gap-0.5">
                              <Hash size={11} />
                              {highlight(n, q)}
                            </span>
                          ))}
                        </div>
                        {r.notesSnippet && (
                          <div className="mt-1 flex items-start gap-1 text-xs text-muted-foreground/80">
                            <FileText size={11} className="mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{highlight(r.notesSnippet, q)}</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
