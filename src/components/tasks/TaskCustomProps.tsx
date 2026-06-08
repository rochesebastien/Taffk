import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useStore } from '../../lib/store';
import { useSettings, type CustomField } from '../../lib/settings';
import { openExternal, type Task } from '../../lib/api';
import { Input } from '../ui/input';

const SECTION_LABEL = 'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60';

function FieldRow({ task, field, readOnly }: { task: Task; field: CustomField; readOnly: boolean }) {
  const patchTask = useStore((s) => s.patchTask);
  const value = task.customProps[field.id] ?? '';
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  function commit() {
    if (draft === value) return;
    void patchTask({ id: task.id, customProps: { ...task.customProps, [field.id]: draft } });
  }

  return (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 truncate text-xs text-muted-foreground">{field.label}</span>
      {readOnly ? (
        field.type === 'link' && value ? (
          <button
            onClick={() => void openExternal(value)}
            className="min-w-0 flex-1 truncate text-left text-sm text-primary hover:underline"
          >
            {value}
          </button>
        ) : (
          <span className="min-w-0 flex-1 truncate text-sm text-foreground/80">{value || '—'}</span>
        )
      ) : (
        <>
          <Input
            value={draft}
            type={field.type === 'link' ? 'url' : 'text'}
            placeholder={field.type === 'link' ? 'https://…' : ''}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            className="h-8 min-w-0 flex-1"
          />
          {field.type === 'link' && value && (
            <button
              onClick={() => void openExternal(value)}
              title="Ouvrir le lien"
              className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ExternalLink size={14} />
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function TaskCustomProps({ task, readOnly }: { task: Task; readOnly: boolean }) {
  const fields = useSettings((s) => s.customFields);
  if (fields.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <span className={SECTION_LABEL}>Propriétés</span>
      <div className="flex flex-col gap-2">
        {fields.map((f) => (
          <FieldRow key={f.id} task={task} field={f} readOnly={readOnly} />
        ))}
      </div>
    </div>
  );
}
