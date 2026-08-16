import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { App } from '../../src/renderer/src/App';
import { HashRouter } from '../../src/renderer/src/lib/router';
import { WorkspaceProvider } from '../../src/renderer/src/state/WorkspaceContext';
import type { HackathonEntryDetail } from '../../src/shared/hackathon-contracts';
import { hackathonStudioFixture } from './hackathon-fixture';
import { installBridge } from './fixtures';

const NOW = '2026-08-15T12:00:00.000Z';
const RULES_SHA = '4'.repeat(64);
const BASE_SHA = '2'.repeat(40);
const CURRENT_SHA = '5'.repeat(40);
const EVIDENCE_SHA = '6'.repeat(64);

function blockedEntryDetail(): HackathonEntryDetail {
  const workspace = hackathonStudioFixture();
  const summary = workspace.hackathonEntries.find((entry) => entry.id === 'entry:sw4p');
  if (!summary) throw new Error('Fixture entry missing');
  return {
    ...summary,
    founderDecision: 'go',
    founderRationale: 'Enter with the settlement component and stablecoin adapter only.',
    state: 'verification',
    ventures: [
      { entryId: summary.id, ventureId: 'venture:sw4p', role: 'lead', createdAt: NOW },
      { entryId: summary.id, ventureId: 'venture:alice', role: 'supporting', createdAt: NOW },
    ],
    trackIds: ['track:payments'],
    bountyIds: ['bounty:stablecoin'],
    rules: [
      {
        id: 'rule:existing-code',
        cycleId: summary.cycleId,
        ruleType: 'existing_code',
        value: { permitted: true, disclosureRequired: true },
        blocking: true,
        sourceId: 'source:rules',
        observedAt: NOW,
        confidence: 'verified',
        reviewState: 'pending',
        reviewedAt: null,
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'rule:demo-video',
        cycleId: summary.cycleId,
        ruleType: 'required_artifact',
        value: { kind: 'demo_video' },
        blocking: true,
        sourceId: 'source:rules',
        observedAt: NOW,
        confidence: 'verified',
        reviewState: 'accepted',
        reviewedAt: NOW,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    tracks: [
      {
        id: 'track:payments',
        cycleId: summary.cycleId,
        name: 'Stablecoin payments',
        goals: 'Demonstrate a complete application settlement outcome.',
        judgingCriteria: ['Correctness', 'Developer utility'],
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    bounties: [
      {
        id: 'bounty:stablecoin',
        cycleId: summary.cycleId,
        sponsorOrganizationId: 'organization:example',
        trackId: 'track:payments',
        title: 'Best programmable stablecoin payment',
        amountValue: 25_000,
        amountAsset: 'USDC',
        requiredTechnology: 'Example stablecoin SDK',
        eligibility: 'Follow the cycle rules.',
        judgingCriteria: 'Settlement correctness and product utility.',
        submissionRequirements: 'Repository, architecture and demo video.',
        sourceId: 'source:rules',
        freshnessState: 'current',
        conflictLockInNotes: null,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    eligibilityEvaluations: [
      {
        id: 'eligibility:sw4p',
        entryId: summary.id,
        status: 'uncertain',
        evaluatedAt: NOW,
        rulesSnapshotSha256: RULES_SHA,
        detail: [
          {
            ruleId: 'rule:existing-code',
            status: 'uncertain',
            reason: 'The existing-code interpretation is awaiting founder review.',
          },
        ],
        founderReviewState: 'pending',
        reviewedAt: null,
      },
    ],
    build: {
      id: 'build:sw4p',
      entryId: summary.id,
      status: 'approved',
      repository: 'rndrntwrk/Sw4p',
      baseCommitSha: BASE_SHA,
      branchName: 'hack/example/sw4p-settlement',
      worktreeReference: '../outreachr-hack-sw4p',
      adapterPath: 'adapters/example-stablecoin',
      ownerAgent: 'alice',
      toolPolicy: { allow: ['read', 'test'], deny: ['send', 'publish', 'merge'] },
      budgetUsd: 50,
      budgetHours: 48,
      startConditions: 'Approved scope, immutable base SHA and accepted tool policy.',
      stopConditions: 'Evidence copied, process tree stopped and worktree retained for founder review.',
      currentCommitSha: null,
      ciState: 'not_run',
      securityReviewState: 'pending',
      evidenceManifestSha256: null,
      mergeDecision: 'pending',
      approvedBy: 'founder',
      approvedAt: NOW,
      startedAt: null,
      completedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
    assets: [
      {
        id: 'asset:readme',
        entryId: summary.id,
        kind: 'readme',
        required: true,
        status: 'missing',
        reference: null,
        contentSha256: null,
        founderReviewState: 'pending',
        reviewedAt: null,
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'asset:demo',
        entryId: summary.id,
        kind: 'demo_video',
        required: true,
        status: 'draft',
        reference: '/private/demo-draft.mp4',
        contentSha256: '7'.repeat(64),
        founderReviewState: 'pending',
        reviewedAt: null,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    distributionPlan: {
      id: 'distribution:sw4p',
      entryId: summary.id,
      summary: 'Technical build trace, submission release and sponsor follow-up.',
      status: 'draft',
      contentSha256: '8'.repeat(64),
      approvedBy: null,
      approvedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
    distributionItems: [
      {
        id: 'distribution-item:pre',
        planId: 'distribution:sw4p',
        kind: 'technical_article',
        phase: 'pre_event',
        status: 'planned',
        title: 'Publish the settlement architecture trace',
        scheduledAt: null,
        completedAt: null,
        reference: null,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    submission: null,
    result: null,
    conversions: [],
    readiness: {
      authorityReady: true,
      decisionReady: true,
      eligibilityReady: false,
      buildPlanReady: true,
      technicalEvidenceReady: false,
      assetsReady: false,
      distributionReady: false,
      receiptReady: false,
      readyForBuild: false,
      readyForSubmission: false,
      blockingReasons: [
        'Eligibility was not accepted for the current rules digest.',
        'CI, security review, a real current commit and an evidence manifest are required.',
        'All required submission assets must be founder-approved.',
        'Distribution requires pre-event, submission-day and post-result items.',
        'A durable submission receipt is required before submitted state.',
      ],
    },
  };
}

function readyEntryDetail(): HackathonEntryDetail {
  const blocked = blockedEntryDetail();
  return {
    ...blocked,
    eligibilityEvaluations: [
      {
        ...blocked.eligibilityEvaluations[0]!,
        status: 'eligible',
        founderReviewState: 'accepted',
        reviewedAt: NOW,
      },
    ],
    build: {
      ...blocked.build!,
      status: 'completed',
      currentCommitSha: CURRENT_SHA,
      ciState: 'passed',
      securityReviewState: 'passed',
      evidenceManifestSha256: EVIDENCE_SHA,
      completedAt: NOW,
    },
    assets: blocked.assets.map((asset) => ({
      ...asset,
      status: 'approved',
      reference: asset.reference ?? `/private/${asset.kind}`,
      contentSha256: asset.contentSha256 ?? '9'.repeat(64),
      founderReviewState: 'accepted',
      reviewedAt: NOW,
    })),
    distributionPlan: {
      ...blocked.distributionPlan!,
      status: 'approved',
      approvedBy: 'founder',
      approvedAt: NOW,
    },
    distributionItems: [
      ...blocked.distributionItems,
      {
        id: 'distribution-item:submission',
        planId: 'distribution:sw4p',
        kind: 'launch_post',
        phase: 'submission_day',
        status: 'ready',
        title: 'Publish the verified submission trace',
        scheduledAt: null,
        completedAt: null,
        reference: null,
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'distribution-item:result',
        planId: 'distribution:sw4p',
        kind: 'sponsor_acknowledgement',
        phase: 'post_result',
        status: 'planned',
        title: 'Record sponsor and judge follow-up',
        scheduledAt: null,
        completedAt: null,
        reference: null,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    readiness: {
      authorityReady: true,
      decisionReady: true,
      eligibilityReady: true,
      buildPlanReady: true,
      technicalEvidenceReady: true,
      assetsReady: true,
      distributionReady: true,
      receiptReady: false,
      readyForBuild: true,
      readyForSubmission: true,
      blockingReasons: ['A durable submission receipt is required before submitted state.'],
    },
  };
}

function renderEntry(
  detail: HackathonEntryDetail,
  command = vi.fn(async (name: string) => {
    if (name === 'hackathon.entry.get') return detail;
    throw new Error(`Unexpected command: ${name}`);
  }),
) {
  window.location.hash = '#/hackathons/entry%3Asw4p';
  installBridge(hackathonStudioFixture(), command as never);
  render(
    <HashRouter>
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>
    </HashRouter>,
  );
  return command;
}

describe('HackathonEntryPage', () => {
  it('renders frozen authority, technical scope and every server-derived readiness blocker', async () => {
    renderEntry(blockedEntryDetail());

    expect(await screen.findByRole('heading', { name: 'SW4P settlement sprint' })).toBeVisible();
    expect(screen.getByText('Local Labs, Inc.')).toBeVisible();
    expect(screen.getByText('Lead · SW4P')).toBeVisible();
    expect(screen.getByText('Supporting · Alice')).toBeVisible();
    expect(screen.getByText('Hackathon narrative v1')).toBeVisible();
    expect(screen.getByText('SW4P Programmable Settlement v1')).toBeVisible();
    expect(screen.getByText('Stablecoin payments')).toBeVisible();
    expect(screen.getByText('Best programmable stablecoin payment')).toBeVisible();
    expect(screen.getByText('Example stablecoin SDK')).toBeVisible();

    for (const blocker of blockedEntryDetail().readiness.blockingReasons) {
      expect(screen.getByText(blocker)).toBeVisible();
    }
    expect(screen.getByRole('button', { name: 'Move to submission ready' })).toBeDisabled();
    expect(screen.getByLabelText('Worktree command')).toHaveTextContent(
      `git worktree add ../outreachr-hack-sw4p -b hack/example/sw4p-settlement ${BASE_SHA}`,
    );
  });

  it('reviews rules and recalculates eligibility without exposing a direct eligible control', async () => {
    const detail = blockedEntryDetail();
    const command = vi.fn(async (name: string, payload: Record<string, unknown>) => {
      if (name === 'hackathon.entry.get') return detail;
      if (name === 'hackathon.rule.review') {
        return { ...detail.rules[0], reviewState: 'accepted', reviewedAt: NOW };
      }
      if (name === 'hackathon.entry.evaluateEligibility') {
        return detail.eligibilityEvaluations[0];
      }
      throw new Error(`Unexpected command: ${name}`);
    });
    renderEntry(detail, command);

    const eligibility = await screen.findByRole('region', { name: 'Eligibility' });
    fireEvent.click(within(eligibility).getByRole('button', { name: 'Accept existing code' }));
    await waitFor(() =>
      expect(command).toHaveBeenCalledWith('hackathon.rule.review', {
        id: 'rule:existing-code',
        decision: 'accept',
      }),
    );
    fireEvent.click(within(eligibility).getByRole('button', { name: 'Evaluate current rules' }));
    await waitFor(() =>
      expect(command).toHaveBeenCalledWith('hackathon.entry.evaluateEligibility', {
        id: 'entry:sw4p',
      }),
    );
    expect(screen.queryByRole('button', { name: /set eligible/iu })).not.toBeInTheDocument();
  });

  it('copies but never executes the isolated worktree command', async () => {
    const detail = blockedEntryDetail();
    const command = vi.fn(async (name: string) => {
      if (name === 'hackathon.entry.get') return detail;
      throw new Error(`Unexpected command: ${name}`);
    });
    const bridge = installBridge(hackathonStudioFixture(), command as never);
    window.location.hash = '#/hackathons/entry%3Asw4p';
    render(
      <HashRouter>
        <WorkspaceProvider>
          <App />
        </WorkspaceProvider>
      </HashRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Copy worktree command' }));
    expect(bridge.copyText).toHaveBeenCalledWith(
      `git worktree add ../outreachr-hack-sw4p -b hack/example/sw4p-settlement ${BASE_SHA}`,
    );
    expect(command).not.toHaveBeenCalledWith(expect.stringMatching(/worktree|branch|merge/u), expect.anything());
  });

  it('sends only the desired state after the founder reviews a ready transition', async () => {
    const detail = readyEntryDetail();
    const command = vi.fn(async (name: string, payload: Record<string, unknown>) => {
      if (name === 'hackathon.entry.get') return detail;
      if (name === 'hackathon.entry.transition') return { ...detail, state: payload.toState };
      throw new Error(`Unexpected command: ${name}`);
    });
    renderEntry(detail, command);

    fireEvent.click(await screen.findByRole('button', { name: 'Move to submission ready' }));
    const dialog = screen.getByRole('dialog', { name: 'Confirm state transition' });
    expect(within(dialog).getByText('Server readiness: complete')).toBeVisible();
    expect(within(dialog).getByText(`Current commit ${CURRENT_SHA}`)).toBeVisible();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm submission-ready state' }));

    await waitFor(() =>
      expect(command).toHaveBeenCalledWith('hackathon.entry.transition', {
        id: 'entry:sw4p',
        toState: 'submission_ready',
      }),
    );
  });
});
