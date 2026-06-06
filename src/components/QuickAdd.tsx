import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { useStore } from '../lib/store';

type Props = {
  scheduleToday: boolean;
  placeholder?: string;
};

export function QuickAdd({ scheduleToday, placeholder }: Props) {
  const quickAdd = useStore((s) => s.quickAdd);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focus = () => inputRef.current?.focus();
    window.addEventListener('taffk:focus-quickadd', focus);
    return () => window.removeEventListener('taffk:focus-quickadd', focus);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    const raw = value;
    setValue('');
    await quickAdd(raw, { scheduleToday });
  }

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 transition-colors focus-within:border-ring focus-within:bg-background"
    >
      <Plus size={17} className="shrink-0 text-muted-foreground" />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder ?? 'Ajouter une tâche…  (A)'}
        className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/60"
      />
    </form>
  );
}
