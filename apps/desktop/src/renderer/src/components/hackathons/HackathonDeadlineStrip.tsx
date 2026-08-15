import type {
  HackathonCycleSummary,
  OpportunitySummary,
} from '../../../../shared/hackathon-contracts';
import { formatDate } from '../ui';

interface DeadlineWindow {
  label: string;
  maximumHours: number;
}

const WINDOWS: DeadlineWindow[] = [
  { label: 'Within 72 hours', maximumHours: 72 },
  { label: 'Within 14 days', maximumHours: 14 * 24 },
  { label: 'Within 30 days', maximumHours: 30 * 24 },
];

export function HackathonDeadlineStrip({
  cycles,
  opportunities,
}: {
  cycles: HackathonCycleSummary[];
  opportunities: OpportunitySummary[];
}): React.JSX.Element {
  const opportunityById = new Map(opportunities.map((item) => [item.id, item]));
  const now = Date.now();
  const deadlines = cycles
    .filter((cycle) => cycle.submissionDeadlineAt)
    .map((cycle) => ({
      cycle,
      opportunity: opportunityById.get(cycle.opportunityId) ?? null,
      hours: (Date.parse(cycle.submissionDeadlineAt!) - now) / 3_600_000,
    }))
    .filter((item) => item.hours >= 0)
    .toSorted((left, right) => left.hours - right.hours);

  return (
    <div className="hackathon-deadline-strip">
      {WINDOWS.map((window, index) => {
        const lowerBound = index === 0 ? 0 : WINDOWS[index - 1]!.maximumHours;
        const matching = deadlines.filter(
          (item) => item.hours > lowerBound && item.hours <= window.maximumHours,
        );
        return (
          <div key={window.label}>
            <span>{window.label}</span>
            <strong className="mono">{matching.length}</strong>
            <small>
              {matching[0]
                ? `${matching[0].opportunity?.name ?? 'Unknown opportunity'} · ${formatDate(
                    matching[0].cycle.submissionDeadlineAt,
                    true,
                  )}`
                : 'No current deadline'}
            </small>
          </div>
        );
      })}
    </div>
  );
}
