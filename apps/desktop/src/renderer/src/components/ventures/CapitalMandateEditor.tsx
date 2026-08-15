import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type {
  CapitalMandateSaveInput,
  CapitalMandateSummary,
} from '../../../../shared/venture-contracts';
import { useWorkspace } from '../../state/WorkspaceContext';
import { Button, Dialog, formatMoney } from '../ui';

function initialState(
  mandate: CapitalMandateSummary | null,
  defaults: {
    roundId: string;
    legalEntityId: string;
    ventureId: string;
    narrativeProfileId: string;
    stage: CapitalMandateSaveInput['stage'];
    targetAmountUsd: number;
    minimumCheckUsd: number | null;
    maximumCheckUsd: number | null;
  },
): CapitalMandateSaveInput {
  return mandate
    ? {
        id: mandate.id,
        roundId: mandate.roundId,
        legalEntityId: mandate.legalEntityId,
        ventureId: mandate.ventureId,
        narrativeProfileId: mandate.narrativeProfileId,
        stage: mandate.stage,
        targetAmountUsd: mandate.targetAmountUsd,
        minimumCheckUsd: mandate.minimumCheckUsd,
        maximumCheckUsd: mandate.maximumCheckUsd,
        instrument: mandate.instrument,
        tokenSideLetterPolicy: mandate.tokenSideLetterPolicy,
        geographies: mandate.geographies,
        targetCloseDate: mandate.targetCloseDate,
        status: mandate.status,
        approvedUseOfFunds: mandate.approvedUseOfFunds,
      }
    : {
        ...defaults,
        instrument: 'SAFE',
        tokenSideLetterPolicy: 'No token side letter is offered by default.',
        geographies: [],
        targetCloseDate: null,
        status: 'planning',
        approvedUseOfFunds: '',
      };
}

function optionalNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
}

