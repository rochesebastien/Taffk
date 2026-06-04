import { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TaskListView } from './components/TaskListView';
import { KanbanBoard } from './components/KanbanBoard';
import { CalendarView } from './components/CalendarView';
import { TaskDetail } from './components/TaskDetail';
import { KeyboardHelp } from './components/KeyboardHelp';
import { useStore, type View } from './lib/store';
import { isTypingTarget } from './lib/keyboard';

const VIEW_KEYS: Record<string, View> = { '1': 'today', '2': 'all', '3': 'board', '4': 'calendar' };

export default function App() {
  const load = useStore((s) => s.load);
  const loaded = useStore((s) => s.loaded);
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const selectedTaskId = useStore((s) => s.selectedTaskId);
  const selectTask = useStore((s) => s.selectTask);
  const selectedTask = useStore((s) => s.tasks.find((t) => t.id === s.selectedTaskId) ?? null);

  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (helpOpen) setHelpOpen(false);
        else if (selectedTaskId) selectTask(null);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;

      if (e.key === '?') {
        setHelpOpen((o) => !o);
      } else if (VIEW_KEYS[e.key]) {
        setView(VIEW_KEYS[e.key]);
      } else if (e.key === 'a' || e.key === 'n') {
        e.preventDefault();
        window.dispatchEvent(new Event('taffk:focus-quickadd'));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [helpOpen, selectedTaskId, selectTask, setView]);

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        {!loaded ? (
          <div className="app-loading">…</div>
        ) : view === 'board' ? (
          <KanbanBoard />
        ) : view === 'calendar' ? (
          <CalendarView />
        ) : (
          <TaskListView />
        )}
      </main>
      {selectedTask && <TaskDetail task={selectedTask} />}
      {helpOpen && <KeyboardHelp onClose={() => setHelpOpen(false)} />}
    </div>
  );
}
