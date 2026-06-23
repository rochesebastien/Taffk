import type { ProjectSlice } from '../../lib/timeStats';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

const PALETTE = [
  '#1218fc',
  '#0ea5e9',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#64748b',
] as const;

function arcPath(cx: number, cy: number, r: number, from: number, to: number): string {
  const a0 = from * 2 * Math.PI - Math.PI / 2;
  const a1 = to * 2 * Math.PI - Math.PI / 2;
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const large = to - from > 0.5 ? 1 : 0;
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
}

export function ProjectPie({
  slices,
  format,
}: {
  slices: ProjectSlice[];
  format: (value: number) => string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);

  if (total === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        Aucune donnée
      </div>
    );
  }

  let acc = 0;
  const segments = slices.map((s, i) => {
    const from = acc / total;
    acc += s.value;
    const to = acc / total;
    return { ...s, from, to, color: PALETTE[i % PALETTE.length] };
  });

  return (
    <div className="flex flex-wrap items-center gap-4">
      <svg viewBox="0 0 100 100" className="size-28 shrink-0">
        {segments.length === 1 ? (
          <circle cx={50} cy={50} r={48} fill={segments[0].color} />
        ) : (
          segments.map((s) => (
            <Tooltip key={s.projectId ?? '__none__'}>
              <TooltipTrigger asChild>
                <path d={arcPath(50, 50, 48, s.from, s.to)} fill={s.color} stroke="var(--card)" strokeWidth={0.5} />
              </TooltipTrigger>
              <TooltipContent>
                <span className="font-medium">{s.name}</span> · {format(s.value)} (
                {Math.round((s.value / total) * 100)}%)
              </TooltipContent>
            </Tooltip>
          ))
        )}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5 text-xs">
        {segments.map((s) => (
          <li key={s.projectId ?? '__none__'} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="min-w-0 flex-1 truncate">{s.name}</span>
            <span className="shrink-0 font-mono text-muted-foreground">{format(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
