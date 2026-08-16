import {
  ArrowLeft,
  CheckCircle2,
  CircleSlash2,
  GitBranch,
  ShieldCheck,
  Timer,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  HackathonAssetSaveInput,
  HackathonBuildSaveInput,
  HackathonConversionSaveInput,
  HackathonDistributionItemSaveInput,
  HackathonDistributionSaveInput,
  HackathonResultSaveInput,
  HackathonSubmissionSaveInput,
} from '../../../shared/hackathon-contracts';
import { BuildPlanPanel } from '../components/hackathons/BuildPlanPanel';
import { DistributionPlanPanel } from '../components/hackathons/DistributionPlanPanel';
import { EligibilityPanel } from '../components/hackathons/EligibilityPanel';
import { ResultPanel } from '../components/hackathons/ResultPanel';
import { SubmissionPanel } from '../components/hackathons/SubmissionPanel';
import {
  isHackathonEntryWorkspaceDetail,
  type HackathonEntryWorkspaceDetail,
} from '../components/hackathons/entry-model';
import {
  Badge,
  Button,
  Dialog,
  EmptyState,
  PageHeader,
  Section,
  formatDate,
  titleCase,
} from '../components/ui';
import { useNavigate, useParams } from '../lib/router';
import { useWorkspace } from '../state/WorkspaceContext';

const NEXT_STATE: Partial<
  Record<HackathonEntryWorkspaceDetail['state'], HackathonEntryWorkspaceDetail['state']>
> = {
  candidate: 'approved',
  approved: 'scoped',
  scoped: 'building',
  building: 'verification',
  verification: 'submission_ready',
  submission_ready: 'submitted',
  submitted: 'judging',
};

function shortDigest(value: string | null | undefined): string {
  if (!value) return 'not recorded';
  return `${value.slice(0, 12)}…${value.slice(-8)}`;
}

function transitionAllowed(
  entry: HackathonEntryWorkspaceDetail,
  target: HackathonEntryWorkspaceDetail['state'] | undefined,
): boolean {
  if (!target) return false;
  if (target === 'approved') {
    return (
      entry.readiness.authorityReady &&
      entry.readiness.decisionReady &&
      entry.readiness.eligibilityReady
    );
  }
  if (target === 'scoped') {
    return entry.readiness.authorityReady && entry.readiness.decisionReady;
  }
  if (target === 'building') return entry.readiness.readyForBuild;
  if (target === 'submission_ready') return entry.readiness.readyForSubmission;
  if (target === 'submitted') return entry.readiness.receiptReady;
  return true;
}

function gateTone(ready: boolean): 'success' | 'warning' {
  return ready ? 'success' : 'warning';
}

function transitionButtonLabel(state: HackathonEntryWorkspaceDetail['state']): string {
  return titleCase(state).toLowerCase().replaceAll(' ', '-');
}

