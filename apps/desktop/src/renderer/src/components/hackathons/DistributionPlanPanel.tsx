import { Megaphone, Plus, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type {
  HackathonDistributionItemSaveInput,
  HackathonDistributionSaveInput,
} from '../../../../shared/hackathon-contracts';
import { Badge, Button, Section, TextField, titleCase } from '../ui';
import type { HackathonEntryWorkspaceDetail } from './entry-model';

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const REQUIRED_PHASES = ['pre_event', 'submission_day', 'post_result'] as const;
const ITEM_KINDS = [
  'pre_build_announcement',
  'build_in_public_update',
  '555stream_session',
  'arcade_activation',
  'technical_article',
  'launch_post',
  'thread',
  'clip',
  'sponsor_acknowledgement',
  'judge_follow_up',
  'investor_update',
  'partner_follow_up',
  'post_result_announcement',
  'open_source_release',
  'other',
] as const;

function planTone(status: string | undefined): 'success' | 'warning' | 'neutral' {
  if (status && ['approved', 'active', 'completed'].includes(status)) return 'success';
  if (status === 'draft') return 'warning';
  return 'neutral';
}

function planStatusOptions(
  plan: HackathonEntryWorkspaceDetail['distributionPlan'],
): HackathonDistributionSaveInput['status'][] {
  if (!plan) return ['draft'];
  if (plan.status === 'draft') return ['draft', 'approved'];
  if (plan.status === 'approved') return ['approved', 'active', 'completed', 'cancelled'];
  if (plan.status === 'active') return ['active', 'completed', 'cancelled'];
  return [plan.status];
}

export function DistributionPlanPanel({
  entry,
  busy,
  onSavePlan,
  onSaveItem,
}: {
  entry: HackathonEntryWorkspaceDetail;
  busy: boolean;
  onSavePlan: (input: HackathonDistributionSaveInput) => Promise<void>;
  onSaveItem: (input: HackathonDistributionItemSaveInput) => Promise<void>;
}): React.JSX.Element {
  const plan = entry.distributionPlan;
  const [summary, setSummary] = useState(plan?.summary ?? '');
  const [status, setStatus] = useState<HackathonDistributionSaveInput['status']>(
    plan?.status ?? 'draft',
  );
  const [digest, setDigest] = useState(plan?.contentSha256 ?? '');
  const [kind, setKind] = useState<HackathonDistributionItemSaveInput['kind']>(
    'technical_article',
  );
  const [phase, setPhase] = useState<HackathonDistributionItemSaveInput['phase']>('pre_event');
  const [itemStatus, setItemStatus] = useState<
    HackathonDistributionItemSaveInput['status']
  >('planned');
  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [completedAt, setCompletedAt] = useState('');
  const [reference, setReference] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setSummary(plan?.summary ?? '');
    setStatus(plan?.status ?? 'draft');
    setDigest(plan?.contentSha256 ?? '');
  }, [plan]);

  const phases = useMemo(
    () =>
      new Set(
        entry.distributionItems
          .filter((item) => item.status !== 'cancelled')
          .map((item) => item.phase),
      ),
    [entry.distributionItems],
  );
  const missingPhases = REQUIRED_PHASES.filter((required) => !phases.has(required));
  const contentLocked = Boolean(plan && plan.status !== 'draft');
  const itemsLocked = Boolean(plan && plan.status !== 'draft');
  const statusOptions = planStatusOptions(plan);

  const savePlan = async (): Promise<void> => {
    setLocalError(null);
    if (!summary.trim()) {
      setLocalError('Distribution summary is required.');
      return;
    }
    if (!SHA256_PATTERN.test(digest.trim())) {
      setLocalError('Distribution plan requires an exact 64-character lowercase SHA-256.');
      return;
    }
    if (status === 'approved' && missingPhases.length) {
      setLocalError(
        `Founder approval requires ${missingPhases.map(titleCase).join(', ')} operations.`,
      );
      return;
    }
    await onSavePlan({
      ...(plan ? { id: plan.id } : {}),
      entryId: entry.id,
      summary: summary.trim(),
      status,
      contentSha256: digest.trim(),
    });
  };

  const saveItem = async (): Promise<void> => {
    setLocalError(null);
    if (!plan || itemsLocked) {
      setLocalError('Distribution operations must be completed before founder plan approval.');
      return;
    }
    if (!title.trim()) {
      setLocalError('Distribution operation title is required.');
      return;
    }
    if (itemStatus === 'published' && (!completedAt.trim() || !reference.trim())) {
      setLocalError('Published distribution operations require completion time and evidence.');
      return;
    }
    await onSaveItem({
      planId: plan.id,
      kind,
      phase,
      status: itemStatus,
      title: title.trim(),
      scheduledAt: scheduledAt.trim() || null,
      completedAt: completedAt.trim() || null,
      reference: reference.trim() || null,
    });
    setTitle('');
    setScheduledAt('');
    setCompletedAt('');
    setReference('');
  };

  return (
    <Section
      title="Distribution program"
      description="Readiness requires a founder-approved plan with pre-event, submission-day and post-result operations. Distribution is part of the entry execution graph, not an after-the-fact announcement."
      action={
        <Badge tone={planTone(plan?.status)}>{plan ? titleCase(plan.status) : 'No plan'}</Badge>
      }
      className="hackathon-entry-section"
    >
      <div className="hackathon-phase-strip" aria-label="Distribution phase coverage">
        {REQUIRED_PHASES.map((required) => (
          <div
            key={required}
            className={phases.has(required) ? 'is-complete' : 'is-missing'}
          >
            <span>{titleCase(required)}</span>
            <strong>{phases.has(required) ? 'Configured' : 'Missing'}</strong>
          </div>
        ))}
      </div>
      {missingPhases.length ? (
        <p className="hackathon-entry-blocker">
          Missing distribution phases: {missingPhases.map(titleCase).join(', ')}.
        </p>
      ) : null}

      <div className="hackathon-entry-split">
        <form
          className="hackathon-entry-form"
          onSubmit={(event) => {
            event.preventDefault();
            void savePlan();
          }}
        >
          <h3>Plan authority</h3>
          <label className="field">
            <span className="field__label">Program summary</span>
            <textarea
              className="textarea"
              value={summary}
              disabled={contentLocked || busy}
              onChange={(event) => setSummary(event.target.value)}
            />
          </label>
          <TextField
            label="Plan content SHA-256"
            value={digest}
            disabled={contentLocked || busy}
            onChange={(event) => setDigest(event.target.value)}
            className="mono"
          />
          <label className="field">
            <span className="field__label">Plan state</span>
            <select
              className="select"
              value={status}
              disabled={busy}
              onChange={(event) => setStatus(event.target.value as typeof status)}
            >
              {statusOptions.map((value) => (
                <option key={value} value={value}>
                  {titleCase(value)}
                </option>
              ))}
            </select>
          </label>
          {contentLocked ? (
            <p className="text-muted">
              Approved plan content is immutable. Only allowed lifecycle transitions remain editable.
            </p>
          ) : null}
          <Button
            type="submit"
            tone="primary"
            loading={busy}
            icon={<Save aria-hidden="true" />}
          >
            Save distribution plan
          </Button>
        </form>

        <form
          className="hackathon-entry-form"
          onSubmit={(event) => {
            event.preventDefault();
            void saveItem();
          }}
        >
          <h3>Add distribution operation</h3>
          <div className="hackathon-entry-form-grid">
            <label className="field">
              <span className="field__label">Operation kind</span>
              <select
                className="select"
                value={kind}
                disabled={itemsLocked || busy}
                onChange={(event) => setKind(event.target.value as typeof kind)}
              >
                {ITEM_KINDS.map((value) => (
                  <option key={value} value={value}>
                    {titleCase(value)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Phase</span>
              <select
                className="select"
                value={phase}
                disabled={itemsLocked || busy}
                onChange={(event) => setPhase(event.target.value as typeof phase)}
              >
                {REQUIRED_PHASES.map((value) => (
                  <option key={value} value={value}>
                    {titleCase(value)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Operation state</span>
              <select
                className="select"
                value={itemStatus}
                disabled={itemsLocked || busy}
                onChange={(event) => setItemStatus(event.target.value as typeof itemStatus)}
              >
                {['planned', 'ready', 'published', 'cancelled'].map((value) => (
                  <option key={value} value={value}>
                    {titleCase(value)}
                  </option>
                ))}
              </select>
            </label>
            <TextField
              label="Title"
              value={title}
              disabled={itemsLocked || busy}
              onChange={(event) => setTitle(event.target.value)}
            />
            <TextField
              label="Scheduled at"
              value={scheduledAt}
              disabled={itemsLocked || busy}
              onChange={(event) => setScheduledAt(event.target.value)}
              placeholder="ISO 8601 or blank"
            />
            <TextField
              label="Completed at"
              value={completedAt}
              disabled={itemsLocked || busy}
              onChange={(event) => setCompletedAt(event.target.value)}
              placeholder="ISO 8601 or blank"
            />
            <TextField
              label="Reference"
              value={reference}
              disabled={itemsLocked || busy}
              onChange={(event) => setReference(event.target.value)}
            />
          </div>
          <Button
            type="submit"
            icon={<Plus aria-hidden="true" />}
            disabled={!plan || itemsLocked}
            loading={busy}
          >
            Add distribution operation
          </Button>
        </form>
      </div>

      {localError ? <p className="field__error">{localError}</p> : null}

      <div className="hackathon-distribution-list">
        {entry.distributionItems.map((item) => (
          <article key={item.id}>
            <Megaphone aria-hidden="true" />
            <span>
              <strong>{item.title}</strong>
              <small>
                {titleCase(item.kind)} · {titleCase(item.phase)} · {titleCase(item.status)}
              </small>
            </span>
            <code>{item.reference ?? 'No published reference'}</code>
          </article>
        ))}
      </div>
    </Section>
  );
}
