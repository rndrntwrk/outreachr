import type {
  HackathonCycleSummary,
  HackathonEntrySummary,
  OpportunitySummary,
} from '../../../../shared/hackathon-contracts';
import type { VentureSummary } from '../../../../shared/venture-contracts';
import { useNavigate } from '../../lib/router';
import { Badge, formatDate, titleCase } from '../ui';
import { HackathonScorecard } from './HackathonScorecard';

export interface HackathonDemoLabel {
  name: string;
  version: number;
}

function eligibilityBadge(status: HackathonEntrySummary['eligibilityStatus']): React.JSX.Element {
  if (status === 'eligible') return <Badge tone="success">Eligible</Badge>;
  if (status === 'ineligible') return <Badge tone="danger">Ineligible</Badge>;
  if (status === 'uncertain') return <Badge tone="warning">Uncertain</Badge>;
  return <Badge tone="neutral">Unknown eligibility</Badge>;
}

function nextAction(entry: HackathonEntrySummary): string {
  if (entry.state === 'candidate' && entry.founderDecision === 'pending') {
    return 'Make go / no-go decision';
  }
  switch (entry.state) {
    case 'candidate':
      return 'Resolve conditions and eligibility';
    case 'approved':
      return 'Freeze the submission scope';
    case 'scoped':
      return 'Approve the isolated build plan';
    case 'building':
      return 'Finish the ecosystem adapter';
    case 'verification':
      return 'Complete evidence and security review';
    case 'submission_ready':
      return 'Submit manually and attach the receipt';
    case 'submitted':
    case 'judging':
      return 'Follow up with judges and sponsors';
    case 'finalist':
    case 'won':
    case 'not_selected':
      return 'Record results and conversion work';
    case 'converted':
      return 'Track the resulting relationship';
    case 'withdrawn':
    case 'archived':
      return 'Retain the reusable assets';
    default:
      return titleCase(entry.state);
  }
}

export function HackathonQueue({
  entries,
  cyclesById,
  opportunitiesById,
  venturesById,
  demoVersionsById,
  emptyMessage,
}: {
  entries: readonly HackathonEntrySummary[];
  cyclesById: ReadonlyMap<string, HackathonCycleSummary>;
  opportunitiesById: ReadonlyMap<string, OpportunitySummary>;
  venturesById: ReadonlyMap<string, VentureSummary>;
  demoVersionsById: ReadonlyMap<string, HackathonDemoLabel>;
  emptyMessage: string;
}): React.JSX.Element {
  const navigate = useNavigate();
  if (entries.length === 0) {
    return <p className="hackathon-queue-empty">{emptyMessage}</p>;
  }

  return (
    <div className="data-table-wrap hackathon-queue-wrap">
      <table className="data-table hackathon-queue" aria-label="Hackathon entries">
        <thead>
          <tr>
            <th>Entry</th>
            <th>Lead venture</th>
            <th>Canonical demo</th>
            <th>Score and delivery</th>
            <th>Eligibility</th>
            <th>Next action</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const cycle = cyclesById.get(entry.cycleId);
            const opportunity = cycle ? opportunitiesById.get(cycle.opportunityId) : undefined;
            const venture = entry.leadVentureId ? venturesById.get(entry.leadVentureId) : undefined;
            const demo = demoVersionsById.get(entry.canonicalDemoVersionId);
            return (
              <tr key={entry.id}>
                <td>
                  <button
                    className="hackathon-entry-link"
                    onClick={() => navigate(`/hackathons/${encodeURIComponent(entry.id)}`)}
                    aria-label={`Open ${entry.submissionConcept}`}
                  >
                    <strong className="data-table__primary">{entry.submissionConcept}</strong>
                    <span className="data-table__secondary">
                      {opportunity?.name ?? 'Unknown opportunity'} ·{' '}
                      {cycle?.cycleName ?? 'Unknown cycle'}
                    </span>
                    <span className="data-table__secondary">{entry.ecosystemAdapter}</span>
                  </button>
                </td>
                <td>
                  <strong>{venture?.name ?? 'Unknown venture'}</strong>
                  <span className="data-table__secondary">{titleCase(entry.state)}</span>
                </td>
                <td>
                  <strong>{demo?.name ?? 'Unknown demo'}</strong>
                  <span className="data-table__secondary">
                    {demo ? `Version ${demo.version}` : entry.canonicalDemoVersionId}
                  </span>
                </td>
                <td>
                  <HackathonScorecard entry={entry} />
                </td>
                <td>{eligibilityBadge(entry.eligibilityStatus)}</td>
                <td>
                  <div className="hackathon-next-action">
                    <strong>{nextAction(entry)}</strong>
                    <span>{formatDate(entry.nextDeadlineAt, true)}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
