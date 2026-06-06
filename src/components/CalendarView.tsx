import { useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer, type View as RbcView } from 'react-big-calendar';
import withDragAndDrop, {
  type EventInteractionArgs,
} from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, getDay, parse, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../lib/store';
import { isoDate, minutesToTime, timeToMinutes } from '../lib/dates';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import type { Task } from '../lib/api';

import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import './calendar-theme.css';

const DEFAULT_DURATION = 30;
const DEFAULT_START = 9 * 60;

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales: { fr },
});

type CalEvent = { id: string; title: string; start: Date; end: Date; allDay: boolean; task: Task };

const DnDCalendar = withDragAndDrop<CalEvent, object>(Calendar);

function dateAt(day: string, minutes: number): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
}

function patchFromRange(start: Date, end: Date, allDay: boolean) {
  const scheduledFor = isoDate(start);
  if (allDay) return { scheduledFor, scheduledTime: null };
  const minutes = Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000));
  return { scheduledFor, scheduledTime: minutesToTime(start.getHours() * 60 + start.getMinutes()), estimateMinutes: minutes };
}

export function CalendarView() {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const patchTask = useStore((s) => s.patchTask);
  const quickAdd = useStore((s) => s.quickAdd);
  const selectTask = useStore((s) => s.selectTask);

  const [date, setDate] = useState(() => new Date());
  const [view, setView] = useState<RbcView>('week');

  const projectColor = (t: Task) => projects.find((p) => p.id === t.projectId)?.color ?? null;

  const events = useMemo<CalEvent[]>(() => {
    return tasks
      .filter((t) => t.parentId === null && t.scheduledFor)
      .map((t) => {
        const timed = t.scheduledTime != null;
        const startMin = timeToMinutes(t.scheduledTime) ?? DEFAULT_START;
        const start = dateAt(t.scheduledFor!, timed ? startMin : 0);
        const end = timed
          ? new Date(start.getTime() + (t.estimateMinutes || DEFAULT_DURATION) * 60000)
          : start;
        return { id: t.id, title: t.title, start, end, allDay: !timed, task: t };
      });
  }, [tasks]);

  function onChange({ event, start, end, isAllDay }: EventInteractionArgs<CalEvent>) {
    const s = new Date(start);
    const e = new Date(end);
    void patchTask({ id: event.id, ...patchFromRange(s, e, Boolean(isAllDay)) });
  }

  async function onSelectSlot({ start, action }: { start: Date; action: string }) {
    if (action !== 'select' && action !== 'click') return;
    const title = window.prompt('Nouvelle tâche');
    if (!title?.trim()) return;
    await quickAdd(title, {
      date: isoDate(start),
      time: view === 'month' ? null : minutesToTime(start.getHours() * 60 + start.getMinutes()),
    });
  }

  const label = format(date, view === 'day' ? 'EEEE d MMMM' : "'Semaine du' d MMMM yyyy", { locale: fr });

  return (
    <div className="flex h-full flex-col px-6">
      <header className="flex items-end justify-between gap-4 pb-4 pt-8">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-3xl font-bold tracking-tight">Planning</h1>
          <span className="text-sm capitalize text-muted-foreground/70">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex rounded-md border border-border p-0.5">
            {(['week', 'day'] as RbcView[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'rounded px-2.5 py-1 text-xs transition-colors',
                  view === v ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {v === 'week' ? 'Semaine' : 'Jour'}
              </button>
            ))}
          </div>
          <Button variant="outline" size="icon" className="size-8" onClick={() => setDate(localizer.add(date, -1, view === 'day' ? 'day' : 'week'))}>
            <ChevronLeft size={16} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDate(new Date())}>
            Aujourd'hui
          </Button>
          <Button variant="outline" size="icon" className="size-8" onClick={() => setDate(localizer.add(date, 1, view === 'day' ? 'day' : 'week'))}>
            <ChevronRight size={16} />
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 pb-6">
        <DnDCalendar
          localizer={localizer}
          culture="fr"
          events={events}
          date={date}
          view={view}
          onNavigate={setDate}
          onView={setView}
          views={['week', 'day']}
          toolbar={false}
          step={30}
          timeslots={2}
          scrollToTime={dateAt(isoDate(new Date()), 7 * 60)}
          selectable
          resizable
          popup
          onEventDrop={onChange}
          onEventResize={onChange}
          onSelectSlot={onSelectSlot}
          onSelectEvent={(e) => selectTask(e.id)}
          eventPropGetter={(e) => {
            const color = projectColor(e.task);
            return {
              className: cn(e.task.done && 'rbc-event-done'),
              style: color ? { backgroundColor: color, borderColor: color } : undefined,
            };
          }}
        />
      </div>
    </div>
  );
}
