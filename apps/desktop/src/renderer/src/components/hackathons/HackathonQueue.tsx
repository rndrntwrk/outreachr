import { ArrowRight, Clock3, Layers3 } from 'lucide-react';
import type {
  HackathonCycleSummary,
  HackathonEntrySummary,
  OpportunitySummary,
} from '../../../../shared/hackathon-contracts';
import type { VentureSummary } from '../../../../shared/venture-contracts';
import { Badge, Button, formatDate, titleCase } from '../ui';
import { HackathonScorecard } from './HackathonScorecard';

function stateTone(
  state: HackathonEntrySummary['state'],
): 'neutral' | 'accent' | 'info' | 'warning' | 'danger' | 'success' {
  if (['finalist', 'won', 'converted'].includes(state)) return 'success';
  if (['submitted', 'judging', 'building', 'verification', 'submission_ready'].includes(state)) {
    return 'info';
  }
  if (['approved', 'scoped'].includes(state)) return 'accent';
  if (['not_selected', 'withdrawn'].includes(state)) return 'danger';
  if (state === 'candidate') return 'warning';
  return 'neutral';
}

export function HackathonQueue({
  entries,
  cycles,
  opportunities,
  ventures,
  emptyMessage,
  onOpen,
}: {
  entries: HackathonEntrySummary[];
  cycles: HackathonCycleSummary[];
  opportunities: OpportunitySummary[];
  ventures: VentureSummary[];
  emptyMessage: string;
  onOpen: (entryId: string) => void;
}): React.JSX.Element {
  const cycleById = new Map(cycles.map((item) => [item.id, item]));
  const opportunityById = new Map(opportunities.map((item) => [item.id, item]));
  const ventureById = new Map(ventures.map((item) => [item.id, item]));

  if (!entries.length) return <p className="hackathon-queue-empty">{emptyMessage}</p>;

  return (
    <div className="hackathon-queue">
      {entries.map((entry) => {
        const cycle = cycleById.get(entry.cycleId);
        const opportunity = cycle ? opportunityById.get(cycle.opportunityId) : undefined;
        const venture = entry.leadVentureId ? ventureById.get(entry.leadVentureId) : undefined;
        return (
          <article className="hackathon-entry-row" key={entry.id}>
            <div className="hackathon-entry-row__copy">
              <div className="hackathon-entry-row__meta">
                <Badge tone={stateTone(entry.state)}>{titleCase(entry.state)}</Badge>
                <span>
                  <Layers3 aria-hidden="true" /> {venture?.name ?? 'Unassigned component'}
                </span>
                <span>
                  <Clock3 aria-hidden="true" /> {entry.estimatedHours}h · {entry.reusePercentage}% reuse
                </span>
              </div>
              <h3>{entry.submissionConcept}</h3>
              <p>{entry.userOutcome}</p>
              <div className="hackathon-entry-row__event">
                <strong>{opportunity?.name ?? cycle?.cycleName ?? 'Hackathon cycle'}</strong>
                <span>{formatDate(entry.nextDeadlineAt)}</span>
                <span>{titleCase(entry.founderDecision)}</span>
                <span>{entry.eligibilityStatus ? titleCase(entry.eligibilityStatus) : 'Not evaluated'}</span>
              </div>
            </div>
            <HackathonScorecard entry={entry} compact />
            <Button tone="quiet" onClick={() => onOpen(entry.id)}>
              Open <ArrowRight aria-hidden="true" />
            </Button>
          </article>
        );
      })}
    </div>
  );
}
