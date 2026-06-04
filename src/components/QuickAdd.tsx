import { useState } from 'react';
import { useStore } from '../lib/store';

type Props = {
  scheduleToday: boolean;
  placeholder?: string;
};

export function QuickAdd({ scheduleToday, placeholder }: Props) {
  const quickAdd = useStore((s) => s.quickAdd);
  const [value, setValue] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const raw = value;
    if (!raw.trim()) return;
    setValue('');
    await quickAdd(raw, { scheduleToday });
  }

  return (
    <form className="quick-add" onSubmit={submit}>
      <span className="quick-add-plus">+</span>
      <input
        className="quick-add-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder ?? 'Ajouter une tâche…  (#tag  @projet)'}
        autoFocus
      />
    </form>
  );
}
