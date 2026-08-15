import { useEffect, useMemo, useState } from 'react';

import type {
  HackathonEntryCreateCommand,
  StudioAppBootstrap,
} from '../../../../shared/hackathon-contracts';
import { useWorkspace } from '../../state/WorkspaceContext';
import { Button, Dialog, TextField } from '../ui';

interface CandidateDraft {
  cycleId: string;
  legalEntityId: string;
  leadVentureId: string;
  narrativeProfileId: string;
  canonicalDemoVersionId: string;
  submissionConcept: string;
  userOutcome: string;
  ecosystemAdapter: string;
  estimatedHours: number;
  reusePercentage: number;
  strategicFit: number;
  acceptanceProbability: number;
  capitalUpside: number;
  distributionUpside: number;
  technicalLeverage: number;
  credibility: number;
  urgency: number;
  effortEfficiency: number;
  lockInSafety: number;
}

const initialRatings = {
  strategicFit: 8,
  acceptanceProbability: 7,
  capitalUpside: 7,
  distributionUpside: 8,
  technicalLeverage: 8,
  credibility: 7,
  urgency: 7,
  effortEfficiency: 7,
  lockInSafety: 8,
} as const;

function initialDraft(data: StudioAppBootstrap): CandidateDraft {
  const cycle = data.hackathonCycles.find(
    (item) => !['completed', 'cancelled', 'watchlist'].includes(item.state),
  );
  const legalEntity = data.legalEntities.find((item) => item.status === 'active');
  const venture = data.ventures.find((item) => item.status === 'active');
  const narrative = data.narrativeProfiles.find(
    (item) =>
      item.approvalState === 'approved' &&
      item.purpose === 'hackathon' &&
      item.ventureId === venture?.id &&
      item.legalEntityId === legalEntity?.id,
  );
  const demo = data.canonicalDemos
    .flatMap((item) => item.versions)
    .find((item) => item.approvalState === 'approved');
  return {
    cycleId: cycle?.id ?? '',
    legalEntityId: legalEntity?.id ?? '',
    leadVentureId: venture?.id ?? '',
    narrativeProfileId: narrative?.id ?? '',
    canonicalDemoVersionId: demo?.id ?? '',
    submissionConcept: '',
    userOutcome: '',
    ecosystemAdapter: '',
    estimatedHours: 48,
    reusePercentage: 80,
    ...initialRatings,
  };
}

function NumberField({
  label,
  value,
  minimum,
  maximum,
  onChange,
}: {
  label: string;
  value: number;
  minimum: number;
  maximum: number;
  onChange: (value: number) => void;
}): React.JSX.Element {
  return (
    <TextField
      label={label}
      type="number"
      min={minimum}
      max={maximum}
      value={Number.isFinite(value) ? value : ''}
      onChange={(event) =>
        onChange(event.target.value === '' ? Number.NaN : Number(event.target.value))
      }
    />
  );
}

