import { afterEach, describe, expect, it } from 'vitest';

import { HackathonService } from '../../src/main/hackathon-service';
import { OpportunityService } from '../../src/main/opportunity-service';
import type { VaultService } from '../../src/main/vault-service';
import {
  FIXED_NOW,
  RESOURCE_ROOT,
  initializedVault,
  onboard,
  removeTemporaryDirectory,
  temporaryDirectory,
} from '../helpers/vault';
import {
  HACKATHON_COMMIT_SHA,
  createHackathonEntry,
  prepareHackathonAuthority,
} from '../helpers/hackathon';

const SHA256 = 'a'.repeat(64);

describe('HackathonService record identity', () => {
  let directory: string | null = null;
  let vault: VaultService | null = null;

  afterEach(async () => {
    vault?.vault.close();
    if (directory) await removeTemporaryDirectory(directory);
    directory = null;
    vault = null;
  });

  it('reuses one build and distribution identity while preserving lifecycle transitions', async () => {
    directory = await temporaryDirectory('hackathon-identity');
    vault = await initializedVault(directory, () => FIXED_NOW);
    await onboard(vault);
    await prepareHackathonAuthority(vault, RESOURCE_ROOT, FIXED_NOW);
    const opportunities = new OpportunityService({ vault, now: () => FIXED_NOW });
    const hackathons = new HackathonService({ vault, now: () => FIXED_NOW });
    const entryId = await createHackathonEntry(opportunities, hackathons);

    const draftBuild = await hackathons.saveBuild({
      entryId,
      status: 'draft',
      repository: 'rndrntwrk/outreachr',
      baseCommitSha: HACKATHON_COMMIT_SHA,
      branchName: 'hackathon/example/identity',
      worktreeReference: null,
      adapterPath: null,
      ownerAgent: null,
      toolPolicy: {},
      budgetUsd: 0,
      budgetHours: 24,
      startConditions: 'Founder approves the build.',
      stopConditions: 'Stop on a failed authority gate.',
      currentCommitSha: null,
      ciState: 'not_run',
      securityReviewState: 'pending',
      evidenceManifestSha256: null,
      mergeDecision: 'pending',
      startedAt: null,
      completedAt: null,
    });
    const approvedBuild = await hackathons.saveBuild({
      entryId,
      status: 'approved',
      repository: 'rndrntwrk/outreachr',
      baseCommitSha: HACKATHON_COMMIT_SHA,
      branchName: 'hackathon/example/identity',
      worktreeReference: null,
      adapterPath: null,
      ownerAgent: null,
      toolPolicy: {},
      budgetUsd: 0,
      budgetHours: 24,
      startConditions: 'Founder approves the build.',
      stopConditions: 'Stop on a failed authority gate.',
      currentCommitSha: null,
      ciState: 'not_run',
      securityReviewState: 'pending',
      evidenceManifestSha256: null,
      mergeDecision: 'pending',
      startedAt: null,
      completedAt: null,
    });
    expect(approvedBuild.id).toBe(draftBuild.id);
    expect(approvedBuild.status).toBe('approved');

    await expect(
      hackathons.saveDistribution({
        entryId,
        summary: 'Pre-event, submission-day and post-result distribution.',
        status: 'active',
        contentSha256: SHA256,
      }),
    ).rejects.toThrow(
      'A new distribution plan must start as a draft so its required items can be added.',
    );

    const draftDistribution = await hackathons.saveDistribution({
      entryId,
      summary: 'Pre-event, submission-day and post-result distribution.',
      status: 'draft',
      contentSha256: SHA256,
    });
    for (const [phase, title] of [
      ['pre_event', 'Build-in-public announcement'],
      ['submission_day', 'Submission launch post'],
      ['post_result', 'Result and conversion follow-up'],
    ] as const) {
      await hackathons.saveDistributionItem({
        planId: draftDistribution.id,
        kind: phase === 'submission_day' ? 'launch_post' : 'build_in_public_update',
        phase,
        status: 'planned',
        title,
        scheduledAt: null,
        completedAt: null,
        reference: null,
      });
    }
    const activeDistribution = await hackathons.saveDistribution({
      entryId,
      summary: 'Pre-event, submission-day and post-result distribution.',
      status: 'active',
      contentSha256: SHA256,
    });
    expect(activeDistribution.id).toBe(draftDistribution.id);
    expect(activeDistribution.status).toBe('active');
    expect(
      Number(
        vault.vault.scalar(
          'SELECT COUNT(*) FROM hackathon_distribution_plans WHERE entry_id=?',
          [entryId],
        ),
      ),
    ).toBe(1);
  });
});
