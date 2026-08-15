import type { HackathonEntrySummary } from '../../../../shared/hackathon-contracts';

export function HackathonScorecard({
  entry,
}: {
  entry: HackathonEntrySummary;
}): React.JSX.Element {
  return (
    <div className="hackathon-scorecard" aria-label={`Score ${entry.weightedScore}`}>
      <strong className="mono">{entry.weightedScore.toFixed(1)}</strong>
      <span>{entry.reusePercentage}% reuse</span>
      <span>{entry.estimatedHours}h</span>
    </div>
  );
}