export function HackathonCandidateDialog({
  open,
  data,
  onClose,
}: {
  open: boolean;
  data: StudioAppBootstrap;
  onClose: () => void;
}): React.JSX.Element | null {
  const { command, notify } = useWorkspace();
  const [draft, setDraft] = useState<CandidateDraft>(() => initialDraft(data));
  const [supportingVentureIds, setSupportingVentureIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(initialDraft(data));
    setSupportingVentureIds([]);
  }, [data, open]);

  const activeVentures = useMemo(
    () => data.ventures.filter((venture) => venture.status === 'active'),
    [data.ventures],
  );
  const narratives = useMemo(
    () =>
      data.narrativeProfiles.filter(
        (profile) =>
          profile.approvalState === 'approved' &&
          profile.purpose === 'hackathon' &&
          profile.legalEntityId === draft.legalEntityId &&
          profile.ventureId === draft.leadVentureId,
      ),
    [data.narrativeProfiles, draft.leadVentureId, draft.legalEntityId],
  );
  const approvedDemos = useMemo(
    () =>
      data.canonicalDemos.flatMap((demo) =>
        demo.versions
          .filter((version) => version.approvalState === 'approved')
          .map((version) => ({ demo, version })),
      ),
    [data.canonicalDemos],
  );

  useEffect(() => {
    if (narratives.some((profile) => profile.id === draft.narrativeProfileId)) return;
    setDraft((current) => ({ ...current, narrativeProfileId: narratives[0]?.id ?? '' }));
  }, [draft.narrativeProfileId, narratives]);

  if (!open) return null;

  const ratingValues = [
    draft.strategicFit,
    draft.acceptanceProbability,
    draft.capitalUpside,
    draft.distributionUpside,
    draft.technicalLeverage,
    draft.credibility,
    draft.urgency,
    draft.effortEfficiency,
    draft.lockInSafety,
  ];
  const ratingsValid = ratingValues.every(
    (value) => Number.isFinite(value) && value >= 1 && value <= 10,
  );
  const valid =
    draft.cycleId.length > 0 &&
    draft.legalEntityId.length > 0 &&
    draft.leadVentureId.length > 0 &&
    draft.narrativeProfileId.length > 0 &&
    draft.canonicalDemoVersionId.length > 0 &&
    draft.submissionConcept.trim().length > 0 &&
    draft.userOutcome.trim().length > 0 &&
    draft.ecosystemAdapter.trim().length > 0 &&
    Number.isFinite(draft.estimatedHours) &&
    draft.estimatedHours >= 1 &&
    draft.estimatedHours <= 1_000 &&
    Number.isFinite(draft.reusePercentage) &&
    draft.reusePercentage >= 0 &&
    draft.reusePercentage <= 100 &&
    ratingsValid;

  const createCandidate = async (): Promise<void> => {
    if (!valid) return;
    setBusy(true);
    try {
      const payload: HackathonEntryCreateCommand = {
        ...draft,
        supportingVentureIds,
        trackIds: [],
        bountyIds: [],
      };
      await command('hackathon.entry.create', payload);
      notify({
        tone: 'success',
        title: 'Hackathon candidate created',
        detail: 'The server calculated the score. Eligibility and the founder decision remain open.',
      });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      title="Add hackathon candidate"
      description="Choose one component, one approved story and one reusable demo. The founder decision remains separate."
      onClose={onClose}
      footer={
        <>
          <Button tone="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button
            tone="primary"
            loading={busy}
            disabled={!valid}
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
            <span className="field__label">Cycle</span>
            <select
              className="select"
              aria-label="Cycle"
              value={draft.cycleId}
              onChange={(event) =>
                setDraft((current) => ({ ...current, cycleId: event.target.value }))
              }
            >
              <option value="">Select a current cycle</option>
              {data.hackathonCycles
                .filter((cycle) => !['completed', 'cancelled', 'watchlist'].includes(cycle.state))
                .map((cycle) => {
                  const opportunity = data.opportunities.find(
                    (item) => item.id === cycle.opportunityId,
                  );
                  return (
                    <option key={cycle.id} value={cycle.id}>
                      {opportunity?.name ?? 'Unknown opportunity'} · {cycle.cycleName}
                    </option>
                  );
                })}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Legal entity</span>
            <select
              className="select"
              aria-label="Legal entity"
              value={draft.legalEntityId}
              onChange={(event) =>
                setDraft((current) => ({ ...current, legalEntityId: event.target.value }))
              }
            >
              <option value="">Select authority</option>
              {data.legalEntities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Lead venture</span>
            <select
              className="select"
              aria-label="Lead venture"
              value={draft.leadVentureId}
              onChange={(event) =>
                setDraft((current) => ({ ...current, leadVentureId: event.target.value }))
              }
            >
              <option value="">Select one component</option>
              {activeVentures
                .filter((venture) => venture.legalEntityId === draft.legalEntityId)
                .map((venture) => (
                  <option key={venture.id} value={venture.id}>
                    {venture.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Approved hackathon narrative</span>
            <select
              className="select"
              aria-label="Approved hackathon narrative"
              value={draft.narrativeProfileId}
              onChange={(event) =>
                setDraft((current) => ({ ...current, narrativeProfileId: event.target.value }))
              }
            >
              <option value="">Select an approved version</option>
              {narratives.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  Version {profile.version} · {profile.descriptions.words50}
                </option>
              ))}
            </select>
          </label>
          <label className="field hackathon-form-grid__wide">
            <span className="field__label">Approved canonical demo</span>
            <select
              className="select"
              aria-label="Approved canonical demo"
              value={draft.canonicalDemoVersionId}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  canonicalDemoVersionId: event.target.value,
                }))
              }
            >
              <option value="">Select a reusable baseline</option>
              {approvedDemos.map(({ demo, version }) => (
                <option key={version.id} value={version.id}>
                  {demo.name} · version {version.version} · {version.expectedBaselineHours}h baseline
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="hackathon-supporting-ventures">
          <legend>Supporting ventures</legend>
          {activeVentures
            .filter(
              (venture) =>
                venture.legalEntityId === draft.legalEntityId && venture.id !== draft.leadVentureId,
            )
            .map((venture) => (
              <label key={venture.id} className="check-row">
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
                <span>
                  <strong>{venture.name}</strong>
                  <small>{venture.category}</small>
                </span>
              </label>
            ))}
        </fieldset>

        <label className="field">
          <span className="field__label">Submission concept</span>
          <textarea
            className="textarea"
            aria-label="Submission concept"
            value={draft.submissionConcept}
            onChange={(event) =>
              setDraft((current) => ({ ...current, submissionConcept: event.target.value }))
            }
          />
        </label>
        <label className="field">
          <span className="field__label">User outcome</span>
          <textarea
            className="textarea"
            aria-label="User outcome"
            value={draft.userOutcome}
            onChange={(event) =>
              setDraft((current) => ({ ...current, userOutcome: event.target.value }))
            }
          />
        </label>
        <label className="field">
          <span className="field__label">Ecosystem adapter</span>
          <textarea
            className="textarea"
            aria-label="Ecosystem adapter"
            value={draft.ecosystemAdapter}
            onChange={(event) =>
              setDraft((current) => ({ ...current, ecosystemAdapter: event.target.value }))
            }
          />
        </label>

        <div className="hackathon-form-grid">
          <NumberField
            label="Estimated hours"
            value={draft.estimatedHours}
            minimum={1}
            maximum={1_000}
            onChange={(estimatedHours) =>
              setDraft((current) => ({ ...current, estimatedHours }))
            }
          />
          <NumberField
            label="Reuse percentage"
            value={draft.reusePercentage}
            minimum={0}
            maximum={100}
            onChange={(reusePercentage) =>
              setDraft((current) => ({ ...current, reusePercentage }))
            }
          />
        </div>

        <fieldset className="hackathon-rating-grid">
          <legend>Portfolio scoring inputs</legend>
          {(
            [
              ['strategicFit', 'Strategic fit'],
              ['acceptanceProbability', 'Acceptance probability'],
              ['capitalUpside', 'Capital upside'],
              ['distributionUpside', 'Distribution upside'],
              ['technicalLeverage', 'Technical leverage'],
              ['credibility', 'Credibility'],
              ['urgency', 'Urgency'],
              ['effortEfficiency', 'Effort efficiency'],
              ['lockInSafety', 'Lock-in safety'],
            ] as const
          ).map(([field, label]) => (
            <NumberField
              key={field}
              label={label}
              value={draft[field]}
              minimum={1}
              maximum={10}
              onChange={(value) => setDraft((current) => ({ ...current, [field]: value }))}
            />
          ))}
        </fieldset>
      </div>
    </Dialog>
  );
}