export function CapitalMandateEditor({
  open,
  mandate = null,
  onClose,
}: {
  open: boolean;
  mandate?: CapitalMandateSummary | null;
  onClose: () => void;
}): React.JSX.Element {
  const { data, command, notify } = useWorkspace();
  const round = data?.round ?? null;
  const firstEntity = data?.legalEntities.find((item) => item.status === 'active') ??
    data?.legalEntities[0] ??
    null;
  const firstVenture = data?.ventures.find(
    (item) => item.legalEntityId === firstEntity?.id && item.status === 'active',
  );
  const firstNarrative = data?.narrativeProfiles.find(
    (item) =>
      item.ventureId === firstVenture?.id &&
      item.purpose === 'investor' &&
      item.approvalState === 'approved',
  );
  const defaults = useMemo(
    () => ({
      roundId: round?.id ?? '',
      legalEntityId: firstEntity?.id ?? '',
      ventureId: firstVenture?.id ?? '',
      narrativeProfileId: firstNarrative?.id ?? '',
      stage: round?.stage ?? ('pre_seed' as const),
      targetAmountUsd: round?.targetAmount ?? 0,
      minimumCheckUsd: round?.targetCheck.minimum ?? null,
      maximumCheckUsd: round?.targetCheck.maximum ?? null,
    }),
    [firstEntity?.id, firstNarrative?.id, firstVenture?.id, round],
  );
  const [form, setForm] = useState<CapitalMandateSaveInput>(() =>
    initialState(mandate, defaults),
  );
  const [saving, setSaving] = useState(false);
  const [confirmEntityChange, setConfirmEntityChange] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initialState(mandate, defaults));
      setConfirmEntityChange(false);
    }
  }, [defaults, mandate, open]);

  const ventures = useMemo(
    () => data?.ventures.filter((item) => item.legalEntityId === form.legalEntityId) ?? [],
    [data?.ventures, form.legalEntityId],
  );
  const narratives = useMemo(
    () =>
      data?.narrativeProfiles.filter(
        (item) =>
          item.ventureId === form.ventureId &&
          item.purpose === 'investor' &&
          item.approvalState === 'approved',
      ) ?? [],
    [data?.narrativeProfiles, form.ventureId],
  );
  const oldEntity = data?.legalEntities.find((item) => item.id === mandate?.legalEntityId) ?? null;
  const newEntity = data?.legalEntities.find((item) => item.id === form.legalEntityId) ?? null;
  const rangeInvalid =
    form.minimumCheckUsd !== null &&
    form.maximumCheckUsd !== null &&
    form.minimumCheckUsd > form.maximumCheckUsd;
  const valid = Boolean(
    form.roundId &&
      form.legalEntityId &&
      form.ventureId &&
      form.narrativeProfileId &&
      form.instrument.trim() &&
      form.tokenSideLetterPolicy.trim() &&
      form.approvedUseOfFunds.trim() &&
      !rangeInvalid,
  );

  const updateEntity = (legalEntityId: string): void => {
    const nextVenture = data?.ventures.find(
      (item) => item.legalEntityId === legalEntityId && item.status === 'active',
    );
    const nextNarrative = data?.narrativeProfiles.find(
      (item) =>
        item.ventureId === nextVenture?.id &&
        item.purpose === 'investor' &&
        item.approvalState === 'approved',
    );
    setForm({
      ...form,
      legalEntityId,
      ventureId: nextVenture?.id ?? '',
      narrativeProfileId: nextNarrative?.id ?? '',
    });
  };

  const updateVenture = (ventureId: string): void => {
    const nextNarrative = data?.narrativeProfiles.find(
      (item) =>
        item.ventureId === ventureId &&
        item.purpose === 'investor' &&
        item.approvalState === 'approved',
    );
    setForm({ ...form, ventureId, narrativeProfileId: nextNarrative?.id ?? '' });
  };

  const save = async (): Promise<void> => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await command('capitalMandate.save', form);
      notify({
        tone: 'success',
        title: mandate ? 'Capital mandate updated' : 'Capital mandate created',
        detail: `${form.instrument} · ${formatMoney(form.targetAmountUsd)}`,
      });
      setConfirmEntityChange(false);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (!valid || saving) return;
    if (mandate?.status === 'active' && mandate.legalEntityId !== form.legalEntityId) {
      setConfirmEntityChange(true);
      return;
    }
    void save();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title={mandate ? 'Edit capital mandate' : 'Add capital mandate'}
        description="One mandate binds one round to one legal entity, venture and approved investor narrative."
        footer={
          <>
            <Button variant="quiet" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form="capital-mandate-editor" disabled={!valid || saving}>
              {saving ? 'Saving…' : 'Save capital mandate'}
            </Button>
          </>
        }
      >
        <form
          id="capital-mandate-editor"
          className="authority-form"
          onSubmit={submit}
        >
          <div className="authority-form-grid">
            <label className="field">
              <span className="field__label">Round</span>
              <input
                className="input"
                value={round ? `${round.companyName} · ${round.stage}` : 'No active round'}
                readOnly
              />
            </label>
            <label className="field">
              <span className="field__label">Stage</span>
              <input className="input" value={form.stage.replace('_', '-')} readOnly />
            </label>
            <label className="field">
              <span className="field__label">Legal entity</span>
              <select
                className="select"
                value={form.legalEntityId}
                onChange={(event) => updateEntity(event.target.value)}
              >
                <option value="">Select an entity</option>
                {data?.legalEntities.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Venture</span>
              <select
                className="select"
                value={form.ventureId}
                onChange={(event) => updateVenture(event.target.value)}
              >
                <option value="">Select a venture</option>
                {ventures.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Approved investor narrative</span>
              <select
                className="select"
                value={form.narrativeProfileId}
                onChange={(event) =>
                  setForm({ ...form, narrativeProfileId: event.target.value })
                }
              >
                <option value="">Select an approved narrative</option>
                {narratives.map((item) => (
                  <option key={item.id} value={item.id}>
                    Investor v{item.version}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Instrument</span>
              <input
                className="input"
                value={form.instrument}
                onChange={(event) => setForm({ ...form, instrument: event.target.value })}
              />
            </label>
            <label className="field">
              <span className="field__label">Target amount (USD)</span>
              <input
                className="input"
                type="number"
                min="0"
                value={form.targetAmountUsd}
                onChange={(event) =>
                  setForm({ ...form, targetAmountUsd: Math.max(0, Number(event.target.value)) })
                }
              />
            </label>
            <label className="field">
              <span className="field__label">Minimum check (USD)</span>
              <input
                className="input"
                type="number"
                min="0"
                value={form.minimumCheckUsd ?? ''}
                onChange={(event) =>
                  setForm({ ...form, minimumCheckUsd: optionalNumber(event.target.value) })
                }
              />
            </label>
            <label className="field">
              <span className="field__label">Maximum check (USD)</span>
              <input
                className="input"
                type="number"
                min="0"
                value={form.maximumCheckUsd ?? ''}
                onChange={(event) =>
                  setForm({ ...form, maximumCheckUsd: optionalNumber(event.target.value) })
                }
              />
              {rangeInvalid ? (
                <span className="field__error">Maximum check must be at least the minimum.</span>
              ) : null}
            </label>
            <label className="field">
              <span className="field__label">Status</span>
              <select
                className="select"
                value={form.status}
                onChange={(event) =>
                  setForm({
                    ...form,
                    status: event.target.value as CapitalMandateSaveInput['status'],
                  })
                }
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="closed">Closed</option>
              </select>
            </label>
            <label className="field">
              <span className="field__label">Target close date</span>
              <input
                className="input"
                type="date"
                value={form.targetCloseDate ?? ''}
                onChange={(event) =>
                  setForm({ ...form, targetCloseDate: event.target.value || null })
                }
              />
            </label>
            <label className="field">
              <span className="field__label">Geographies</span>
              <input
                className="input"
                value={form.geographies.join(', ')}
                onChange={(event) =>
                  setForm({
                    ...form,
                    geographies: event.target.value
                      .split(',')
                      .map((value) => value.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="United States, Global"
              />
            </label>
          </div>
          <label className="field">
            <span className="field__label">Token side-letter policy</span>
            <textarea
              className="textarea"
              value={form.tokenSideLetterPolicy}
              onChange={(event) =>
                setForm({ ...form, tokenSideLetterPolicy: event.target.value })
              }
            />
          </label>
          <label className="field">
            <span className="field__label">Approved use of funds</span>
            <textarea
              className="textarea"
              value={form.approvedUseOfFunds}
              onChange={(event) =>
                setForm({ ...form, approvedUseOfFunds: event.target.value })
              }
            />
          </label>
        </form>
      </Dialog>

      <Dialog
        open={confirmEntityChange}
        onClose={() => setConfirmEntityChange(false)}
        title="Confirm legal entity change"
        description="An active mandate is an external authority record."
        footer={
          <>
            <Button variant="quiet" onClick={() => setConfirmEntityChange(false)}>
              Keep current entity
            </Button>
            <Button variant="danger" onClick={() => void save()} disabled={saving}>
              Confirm entity change
            </Button>
          </>
        }
      >
        <p className="authority-warning">
          Changing the mandate from {oldEntity?.displayName ?? 'the current entity'} to{' '}
          {newEntity?.displayName ?? 'the selected entity'} changes which entity can raise, sign and
          receive funds. Confirm the venture, investor narrative, cap-table context and application
          materials before continuing.
        </p>
      </Dialog>
    </>
  );
}
