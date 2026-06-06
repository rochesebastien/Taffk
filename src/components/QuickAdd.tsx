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
    const raw = value;
    if (!raw.trim()) return;
    setValue('');
    await quickAdd(raw, { scheduleToday });
  }

  return (
    <form className="quick-add" onSubmit={submit}>
      <span className="quick-add-plus"><Plus size={17} /></span>
      <input
        ref={inputRef}
        className="quick-add-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder ?? 'Ajouter une tâche…  (A)'}
      />
    </form>
  );
}
