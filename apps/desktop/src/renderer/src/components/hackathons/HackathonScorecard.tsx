import type { HackathonEntrySummary } from '../../../../shared/hackathon-contracts';

const dimensions = [
  ['Strategic fit', 'strategicFit'],
  ['Distribution', 'distributionUpside'],
  ['Technical leverage', 'technicalLeverage'],
  ['Reuse', 'reusePercentage'],
] as const;

export function HackathonScorecard({
  entry,
  compact = false,
}: {
  entry: HackathonEntrySummary;
  compact?: boolean;
}): React.JSX.Element {
  return (
    <div className={compact ? 'hackathon-score hackathon-score--compact' : 'hackathon-score'}>
      <div className="hackathon-score__total" aria-label={`Weighted score ${entry.weightedScore}`}>
        <strong>{entry.weightedScore}</strong>
        <span>weighted</span>
      </div>
      <dl>
        {dimensions.map(([label, key]) => {
          const value = entry[key];
          const maximum = key === 'reusePercentage' ? 100 : 10;
          return (
            <div key={key}>
              <dt>{label}</dt>
              <dd>
                <span>{value}</span>
                <div className="hackathon-score__track" aria-hidden="true">
                  <span style={{ width: `${Math.min(100, (value / maximum) * 100)}%` }} />
                </div>
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
