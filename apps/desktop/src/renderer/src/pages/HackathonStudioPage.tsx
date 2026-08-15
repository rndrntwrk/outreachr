import { Plus, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type {
  HackathonEntryCreateCommand,
  HackathonEntrySummary,
} from '../../../shared/hackathon-contracts';
import { useNavigate } from '../lib/router';
import { Button, Dialog, PageHeader, Section, TextField, titleCase } from '../components/ui';
import { HackathonDeadlineStrip } from '../components/hackathons/HackathonDeadlineStrip';
import {
  HackathonQueue,
  type HackathonQueueItem,
} from '../components/hackathons/HackathonQueue';
import { useWorkspace } from '../state/WorkspaceContext';

const ENTRY_STATES = [
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
] as const;

const RATING_DEFAULTS = {
  strategicFit: 8,
  acceptanceProbability: 6,
  capitalUpside: 7,
  distributionUpside: 9,
  technicalLeverage: 8,
  credibility: 7,
  urgency: 7,
  effortEfficiency: 8,
  lockInSafety: 8,
};

function SelectField({
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
    <label className="field">
      <span className="field__label">{label}</span>
      <select className="select" value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

function RatingField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}): React.JSX.Element {
  return (
    <TextField
      label={label}
      type="number"
      min={1}
      max={10}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  );
}

function withinHours(deadline: string | null, maximum: number): boolean {
  if (!deadline) return false;
  const hours = (Date.parse(deadline) - Date.now()) / 3_600_000;
  return hours >= 0 && hours <= maximum;
}

export function HackathonStudioPage(): React.JSX.Element {
  const { data, command, notify } = useWorkspace();
  const navigate = useNavigate();
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [statusFilter, setStatusFilter] = useState('all');
  const [ventureFilter, setVentureFilter] = useState('all');
  const [demoFilter, setDemoFilter] = useState('all');
  const [ecosystemFilter, setEcosystemFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all');
  const [eligibilityFilter, setEligibilityFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');

  const firstCycleId = data?.hackathonCycles.find((cycle) => cycle.state !== 'watchlist')?.id ?? '';
  const firstLegalEntityId = data?.legalEntities[0]?.id ?? '';
  const firstVentureId =
    data?.ventures.find((venture) => venture.legalEntityId === firstLegalEntityId)?.id ?? '';
  const firstNarrativeId =
    data?.narrativeProfiles.find(
      (narrative) =>
        narrative.ventureId === firstVentureId &&
        narrative.purpose === 'hackathon' &&
        narrative.approvalState === 'approved',
    )?.id ?? '';
  const approvedDemoVersions = useMemo(
    () =>
      (data?.canonicalDemos ?? []).flatMap((demo) =>
        demo.versions
          .filter((version) => version.approvalState === 'approved')
          .map((version) => ({ ...version, demoName: demo.name })),
      ),
    [data?.canonicalDemos],
  );
  const firstDemoVersionId = approvedDemoVersions[0]?.id ?? '';

  const [cycleId, setCycleId] = useState(firstCycleId);
  const [legalEntityId, setLegalEntityId] = useState(firstLegalEntityId);
  const [leadVentureId, setLeadVentureId] = useState(firstVentureId);
  const [supportingVentureIds, setSupportingVentureIds] = useState<string[]>([]);
  const [narrativeProfileId, setNarrativeProfileId] = useState(firstNarrativeId);
  const [canonicalDemoVersionId, setCanonicalDemoVersionId] = useState(firstDemoVersionId);
  const [submissionConcept, setSubmissionConcept] = useState('');
  const [userOutcome, setUserOutcome] = useState('');
  const [ecosystemAdapter, setEcosystemAdapter] = useState('');
  const [estimatedHours, setEstimatedHours] = useState(40);
  const [reusePercentage, setReusePercentage] = useState(75);
  const [ratings, setRatings] = useState(RATING_DEFAULTS);

  useEffect(() => {
    if (!data) return;
    if (!data.hackathonCycles.some((cycle) => cycle.id === cycleId)) setCycleId(firstCycleId);
    if (!data.legalEntities.some((entity) => entity.id === legalEntityId)) {
      setLegalEntityId(firstLegalEntityId);
    }
  }, [cycleId, data, firstCycleId, firstLegalEntityId, legalEntityId]);

  const ventureOptions = useMemo(
    () => (data?.ventures ?? []).filter((venture) => venture.legalEntityId === legalEntityId),
    [data?.ventures, legalEntityId],
  );
  const narrativeOptions = useMemo(
    () =>
      (data?.narrativeProfiles ?? []).filter(
        (narrative) =>
          narrative.ventureId === leadVentureId &&
          narrative.purpose === 'hackathon' &&
          narrative.approvalState === 'approved',
      ),
    [data?.narrativeProfiles, leadVentureId],
  );

  useEffect(() => {
    if (!ventureOptions.some((venture) => venture.id === leadVentureId)) {
      setLeadVentureId(ventureOptions[0]?.id ?? '');
      setSupportingVentureIds([]);
    }
  }, [leadVentureId, ventureOptions]);

  useEffect(() => {
    if (!narrativeOptions.some((narrative) => narrative.id === narrativeProfileId)) {
      setNarrativeProfileId(narrativeOptions[0]?.id ?? '');
    }
  }, [narrativeOptions, narrativeProfileId]);

  useEffect(() => {
    if (!approvedDemoVersions.some((version) => version.id === canonicalDemoVersionId)) {
      setCanonicalDemoVersionId(approvedDemoVersions[0]?.id ?? '');
    }
  }, [approvedDemoVersions, canonicalDemoVersionId]);

  if (!data) return <div className="page" />;

  const opportunityById = new Map(data.opportunities.map((item) => [item.id, item]));
  const cycleById = new Map(data.hackathonCycles.map((item) => [item.id, item]));
  const ventureById = new Map(data.ventures.map((item) => [item.id, item]));
  const demoVersionName = new Map(
    data.canonicalDemos.flatMap((demo) =>
      demo.versions.map((version) => [version.id, demo.name] as const),
    ),
  );
  const organizationById = new Map(data.organizations.map((item) => [item.id, item]));

  const queueItems = data.hackathonEntries.map((entry): HackathonQueueItem => {
    const cycle = cycleById.get(entry.cycleId) ?? null;
    return {
      entry,
      cycle,
      opportunity: cycle ? (opportunityById.get(cycle.opportunityId) ?? null) : null,
      ventureName: entry.leadVentureId
        ? (ventureById.get(entry.leadVentureId)?.name ?? 'Unknown venture')
        : 'Unknown venture',
      demoName: demoVersionName.get(entry.canonicalDemoVersionId) ?? 'Unknown demo',
    };
  });

  const filteredItems = queueItems.filter(({ entry, cycle, opportunity }) => {
    const organizerId = opportunity?.organizerOrganizationId ?? null;
    if (statusFilter !== 'all' && opportunity?.status !== statusFilter) return false;
    if (ventureFilter !== 'all' && entry.leadVentureId !== ventureFilter) return false;
    if (demoFilter !== 'all' && entry.canonicalDemoVersionId !== demoFilter) return false;
    if (ecosystemFilter !== 'all' && organizerId !== ecosystemFilter) return false;
    if (formatFilter !== 'all' && cycle?.format !== formatFilter) return false;
    if (
      eligibilityFilter !== 'all' &&
      (entry.eligibilityStatus ?? 'unknown') !== eligibilityFilter
    ) {
      return false;
    }
    if (stateFilter !== 'all' && entry.state !== stateFilter) return false;
    if (priorityFilter === '72h' && !withinHours(entry.nextDeadlineAt, 72)) return false;
    if (priorityFilter === '14d' && !withinHours(entry.nextDeadlineAt, 14 * 24)) return false;
    if (priorityFilter === '30d' && !withinHours(entry.nextDeadlineAt, 30 * 24)) return false;
    return true;
  });

  const forStates = (states: readonly HackathonEntrySummary['state'][]): HackathonQueueItem[] =>
    filteredItems.filter((item) => states.includes(item.entry.state));

  const watchlistCycles = data.hackathonCycles.filter((cycle) => {
    if (cycle.state !== 'watchlist') return false;
    const opportunity = opportunityById.get(cycle.opportunityId);
    if (stateFilter !== 'all') return false;
    if (statusFilter !== 'all' && opportunity?.status !== statusFilter) return false;
    if (formatFilter !== 'all' && cycle.format !== formatFilter) return false;
    if (
      ecosystemFilter !== 'all' &&
      opportunity?.organizerOrganizationId !== ecosystemFilter
    ) {
      return false;
    }
    if (priorityFilter === '72h' && !withinHours(cycle.submissionDeadlineAt, 72)) return false;
    if (priorityFilter === '14d' && !withinHours(cycle.submissionDeadlineAt, 14 * 24)) return false;
    if (priorityFilter === '30d' && !withinHours(cycle.submissionDeadlineAt, 30 * 24)) return false;
    return eligibilityFilter === 'all' || eligibilityFilter === 'unknown';
  });

  const resetForm = (): void => {
    setCycleId(firstCycleId);
    setLegalEntityId(firstLegalEntityId);
    setLeadVentureId(firstVentureId);
    setSupportingVentureIds([]);
    setNarrativeProfileId(firstNarrativeId);
    setCanonicalDemoVersionId(firstDemoVersionId);
    setSubmissionConcept('');
    setUserOutcome('');
    setEcosystemAdapter('');
    setEstimatedHours(40);
    setReusePercentage(75);
    setRatings(RATING_DEFAULTS);
  };

  const createCandidate = async (): Promise<void> => {
    const payload: HackathonEntryCreateCommand = {
      cycleId,
      legalEntityId,
      leadVentureId,
      supportingVentureIds,
      narrativeProfileId,
      canonicalDemoVersionId,
      trackIds: [],
      bountyIds: [],
      submissionConcept,
      userOutcome,
      ecosystemAdapter,
      estimatedHours,
      reusePercentage,
      ...ratings,
    };
    setSaving(true);
    try {
      await command('hackathon.entry.create', payload);
      notify({
        tone: 'success',
        title: 'Candidate entry created',
        detail: 'Score, eligibility and readiness remain server-owned and founder-reviewed.',
      });
      setEntryDialogOpen(false);
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const formReady = Boolean(
    cycleId &&
      legalEntityId &&
      leadVentureId &&
      narrativeProfileId &&
      canonicalDemoVersionId &&
      submissionConcept.trim() &&
      userOutcome.trim() &&
      ecosystemAdapter.trim() &&
      estimatedHours > 0 &&
      reusePercentage >= 0,
  );

  return (
    <div className="page page--wide">
      <PageHeader
        title="Hackathon Studio"
        description="Run component-specific builds as bounded engineering, visibility, distribution and capital programs."
        actions={
          <Button
            tone="primary"
            icon={<Plus aria-hidden="true" />}
            onClick={() => setEntryDialogOpen(true)}
          >
            Add candidate entry
          </Button>
        }
      />

      <div className="hackathon-momentum" aria-label="Hackathon portfolio metrics">
        <div>
          <span>Open cycles</span>
          <strong className="mono">{data.hackathonPortfolio.openUpcomingRollingCycles}</strong>
        </div>
        <div>
          <span>Active builds</span>
          <strong className="mono">{data.hackathonPortfolio.approvedActiveBuilds}</strong>
        </div>
        <div>
          <span>Submitted</span>
          <strong className="mono">{data.hackathonPortfolio.submittedEntries}</strong>
        </div>
        <div>
          <span>Active hours</span>
          <strong className="mono">{data.hackathonPortfolio.estimatedActiveHours}</strong>
        </div>
      </div>

      <div className="hackathon-filter-rail" aria-label="Hackathon filters">
        <SelectField label="Opportunity status" value={statusFilter} onChange={setStatusFilter}>
          <option value="all">All statuses</option>
          {['open', 'upcoming', 'rolling', 'watchlist', 'closed'].map((status) => (
            <option key={status} value={status}>
              {titleCase(status)}
            </option>
          ))}
        </SelectField>
        <SelectField label="Venture" value={ventureFilter} onChange={setVentureFilter}>
          <option value="all">All ventures</option>
          {data.ventures.map((venture) => (
            <option key={venture.id} value={venture.id}>
              {venture.name}
            </option>
          ))}
        </SelectField>
        <SelectField label="Canonical demo" value={demoFilter} onChange={setDemoFilter}>
          <option value="all">All demos</option>
          {approvedDemoVersions.map((version) => (
            <option key={version.id} value={version.id}>
              {version.demoName}
            </option>
          ))}
        </SelectField>
        <SelectField label="Ecosystem" value={ecosystemFilter} onChange={setEcosystemFilter}>
          <option value="all">All ecosystems</option>
          {data.organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name}
            </option>
          ))}
        </SelectField>
        <SelectField label="Format" value={formatFilter} onChange={setFormatFilter}>
          <option value="all">All formats</option>
          <option value="online">Online</option>
          <option value="hybrid">Hybrid</option>
          <option value="in_person">In person</option>
        </SelectField>
        <SelectField label="Eligibility" value={eligibilityFilter} onChange={setEligibilityFilter}>
          <option value="all">All eligibility</option>
          <option value="eligible">Eligible</option>
          <option value="uncertain">Uncertain</option>
          <option value="ineligible">Ineligible</option>
          <option value="unknown">Unknown</option>
        </SelectField>
        <SelectField label="Priority window" value={priorityFilter} onChange={setPriorityFilter}>
          <option value="all">All windows</option>
          <option value="72h">72 hours</option>
          <option value="14d">14 days</option>
          <option value="30d">30 days</option>
        </SelectField>
        <SelectField label="Entry state" value={stateFilter} onChange={setStateFilter}>
          <option value="all">All states</option>
          {ENTRY_STATES.map((state) => (
            <option key={state} value={state}>
              {titleCase(state)}
            </option>
          ))}
        </SelectField>
      </div>

      <Section title="Deadlines" description="The nearest reviewed submission windows.">
        <HackathonDeadlineStrip cycles={data.hackathonCycles} opportunities={data.opportunities} />
      </Section>

      <Section title="Next decisions" description="Candidates waiting for founder go/no-go review.">
        <HackathonQueue
          items={forStates(['candidate'])}
          emptyMessage="No candidate decisions match these filters."
          onOpen={(id) => navigate(`/hackathons/${id}`)}
        />
      </Section>
      <Section title="Active builds" description="Approved, scoped, building or verification work.">
        <HackathonQueue
          items={forStates(['approved', 'scoped', 'building', 'verification'])}
          emptyMessage="No active build matches these filters."
          onOpen={(id) => navigate(`/hackathons/${id}`)}
        />
      </Section>
      <Section title="Submission-ready" description="Verified entries waiting for founder submission.">
        <HackathonQueue
          items={forStates(['submission_ready'])}
          emptyMessage="No entry is submission-ready under these filters."
          onOpen={(id) => navigate(`/hackathons/${id}`)}
        />
      </Section>
      <Section title="Submitted and judging" description="Receipt-backed submissions and judging state.">
        <HackathonQueue
          items={forStates(['submitted', 'judging', 'finalist'])}
          emptyMessage="No submitted entry matches these filters."
          onOpen={(id) => navigate(`/hackathons/${id}`)}
        />
      </Section>
      <Section title="Results and conversions" description="Competition outcomes and follow-on value.">
        <HackathonQueue
          items={forStates(['won', 'not_selected', 'converted', 'archived'])}
          emptyMessage="No result or conversion is recorded for these filters."
          onOpen={(id) => navigate(`/hackathons/${id}`)}
        />
      </Section>
      <Section title="Watchlist" description="Unannounced or recurring opportunities kept visible.">
        <div className="hackathon-watchlist">
          {watchlistCycles.length ? (
            watchlistCycles.map((cycle) => {
              const opportunity = opportunityById.get(cycle.opportunityId);
              const organizer = opportunity?.organizerOrganizationId
                ? organizationById.get(opportunity.organizerOrganizationId)
                : null;
              return (
                <div key={cycle.id}>
                  <Trophy aria-hidden="true" />
                  <div>
                    <strong>{opportunity?.name ?? 'Unknown opportunity'}</strong>
                    <span>{organizer?.name ?? 'Unknown ecosystem'} · {cycle.cycleName}</span>
                  </div>
                  <span>Eligibility unknown</span>
                </div>
              );
            })
          ) : (
            <p className="hackathon-empty-row">No watchlist opportunity matches these filters.</p>
          )}
        </div>
      </Section>

      <Dialog
        open={entryDialogOpen}
        title="Add hackathon entry"
        description="Choose one component-specific path. Score, eligibility and readiness are calculated outside the renderer."
        onClose={() => setEntryDialogOpen(false)}
        footer={
          <>
            <Button tone="quiet" onClick={() => setEntryDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              tone="primary"
              loading={saving}
              disabled={!formReady}
              onClick={() => void createCandidate()}
            >
              Create candidate
            </Button>
          </>
        }
      >
        <div className="hackathon-entry-form">
          <div className="hackathon-form-grid">
            <SelectField label="Cycle" value={cycleId} onChange={setCycleId}>
              {data.hackathonCycles
                .filter((cycle) => cycle.state !== 'watchlist')
                .map((cycle) => (
                  <option key={cycle.id} value={cycle.id}>
                    {opportunityById.get(cycle.opportunityId)?.name ?? cycle.cycleName}
                  </option>
                ))}
            </SelectField>
            <SelectField label="Legal entity" value={legalEntityId} onChange={setLegalEntityId}>
              {data.legalEntities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.displayName}
                </option>
              ))}
            </SelectField>
            <SelectField label="Lead venture" value={leadVentureId} onChange={setLeadVentureId}>
              {ventureOptions.map((venture) => (
                <option key={venture.id} value={venture.id}>
                  {venture.name}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Hackathon narrative"
              value={narrativeProfileId}
              onChange={setNarrativeProfileId}
            >
              {narrativeOptions.map((narrative) => (
                <option key={narrative.id} value={narrative.id}>
                  {titleCase(narrative.purpose)} narrative v{narrative.version}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Canonical demo"
              value={canonicalDemoVersionId}
              onChange={setCanonicalDemoVersionId}
            >
              {approvedDemoVersions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.demoName} v{version.version}
                </option>
              ))}
            </SelectField>
          </div>

          {ventureOptions.filter((venture) => venture.id !== leadVentureId).length ? (
            <fieldset className="hackathon-supporting-ventures">
              <legend>Supporting ventures</legend>
              {ventureOptions
                .filter((venture) => venture.id !== leadVentureId)
                .map((venture) => (
                  <label key={venture.id}>
                    <input
                      type="checkbox"
                      checked={supportingVentureIds.includes(venture.id)}
                      onChange={(event) =>
                        setSupportingVentureIds((current) =>
                          event.target.checked
                            ? [...current, venture.id]
                            : current.filter((id) => id !== venture.id),
                        )
                      }
                    />
                    <span>{venture.name}</span>
                  </label>
                ))}
            </fieldset>
          ) : null}

          <label className="field">
            <span className="field__label">Submission concept</span>
            <textarea
              className="textarea"
              value={submissionConcept}
              onChange={(event) => setSubmissionConcept(event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field__label">User outcome</span>
            <textarea
              className="textarea"
              value={userOutcome}
              onChange={(event) => setUserOutcome(event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field__label">Ecosystem adapter</span>
            <textarea
              className="textarea"
              value={ecosystemAdapter}
              onChange={(event) => setEcosystemAdapter(event.target.value)}
            />
          </label>
          <div className="hackathon-form-grid">
            <TextField
              label="Estimated hours"
              type="number"
              min={1}
              max={1_000}
              value={estimatedHours}
              onChange={(event) => setEstimatedHours(Number(event.target.value))}
            />
            <TextField
              label="Reuse percentage"
              type="number"
              min={0}
              max={100}
              value={reusePercentage}
              onChange={(event) => setReusePercentage(Number(event.target.value))}
            />
          </div>
          <div className="hackathon-rating-grid">
            <RatingField
              label="Strategic fit"
              value={ratings.strategicFit}
              onChange={(value) => setRatings((current) => ({ ...current, strategicFit: value }))}
            />
            <RatingField
              label="Acceptance probability"
              value={ratings.acceptanceProbability}
              onChange={(value) =>
                setRatings((current) => ({ ...current, acceptanceProbability: value }))
              }
            />
            <RatingField
              label="Capital upside"
              value={ratings.capitalUpside}
              onChange={(value) => setRatings((current) => ({ ...current, capitalUpside: value }))}
            />
            <RatingField
              label="Distribution upside"
              value={ratings.distributionUpside}
              onChange={(value) =>
                setRatings((current) => ({ ...current, distributionUpside: value }))
              }
            />
            <RatingField
              label="Technical leverage"
              value={ratings.technicalLeverage}
              onChange={(value) =>
                setRatings((current) => ({ ...current, technicalLeverage: value }))
              }
            />
            <RatingField
              label="Credibility"
              value={ratings.credibility}
              onChange={(value) => setRatings((current) => ({ ...current, credibility: value }))}
            />
            <RatingField
              label="Urgency"
              value={ratings.urgency}
              onChange={(value) => setRatings((current) => ({ ...current, urgency: value }))}
            />
            <RatingField
              label="Effort efficiency"
              value={ratings.effortEfficiency}
              onChange={(value) =>
                setRatings((current) => ({ ...current, effortEfficiency: value }))
              }
            />
            <RatingField
              label="Lock-in safety"
              value={ratings.lockInSafety}
              onChange={(value) => setRatings((current) => ({ ...current, lockInSafety: value }))}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
