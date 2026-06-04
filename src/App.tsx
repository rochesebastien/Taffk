import { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TaskListView } from './components/TaskListView';
import { useStore } from './lib/store';

export default function App() {
  const load = useStore((s) => s.load);
  const loaded = useStore((s) => s.loaded);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">{loaded ? <TaskListView /> : <div className="app-loading">…</div>}</main>
    </div>
  );
}