export function HackathonEntryPage(): React.JSX.Element {
  const { entryId } = useParams<{ entryId?: string }>();
  const navigate = useNavigate();
  const { data, command, notify } = useWorkspace();
  const [entry, setEntry] = useState<HackathonEntryWorkspaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transitionOpen, setTransitionOpen] = useState(false);

  const loadEntry = useCallback(async (): Promise<void> => {
    if (!entryId) {
      setError('Hackathon entry ID is missing.');
      setLoading(false);
      return;
    }
    try {
      const value = await command('hackathon.entry.get', { id: entryId });
      if (!isHackathonEntryWorkspaceDetail(value)) {
        throw new Error(
          'Hackathon entry context is incomplete. Rules, tracks and bounties are required.',
        );
      }
      setEntry(value);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Hackathon entry could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [command, entryId]);

  useEffect(() => {
    void loadEntry();
  }, [loadEntry]);

  const runMutation = useCallback(
    async (operation: () => Promise<unknown>, success: string): Promise<void> => {
      setBusy(true);
      try {
        await operation();
        await loadEntry();
        notify({ tone: 'success', title: success });
      } finally {
        setBusy(false);
      }
    },
    [loadEntry, notify],
  );

  const context = useMemo(() => {
    if (!entry || !data) return null;
    const cycle = data.hackathonCycles.find((item) => item.id === entry.cycleId) ?? null;
    const opportunity = cycle
      ? (data.opportunities.find((item) => item.id === cycle.opportunityId) ?? null)
      : null;
    const legalEntity =
      data.legalEntities.find((item) => item.id === entry.legalEntityId) ?? null;
    const narrative =
      data.narrativeProfiles.find((item) => item.id === entry.narrativeProfileId) ?? null;
    const ventureLinks = entry.ventures.map((link) => ({
      ...link,
      venture: data.ventures.find((item) => item.id === link.ventureId) ?? null,
    }));
    const demo = data.canonicalDemos.find((item) =>
      item.versions.some((version) => version.id === entry.canonicalDemoVersionId),
    );
    const demoVersion =
      demo?.versions.find((version) => version.id === entry.canonicalDemoVersionId) ?? null;
    return { cycle, opportunity, legalEntity, narrative, ventureLinks, demo, demoVersion };
  }, [data, entry]);

  if (loading) {
    return (
      <div className="page">
        <PageHeader
          title="Hackathon entry"
          description="Loading founder authority and readiness evidence."
        />
      </div>
    );
  }

  if (error || !entry || !context || !data) {
    return (
      <div className="page">
        <PageHeader
          title="Hackathon entry unavailable"
          actions={
            <Button
              icon={<ArrowLeft aria-hidden="true" />}
              onClick={() => navigate('/hackathons')}
            >
              Back to Studio
            </Button>
          }
        />
        <EmptyState
          title="Entry context could not be resolved"
          detail={error ?? 'The entry record is missing.'}
          action={<Button onClick={() => void loadEntry()}>Retry local read</Button>}
        />
      </div>
    );
  }

  const targetState = NEXT_STATE[entry.state];
  const canMove = transitionAllowed(entry, targetState);
  const leadVenture = context.ventureLinks.find((link) => link.role === 'lead');
  const supportingVentures = context.ventureLinks.filter((link) => link.role === 'supporting');
  const readinessGates = [
    ['Authority', entry.readiness.authorityReady],
    ['Founder decision', entry.readiness.decisionReady],
    ['Eligibility', entry.readiness.eligibilityReady],
    ['Build plan', entry.readiness.buildPlanReady],
    ['Technical evidence', entry.readiness.technicalEvidenceReady],
    ['Submission assets', entry.readiness.assetsReady],
    ['Distribution', entry.readiness.distributionReady],
    ['Receipt', entry.readiness.receiptReady],
  ] as const;

  return (
    <div className="page page--wide hackathon-entry-page">
      <PageHeader
        title={entry.submissionConcept}
        description={entry.userOutcome}
        meta={
          <div className="hackathon-entry-header-badges">
            <Badge tone="info">Score {entry.weightedScore.toFixed(1)}</Badge>
            <Badge tone={entry.founderDecision === 'go' ? 'success' : 'warning'}>
              {titleCase(entry.founderDecision)}
            </Badge>
            <Badge tone="neutral">{titleCase(entry.state)}</Badge>
          </div>
        }
        actions={
          <>
            <Button
              icon={<ArrowLeft aria-hidden="true" />}
              onClick={() => navigate('/hackathons')}
            >
              Back to Studio
            </Button>
            {targetState ? (
              <Button
                tone="primary"
                disabled={!canMove}
                onClick={() => setTransitionOpen(true)}
              >
                Move to {titleCase(targetState).toLowerCase()}
              </Button>
            ) : null}
          </>
        }
      />

      <section className="hackathon-entry-authority" aria-label="Frozen entry authority">
        <div>
          <span>Opportunity</span>
          <strong>{context.opportunity?.name ?? 'Unknown opportunity'}</strong>
          <small>{context.cycle?.cycleName ?? entry.cycleId}</small>
        </div>
        <div>
          <span>Legal entity</span>
          <strong>{context.legalEntity?.legalName ?? entry.legalEntityId}</strong>
          <small>{context.legalEntity?.jurisdiction ?? 'Jurisdiction not recorded'}</small>
        </div>
        <div>
          <span>Product authority</span>
          <strong>
            Lead · {leadVenture?.venture?.name ?? leadVenture?.ventureId ?? 'Missing'}
          </strong>
          <small>
            {supportingVentures.length
              ? supportingVentures
                  .map((link) => `Supporting · ${link.venture?.name ?? link.ventureId}`)
                  .join(' · ')
              : 'No supporting venture'}
          </small>
        </div>
        <div>
          <span>Narrative authority</span>
          <strong>
            {context.narrative
              ? `${titleCase(context.narrative.purpose)} narrative v${context.narrative.version}`
              : entry.narrativeProfileId}
          </strong>
          <small className="mono">{shortDigest(context.narrative?.contentSha256)}</small>
        </div>
        <div>
          <span>Canonical demo</span>
          <strong>
            {context.demo && context.demoVersion
              ? `${context.demo.name} v${context.demoVersion.version}`
              : entry.canonicalDemoVersionId}
          </strong>
          <small className="mono">
            {context.demoVersion?.baselineCommitSha ?? 'No baseline SHA'}
          </small>
        </div>
        <div>
          <span>Next deadline</span>
          <strong>{formatDate(entry.nextDeadlineAt, true)}</strong>
          <small>
            {entry.estimatedHours}h planned · {entry.reusePercentage}% reuse
          </small>
        </div>
      </section>

      <Section
        title="Readiness state machine"
        description="Every gate is server-derived from current authority, rules, build evidence, assets, distribution and receipt state. The UI submits only the requested next state."
        className="hackathon-entry-section"
      >
        <div className="hackathon-readiness-grid">
          {readinessGates.map(([label, ready]) => (
            <div key={label}>
              {ready ? (
                <CheckCircle2 aria-hidden="true" />
              ) : (
                <CircleSlash2 aria-hidden="true" />
              )}
              <span>{label}</span>
              <Badge tone={gateTone(ready)}>{ready ? 'Ready' : 'Blocked'}</Badge>
            </div>
          ))}
        </div>
        {entry.readiness.blockingReasons.length ? (
          <div className="hackathon-blocker-list" role="status">
            {entry.readiness.blockingReasons.map((reason) => (
              <p key={reason}>{reason}</p>
            ))}
          </div>
        ) : (
          <p className="hackathon-entry-complete">All current readiness gates are complete.</p>
        )}
      </Section>

      <Section
        title="Competition scope"
        description="Tracks, bounties and ecosystem adapter are frozen inputs to this entry. A separate candidate entry is required for a materially different product or adapter."
        className="hackathon-entry-section"
      >
        <div className="hackathon-entry-scope-grid">
          <div>
            <GitBranch aria-hidden="true" />
            <span>
              <strong>Ecosystem adapter</strong>
              <small>{entry.ecosystemAdapter}</small>
            </span>
          </div>
          {entry.tracks.map((track) => (
            <div key={track.id}>
              <ShieldCheck aria-hidden="true" />
              <span>
                <strong>{track.name}</strong>
                <small>{track.goals ?? 'No track goal recorded'}</small>
              </span>
            </div>
          ))}
          {entry.bounties.map((bounty) => (
            <div key={bounty.id}>
              <Timer aria-hidden="true" />
              <span>
                <strong>{bounty.title}</strong>
                <small>{bounty.requiredTechnology ?? 'No required technology recorded'}</small>
                {bounty.amountValue !== null ? (
                  <small>
                    {bounty.amountValue} {bounty.amountAsset ?? ''}
                  </small>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <EligibilityPanel
        entry={entry}
        busy={busy}
        onReviewRule={(id, decision) =>
          runMutation(
            () => command('hackathon.rule.review', { id, decision }),
            `Rule ${decision === 'accept' ? 'accepted' : 'rejected'}`,
          )
        }
        onEvaluate={() =>
          runMutation(
            () => command('hackathon.entry.evaluateEligibility', { id: entry.id }),
            'Eligibility recalculated',
          )
        }
        onReviewEvaluation={(id, decision) =>
          runMutation(
            () => command('hackathon.eligibility.review', { id, decision }),
            `Eligibility evaluation ${decision === 'accept' ? 'accepted' : 'rejected'}`,
          )
        }
      />

      <BuildPlanPanel
        entry={entry}
        busy={busy}
        onSave={(input: HackathonBuildSaveInput) =>
          runMutation(() => command('hackathon.build.save', input), 'Build envelope saved')
        }
      />

      <SubmissionPanel
        entry={entry}
        busy={busy}
        onSaveAsset={(input: HackathonAssetSaveInput) =>
          runMutation(() => command('hackathon.asset.save', input), 'Submission asset saved')
        }
        onSaveSubmission={(input: HackathonSubmissionSaveInput) =>
          runMutation(
            () => command('hackathon.submission.save', input),
            'Manual submission receipt recorded',
          )
        }
      />

      <DistributionPlanPanel
        entry={entry}
        busy={busy}
        onSavePlan={(input: HackathonDistributionSaveInput) =>
          runMutation(
            () => command('hackathon.distribution.save', input),
            'Distribution plan saved',
          )
        }
        onSaveItem={(input: HackathonDistributionItemSaveInput) =>
          runMutation(
            () => command('hackathon.distributionItem.save', input),
            'Distribution operation saved',
          )
        }
      />

      <ResultPanel
        entry={entry}
        workspace={data}
        busy={busy}
        onSaveResult={(input: HackathonResultSaveInput) =>
          runMutation(() => command('hackathon.result.save', input), 'Hackathon result saved')
        }
        onSaveConversion={(input: HackathonConversionSaveInput) =>
          runMutation(
            () => command('hackathon.conversion.save', input),
            'Conversion outcome saved',
          )
        }
      />

      <Dialog
        open={transitionOpen}
        title="Confirm state transition"
        description="The service recalculates current readiness. The client sends only the desired state."
        onClose={() => setTransitionOpen(false)}
        footer={
          <>
            <Button tone="quiet" onClick={() => setTransitionOpen(false)}>
              Cancel
            </Button>
            {targetState ? (
              <Button
                tone="primary"
                disabled={!canMove || busy}
                onClick={() => {
                  setTransitionOpen(false);
                  void runMutation(
                    () =>
                      command('hackathon.entry.transition', {
                        id: entry.id,
                        toState: targetState,
                      }),
                    `Entry moved to ${titleCase(targetState)}`,
                  );
                }}
              >
                Confirm {transitionButtonLabel(targetState)} state
              </Button>
            ) : null}
          </>
        }
      >
        <div className="hackathon-transition-review">
          <p>{`Server readiness: ${canMove ? 'complete' : 'blocked'}`}</p>
          <p>{`Current state: ${titleCase(entry.state)}`}</p>
          <p>{`Requested state: ${targetState ? titleCase(targetState) : 'None'}`}</p>
          <p className="mono">Current commit {entry.build?.currentCommitSha ?? 'not recorded'}</p>
          {entry.readiness.blockingReasons.map((reason) => (
            <p key={reason}>{reason}</p>
          ))}
        </div>
      </Dialog>
    </div>
  );
}
