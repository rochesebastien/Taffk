import { useMemo } from 'react';
import { Hash, PencilLine, Trash2 } from 'lucide-react';
import { useStore } from '../../lib/store';
import { confirm } from '../../lib/confirm';
import { prompt } from '../../lib/prompt';
import { cn } from '../../lib/utils';
import type { Tag } from '../../lib/api';

const iconBtn =
  'flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-background';

function TagRow({ tag, count, active }: { tag: Tag; count: number; active: boolean }) {
  const tags = useStore((s) => s.tags);
  const selectTag = useStore((s) => s.selectTag);
  const updateTag = useStore((s) => s.updateTag);
  const removeTag = useStore((s) => s.removeTag);

  async function rename() {
    const name = await prompt({
      title: "Renommer l'étiquette",
      initialValue: tag.name,
      confirmLabel: 'Renommer',
    });
    const next = name?.trim().toLowerCase().replace(/^#/, '');
    if (!next || next === tag.name) return;
    if (tags.some((t) => t.id !== tag.id && t.name.toLowerCase() === next)) return;
    void updateTag(tag.id, next, tag.color);
  }

  async function onDelete() {
    const ok = await confirm({
      title: "Supprimer l'étiquette ?",
      description:
        count > 0
          ? `« ${tag.name} » sera retirée de ${count} tâche${count > 1 ? 's' : ''}.`
          : `« ${tag.name} » sera supprimée.`,
      confirmLabel: 'Supprimer',
      destructive: true,
    });
    if (ok) void removeTag(tag.id);
  }

  return (
    <div
      onClick={() => selectTag(active ? null : tag.id)}
      className={cn(
        'group flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors',
        active ? 'bg-accent' : 'hover:bg-muted/40',
      )}
    >
      <label
        onClick={(e) => e.stopPropagation()}
        className="relative inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border"
        style={{ color: tag.color ?? undefined }}
        title="Changer la couleur"
      >
        <Hash size={15} />
        <input
          type="color"
          value={tag.color ?? '#888888'}
          onChange={(e) => void updateTag(tag.id, tag.name, e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <span className="min-w-0 flex-1 truncate font-mono text-sm">#{tag.name}</span>
      <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
        {count} tâche{count > 1 ? 's' : ''}
      </span>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            void rename();
          }}
          className={cn(iconBtn, 'hover:text-foreground')}
          title="Renommer"
        >
          <PencilLine size={15} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            void onDelete();
          }}
          className={cn(iconBtn, 'hover:text-destructive')}
          title="Supprimer"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

function Distribution({ tags, counts }: { tags: Tag[]; counts: Map<string, number> }) {
  const data = useMemo(
    () =>
      tags
        .map((tag) => ({ tag, count: counts.get(tag.id) ?? 0 }))
        .filter((d) => d.count > 0)
        .sort((a, b) => b.count - a.count),
    [tags, counts],
  );
  const max = data.length ? data[0].count : 0;
  if (data.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold">Distribution</h2>
      <div className="flex flex-col gap-2">
        {data.map(({ tag, count }) => (
          <div key={tag.id} className="flex items-center gap-3">
            <span className="w-28 shrink-0 truncate text-right font-mono text-xs text-muted-foreground">
              #{tag.name}
            </span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-[width]"
                style={{ width: `${(count / max) * 100}%`, backgroundColor: tag.color ?? 'var(--primary)' }}
              />
            </div>
            <span className="w-6 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
              {count}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TagsView() {
  const tags = useStore((s) => s.tags);
  const tasks = useStore((s) => s.tasks);
  const selectedTagId = useStore((s) => s.selectedTagId);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tasks) for (const id of t.tagIds) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
  }, [tasks]);

  const sorted = useMemo(() => [...tags].sort((a, b) => a.name.localeCompare(b.name)), [tags]);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-end justify-between gap-4 px-6 pb-4 pt-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Étiquettes</h1>
        <span className="font-mono text-sm text-muted-foreground">
          {tags.length} tag{tags.length > 1 ? 's' : ''}
        </span>
      </header>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 pb-10">
        <section className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {sorted.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              Aucune étiquette. Créez-en avec #tag depuis une tâche.
            </div>
          ) : (
            sorted.map((t) => (
              <TagRow key={t.id} tag={t} count={counts.get(t.id) ?? 0} active={t.id === selectedTagId} />
            ))
          )}
        </section>

        <Distribution tags={sorted} counts={counts} />
      </div>
    </div>
  );
}
