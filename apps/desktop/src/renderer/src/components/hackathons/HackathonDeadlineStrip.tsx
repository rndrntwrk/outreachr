import type { HackathonCycleSummary } from '../../../../shared/hackathon-contracts';

function countWithin(cycles: readonly HackathonCycleSummary[], maximumHours: number, now: number): number {
  return cycles.filter((cycle) => {
    if (!cycle.submissionDeadlineAt) return false;
    const remaining = Date.parse(cycle.submissionDeadlineAt) - now;
    return remaining >= 0 && remaining <= maximumHours * 60 * 60 * 1_000;
  }).length;
}

export function HackathonDeadlineStrip({
  cycles,
}: {
  cycles: readonly HackathonCycleSummary[];
}): React.JSX.Element {
  const now = Date.now();
  const unscheduled = cycles.filter(
    (cycle) => cycle.state === 'watchlist' || !cycle.submissionDeadlineAt,
  ).length;
  const windows = [
    { label: 'Next 72 hours', count: countWithin(cycles, 72, now) },
    { label: 'Next 14 days', count: countWithin(cycles, 14 * 24, now) },
    { label: 'Next 30 days', count: countWithin(cycles, 30 * 24, now) },
    { label: 'Watchlist / unknown', count: unscheduled },
  ];

  return (
    <section className="hackathon-deadline-strip" aria-label="Hackathon deadline windows">
      {windows.map((window) => (
        <div key={window.label}>
          <span>{window.label}</span>
          <strong className="mono">{window.count}</strong>
        </div>
      ))}
    </section>
  );
}
