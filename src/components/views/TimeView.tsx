import { useMemo, useState } from 'react';
import { useStore } from '../../lib/store';
import { isoDate, todayIso } from '../../lib/dates';
import {
  buildHeatmap,
  computeStats,
  formatDuration,
  formatNumber,
  localDay,
  MONTH_LABELS,
  type DateRange,
} from '../../lib/timeStats';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

const ALL = '__all__';

type RangePreset = '7d' | '30d' | '90d' | 'year' | 'all';

const RANGE_LABELS: Record<RangePreset, string> = {
  '7d': '7 derniers jours',
  '30d': '30 derniers jours',
  '90d': '90 derniers jours',
  year: 'Cette année',
  all: 'Tout',
};

const LEVEL_CLASS = [
  'bg-muted',
  'bg-primary/25',
  'bg-primary/45',
  'bg-primary/70',
  'bg-primary',
] as const;

const DOW_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function formatDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return format(new Date(y, m - 1, d), 'EEEE d MMMM yyyy', { locale: fr });
}

function resolveRange(preset: RangePreset, earliest: string): DateRange {
  const end = todayIso();
  if (preset === 'all') return { start: earliest, end };
  if (preset === 'year') return { start: `${new Date().getFullYear()}-01-01`, end };
  const days = preset === '7d' ? 6 : preset === '30d' ? 29 : 89;
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { start: isoDate(start), end };
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 px-4 py-3 last:border-0">
      <span className="text-sm font-medium">{label}</span>
      <span className="font-mono text-sm text-muted-foreground">{value}</span>
    </div>
  );
}

export function TimeView() {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const timeEntries = useStore((s) => s.timeEntries);

  const [projectId, setProjectId] = useState<string>(ALL);
  const [preset, setPreset] = useState<RangePreset>('30d');

  const scopedProject = projectId === ALL ? null : projectId;
  const year = new Date().getFullYear();

  const earliest = useMemo(() => {
    const days = [
      ...tasks.map((t) => localDay(t.createdAt)),
      ...timeEntries.map((e) => localDay(e.startedAt)),
    ];
    return days.length ? days.reduce((a, b) => (a < b ? a : b)) : todayIso();
  }, [tasks, timeEntries]);

  const range = useMemo(() => resolveRange(preset, earliest), [preset, earliest]);

  const stats = useMemo(
    () => computeStats(tasks, timeEntries, range, scopedProject),
    [tasks, timeEntries, range, scopedProject],
  );

  const heatmap = useMemo(
    () => buildHeatmap(timeEntries, tasks, year, scopedProject),
    [timeEntries, tasks, year, scopedProject],
  );

  const rows: { label: string; value: string }[] = [
    { label: 'Temps passé', value: formatDuration(stats.spentSeconds) },
    { label: 'Temps estimé', value: formatDuration(stats.estimateMinutes * 60) },
    { label: 'Tâches (effectuées / créées)', value: `${stats.doneCount} / ${stats.createdCount}` },
    { label: 'Jours travaillés', value: String(stats.daysWorked) },
    { label: 'Moy. tâches par jour travaillées', value: formatNumber(stats.avgTasksPerDay) },
    { label: 'Moy. pauses par jour', value: formatNumber(stats.avgBreaksPerDay) },
    { label: 'Moy. temps passé par jour', value: formatDuration(stats.avgSpentPerDay ?? 0) },
    { label: 'Moy. temps passé par tâche', value: formatDuration(stats.avgSpentPerTask ?? 0) },
    {
      label: 'Moy. temps passé par tâche (compter les sous-tâches)',
      value: formatDuration(stats.avgSpentPerTaskWithSubtasks ?? 0),
    },
    { label: 'Moy. temps consacré aux pauses', value: formatDuration(stats.avgBreakPerDay ?? 0) },
  ];

  // A month label sits above the first week column whose Monday lands in it.
  const monthMarks = heatmap.map((week, i) => {
    const first = new Date(week[0].day);
    const prev = i > 0 ? new Date(heatmap[i - 1][0].day).getMonth() : -1;
    return first.getMonth() !== prev && first.getFullYear() === year ? first.getMonth() : null;
  });

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-end justify-between gap-4 px-6 pb-4 pt-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Gestion du temps</h1>
        <div className="flex items-center gap-2">
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger size="sm" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous les projets</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={preset} onValueChange={(v) => setPreset(v as RangePreset)}>
            <SelectTrigger size="sm" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(RANGE_LABELS) as RangePreset[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {RANGE_LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 pb-10">
        <section className="rounded-xl border border-border bg-card">
          <div className="border-b border-border/60 px-4 py-3">
            <h2 className="text-sm font-semibold">Statistiques</h2>
            <p className="font-mono text-xs text-muted-foreground">
              {range.start} — {range.end}
            </p>
          </div>
          {rows.map((r) => (
            <StatRow key={r.label} label={r.label} value={r.value} />
          ))}
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Votre activité</h2>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Moins</span>
              {LEVEL_CLASS.map((c, i) => (
                <span key={i} className={cn('size-3 rounded-sm', c)} />
              ))}
              <span>Plus</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="flex gap-1">
              <div className="mt-5 flex shrink-0 flex-col gap-[3px] pr-1 text-[10px] text-muted-foreground">
                {DOW_LABELS.map((d) => (
                  <span key={d} className="flex h-3 items-center">
                    {d}
                  </span>
                ))}
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex gap-[3px]">
                  {heatmap.map((_, i) => (
                    <span key={i} className="w-3 text-[10px] text-muted-foreground">
                      {monthMarks[i] !== null ? MONTH_LABELS[monthMarks[i] as number] : ''}
                    </span>
                  ))}
                </div>
                <div className="flex gap-[3px]">
                  {heatmap.map((week, i) => (
                    <div key={i} className="flex flex-col gap-[3px]">
                      {week.map((cell) =>
                        cell.inYear ? (
                          <Tooltip key={cell.day}>
                            <TooltipTrigger asChild>
                              <span className={cn('size-3 rounded-sm', LEVEL_CLASS[cell.level])} />
                            </TooltipTrigger>
                            <TooltipContent className="text-center">
                              <div className="font-medium capitalize">{formatDay(cell.day)}</div>
                              <div className="text-background/80">
                                {cell.doneCount} tâche{cell.doneCount > 1 ? 's' : ''} faite
                                {cell.doneCount > 1 ? 's' : ''} · {formatDuration(cell.seconds)}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span key={cell.day} className="size-3 rounded-sm bg-transparent" />
                        ),
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
