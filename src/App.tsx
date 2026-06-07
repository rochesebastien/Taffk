import { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TaskListView } from './components/TaskListView';
import { KanbanBoard } from './components/KanbanBoard';
import { CalendarView } from './components/CalendarView';
import { SettingsView } from './components/SettingsView';
import { TaskDetail } from './components/TaskDetail';
import { TaskSpotlight } from './components/TaskSpotlight';
import { ConfirmDialog } from './components/ConfirmDialog';
import { PromptDialog } from './components/PromptDialog';
import { KeyboardHelp } from './components/KeyboardHelp';
import { TooltipProvider } from './components/ui/tooltip';
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
  const spotlightOpen = useStore((s) => s.spotlightOpen);
  const openSpotlight = useStore((s) => s.openSpotlight);

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
      if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
        e.preventDefault();
        openSpotlight();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;

      if (e.key === '?') {
        setHelpOpen((o) => !o);
      } else if (VIEW_KEYS[e.key]) {
        setView(VIEW_KEYS[e.key]);
      } else if (e.key === 'a' || e.key === 'n') {
        e.preventDefault();
        openSpotlight();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [helpOpen, selectedTaskId, selectTask, setView, openSpotlight]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {!loaded ? (
            <div className="grid h-full place-items-center text-muted-foreground/60">…</div>
          ) : view === 'board' ? (
            <KanbanBoard />
          ) : view === 'calendar' ? (
            <CalendarView />
          ) : view === 'settings' ? (
            <SettingsView />
          ) : (
            <TaskListView />
          )}
        </main>
        {selectedTask && <TaskDetail task={selectedTask} />}
        {spotlightOpen && <TaskSpotlight />}
        {helpOpen && <KeyboardHelp onClose={() => setHelpOpen(false)} />}
        <ConfirmDialog />
        <PromptDialog />
      </div>
    </TooltipProvider>
  );
}
