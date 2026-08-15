import { describe, expect, it } from 'vitest';

import { HackathonExecutionCommandService } from '../../src/main/hackathon-execution-command-service';
import type { HackathonStudioService } from '../../src/main/hackathon-studio-service';

describe('HackathonExecutionCommandService', () => {
  it('records a manual submission but rejects any request to submit externally', async () => {
    const calls: unknown[] = [];
    const service = {
      recordSubmission(input: unknown) {
        calls.push(input);
        return Promise.resolve(input);
      },
    } as unknown as HackathonStudioService;
    const commands = new HackathonExecutionCommandService(service);

    await expect(
      commands.execute('hackathon.submission.record', {
        entryId: 'entry:test',
        portalUrl: 'https://example.test/submission/1',
        submittedAt: '2026-08-15T12:00:00.000Z',
        narrativeProfileId: 'narrative:test',
        canonicalDemoVersionId: 'demo-version:test',
        repositoryCommitSha: 'b'.repeat(40),
        receiptAssetId: 'asset:receipt',
        contentSha256: 'a'.repeat(64),
        status: 'submitted',
        submitNow: true,
      } as never),
    ).rejects.toThrow();
    expect(calls).toEqual([]);
  });

  it('accepts local evidence fields without merge or publishing authority', async () => {
    const calls: unknown[] = [];
    const service = {
      saveBuild(input: unknown) {
        calls.push(input);
        return Promise.resolve(input);
      },
    } as unknown as HackathonStudioService;
    const commands = new HackathonExecutionCommandService(service);

    await commands.execute('hackathon.build.save', {
      entryId: 'entry:test',
      status: 'draft',
      repository: 'rndrntwrk/outreachr',
      baseCommitSha: 'b'.repeat(40),
      branchName: 'hackathon/example/test',
      worktreeReference: null,
      adapterPath: null,
      ownerAgent: null,
      toolPolicy: { network: 'proposal_only' },
      budgetUsd: 0,
      budgetHours: 48,
      startConditions: 'Founder approves the scoped build.',
      stopConditions: 'Stop on expired rules or a policy violation.',
      currentCommitSha: null,
      ciState: 'not_run',
      securityReviewState: 'pending',
      evidenceManifestSha256: null,
      mergeDecision: 'pending',
      approved: false,
      startedAt: null,
      completedAt: null,
    });
    expect(calls).toHaveLength(1);
  });
});
