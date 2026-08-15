import { useState } from 'react';

import { Button, Dialog, TextField } from '../ui';
import { useWorkspace } from '../../state/WorkspaceContext';

const RATING_DEFAULTS = {
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

export function HackathonCandidateDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): React.JSX.Element | null {
  const { data, command, notify } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [cycleId, setCycleId] = useState(data?.hackathonCycles[0]?.id ?? '');
  const [legalEntityId, setLegalEntityId] = useState(data?.legalEntities[0]?.id ?? '');
  const [leadVentureId, setLeadVentureId] = useState(
    data?.ventures.find((venture) => venture.legalEntityId === data.legalEntities[0]?.id)?.id ?? '',
  );
  const [supportingVentureIds, setSupportingVentureIds] = useState<string[]>([]);
  const [narrativeId, setNarrativeId] = useState('');
  const [demoVersionId, setDemoVersionId] = useState('');
  const [submissionConcept, setSubmissionConcept] = useState('');
  const [userOutcome, setUserOutcome] = useState('');
  const [ecosystemAdapter, setEcosystemAdapter] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('28');
  const [reusePercentage, setReusePercentage] = useState('75');
  const [ratings, setRatings] = useState(RATING_DEFAULTS);

  if (!data) return null;

  const legalEntityVentures = data.ventures.filter(
    (venture) => venture.legalEntityId === legalEntityId,
  );
  const leadVenture = legalEntityVentures.find((venture) => venture.id === leadVentureId) ?? null;
  const supportingVentures = legalEntityVentures.filter((venture) => venture.id !== leadVentureId);
  const hackathonNarratives = data.narrativeProfiles.filter(
    (item) =>
      item.ventureId === leadVentureId &&
      item.purpose === 'hackathon' &&
      item.approvalState === 'approved',
  );
  const approvedDemoVersions = data.canonicalDemos.flatMap((demo) =>
    demo.versions
      .filter(
        (version) =>
          version.approvalState === 'approved' &&
          version.id === leadVenture?.currentDemoVersionId,
      )
      .map((version) => ({ ...version, demoName: demo.name })),
  );
  const resolvedNarrativeId = hackathonNarratives.some((item) => item.id === narrativeId)
    ? narrativeId
    : (hackathonNarratives[0]?.id ?? '');
  const resolvedDemoVersionId = approvedDemoVersions.some((item) => item.id === demoVersionId)
    ? demoVersionId
    : (approvedDemoVersions[0]?.id ?? '');

  const reset = (): void => {
    const entity = data.legalEntities[0]?.id ?? '';
    const venture = data.ventures.find((item) => item.legalEntityId === entity)?.id ?? '';
    setCycleId(data.hackathonCycles[0]?.id ?? '');
    setLegalEntityId(entity);
    setLeadVentureId(venture);
    setSupportingVentureIds([]);
    setNarrativeId('');
    setDemoVersionId('');
    setSubmissionConcept('');
    setUserOutcome('');
    setEcosystemAdapter('');
    setEstimatedHours('28');
    setReusePercentage('75');
    setRatings(RATING_DEFAULTS);
  };

  const close = (): void => {
    if (busy) return;
    onClose();
  };

  const toggleSupportingVenture = (ventureId: string): void => {
    setSupportingVentureIds((current) =>
      current.includes(ventureId)
        ? current.filter((item) => item !== ventureId)
        : [...current, ventureId],
    );
  };

  const createCandidate = async (): Promise<void> => {
    if (!leadVenture || !resolvedNarrativeId || !resolvedDemoVersionId || !cycleId) return;
    setBusy(true);
    try {
      await command('hackathon.entry.create', {
        cycleId,
        legalEntityId,
        leadVentureId: leadVenture.id,
        supportingVentureIds,
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
      onClose();
      reset();
    } finally {
      setBusy(false);
    }
  };

  const candidateReady = Boolean(
    cycleId &&
      legalEntityId &&
      leadVenture &&
      resolvedNarrativeId &&
      resolvedDemoVersionId &&
      submissionConcept.trim() &&
      userOutcome.trim() &&
      ecosystemAdapter.trim(),
  );

  return (
    <Dialog
      open={open}
      title="Create candidate entry"
      description="Choose one legal entity, one lead component and one approved demo. The server calculates the score; the founder decides whether to proceed."
      onClose={close}
      footer={
        <>
          <Button tone="quiet" disabled={busy} onClick={close}>
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
              {data.hackathonCycles.map((cycle) => {
                const opportunity = data.opportunities.find(
                  (item) => item.id === cycle.opportunityId,
                );
                return (
                  <option value={cycle.id} key={cycle.id}>
                    {opportunity?.name ?? cycle.cycleName}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Legal entity</span>
            <select
              className="select"
              value={legalEntityId}
              onChange={(event) => {
                const nextEntityId = event.target.value;
                const firstVenture = data.ventures.find(
                  (venture) => venture.legalEntityId === nextEntityId,
                );
                setLegalEntityId(nextEntityId);
                setLeadVentureId(firstVenture?.id ?? '');
                setSupportingVentureIds([]);
                setNarrativeId('');
                setDemoVersionId('');
              }}
            >
              {data.legalEntities.map((entity) => (
                <option value={entity.id} key={entity.id}>
                  {entity.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Lead component</span>
            <select
              className="select"
              value={leadVentureId}
              onChange={(event) => {
                setLeadVentureId(event.target.value);
                setSupportingVentureIds((current) =>
                  current.filter((item) => item !== event.target.value),
                );
                setNarrativeId('');
                setDemoVersionId('');
              }}
            >
              {legalEntityVentures.map((venture) => (
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

        <fieldset className="hackathon-supporting-ventures">
          <legend>Supporting components</legend>
          {supportingVentures.length ? (
            supportingVentures.map((venture) => (
              <label key={venture.id}>
                <input
                  type="checkbox"
                  checked={supportingVentureIds.includes(venture.id)}
                  onChange={() => toggleSupportingVenture(venture.id)}
                />
                <span>
                  <strong>{venture.name} supporting component</strong>
                  <small>{venture.utility}</small>
                </span>
              </label>
            ))
          ) : (
            <p>No additional component is available under this legal entity.</p>
          )}
        </fieldset>

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
            The lead component needs an approved hackathon narrative before an entry can be created.
          </p>
        ) : null}
        {!approvedDemoVersions.length ? (
          <p className="hackathon-form-warning">
            The lead component needs a current approved canonical demo before an entry can be created.
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}
