import { Plus, RotateCcw, Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';

import type {
  HackathonCycleSummary,
  HackathonEntrySummary,
  OpportunitySummary,
  StudioAppBootstrap,
} from '../../../shared/hackathon-contracts';
import { HackathonCandidateDialog } from '../components/hackathons/HackathonCandidateDialog';
import { HackathonDeadlineStrip } from '../components/hackathons/HackathonDeadlineStrip';
import {
  HackathonQueue,
  type HackathonDemoLabel,
} from '../components/hackathons/HackathonQueue';
import {
  Badge,
  Button,
  EmptyState,
  PageHeader,
  Section,
  formatDate,
  titleCase,
} from '../components/ui';
import { useWorkspace } from '../state/WorkspaceContext';

interface Filters {
  opportunityStatus: string;
  ventureId: string;
  demoVersionId: string;
  organizerId: string;
  format: string;
  eligibility: string;
  priorityWindow: string;
  state: string;
}

const emptyFilters: Filters = {
  opportunityStatus: '',
  ventureId: '',
  demoVersionId: '',
  organizerId: '',
  format: '',
  eligibility: '',
  priorityWindow: '',
  state: '',
};

function deadlineMatches(deadline: string | null, window: string): boolean {
  if (!window) return true;
  if (window === 'unknown') return deadline === null;
  if (deadline === null) return false;
  const remaining = Date.parse(deadline) - Date.now();
  if (remaining < 0) return false;
  const hours = Number(window);
  return Number.isFinite(hours) && remaining <= hours * 60 * 60 * 1_000;
}

function ventureMatches(leadVentureId: string | null, filter: string): boolean {
  if (!filter) return true;
  return filter === 'unknown' ? leadVentureId === null : leadVentureId === filter;
}

function entryGroups(entries: readonly HackathonEntrySummary[]) {
  return {
    decisions: entries.filter(
      (entry) => entry.state === 'candidate' && entry.founderDecision !== 'no_go',
    ),
    activeBuilds: entries.filter((entry) =>
      ['approved', 'scoped', 'building', 'verification'].includes(entry.state),
    ),
    submissionReady: entries.filter((entry) => entry.state === 'submission_ready'),
    submitted: entries.filter((entry) => ['submitted', 'judging'].includes(entry.state)),
    results: entries.filter((entry) =>
      ['finalist', 'won', 'not_selected', 'converted'].includes(entry.state),
    ),
    watchlist: entries.filter(
      (entry) =>
        entry.founderDecision === 'no_go' || ['withdrawn', 'archived'].includes(entry.state),
    ),
  };
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <label className="hackathon-filter">
      <span>{label}</span>
      <select
        className="select"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

function PortfolioSummary({ data }: { data: StudioAppBootstrap }): React.JSX.Element {
  const metrics = data.hackathonPortfolio;
  return (
    <section className="hackathon-portfolio-summary" aria-label="Hackathon portfolio summary">
      <div>
        <span>Current cycles</span>
        <strong className="mono">{metrics.openUpcomingRollingCycles}</strong>
      </div>
      <div>
        <span>Candidate decisions</span>
        <strong className="mono">{metrics.candidateEntries}</strong>
      </div>
      <div>
        <span>Active builds</span>
        <strong className="mono">{metrics.approvedActiveBuilds}</strong>
      </div>
      <div>
        <span>Ready / submitted</span>
        <strong className="mono">
          {metrics.submissionReadyEntries + metrics.submittedEntries}
        </strong>
      </div>
      <div>
        <span>Finalists / wins</span>
        <strong className="mono">{metrics.finalistsWins}</strong>
      </div>
      <div>
        <span>Committed build hours</span>
        <strong className="mono">{metrics.estimatedActiveHours}h</strong>
      </div>
    </section>
  );
}

function WatchlistCycles({
  cycles,
  opportunitiesById,
}: {
  cycles: readonly HackathonCycleSummary[];
  opportunitiesById: ReadonlyMap<string, OpportunitySummary>;
}): React.JSX.Element {
  if (cycles.length === 0) {
    return (
      <p className="hackathon-queue-empty">
        No recurring or unannounced cycles match the filters.
      </p>
    );
  }
  return (
    <div className="hackathon-watchlist">
      {cycles.map((cycle) => {
        const opportunity = opportunitiesById.get(cycle.opportunityId);
        return (
          <div key={cycle.id}>
            <Trophy aria-hidden="true" />
            <span>
              <strong>{opportunity?.name ?? 'Unknown opportunity'}</strong>
              <small>
                {cycle.cycleName} · {cycle.format} · deadline{' '}
                {formatDate(cycle.submissionDeadlineAt, true)}
              </small>
            </span>
            <Badge tone={cycle.rulesSha256 ? 'info' : 'neutral'}>
              {cycle.rulesSha256 ? 'Rules captured' : 'Rules unknown'}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}

export function HackathonStudioPage(): React.JSX.Element {
  const { data: workspaceData } = useWorkspace();
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [candidateOpen, setCandidateOpen] = useState(false);
  const data = workspaceData as StudioAppBootstrap;

  const cyclesById = useMemo(
    () => new Map(data.hackathonCycles.map((cycle) => [cycle.id, cycle])),
    [data.hackathonCycles],
  );
  const opportunitiesById = useMemo(
    () => new Map(data.opportunities.map((opportunity) => [opportunity.id, opportunity])),
    [data.opportunities],
  );
  const venturesById = useMemo(
    () => new Map(data.ventures.map((venture) => [venture.id, venture])),
    [data.ventures],
  );
  const demoVersionsById = useMemo(() => {
    const values = new Map<string, HackathonDemoLabel>();
    for (const demo of data.canonicalDemos) {
      for (const version of demo.versions) {
        values.set(version.id, { name: demo.name, version: version.version });
      }
    }
    return values;
  }, [data.canonicalDemos]);

  const filteredEntries = useMemo(
    () =>
      data.hackathonEntries.filter((entry) => {
        const cycle = cyclesById.get(entry.cycleId);
        const opportunity = cycle ? opportunitiesById.get(cycle.opportunityId) : undefined;
        const eligibility = entry.eligibilityStatus ?? 'unknown';
        return (
          (!filters.opportunityStatus || opportunity?.status === filters.opportunityStatus) &&
          ventureMatches(entry.leadVentureId, filters.ventureId) &&
          (!filters.demoVersionId || entry.canonicalDemoVersionId === filters.demoVersionId) &&
          (!filters.organizerId ||
            (opportunity?.organizerOrganizationId ?? 'unknown') === filters.organizerId) &&
          (!filters.format || (cycle?.format ?? 'unknown') === filters.format) &&
          (!filters.eligibility || eligibility === filters.eligibility) &&
          (!filters.state || entry.state === filters.state) &&
          deadlineMatches(entry.nextDeadlineAt, filters.priorityWindow)
        );
      }),
    [cyclesById, data.hackathonEntries, filters, opportunitiesById],
  );
  const groups = useMemo(() => entryGroups(filteredEntries), [filteredEntries]);

  const filteredWatchlistCycles = data.hackathonCycles.filter((cycle) => {
    if (cycle.state !== 'watchlist' && cycle.submissionDeadlineAt !== null) return false;
    const opportunity = opportunitiesById.get(cycle.opportunityId);
    return (
      (!filters.opportunityStatus || opportunity?.status === filters.opportunityStatus) &&
      (!filters.organizerId ||
        (opportunity?.organizerOrganizationId ?? 'unknown') === filters.organizerId) &&
      (!filters.format || cycle.format === filters.format)
    );
  });

  const commonQueueProps = {
    cyclesById,
    opportunitiesById,
    venturesById,
    demoVersionsById,
  };
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="page page--wide">
      <PageHeader
        title="Hackathon Studio"
        description="Run component-specific hackathons as reusable product, distribution and relationship campaigns. Scores and readiness remain server-calculated; every external action stays founder-controlled."
        actions={
          <Button
            tone="primary"
            icon={<Plus aria-hidden="true" />}
            onClick={() => setCandidateOpen(true)}
          >
            Add candidate
          </Button>
        }
      />

      <PortfolioSummary data={data} />
      <HackathonDeadlineStrip cycles={data.hackathonCycles} />

      <section className="hackathon-filter-bar" aria-label="Hackathon portfolio filters">
        <FilterSelect
          label="Opportunity status"
          value={filters.opportunityStatus}
          onChange={(opportunityStatus) =>
            setFilters((current) => ({ ...current, opportunityStatus }))
          }
        >
          <option value="">All statuses</option>
          {['open', 'upcoming', 'rolling', 'closed_recurring', 'watchlist', 'cancelled'].map(
            (status) => (
              <option key={status} value={status}>
                {titleCase(status)}
              </option>
            ),
          )}
        </FilterSelect>
        <FilterSelect
          label="Lead venture"
          value={filters.ventureId}
          onChange={(ventureId) => setFilters((current) => ({ ...current, ventureId }))}
        >
          <option value="">All ventures</option>
          {data.ventures.map((venture) => (
            <option key={venture.id} value={venture.id}>
              {venture.name}
            </option>
          ))}
          <option value="unknown">Unknown venture</option>
        </FilterSelect>
        <FilterSelect
          label="Canonical demo"
          value={filters.demoVersionId}
          onChange={(demoVersionId) => setFilters((current) => ({ ...current, demoVersionId }))}
        >
          <option value="">All demos</option>
          {[...demoVersionsById.entries()].map(([id, demo]) => (
            <option key={id} value={id}>
              {demo.name} · v{demo.version}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          label="Ecosystem / organizer"
          value={filters.organizerId}
          onChange={(organizerId) => setFilters((current) => ({ ...current, organizerId }))}
        >
          <option value="">All ecosystems</option>
          {data.organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name}
            </option>
          ))}
          <option value="unknown">Unknown organizer</option>
        </FilterSelect>
        <FilterSelect
          label="Format"
          value={filters.format}
          onChange={(format) => setFilters((current) => ({ ...current, format }))}
        >
          <option value="">All formats</option>
          {['online', 'in_person', 'hybrid', 'unknown'].map((format) => (
            <option key={format} value={format}>
              {titleCase(format)}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          label="Eligibility"
          value={filters.eligibility}
          onChange={(eligibility) => setFilters((current) => ({ ...current, eligibility }))}
        >
          <option value="">All eligibility states</option>
          <option value="eligible">Eligible</option>
          <option value="uncertain">Uncertain</option>
          <option value="ineligible">Ineligible</option>
          <option value="unknown">Unknown</option>
        </FilterSelect>
        <FilterSelect
          label="Priority window"
          value={filters.priorityWindow}
          onChange={(priorityWindow) => setFilters((current) => ({ ...current, priorityWindow }))}
        >
          <option value="">All deadlines</option>
          <option value="72">Next 72 hours</option>
          <option value="336">Next 14 days</option>
          <option value="720">Next 30 days</option>
          <option value="unknown">Unknown deadline</option>
        </FilterSelect>
        <FilterSelect
          label="Entry state"
          value={filters.state}
          onChange={(state) => setFilters((current) => ({ ...current, state }))}
        >
          <option value="">All entry states</option>
          {[
            'candidate',
            'approved',
            'scoped',
            'building',
            'verification',
            'submission_ready',
            'submitted',
            'judging',
            'finalist',
            'won',
            'not_selected',
            'withdrawn',
            'converted',
            'archived',
          ].map((state) => (
            <option key={state} value={state}>
              {titleCase(state)}
            </option>
          ))}
        </FilterSelect>
        <Button
          tone="quiet"
          size="small"
          icon={<RotateCcw aria-hidden="true" />}
          disabled={activeFilterCount === 0}
          onClick={() => setFilters(emptyFilters)}
        >
          Reset {activeFilterCount ? `(${activeFilterCount})` : ''}
        </Button>
      </section>

      {filteredEntries.length === 0 && filteredWatchlistCycles.length === 0 ? (
        <EmptyState
          title="No matching hackathon work"
          detail="Unknown evidence is never hidden by default. Reset the filters or add a component-specific candidate."
          action={
            <Button tone="primary" onClick={() => setCandidateOpen(true)}>
              Add candidate
            </Button>
          }
        />
      ) : (
        <>
          <Section
            title="Next decisions"
            description="Candidate entries waiting for eligibility review, scope selection or a founder go/no-go decision."
          >
            <HackathonQueue
              entries={groups.decisions}
              emptyMessage="No candidate decisions match the current filters."
              {...commonQueueProps}
            />
          </Section>
          <Section
            title="Active builds"
            description="Approved, scoped, building and verification-stage entries using isolated reusable baselines."
          >
            <HackathonQueue
              entries={groups.activeBuilds}
              emptyMessage="No active builds match the current filters."
              {...commonQueueProps}
            />
          </Section>
          <Section
            title="Submission-ready"
            description="Verified entries whose required assets and founder-approved distribution plans are complete."
          >
            <HackathonQueue
              entries={groups.submissionReady}
              emptyMessage="No entries are submission-ready."
              {...commonQueueProps}
            />
          </Section>
          <Section
            title="Submitted and judging"
            description="Manual submissions with durable receipts, followed through judging and sponsor conversations."
          >
            <HackathonQueue
              entries={groups.submitted}
              emptyMessage="No submitted or judging entries match the filters."
              {...commonQueueProps}
            />
          </Section>
          <Section
            title="Results and conversions"
            description="Finalists, wins, non-selections and the pilots, grants, investors, users or partnerships they create."
          >
            <HackathonQueue
              entries={groups.results}
              emptyMessage="No result-stage entries match the filters."
              {...commonQueueProps}
            />
          </Section>
          <Section
            title="Watchlist"
            description="Recurring cycles, unknown deadlines and no-go entries retained for evidence and reuse."
          >
            <HackathonQueue
              entries={groups.watchlist}
              emptyMessage="No retained no-go or archived entries match the filters."
              {...commonQueueProps}
            />
            <WatchlistCycles
              cycles={filteredWatchlistCycles}
              opportunitiesById={opportunitiesById}
            />
          </Section>
        </>
      )}

      <HackathonCandidateDialog
        open={candidateOpen}
        data={data}
        onClose={() => setCandidateOpen(false)}
      />
    </div>
  );
}
