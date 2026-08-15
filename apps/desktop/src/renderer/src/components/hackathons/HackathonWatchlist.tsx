import { CalendarClock, Eye, Globe2 } from 'lucide-react';

import type {
  HackathonCycleSummary,
  OpportunitySummary,
  OrganizationSummary,
} from '../../../../shared/hackathon-contracts';
import { Badge, formatDate, titleCase } from '../ui';

export function HackathonWatchlist({
  cycles,
  opportunities,
  organizations,
}: {
  cycles: HackathonCycleSummary[];
  opportunities: OpportunitySummary[];
  organizations: OrganizationSummary[];
}): React.JSX.Element {
  const opportunityById = new Map(opportunities.map((item) => [item.id, item]));
  const organizationById = new Map(organizations.map((item) => [item.id, item]));

  if (!cycles.length) {
    return <p className="hackathon-queue-empty">No watchlist cycle matches the current filters.</p>;
  }

  return (
    <div className="hackathon-watchlist">
      {cycles.map((cycle) => {
        const opportunity = opportunityById.get(cycle.opportunityId);
        const organizer = opportunity?.organizerOrganizationId
          ? organizationById.get(opportunity.organizerOrganizationId)
          : undefined;
        return (
          <article key={cycle.id}>
            <Eye aria-hidden="true" />
            <div>
              <h3>{opportunity?.name ?? cycle.cycleName}</h3>
              <p>{opportunity?.eligibilitySummary ?? 'Eligibility is unknown.'}</p>
            </div>
            <dl>
              <div>
                <dt>Organizer</dt>
                <dd>{organizer?.name ?? 'Unknown'}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <Badge tone="neutral">{titleCase(opportunity?.status ?? 'unknown')}</Badge>
                </dd>
              </div>
              <div>
                <dt>Format</dt>
                <dd>
                  <Globe2 aria-hidden="true" /> {titleCase(cycle.format ?? 'unknown')}
                </dd>
              </div>
              <div>
                <dt>Next date</dt>
                <dd>
                  <CalendarClock aria-hidden="true" /> {formatDate(cycle.submissionDeadlineAt)}
                </dd>
              </div>
            </dl>
          </article>
        );
      })}
    </div>
  );
}
