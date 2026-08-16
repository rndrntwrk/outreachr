import { Copy, Save, TerminalSquare } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { HackathonBuildSaveInput } from '../../../../shared/hackathon-contracts';
import { Badge, Button, Section, TextField, titleCase } from '../ui';
import type { HackathonEntryWorkspaceDetail } from './entry-model';

function valueOrEmpty(value: string | null | undefined): string {
  return value ?? '';
}

function numberOrNull(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function worktreeSlug(entryId: string): string {
  return entryId
    .replace(/^entry:/u, '')
    .replace(/[^a-zA-Z0-9._-]+/gu, '-')
    .replace(/^-+|-+$/gu, '') || 'entry';
}

export function BuildPlanPanel({
  entry,
  busy,
  onSave,
}: {
  entry: HackathonEntryWorkspaceDetail;
  busy: boolean;
  onSave: (input: HackathonBuildSaveInput) => Promise<void>;
}): React.JSX.Element {
  const build = entry.build;
  const [status, setStatus] = useState<HackathonBuildSaveInput['status']>(
    build?.status ?? 'draft',
  );
  const [repository, setRepository] = useState(build?.repository ?? '');
  const [baseCommitSha, setBaseCommitSha] = useState(build?.baseCommitSha ?? '');
  const [branchName, setBranchName] = useState(build?.branchName ?? '');
  const [worktreeReference, setWorktreeReference] = useState(
    valueOrEmpty(build?.worktreeReference),
  );
  const [adapterPath, setAdapterPath] = useState(valueOrEmpty(build?.adapterPath));
  const [ownerAgent, setOwnerAgent] = useState(valueOrEmpty(build?.ownerAgent));
  const [toolPolicy, setToolPolicy] = useState(
    JSON.stringify(build?.toolPolicy ?? { allow: ['read', 'test'], deny: ['send', 'publish', 'merge'] }, null, 2),
  );
  const [budgetUsd, setBudgetUsd] = useState(build?.budgetUsd?.toString() ?? '');
  const [budgetHours, setBudgetHours] = useState(build?.budgetHours?.toString() ?? '');
  const [startConditions, setStartConditions] = useState(build?.startConditions ?? '');
  const [stopConditions, setStopConditions] = useState(build?.stopConditions ?? '');
  const [currentCommitSha, setCurrentCommitSha] = useState(
    valueOrEmpty(build?.currentCommitSha),
  );
  const [ciState, setCiState] = useState<HackathonBuildSaveInput['ciState']>(
    build?.ciState ?? 'not_run',
  );
  const [securityReviewState, setSecurityReviewState] = useState<
    HackathonBuildSaveInput['securityReviewState']
  >(build?.securityReviewState ?? 'pending');
  const [evidenceManifestSha256, setEvidenceManifestSha256] = useState(
    valueOrEmpty(build?.evidenceManifestSha256),
  );
  const [mergeDecision, setMergeDecision] = useState<HackathonBuildSaveInput['mergeDecision']>(
    build?.mergeDecision ?? 'pending',
  );
  const [startedAt, setStartedAt] = useState(valueOrEmpty(build?.startedAt));
  const [completedAt, setCompletedAt] = useState(valueOrEmpty(build?.completedAt));
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!build) return;
    setStatus(build.status);
    setRepository(build.repository);
    setBaseCommitSha(build.baseCommitSha);
    setBranchName(build.branchName);
    setWorktreeReference(valueOrEmpty(build.worktreeReference));
    setAdapterPath(valueOrEmpty(build.adapterPath));
    setOwnerAgent(valueOrEmpty(build.ownerAgent));
    setToolPolicy(JSON.stringify(build.toolPolicy, null, 2));
    setBudgetUsd(build.budgetUsd?.toString() ?? '');
    setBudgetHours(build.budgetHours?.toString() ?? '');
    setStartConditions(build.startConditions);
    setStopConditions(build.stopConditions);
    setCurrentCommitSha(valueOrEmpty(build.currentCommitSha));
    setCiState(build.ciState);
    setSecurityReviewState(build.securityReviewState);
    setEvidenceManifestSha256(valueOrEmpty(build.evidenceManifestSha256));
    setMergeDecision(build.mergeDecision);
    setStartedAt(valueOrEmpty(build.startedAt));
    setCompletedAt(valueOrEmpty(build.completedAt));
  }, [build]);

  const worktreeCommand = useMemo(() => {
    const directory = worktreeReference.trim() || `../outreachr-hack-${worktreeSlug(entry.id)}`;
    const branch = branchName.trim() || `hack/${worktreeSlug(entry.id)}`;
    const sha = baseCommitSha.trim() || '<approved-base-sha>';
    return `git worktree add ${directory} -b ${branch} ${sha}`;
  }, [baseCommitSha, branchName, entry.id, worktreeReference]);

  const save = async (): Promise<void> => {
    setLocalError(null);
    let parsedPolicy: Record<string, unknown>;
    try {
      const parsed = JSON.parse(toolPolicy) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Tool policy must be a JSON object.');
      }
      parsedPolicy = parsed as Record<string, unknown>;
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Tool policy is invalid JSON.');
      return;
    }
    const hours = numberOrNull(budgetHours);
    if (budgetHours.trim() && (hours === null || !Number.isInteger(hours) || hours < 1)) {
      setLocalError('Budget hours must be a positive integer.');
      return;
    }
    await onSave({
      ...(build ? { id: build.id } : {}),
      entryId: entry.id,
      status,
      repository: repository.trim(),
      baseCommitSha: baseCommitSha.trim(),
      branchName: branchName.trim(),
      worktreeReference: worktreeReference.trim() || null,
      adapterPath: adapterPath.trim() || null,
      ownerAgent: ownerAgent.trim() || null,
      toolPolicy: parsedPolicy,
      budgetUsd: numberOrNull(budgetUsd),
      budgetHours: hours,
      startConditions: startConditions.trim(),
      stopConditions: stopConditions.trim(),
      currentCommitSha: currentCommitSha.trim() || null,
      ciState,
      securityReviewState,
      evidenceManifestSha256: evidenceManifestSha256.trim() || null,
      mergeDecision,
      startedAt: startedAt.trim() || null,
      completedAt: completedAt.trim() || null,
    });
  };

  return (
    <Section
      title="Build envelope"
      description="The build record binds source identity, execution budget, approved tools, stop conditions, verification evidence and the founder merge decision."
      action={
        <Badge tone={build && ['approved', 'active', 'completed'].includes(build.status) ? 'success' : 'warning'}>
          {build ? titleCase(build.status) : 'No build record'}
        </Badge>
      }
      className="hackathon-entry-section"
    >
      <div className="hackathon-build-layout">
        <form
          className="hackathon-entry-form"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <div className="hackathon-entry-form-grid">
            <label className="field">
              <span className="field__label">Build state</span>
              <select className="select" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
                {['draft', 'approved', 'active', 'completed', 'cancelled'].map((value) => (
                  <option key={value} value={value}>{titleCase(value)}</option>
                ))}
              </select>
            </label>
            <TextField label="Repository" value={repository} onChange={(event) => setRepository(event.target.value)} />
            <TextField label="Base commit SHA" value={baseCommitSha} onChange={(event) => setBaseCommitSha(event.target.value)} className="mono" />
            <TextField label="Branch" value={branchName} onChange={(event) => setBranchName(event.target.value)} />
            <TextField label="Worktree reference" value={worktreeReference} onChange={(event) => setWorktreeReference(event.target.value)} />
            <TextField label="Adapter path" value={adapterPath} onChange={(event) => setAdapterPath(event.target.value)} />
            <TextField label="Owner agent" value={ownerAgent} onChange={(event) => setOwnerAgent(event.target.value)} />
            <TextField label="Budget USD" type="number" min="0" value={budgetUsd} onChange={(event) => setBudgetUsd(event.target.value)} />
            <TextField label="Budget hours" type="number" min="1" step="1" value={budgetHours} onChange={(event) => setBudgetHours(event.target.value)} />
            <label className="field">
              <span className="field__label">CI state</span>
              <select className="select" value={ciState} onChange={(event) => setCiState(event.target.value as typeof ciState)}>
                {['not_run', 'running', 'passed', 'failed', 'blocked'].map((value) => (
                  <option key={value} value={value}>{titleCase(value)}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Security review</span>
              <select className="select" value={securityReviewState} onChange={(event) => setSecurityReviewState(event.target.value as typeof securityReviewState)}>
                {['pending', 'passed', 'failed', 'not_required'].map((value) => (
                  <option key={value} value={value}>{titleCase(value)}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Merge decision</span>
              <select className="select" value={mergeDecision} onChange={(event) => setMergeDecision(event.target.value as typeof mergeDecision)}>
                {['pending', 'merge', 'do_not_merge', 'superseded'].map((value) => (
                  <option key={value} value={value}>{titleCase(value)}</option>
                ))}
              </select>
            </label>
            <TextField label="Current commit SHA" value={currentCommitSha} onChange={(event) => setCurrentCommitSha(event.target.value)} className="mono" />
            <TextField label="Evidence manifest SHA-256" value={evidenceManifestSha256} onChange={(event) => setEvidenceManifestSha256(event.target.value)} className="mono" />
            <TextField label="Started at" value={startedAt} onChange={(event) => setStartedAt(event.target.value)} placeholder="ISO 8601 or blank" />
            <TextField label="Completed at" value={completedAt} onChange={(event) => setCompletedAt(event.target.value)} placeholder="ISO 8601 or blank" />
          </div>

          <label className="field">
            <span className="field__label">Approved tool policy JSON</span>
            <textarea className="textarea mono" value={toolPolicy} onChange={(event) => setToolPolicy(event.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">Start conditions</span>
            <textarea className="textarea" value={startConditions} onChange={(event) => setStartConditions(event.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">Stop conditions</span>
            <textarea className="textarea" value={stopConditions} onChange={(event) => setStopConditions(event.target.value)} />
          </label>
          {localError ? <p className="field__error">{localError}</p> : null}
          <Button type="submit" tone="primary" loading={busy} icon={<Save aria-hidden="true" />}>
            Save build envelope
          </Button>
        </form>

        <aside className="hackathon-worktree-panel">
          <span>
            <TerminalSquare aria-hidden="true" />
            <strong>Isolated source command</strong>
          </span>
          <code aria-label="Worktree command">{worktreeCommand}</code>
          <p>
            Outreachr stores and copies this command. Git, the worktree, CI, security review and merge remain outside the desktop command surface.
          </p>
          <Button
            size="small"
            icon={<Copy aria-hidden="true" />}
            onClick={() => void window.outreachr.copyText(worktreeCommand)}
          >
            Copy worktree command
          </Button>
        </aside>
      </div>
    </Section>
  );
}
