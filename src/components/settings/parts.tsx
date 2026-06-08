import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function SettingsGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      {title && (
        <h2 className="mb-2.5 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
      )}
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {children}
      </div>
    </section>
  );
}

export function SettingRow({
  label,
  description,
  children,
  stacked,
}: {
  label: string;
  description?: string;
  children?: ReactNode;
  stacked?: boolean;
}) {
  return (
    <div
      className={cn(
        'gap-4 px-4 py-3.5',
        stacked ? 'flex flex-col' : 'flex items-center justify-between',
      )}
    >
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {description && <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>}
      </div>
      {children != null && <div className={cn('shrink-0', stacked && 'self-start')}>{children}</div>}
    </div>
  );
}

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full transition-colors',
        checked ? 'bg-primary' : 'bg-muted-foreground/30',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-[18px]' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}
