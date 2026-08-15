import { ArrowRight, Clock3 } from 'lucide-react';

import type {
  HackathonCycleSummary,
  HackathonEntrySummary,
  OpportunitySummary,
} from '../../../../shared/hackathon-contracts';
import { Badge, formatDate, titleCase } from '../ui';
import { HackathonScorecard } from './HackathonScorecard';

export interface HackathonQueueItem {
  entry: HackathonEntrySummary;
  cycle: HackathonCycleSummary | null;
  opportunity: OpportunitySummary | null;
  ventureName: string;
  demoName: string;
}

function eligibilityLabel(value: HackathonEntrySummary['eligibilityStatus']): string {
  if (value === null) return 'Eligibility unknown';
  return titleCase(value);
}

function eligibilityTone(
  value: HackathonEntrySummary['eligibilityStatus'],
): 'success' | 'danger' | 'warning' | 'neutral' {
  if (value === 'eligible') return 'success';
  if (value === 'ineligible') return 'danger';
  if (value === 'uncertain') return 'warning';
  return 'neutral';
}

export function HackathonQueue({
  items,
  emptyMessage,
  onOpen,
}: {
  items: HackathonQueueItem[];
  emptyMessage: string;
  onOpen: (id: string) => void;
}): React.JSX.Element {
  if (!items.length) return <p className="hackathon-empty-row">{emptyMessage}</p>;

  return (
    <div className="hackathon-queue">
      {items.map(({ entry, cycle, opportunity, ventureName, demoName }) => (
        <button
          key={entry.id}
          className="hackathon-row"
          aria-label={`${opportunity?.name ?? 'Unknown opportunity'} · ${entry.submissionConcept}`}
          onClick={() => onOpen(entry.id)}
        >
          <div className="hackathon-row__identity">
            <div className="hackathon-row__title-line">
              <strong>{opportunity?.name ?? 'Unknown opportunity'}</strong>
              <Badge tone={entry.founderDecision === 'go' ? 'success' : 'neutral'}>
                {titleCase(entry.state)}
              </Badge>
            </div>
            <span>{cycle?.cycleName ?? 'Unknown cycle'}</span>
            <p>{entry.submissionConcept}</p>
          </div>
          <dl className="hackathon-row__context">
            <div>
              <dt>Lead venture</dt>
              <dd>{ventureName}</dd>
            </div>
            <div>
              <dt>Canonical demo</dt>
              <dd>{demoName}</dd>
            </div>
            <div>
              <dt>Eligibility</dt>
              <dd>
                <Badge tone={eligibilityTone(entry.eligibilityStatus)}>
                  {eligibilityLabel(entry.eligibilityStatus)}
                </Badge>
              </dd>
            </div>
          </dl>
          <HackathonScorecard entry={entry} />
          <div className="hackathon-row__deadline">
            <Clock3 aria-hidden="true" />
            <span>{formatDate(entry.nextDeadlineAt, true)}</span>
            <ArrowRight aria-hidden="true" />
          </div>
        </button>
      ))}
    </div>
  );
}
