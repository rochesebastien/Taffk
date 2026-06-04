import { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TaskListView } from './components/TaskListView';
import { KanbanBoard } from './components/KanbanBoard';
import { TaskDetail } from './components/TaskDetail';
import { useStore } from './lib/store';

export default function App() {
  const load = useStore((s) => s.load);
  const loaded = useStore((s) => s.loaded);
  const view = useStore((s) => s.view);
  const selectedTaskId = useStore((s) => s.selectedTaskId);
  const selectTask = useStore((s) => s.selectTask);
  const selectedTask = useStore((s) => s.tasks.find((t) => t.id === s.selectedTaskId) ?? null);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedTaskId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') selectTask(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedTaskId, selectTask]);

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        {!loaded ? (
          <div className="app-loading">…</div>
        ) : view === 'board' ? (
          <KanbanBoard />
        ) : (
          <TaskListView />
        )}
      </main>
      {selectedTask && <TaskDetail task={selectedTask} />}
    </div>
  );
}
