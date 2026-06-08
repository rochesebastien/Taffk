import { useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer, type View as RbcView } from 'react-big-calendar';
import withDragAndDrop, {
  type EventInteractionArgs,
} from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, getDay, parse, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../../lib/store';
import { isoDate, minutesToTime, timeToMinutes } from '../../lib/dates';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { ButtonGroup } from '../ui/button-group';
import type { Task } from '../../lib/api';

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

export function CalendarView() {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const patchTask = useStore((s) => s.patchTask);
  const openSpotlight = useStore((s) => s.openSpotlight);
  const spotlightOpen = useStore((s) => s.spotlightOpen);
  const selectTask = useStore((s) => s.selectTask);

  const [date, setDate] = useState(() => new Date());
  const [view, setView] = useState<RbcView>('week');

  const projectColor = (t: Task) => projects.find((p) => p.id === t.projectId)?.color ?? null;

  const events = useMemo<CalEvent[]>(() => {
    return tasks
      .filter((t) => t.parentId === null && !t.archived && t.scheduledFor)
      .map((t) => {
        const timed = t.scheduledTime != null;
        const startMin = timeToMinutes(t.scheduledTime) ?? DEFAULT_START;
        const start = dateAt(t.scheduledFor!, timed ? startMin : 0);
        // All-day events span a full day (end-exclusive) so RBC renders one cell
        // and they stay draggable into the time grid.
        const end = timed
          ? new Date(start.getTime() + (t.estimateMinutes || DEFAULT_DURATION) * 60000)
          : new Date(start.getTime() + 24 * 60 * 60000);
        return { id: t.id, title: t.title, start, end, allDay: !timed, task: t };
      });
  }, [tasks]);

  function onChange({ event, start, end, isAllDay }: EventInteractionArgs<CalEvent>) {
    const s = new Date(start);
    const e = new Date(end);
    if (isAllDay) {
      void patchTask({ id: event.id, scheduledFor: isoDate(s), scheduledTime: null });
      return;
    }
    // Dropping an all-day event onto the grid converts it to a timed task with a
    // sensible default; a move/resize of a timed event keeps its dragged span.
    const minutes = event.allDay
      ? DEFAULT_DURATION
      : Math.max(15, Math.round((e.getTime() - s.getTime()) / 60000));
    void patchTask({
      id: event.id,
      scheduledFor: isoDate(s),
      scheduledTime: minutesToTime(s.getHours() * 60 + s.getMinutes()),
      estimateMinutes: minutes,
    });
  }

  function onSelectSlot({ start, end, action }: { start: Date; end: Date; action: string }) {
    if (action !== 'select' && action !== 'click') return;
    if (spotlightOpen) return;
    const raw = Math.round((end.getTime() - start.getTime()) / 60000);
    openSpotlight({
      date: isoDate(start),
      time: view === 'month' ? null : minutesToTime(start.getHours() * 60 + start.getMinutes()),
      estimateMinutes: view === 'month' ? undefined : raw >= 15 ? raw : DEFAULT_DURATION,
    });
  }

  const label = format(
    date,
    view === 'day' ? 'EEEE d MMMM' : view === 'month' ? 'MMMM yyyy' : "'Semaine du' d MMMM yyyy",
    { locale: fr },
  );
  const navUnit = view === 'day' ? 'day' : view === 'month' ? 'month' : 'week';

  return (
    <div className="flex h-full flex-col px-6">
      <header className="flex items-end justify-between gap-4 pb-4 pt-8">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-3xl font-bold tracking-tight">Planning</h1>
          <span className="text-sm capitalize text-muted-foreground/70">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <ButtonGroup>
            {(['month', 'week', 'day'] as RbcView[]).map((v) => (
              <Button
                key={v}
                size="sm"
                variant={view === v ? 'secondary' : 'outline'}
                onClick={() => setView(v)}
              >
                {v === 'month' ? 'Mois' : v === 'week' ? 'Semaine' : 'Jour'}
              </Button>
            ))}
          </ButtonGroup>
          <ButtonGroup>
            <Button variant="outline" size="sm" className="px-2" onClick={() => setDate(localizer.add(date, -1, navUnit))}>
              <ChevronLeft size={16} />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDate(new Date())}>
              Aujourd'hui
            </Button>
            <Button variant="outline" size="sm" className="px-2" onClick={() => setDate(localizer.add(date, 1, navUnit))}>
              <ChevronRight size={16} />
            </Button>
          </ButtonGroup>
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
          views={['month', 'week', 'day']}
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
