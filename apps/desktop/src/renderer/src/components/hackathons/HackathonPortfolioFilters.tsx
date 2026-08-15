import type {
  HackathonEntrySummary,
  OpportunitySummary,
  OrganizationSummary,
} from '../../../../shared/hackathon-contracts';
import type {
  CanonicalDemoSummary,
  VentureSummary,
} from '../../../../shared/venture-contracts';
import { Button, titleCase } from '../ui';

export type HackathonPriorityWindow =
  | 'all'
  | '72_hours'
  | '14_days'
  | '30_days'
  | 'later'
  | 'unscheduled'
  | 'past_due';

export interface HackathonPortfolioFilterState {
  opportunityStatus: string;
  ventureId: string;
  demoVersionId: string;
  ecosystemId: string;
  format: string;
  eligibility: string;
  priorityWindow: HackathonPriorityWindow;
  entryState: 'all' | HackathonEntrySummary['state'];
}

export const EMPTY_HACKATHON_FILTERS: HackathonPortfolioFilterState = {
  opportunityStatus: 'all',
  ventureId: 'all',
  demoVersionId: 'all',
  ecosystemId: 'all',
  format: 'all',
  eligibility: 'all',
  priorityWindow: 'all',
  entryState: 'all',
};

const OPPORTUNITY_STATUSES = [
  'open',
  'upcoming',
  'rolling',
  'watchlist',
  'closed_recurring',
  'closed',
  'paused',
] as const;
const FORMATS = ['online', 'in_person', 'hybrid', 'async'] as const;
const ELIGIBILITY_STATES = ['eligible', 'uncertain', 'ineligible', 'not_applicable'] as const;
const ENTRY_STATES: HackathonEntrySummary['state'][] = [
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
  'converted',
  'withdrawn',
  'archived',
];

function FilterField({
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
    <label>
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

export function HackathonPortfolioFilters({
  value,
  opportunities,
  organizations,
  ventures,
  canonicalDemos,
  onChange,
  onClear,
}: {
  value: HackathonPortfolioFilterState;
  opportunities: OpportunitySummary[];
  organizations: OrganizationSummary[];
  ventures: VentureSummary[];
  canonicalDemos: CanonicalDemoSummary[];
  onChange: (value: HackathonPortfolioFilterState) => void;
  onClear: () => void;
}): React.JSX.Element {
  const knownStatuses = new Set(opportunities.map((item) => item.status));
  const knownEcosystems = new Set(opportunities.map((item) => item.organizerOrganizationId));
  const organizationById = new Map(organizations.map((item) => [item.id, item]));

  const update = <K extends keyof HackathonPortfolioFilterState>(
    key: K,
    next: HackathonPortfolioFilterState[K],
  ): void => onChange({ ...value, [key]: next });

  return (
    <div className="hackathon-toolbar" aria-label="Hackathon portfolio filters">
      <FilterField
        label="Opportunity status"
        value={value.opportunityStatus}
        onChange={(next) => update('opportunityStatus', next)}
      >
        <option value="all">All statuses</option>
        {OPPORTUNITY_STATUSES.filter((status) => knownStatuses.has(status)).map((status) => (
          <option key={status} value={status}>
            {titleCase(status)}
          </option>
        ))}
        <option value="unknown">Unknown</option>
      </FilterField>

      <FilterField
        label="Component"
        value={value.ventureId}
        onChange={(next) => update('ventureId', next)}
      >
        <option value="all">All components</option>
        {ventures.map((venture) => (
          <option key={venture.id} value={venture.id}>
            {venture.name}
          </option>
        ))}
        <option value="unknown">Unknown</option>
      </FilterField>

      <FilterField
        label="Canonical demo"
        value={value.demoVersionId}
        onChange={(next) => update('demoVersionId', next)}
      >
        <option value="all">All demos</option>
        {canonicalDemos.flatMap((demo) =>
          demo.versions.map((version) => (
            <option key={version.id} value={version.id}>
              {demo.name} · v{version.version}
            </option>
          )),
        )}
        <option value="unknown">Unknown</option>
      </FilterField>

      <FilterField
        label="Ecosystem"
        value={value.ecosystemId}
        onChange={(next) => update('ecosystemId', next)}
      >
        <option value="all">All ecosystems</option>
        {[...knownEcosystems]
          .filter((id): id is string => id !== null)
          .map((id) => (
            <option key={id} value={id}>
              {organizationById.get(id)?.name ?? 'Unknown'}
            </option>
          ))}
        <option value="unknown">Unknown</option>
      </FilterField>

      <FilterField
        label="Format"
        value={value.format}
        onChange={(next) => update('format', next)}
      >
        <option value="all">All formats</option>
        {FORMATS.map((format) => (
          <option key={format} value={format}>
            {titleCase(format)}
          </option>
        ))}
        <option value="unknown">Unknown</option>
      </FilterField>

      <FilterField
        label="Eligibility"
        value={value.eligibility}
        onChange={(next) => update('eligibility', next)}
      >
        <option value="all">All eligibility states</option>
        {ELIGIBILITY_STATES.map((state) => (
          <option key={state} value={state}>
            {titleCase(state)}
          </option>
        ))}
        <option value="unknown">Unknown</option>
      </FilterField>

      <FilterField
        label="Priority window"
        value={value.priorityWindow}
        onChange={(next) => update('priorityWindow', next as HackathonPriorityWindow)}
      >
        <option value="all">All windows</option>
        <option value="72_hours">Within 72 hours</option>
        <option value="14_days">Within 14 days</option>
        <option value="30_days">Within 30 days</option>
        <option value="later">Later than 30 days</option>
        <option value="past_due">Past due</option>
        <option value="unscheduled">Unscheduled</option>
      </FilterField>

      <FilterField
        label="Entry state"
        value={value.entryState}
        onChange={(next) => update('entryState', next as HackathonPortfolioFilterState['entryState'])}
      >
        <option value="all">All states</option>
        {ENTRY_STATES.map((state) => (
          <option key={state} value={state}>
            {titleCase(state)}
          </option>
        ))}
      </FilterField>

      <Button tone="quiet" onClick={onClear}>
        Clear filters
      </Button>
    </div>
  );
}
