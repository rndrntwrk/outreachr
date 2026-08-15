import { useState } from 'react';
import { Plus } from 'lucide-react';

import type { HackathonEntrySummary } from '../../../shared/hackathon-contracts';
import { HackathonDeadlineStrip } from '../components/hackathons/HackathonDeadlineStrip';
import { HackathonQueue } from '../components/hackathons/HackathonQueue';
import { Button, Dialog, PageHeader, Section, TextField } from '../components/ui';
import { useNavigate } from '../lib/router';
import { useWorkspace } from '../state/WorkspaceContext';

type HackathonEntryState = HackathonEntrySummary['state'];

const ACTIVE_STATES: HackathonEntryState[] = [
  'approved',
  'scoped',
  'building',
  'verification',
  'submission_ready',
];
const POST_RESULT_STATES: HackathonEntryState[] = [
  'submitted',
  'judging',
  'finalist',
  'won',
  'not_selected',
  'converted',
  'archived',
];

const ratingDefaults = {
  strategicFit: 8,
  acceptanceProbability: 7,
  capitalUpside: 7,
  distributionUpside: 9,
  technicalLeverage: 8,
  credibility: 7,
  urgency: 7,
  effortEfficiency: 7,
  lockInSafety: 8,
};

function numberValue(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function HackathonsPage(): React.JSX.Element {
  const { data, command, notify } = useWorkspace();
  const navigate = useNavigate();
  const [stateFilter, setStateFilter] = useState<'all' | HackathonEntryState>('all');
  const [ventureFilter, setVentureFilter] = useState('all');
  const [cycleFilter, setCycleFilter] = useState('all');
  const [candidateOpen, setCandidateOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cycleId, setCycleId] = useState(data?.hackathonCycles[0]?.id ?? '');
  const [ventureId, setVentureId] = useState(data?.ventures[0]?.id ?? '');
  const [narrativeId, setNarrativeId] = useState('');
  const [demoVersionId, setDemoVersionId] = useState('');
  const [submissionConcept, setSubmissionConcept] = useState('');
  const [userOutcome, setUserOutcome] = useState('');
  const [ecosystemAdapter, setEcosystemAdapter] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('28');
  const [reusePercentage, setReusePercentage] = useState('75');
  const [ratings, setRatings] = useState(ratingDefaults);

  if (!data) return <div className="page" />;

  const opportunityById = new Map(data.opportunities.map((item) => [item.id, item]));
  const selectedVenture = data.ventures.find((item) => item.id === ventureId) ?? null;
  const hackathonNarratives = data.narrativeProfiles.filter(
    (item) =>
      item.ventureId === ventureId &&
      item.purpose === 'hackathon' &&
      item.approvalState === 'approved',
  );
  const approvedDemoVersions = data.canonicalDemos.flatMap((demo) =>
    demo.versions
      .filter((version) => version.approvalState === 'approved')
      .map((version) => ({ ...version, demoName: demo.name })),
  );
  const resolvedNarrativeId = hackathonNarratives.some((item) => item.id === narrativeId)
    ? narrativeId
    : (hackathonNarratives[0]?.id ?? '');
  const preferredDemoVersionId = selectedVenture?.currentDemoVersionId ?? '';
  const resolvedDemoVersionId = approvedDemoVersions.some((item) => item.id === demoVersionId)
    ? demoVersionId
    : approvedDemoVersions.some((item) => item.id === preferredDemoVersionId)
      ? preferredDemoVersionId
      : (approvedDemoVersions[0]?.id ?? '');

  const filteredEntries = data.hackathonEntries.filter((entry) => {
    if (stateFilter !== 'all' && entry.state !== stateFilter) return false;
    if (ventureFilter !== 'all' && entry.leadVentureId !== ventureFilter) return false;
    if (cycleFilter !== 'all' && entry.cycleId !== cycleFilter) return false;
    return true;
  });

  const deadlines = data.hackathonCycles
    .filter((cycle) => cycle.submissionDeadlineAt !== null)
    .map((cycle) => ({
      cycleId: cycle.id,
      name: opportunityById.get(cycle.opportunityId)?.name ?? cycle.cycleName,
      deadlineAt: cycle.submissionDeadlineAt!,
      entryCount: data.hackathonEntries.filter((entry) => entry.cycleId === cycle.id).length,
      state: cycle.state,
    }))
    .sort((left, right) => left.deadlineAt.localeCompare(right.deadlineAt));

  const applyNow = filteredEntries.filter((entry) => entry.state === 'candidate');
  const activeBuilds = filteredEntries.filter((entry) => ACTIVE_STATES.includes(entry.state));
  const postResult = filteredEntries.filter((entry) => POST_RESULT_STATES.includes(entry.state));
  const portfolioHours = data.hackathonEntries.reduce(
    (total, entry) => total + entry.estimatedHours,
    0,
  );

  const resetCandidate = (): void => {
    const firstCycle = data.hackathonCycles[0]?.id ?? '';
    const firstVenture = data.ventures[0]?.id ?? '';
    setCycleId(firstCycle);
    setVentureId(firstVenture);
    setNarrativeId('');
    setDemoVersionId('');
    setSubmissionConcept('');
    setUserOutcome('');
    setEcosystemAdapter('');
    setEstimatedHours('28');
    setReusePercentage('75');
    setRatings(ratingDefaults);
  };

  const createCandidate = async (): Promise<void> => {
    if (!selectedVenture || !resolvedNarrativeId || !resolvedDemoVersionId || !cycleId) return;
    setBusy(true);
    try {
      await command('hackathon.entry.create', {
        cycleId,
        legalEntityId: selectedVenture.legalEntityId,
        leadVentureId: selectedVenture.id,
        supportingVentureIds: [],
        narrativeProfileId: resolvedNarrativeId,
        canonicalDemoVersionId: resolvedDemoVersionId,
        trackIds: [],
        bountyIds: [],
        submissionConcept,
        userOutcome,
        ecosystemAdapter,
        estimatedHours: numberValue(estimatedHours, 28),
        reusePercentage: numberValue(reusePercentage, 75),
        ...ratings,
      });
      notify({
        tone: 'success',
        title: 'Candidate entry created',
        detail: 'The server calculated its score. Founder go/no-go remains pending.',
      });
      setCandidateOpen(false);
      resetCandidate();
    } finally {
      setBusy(false);
    }
  };

  const candidateReady = Boolean(
    cycleId &&
      selectedVenture &&
      resolvedNarrativeId &&
      resolvedDemoVersionId &&
      submissionConcept.trim() &&
      userOutcome.trim() &&
      ecosystemAdapter.trim(),
  );

  return (
    <div className="page page--wide">
      <PageHeader
        title="Hackathon Studio"
        description="Run component-specific build campaigns that compound into reusable product, visibility, ecosystem relationships and capital access."
        actions={
          <Button
            tone="primary"
            icon={<Plus aria-hidden="true" />}
            onClick={() => setCandidateOpen(true)}
          >
            New candidate entry
          </Button>
        }
      />

      <div className="hackathon-metrics" aria-label="Hackathon portfolio metrics">
        <div>
          <span>Open cycles</span>
          <strong>{data.hackathonPortfolio.openUpcomingRollingCycles}</strong>
        </div>
        <div>
          <span>Candidates</span>
          <strong>{data.hackathonPortfolio.candidateEntries}</strong>
        </div>
        <div>
          <span>Active builds</span>
          <strong>{data.hackathonPortfolio.approvedActiveBuilds}</strong>
        </div>
        <div>
          <span>Blocked entries</span>
          <strong>{data.hackathonPortfolio.blockedEntries}</strong>
        </div>
        <div>
          <span>Portfolio effort</span>
          <strong>{portfolioHours}h</strong>
        </div>
      </div>

      <HackathonDeadlineStrip
        items={deadlines}
        onSelect={(selectedCycleId) => setCycleFilter(selectedCycleId)}
      />

      <div className="hackathon-toolbar" aria-label="Hackathon portfolio filters">
        <label>
          <span>Entry state</span>
          <select
            className="select"
            aria-label="Entry state"
            value={stateFilter}
            onChange={(event) => setStateFilter(event.target.value as 'all' | HackathonEntryState)}
          >
            <option value="all">All states</option>
            <option value="candidate">Candidate</option>
            <option value="approved">Approved</option>
            <option value="scoped">Scoped</option>
            <option value="building">Building</option>
            <option value="verification">Verification</option>
            <option value="submission_ready">Submission ready</option>
            <option value="submitted">Submitted</option>
            <option value="judging">Judging</option>
            <option value="finalist">Finalist</option>
            <option value="won">Won</option>
            <option value="not_selected">Not selected</option>
            <option value="converted">Converted</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label>
          <span>Component</span>
          <select
            className="select"
            aria-label="Component"
            value={ventureFilter}
            onChange={(event) => setVentureFilter(event.target.value)}
          >
            <option value="all">All components</option>
            {data.ventures.map((venture) => (
              <option key={venture.id} value={venture.id}>
                {venture.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Cycle</span>
          <select
            className="select"
            aria-label="Cycle"
            value={cycleFilter}
            onChange={(event) => setCycleFilter(event.target.value)}
          >
            <option value="all">All cycles</option>
            {data.hackathonCycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {opportunityById.get(cycle.opportunityId)?.name ?? cycle.cycleName}
              </option>
            ))}
          </select>
        </label>
        <Button
          tone="quiet"
          onClick={() => {
            setStateFilter('all');
            setVentureFilter('all');
            setCycleFilter('all');
          }}
        >
          Clear filters
        </Button>
      </div>

      <Section
        title="Apply now"
        description="Candidate entries awaiting eligibility review and a founder go/no-go decision."
      >
        <HackathonQueue
          entries={applyNow}
          cycles={data.hackathonCycles}
          opportunities={data.opportunities}
          ventures={data.ventures}
          emptyMessage="No candidate entry matches the current filters."
          onOpen={(entryId) => navigate(`/hackathons/${entryId}`)}
        />
      </Section>

      <Section
        title="Active builds"
        description="Approved entries moving through isolated build, evidence and submission-readiness gates."
      >
        <HackathonQueue
          entries={activeBuilds}
          cycles={data.hackathonCycles}
          opportunities={data.opportunities}
          ventures={data.ventures}
          emptyMessage="No active build matches the current filters."
          onOpen={(entryId) => navigate(`/hackathons/${entryId}`)}
        />
      </Section>

      <Section
        title="Post-result conversion"
        description="Submitted work converting into public proof, sponsor relationships, grants, pilots and investor conversations."
      >
        <HackathonQueue
          entries={postResult}
          cycles={data.hackathonCycles}
          opportunities={data.opportunities}
          ventures={data.ventures}
          emptyMessage="No post-result entry matches the current filters."
          onOpen={(entryId) => navigate(`/hackathons/${entryId}`)}
        />
      </Section>

      <Dialog
        open={candidateOpen}
        title="Create candidate entry"
        description="Choose one component and one reusable demo. The server calculates the score; the founder decides whether to proceed."
        onClose={() => setCandidateOpen(false)}
        footer={
          <>
            <Button tone="quiet" onClick={() => setCandidateOpen(false)}>
              Cancel
            </Button>
            <Button
              tone="primary"
              loading={busy}
              disabled={!candidateReady}
              onClick={() => void createCandidate()}
            >
              Create candidate
            </Button>
          </>
        }
      >
        <div className="hackathon-candidate-form">
          <div className="hackathon-form-grid">
            <label className="field">
              <span className="field__label">Hackathon cycle</span>
              <select
                className="select"
                value={cycleId}
                onChange={(event) => setCycleId(event.target.value)}
              >
                {data.hackathonCycles.map((cycle) => (
                  <option value={cycle.id} key={cycle.id}>
                    {opportunityById.get(cycle.opportunityId)?.name ?? cycle.cycleName}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Lead component</span>
              <select
                className="select"
                value={ventureId}
                onChange={(event) => {
                  setVentureId(event.target.value);
                  setNarrativeId('');
                }}
              >
                {data.ventures.map((venture) => (
                  <option value={venture.id} key={venture.id}>
                    {venture.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Approved hackathon narrative</span>
              <select
                className="select"
                value={resolvedNarrativeId}
                onChange={(event) => setNarrativeId(event.target.value)}
              >
                {hackathonNarratives.map((narrative) => (
                  <option key={narrative.id} value={narrative.id}>
                    {narrative.descriptions.words50} · v{narrative.version}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Approved canonical demo</span>
              <select
                className="select"
                value={resolvedDemoVersionId}
                onChange={(event) => setDemoVersionId(event.target.value)}
              >
                {approvedDemoVersions.map((version) => (
                  <option key={version.id} value={version.id}>
                    {version.demoName} · v{version.version}
                  </option>
                ))}
              </select>
            </label>
          </div>

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
              max={1000}
              value={estimatedHours}
              onChange={(event) => setEstimatedHours(event.target.value)}
            />
            <TextField
              label="Reuse percentage"
              type="number"
              min={0}
              max={100}
              value={reusePercentage}
              onChange={(event) => setReusePercentage(event.target.value)}
            />
          </div>

          <div className="hackathon-rating-grid" aria-label="Candidate scoring inputs">
            {(
              [
                ['Strategic fit', 'strategicFit'],
                ['Acceptance probability', 'acceptanceProbability'],
                ['Capital upside', 'capitalUpside'],
                ['Distribution upside', 'distributionUpside'],
                ['Technical leverage', 'technicalLeverage'],
                ['Credibility', 'credibility'],
                ['Urgency', 'urgency'],
                ['Effort efficiency', 'effortEfficiency'],
                ['Lock-in safety', 'lockInSafety'],
              ] as const
            ).map(([label, key]) => (
              <TextField
                key={key}
                label={label}
                type="number"
                min={1}
                max={10}
                value={String(ratings[key])}
                onChange={(event) =>
                  setRatings((current) => ({
                    ...current,
                    [key]: numberValue(event.target.value, current[key]),
                  }))
                }
              />
            ))}
          </div>
          {!hackathonNarratives.length ? (
            <p className="hackathon-form-warning">
              This component needs an approved hackathon narrative before an entry can be created.
            </p>
          ) : null}
        </div>
      </Dialog>
    </div>
  );
}
