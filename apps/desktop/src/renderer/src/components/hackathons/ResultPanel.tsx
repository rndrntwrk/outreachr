import { ArrowUpRight, Plus, Save, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';

import type {
  HackathonConversionSaveInput,
  HackathonResultSaveInput,
  StudioAppBootstrap,
} from '../../../../shared/hackathon-contracts';
import { Badge, Button, Section, TextField, titleCase } from '../ui';
import type { HackathonEntryWorkspaceDetail } from './entry-model';

function csv(value: string): string[] {
  return value
    .split(/[\n,]/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

function numberOrNull(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function ResultPanel({
  entry,
  workspace,
  busy,
  onSaveResult,
  onSaveConversion,
}: {
  entry: HackathonEntryWorkspaceDetail;
  workspace: StudioAppBootstrap;
  busy: boolean;
  onSaveResult: (input: HackathonResultSaveInput) => Promise<void>;
  onSaveConversion: (input: HackathonConversionSaveInput) => Promise<void>;
}): React.JSX.Element {
  const result = entry.result;
  const [outcome, setOutcome] = useState<HackathonResultSaveInput['outcome']>(
    result?.outcome ?? 'other',
  );
  const [placement, setPlacement] = useState(result?.placement ?? '');
  const [prizeValue, setPrizeValue] = useState(result?.prizeValue?.toString() ?? '');
  const [prizeAsset, setPrizeAsset] = useState(result?.prizeAsset ?? '');
  const [credits, setCredits] = useState(result?.credits.join('\n') ?? '');
  const [invitations, setInvitations] = useState(result?.invitations.join('\n') ?? '');
  const [recordedAt, setRecordedAt] = useState(result?.recordedAt ?? '');

  const [conversionKind, setConversionKind] = useState<
    HackathonConversionSaveInput['kind']
  >('reusable_demo');
  const [organizationId, setOrganizationId] = useState('');
  const [conversionTitle, setConversionTitle] = useState('');
  const [conversionDetail, setConversionDetail] = useState('');
  const [valueUsd, setValueUsd] = useState('');
  const [conversionStatus, setConversionStatus] = useState<
    HackathonConversionSaveInput['status']
  >('identified');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [occurredAt, setOccurredAt] = useState('');

  useEffect(() => {
    setOutcome(result?.outcome ?? 'other');
    setPlacement(result?.placement ?? '');
    setPrizeValue(result?.prizeValue?.toString() ?? '');
    setPrizeAsset(result?.prizeAsset ?? '');
    setCredits(result?.credits.join('\n') ?? '');
    setInvitations(result?.invitations.join('\n') ?? '');
    setRecordedAt(result?.recordedAt ?? '');
  }, [result]);

  const saveResult = async (): Promise<void> => {
    await onSaveResult({
      ...(result ? { id: result.id } : {}),
      entryId: entry.id,
      outcome,
      placement: placement.trim() || null,
      prizeValue: numberOrNull(prizeValue),
      prizeAsset: prizeAsset.trim() || null,
      credits: csv(credits),
      invitations: csv(invitations),
      ...(recordedAt.trim() ? { recordedAt: recordedAt.trim() } : {}),
    });
  };

  const saveConversion = async (): Promise<void> => {
    await onSaveConversion({
      entryId: entry.id,
      kind: conversionKind,
      organizationId: organizationId || null,
      title: conversionTitle.trim(),
      detail: conversionDetail.trim() || null,
      valueUsd: numberOrNull(valueUsd),
      status: conversionStatus,
      referenceUrl: referenceUrl.trim() || null,
      occurredAt: occurredAt.trim() || null,
    });
    setConversionTitle('');
    setConversionDetail('');
    setValueUsd('');
    setReferenceUrl('');
    setOccurredAt('');
  };

  return (
    <Section
      title="Result and conversion ledger"
      description="Competition outcome, prize, credits, invitations and downstream business conversions remain separate records. Winning is one result class; reusable code, grants, pilots, sponsor relationships and distribution are independent outputs."
      action={
        <Badge tone={result?.outcome === 'won' ? 'success' : result ? 'info' : 'neutral'}>
          {result ? titleCase(result.outcome) : 'No result'}
        </Badge>
      }
      className="hackathon-entry-section"
    >
      <div className="hackathon-entry-split">
        <form
          className="hackathon-entry-form"
          onSubmit={(event) => {
            event.preventDefault();
            void saveResult();
          }}
        >
          <h3>Competition result</h3>
          <label className="field">
            <span className="field__label">Outcome</span>
            <select className="select" value={outcome} onChange={(event) => setOutcome(event.target.value as typeof outcome)}>
              {['finalist', 'won', 'not_selected', 'withdrawn', 'cancelled', 'other'].map((value) => (
                <option key={value} value={value}>{titleCase(value)}</option>
              ))}
            </select>
          </label>
          <div className="hackathon-entry-form-grid">
            <TextField label="Placement" value={placement} onChange={(event) => setPlacement(event.target.value)} />
            <TextField label="Prize value" type="number" min="0" value={prizeValue} onChange={(event) => setPrizeValue(event.target.value)} />
            <TextField label="Prize asset" value={prizeAsset} onChange={(event) => setPrizeAsset(event.target.value)} />
            <TextField label="Recorded at" value={recordedAt} onChange={(event) => setRecordedAt(event.target.value)} placeholder="ISO 8601 or blank" />
          </div>
          <label className="field">
            <span className="field__label">Credits, one per line</span>
            <textarea className="textarea" value={credits} onChange={(event) => setCredits(event.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">Invitations, one per line</span>
            <textarea className="textarea" value={invitations} onChange={(event) => setInvitations(event.target.value)} />
          </label>
          <Button type="submit" tone="primary" loading={busy} icon={<Save aria-hidden="true" />}>
            Save result
          </Button>
        </form>

        <form
          className="hackathon-entry-form"
          onSubmit={(event) => {
            event.preventDefault();
            void saveConversion();
          }}
        >
          <h3>Add conversion outcome</h3>
          <div className="hackathon-entry-form-grid">
            <label className="field">
              <span className="field__label">Conversion kind</span>
              <select className="select" value={conversionKind} onChange={(event) => setConversionKind(event.target.value as typeof conversionKind)}>
                {['grant', 'accelerator', 'pilot', 'investor_meeting', 'sponsor_relationship', 'partner_integration', 'user_growth', 'media_coverage', 'reusable_demo', 'other'].map((value) => (
                  <option key={value} value={value}>{titleCase(value)}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Organization</span>
              <select className="select" value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}>
                <option value="">No organization</option>
                {workspace.organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>{organization.name}</option>
                ))}
              </select>
            </label>
            <TextField label="Conversion title" value={conversionTitle} onChange={(event) => setConversionTitle(event.target.value)} />
            <TextField label="Estimated value USD" type="number" min="0" value={valueUsd} onChange={(event) => setValueUsd(event.target.value)} />
            <label className="field">
              <span className="field__label">Conversion state</span>
              <select className="select" value={conversionStatus} onChange={(event) => setConversionStatus(event.target.value as typeof conversionStatus)}>
                {['identified', 'active', 'won', 'lost', 'completed'].map((value) => (
                  <option key={value} value={value}>{titleCase(value)}</option>
                ))}
              </select>
            </label>
            <TextField label="Occurred at" value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} placeholder="ISO 8601 or blank" />
            <TextField label="Reference URL" value={referenceUrl} onChange={(event) => setReferenceUrl(event.target.value)} />
          </div>
          <label className="field">
            <span className="field__label">Technical or commercial detail</span>
            <textarea className="textarea" value={conversionDetail} onChange={(event) => setConversionDetail(event.target.value)} />
          </label>
          <Button type="submit" icon={<Plus aria-hidden="true" />} loading={busy}>
            Add conversion
          </Button>
        </form>
      </div>

      <div className="hackathon-conversion-list">
        {entry.conversions.map((conversion) => {
          const organization = workspace.organizations.find(
            (item) => item.id === conversion.organizationId,
          );
          return (
            <article key={conversion.id}>
              <Trophy aria-hidden="true" />
              <span>
                <strong>{conversion.title}</strong>
                <small>
                  {titleCase(conversion.kind)} · {titleCase(conversion.status)}
                  {organization ? ` · ${organization.name}` : ''}
                </small>
              </span>
              {conversion.referenceUrl ? (
                <Button
                  size="small"
                  tone="quiet"
                  icon={<ArrowUpRight aria-hidden="true" />}
                  onClick={() => void window.outreachr.openExternal(conversion.referenceUrl!)}
                >
                  Open evidence
                </Button>
              ) : null}
            </article>
          );
        })}
      </div>
    </Section>
  );
}
