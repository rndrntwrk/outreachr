import { CalendarClock, ChevronRight } from 'lucide-react';
import { formatDate } from '../ui';

export interface HackathonDeadlineItem {
  cycleId: string;
  name: string;
  deadlineAt: string;
  entryCount: number;
  state: string;
}

function daysUntil(value: string): number {
  const deadline = Date.parse(value);
  const today = Date.now();
  if (Number.isNaN(deadline)) return 0;
  return Math.max(0, Math.ceil((deadline - today) / 86_400_000));
}

export function HackathonDeadlineStrip({
  items,
  onSelect,
}: {
  items: HackathonDeadlineItem[];
  onSelect: (cycleId: string) => void;
}): React.JSX.Element {
  if (!items.length) {
    return (
      <div className="hackathon-deadline-empty">
        <CalendarClock aria-hidden="true" />
        <span>No reviewed hackathon deadline is currently scheduled.</span>
      </div>
    );
  }

  return (
    <section className="hackathon-deadline-strip" aria-label="Upcoming hackathon deadlines">
      {items.slice(0, 4).map((item) => (
        <button key={item.cycleId} type="button" onClick={() => onSelect(item.cycleId)}>
          <CalendarClock aria-hidden="true" />
          <span>
            <strong>{item.name}</strong>
            <small>
              {item.entryCount} {item.entryCount === 1 ? 'entry' : 'entries'} · {item.state}
            </small>
          </span>
          <span className="hackathon-deadline-strip__date">
            <strong>{formatDate(item.deadlineAt)}</strong>
            <small>{daysUntil(item.deadlineAt)} days</small>
          </span>
          <ChevronRight aria-hidden="true" />
        </button>
      ))}
    </section>
  );
}
