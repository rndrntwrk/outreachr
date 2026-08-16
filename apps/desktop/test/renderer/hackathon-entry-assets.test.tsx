import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { App } from '../../src/renderer/src/App';
import type { HackathonEntryWorkspaceDetail } from '../../src/renderer/src/components/hackathons/entry-model';
import { HashRouter } from '../../src/renderer/src/lib/router';
import { WorkspaceProvider } from '../../src/renderer/src/state/WorkspaceContext';
import { hackathonStudioFixture } from './hackathon-fixture';
import { installBridge } from './fixtures';

const NOW = '2026-08-15T12:00:00.000Z';
const BASE_SHA = '2'.repeat(40);

function entryWithMissingRequiredAsset(): HackathonEntryWorkspaceDetail {
  const workspace = hackathonStudioFixture();
  const summary = workspace.hackathonEntries.find((entry) => entry.id === 'entry:sw4p');
  if (!summary) throw new Error('Fixture entry missing');
  return {
    ...summary,
    founderDecision: 'go',
    founderRationale: 'Use the SW4P settlement component only.',
    state: 'verification',
    ventures: [
      {
        entryId: summary.id,
        ventureId: 'venture:sw4p',
        role: 'lead',
        createdAt: NOW,
      },
    ],
    trackIds: [],
    bountyIds: [],
    rules: [],
    tracks: [],
    bounties: [],
    eligibilityEvaluations: [],
    build: {
      id: 'build:sw4p',
      entryId: summary.id,
      status: 'approved',
      repository: 'rndrntwrk/Sw4p',
      baseCommitSha: BASE_SHA,
      branchName: 'hack/example/sw4p-settlement',
      worktreeReference: '../outreachr-hack-sw4p',
      adapterPath: null,
      ownerAgent: 'alice',
      toolPolicy: { allow: ['read', 'test'], deny: ['send', 'publish', 'merge'] },
      budgetUsd: 50,
      budgetHours: 48,
      startConditions: 'Approved scope and immutable base SHA.',
      stopConditions: 'Evidence copied and processes terminated.',
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
    ],
    distributionPlan: null,
    distributionItems: [],
    submission: null,
    result: null,
    conversions: [],
    readiness: {
      authorityReady: true,
      decisionReady: true,
      eligibilityReady: true,
      buildPlanReady: true,
      technicalEvidenceReady: false,
      assetsReady: false,
      distributionReady: false,
      receiptReady: false,
      readyForBuild: true,
      readyForSubmission: false,
      blockingReasons: ['All required submission assets must be founder-approved.'],
    },
  };
}

function renderEntry(command: ReturnType<typeof vi.fn>): void {
  window.location.hash = '#/hackathons/entry%3Asw4p';
  installBridge(hackathonStudioFixture(), command as never);
  render(
    <HashRouter>
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>
    </HashRouter>,
  );
}

describe('Hackathon entry asset evidence', () => {
  it('updates an existing required placeholder with exact evidence before founder approval', async () => {
    const detail = entryWithMissingRequiredAsset();
    const command = vi.fn(async (name: string, payload: Record<string, unknown>) => {
      if (name === 'hackathon.entry.get') return detail;
      if (name === 'hackathon.asset.save') return { ...detail.assets[0], ...payload };
      throw new Error(`Unexpected command: ${name}`);
    });
    renderEntry(command);

    fireEvent.change(await screen.findByLabelText('Readme reference'), {
      target: { value: '/private/submissions/readme.md' },
    });
    fireEvent.change(screen.getByLabelText('Readme SHA-256'), {
      target: { value: 'a'.repeat(64) },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Approve exact asset' }));

    await waitFor(() =>
      expect(command).toHaveBeenCalledWith('hackathon.asset.save', {
        id: 'asset:readme',
        entryId: 'entry:sw4p',
        kind: 'readme',
        required: true,
        status: 'approved',
        reference: '/private/submissions/readme.md',
        contentSha256: 'a'.repeat(64),
        reviewDecision: 'accept',
      }),
    );
  });
});
