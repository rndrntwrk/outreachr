import { describe, expect, it } from 'vitest';

import { HackathonService } from '../../src/main/hackathon-service';

const BUILD_COMMIT = 'a'.repeat(40);
const OTHER_COMMIT = 'b'.repeat(40);

class SubmissionGuardService extends HackathonService {
  override async getEntry(): Promise<never> {
    return {
      build: { currentCommitSha: BUILD_COMMIT },
    } as never;
  }
}

describe('HackathonService submission guard', () => {
  it('rejects a portal record whose commit differs from the verified build', async () => {
    const service = new SubmissionGuardService({ vault: {} as never });
    await expect(
      service.saveSubmission({
        entryId: 'entry:test',
        portalUrl: 'https://example.test/submission/1',
        narrativeProfileId: 'narrative:test',
        canonicalDemoVersionId: 'demo-version:test',
        repositoryCommitSha: OTHER_COMMIT,
        receiptAssetId: 'asset:receipt',
        contentSha256: 'c'.repeat(64),
        status: 'submitted',
      }),
    ).rejects.toThrow('Submission commit must match the current verified build commit.');
  });
});
