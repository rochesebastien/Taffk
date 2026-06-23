import { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { SettingsSidebar } from './components/SettingsSidebar';
import { TaskListView } from './components/tasks/TaskListView';
import { KanbanBoard } from './components/views/KanbanBoard';
import { CalendarView } from './components/views/CalendarView';
import { TimeView } from './components/views/TimeView';
import { TagsView } from './components/views/TagsView';
import { SettingsView } from './components/views/SettingsView';
import { TaskDetail } from './components/tasks/TaskDetail';
import { TagPanel } from './components/tasks/TagPanel';
import { TaskSpotlight } from './components/tasks/TaskSpotlight';
import { SearchSpotlight } from './components/search/SearchSpotlight';
import { ConfirmDialog } from './components/dialog/ConfirmDialog';
import { PromptDialog } from './components/dialog/PromptDialog';
import { KeyboardHelp } from './components/KeyboardHelp';
import { TooltipProvider } from './components/ui/tooltip';
import { useStore, type View } from './lib/store';
import { useSettings } from './lib/settings';
import { onRemoteDataChanged, setToggleShortcut } from './lib/api';
import { isTypingTarget, matchesAccel } from './lib/keyboard';

const VIEW_KEYS: Record<string, View> = { '1': 'today', '2': 'all', '3': 'board', '4': 'calendar', '5': 'time', '6': 'tags' };

export default function App() {
  const load = useStore((s) => s.load);
  const loaded = useStore((s) => s.loaded);
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const closeSettings = useStore((s) => s.closeSettings);
  const selectedTaskId = useStore((s) => s.selectedTaskId);
  const selectTask = useStore((s) => s.selectTask);
  const selectedTask = useStore((s) => s.tasks.find((t) => t.id === s.selectedTaskId) ?? null);
  const selectedTagId = useStore((s) => s.selectedTagId);
  const selectTag = useStore((s) => s.selectTag);
  const selectedTag = useStore((s) => s.tags.find((t) => t.id === s.selectedTagId) ?? null);
  const spotlightOpen = useStore((s) => s.spotlightOpen);
  const openSpotlight = useStore((s) => s.openSpotlight);
  const searchOpen = useStore((s) => s.searchOpen);
  const openSearch = useStore((s) => s.openSearch);
  const closeSearch = useStore((s) => s.closeSearch);

  const quickAddShortcut = useSettings((s) => s.shortcutQuickAdd);

  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    void load();
    void setToggleShortcut(useSettings.getState().shortcutToggle);
    let unlisten: (() => void) | undefined;
    void onRemoteDataChanged(() => void load()).then((un) => {
      unlisten = un;
    });
    return () => unlisten?.();
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (helpOpen) setHelpOpen(false);
        else if (searchOpen) closeSearch();
        else if (selectedTaskId) selectTask(null);
        else if (selectedTagId) selectTag(null);
        else if (view === 'settings') closeSettings();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
        e.preventDefault();
        openSpotlight();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        openSearch();
        return;
      }
      if (!isTypingTarget(e.target) && matchesAccel(e, quickAddShortcut)) {
        e.preventDefault();
        openSpotlight();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;

      if (e.key === '?') {
        setHelpOpen((o) => !o);
      } else if (e.key === '/') {
        e.preventDefault();
        openSearch();
      } else if (VIEW_KEYS[e.key]) {
        setView(VIEW_KEYS[e.key]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [helpOpen, searchOpen, closeSearch, selectedTaskId, selectTask, selectedTagId, selectTag, view, closeSettings, setView, openSpotlight, openSearch, quickAddShortcut]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
        {view === 'settings' ? <SettingsSidebar /> : <Sidebar />}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {!loaded ? (
            <div className="grid h-full place-items-center text-muted-foreground/60">…</div>
          ) : view === 'board' ? (
            <KanbanBoard />
          ) : view === 'calendar' ? (
            <CalendarView />
          ) : view === 'time' ? (
            <TimeView />
          ) : view === 'tags' ? (
            <TagsView />
          ) : view === 'settings' ? (
            <SettingsView />
          ) : (
            <TaskListView />
          )}
        </main>
        {selectedTask && <TaskDetail task={selectedTask} />}
        {view === 'tags' && selectedTag && !selectedTask && <TagPanel tag={selectedTag} />}
        {spotlightOpen && <TaskSpotlight />}
        {searchOpen && <SearchSpotlight />}
        {helpOpen && <KeyboardHelp onClose={() => setHelpOpen(false)} />}
        <ConfirmDialog />
        <PromptDialog />
      </div>
    </TooltipProvider>
  );
}
