import { Check, FileCheck2, Plus, Save, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type {
  HackathonAssetSaveInput,
  HackathonSubmissionSaveInput,
} from '../../../../shared/hackathon-contracts';
import { Badge, Button, Section, TextField, titleCase } from '../ui';
import type { HackathonEntryWorkspaceDetail } from './entry-model';

const ASSET_KINDS = [
  'readme',
  'repository',
  'architecture',
  'screenshot',
  'demo_video',
  'pitch_deck',
  'submission_text',
  'license',
  'open_source_notice',
  'receipt',
  'other',
] as const;

function assetTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'danger';
  if (status === 'ready' || status === 'draft') return 'warning';
  return 'neutral';
}

export function SubmissionPanel({
  entry,
  busy,
  onSaveAsset,
  onSaveSubmission,
}: {
  entry: HackathonEntryWorkspaceDetail;
  busy: boolean;
  onSaveAsset: (input: HackathonAssetSaveInput) => Promise<void>;
  onSaveSubmission: (input: HackathonSubmissionSaveInput) => Promise<void>;
}): React.JSX.Element {
  const [kind, setKind] = useState<HackathonAssetSaveInput['kind']>('readme');
  const [required, setRequired] = useState(true);
  const [status, setStatus] = useState<HackathonAssetSaveInput['status']>('missing');
  const [reference, setReference] = useState('');
  const [contentSha256, setContentSha256] = useState('');
  const [portalUrl, setPortalUrl] = useState(entry.submission?.portalUrl ?? '');
  const [repositoryCommitSha, setRepositoryCommitSha] = useState(
    entry.submission?.repositoryCommitSha ?? entry.build?.currentCommitSha ?? '',
  );
  const [receiptAssetId, setReceiptAssetId] = useState(entry.submission?.receiptAssetId ?? '');
  const [submissionDigest, setSubmissionDigest] = useState(entry.submission?.contentSha256 ?? '');
  const [submissionStatus, setSubmissionStatus] = useState<
    HackathonSubmissionSaveInput['status']
  >(entry.submission?.status ?? 'submitted');
  const [submittedAt, setSubmittedAt] = useState(entry.submission?.submittedAt ?? '');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setPortalUrl(entry.submission?.portalUrl ?? '');
    setRepositoryCommitSha(
      entry.submission?.repositoryCommitSha ?? entry.build?.currentCommitSha ?? '',
    );
    setReceiptAssetId(entry.submission?.receiptAssetId ?? '');
    setSubmissionDigest(entry.submission?.contentSha256 ?? '');
    setSubmissionStatus(entry.submission?.status ?? 'submitted');
    setSubmittedAt(entry.submission?.submittedAt ?? '');
  }, [entry.build?.currentCommitSha, entry.submission]);

  const receiptAssets = useMemo(
    () => entry.assets.filter((asset) => asset.kind === 'receipt' && asset.status === 'approved'),
    [entry.assets],
  );

  const saveNewAsset = async (): Promise<void> => {
    setLocalError(null);
    if (status === 'approved' && (!reference.trim() || !contentSha256.trim())) {
      setLocalError('Founder approval requires an exact reference and SHA-256 digest.');
      return;
    }
    await onSaveAsset({
      entryId: entry.id,
      kind,
      required,
      status,
      reference: reference.trim() || null,
      contentSha256: contentSha256.trim() || null,
      ...(status === 'approved' ? { reviewDecision: 'accept' as const } : {}),
    });
    setReference('');
    setContentSha256('');
    setStatus('missing');
  };

  const mutateExistingAsset = async (
    asset: HackathonEntryWorkspaceDetail['assets'][number],
    nextStatus: HackathonAssetSaveInput['status'],
    reviewDecision?: 'accept' | 'reject',
  ): Promise<void> => {
    if (nextStatus === 'approved' && (!asset.reference || !asset.contentSha256)) {
      setLocalError(`Asset ${asset.kind} requires a reference and digest before approval.`);
      return;
    }
    setLocalError(null);
    await onSaveAsset({
      id: asset.id,
      entryId: entry.id,
      kind: asset.kind,
      required: asset.required,
      status: nextStatus,
      reference: asset.reference,
      contentSha256: asset.contentSha256,
      ...(reviewDecision ? { reviewDecision } : {}),
    });
  };

  const recordSubmission = async (): Promise<void> => {
    setLocalError(null);
    if (!receiptAssetId) {
      setLocalError('Record and approve the external portal receipt before submission state.');
      return;
    }
    await onSaveSubmission({
      ...(entry.submission ? { id: entry.submission.id } : {}),
      entryId: entry.id,
      portalUrl: portalUrl.trim(),
      ...(submittedAt.trim() ? { submittedAt: submittedAt.trim() } : {}),
      narrativeProfileId: entry.narrativeProfileId,
      canonicalDemoVersionId: entry.canonicalDemoVersionId,
      repositoryCommitSha: repositoryCommitSha.trim(),
      receiptAssetId,
      contentSha256: submissionDigest.trim(),
      status: submissionStatus,
    });
  };

  return (
    <Section
      title="Submission evidence"
      description="Assets progress through explicit states. Founder approval binds the stored reference and digest. The external portal submission remains manual; this surface records its exact evidence and receipt."
      action={
        <Badge tone={entry.submission ? 'success' : 'neutral'}>
          {entry.submission ? titleCase(entry.submission.status) : 'No receipt'}
        </Badge>
      }
      className="hackathon-entry-section"
    >
      <div className="hackathon-asset-list">
        {entry.assets.map((asset) => (
          <article className="hackathon-asset" key={asset.id}>
            <div>
              <FileCheck2 aria-hidden="true" />
              <span>
                <strong>{titleCase(asset.kind)}</strong>
                <small>{asset.required ? 'Required' : 'Optional'} · {titleCase(asset.founderReviewState)}</small>
              </span>
            </div>
            <Badge tone={assetTone(asset.status)}>{titleCase(asset.status)}</Badge>
            <code>{asset.reference ?? 'No reference'}</code>
            <code>{asset.contentSha256 ?? 'No content digest'}</code>
            <div className="hackathon-entry-inline-actions">
              <Button
                size="small"
                tone="quiet"
                disabled={busy || asset.status === 'ready' || asset.status === 'approved'}
                onClick={() => void mutateExistingAsset(asset, 'ready')}
              >
                Mark ready
              </Button>
              <Button
                size="small"
                disabled={busy || asset.status === 'approved' || !asset.reference || !asset.contentSha256}
                icon={<Check aria-hidden="true" />}
                onClick={() => void mutateExistingAsset(asset, 'approved', 'accept')}
              >
                Approve exact asset
              </Button>
              <Button
                size="small"
                tone="danger"
                disabled={busy || asset.status === 'rejected'}
                icon={<X aria-hidden="true" />}
                onClick={() => void mutateExistingAsset(asset, 'rejected', 'reject')}
              >
                Reject asset
              </Button>
            </div>
          </article>
        ))}
      </div>

      <div className="hackathon-entry-split">
        <form
          className="hackathon-entry-form"
          onSubmit={(event) => {
            event.preventDefault();
            void saveNewAsset();
          }}
        >
          <h3>Add submission asset</h3>
          <div className="hackathon-entry-form-grid">
            <label className="field">
              <span className="field__label">Asset kind</span>
              <select className="select" value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}>
                {ASSET_KINDS.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Asset state</span>
              <select className="select" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
                {['missing', 'draft', 'ready', 'approved'].map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}
              </select>
            </label>
            <TextField label="Reference" value={reference} onChange={(event) => setReference(event.target.value)} />
            <TextField label="Content SHA-256" value={contentSha256} onChange={(event) => setContentSha256(event.target.value)} className="mono" />
          </div>
          <label className="check-row">
            <input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} />
            <span><strong>Required for readiness</strong><small>Every required asset must be founder-approved.</small></span>
          </label>
          <Button type="submit" icon={<Plus aria-hidden="true" />} loading={busy}>Save asset</Button>
        </form>

        <form
          className="hackathon-entry-form"
          onSubmit={(event) => {
            event.preventDefault();
            void recordSubmission();
          }}
        >
          <h3>Record manual portal submission</h3>
          <TextField label="Portal URL" value={portalUrl} onChange={(event) => setPortalUrl(event.target.value)} />
          <TextField label="Submitted repository commit" value={repositoryCommitSha} onChange={(event) => setRepositoryCommitSha(event.target.value)} className="mono" />
          <TextField label="Submission content SHA-256" value={submissionDigest} onChange={(event) => setSubmissionDigest(event.target.value)} className="mono" />
          <TextField label="Submitted at" value={submittedAt} onChange={(event) => setSubmittedAt(event.target.value)} placeholder="ISO 8601 or blank for current time" />
          <label className="field">
            <span className="field__label">Approved receipt asset</span>
            <select className="select" value={receiptAssetId} onChange={(event) => setReceiptAssetId(event.target.value)}>
              <option value="">Select approved receipt</option>
              {receiptAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.reference ?? asset.id}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Submission status</span>
            <select className="select" value={submissionStatus} onChange={(event) => setSubmissionStatus(event.target.value as typeof submissionStatus)}>
              {['submitted', 'accepted', 'rejected', 'withdrawn'].map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}
            </select>
          </label>
          <dl className="hackathon-entry-facts">
            <div><dt>Narrative</dt><dd>{entry.narrativeProfileId}</dd></div>
            <div><dt>Demo</dt><dd>{entry.canonicalDemoVersionId}</dd></div>
          </dl>
          <Button type="submit" tone="primary" icon={<Save aria-hidden="true" />} loading={busy}>
            Record manual submission
          </Button>
        </form>
      </div>
      {localError ? <p className="field__error">{localError}</p> : null}
    </Section>
  );
}
