import { describe, expect, it } from 'vitest';

import {
  HackathonBuildSchema,
  HackathonEntrySchema,
  HackathonSubmissionSchema,
} from '../src/index.js';

const NOW = '2026-08-15T10:00:00.000Z';
const SHA256 = 'a'.repeat(64);
const COMMIT_SHA = 'b'.repeat(40);

const validEntry = {
  id: 'entry:test',
  cycleId: 'cycle:test',
  legalEntityId: 'legal-entity:test',
  narrativeProfileId: 'narrative:test',
  canonicalDemoVersionId: 'demo-version:test',
  submissionConcept: 'A bounded settlement demonstration.',
  userOutcome: 'A user receives a completed and provable result.',
  ecosystemAdapter: 'Example sponsor adapter.',
  estimatedHours: 48,
  reusePercentage: 80,
  strategicFit: 9,
  acceptanceProbability: 7,
  capitalUpside: 7,
  distributionUpside: 9,
  technicalLeverage: 9,
  credibility: 8,
  urgency: 8,
  effortEfficiency: 8,
  lockInSafety: 8,
  weightedScore: 82,
  founderDecision: 'pending' as const,
  founderRationale: null,
  state: 'candidate' as const,
  createdAt: NOW,
  updatedAt: NOW,
};

const validBuild = {
  id: 'build:test',
  entryId: 'entry:test',
  status: 'draft' as const,
  repository: 'rndrntwrk/Sw4p',
  baseCommitSha: COMMIT_SHA,
  branchName: 'hackathon/example/sw4p',
  worktreeReference: null,
  adapterPath: 'adapters/example',
  ownerAgent: 'codex',
  toolPolicy: { network: 'proposal_only' },
  budgetUsd: 0,
  budgetHours: 48,
  startConditions: 'Founder approves the scoped entry.',
  stopConditions: 'Stop on policy violation or expired deadline.',
  currentCommitSha: COMMIT_SHA,
  ciState: 'not_run' as const,
  securityReviewState: 'pending' as const,
  evidenceManifestSha256: null,
  mergeDecision: 'pending' as const,
  approvedBy: null,
  approvedAt: null,
  startedAt: null,
  completedAt: null,
  createdAt: NOW,
  updatedAt: NOW,
};

describe('Hackathon Studio validation', () => {
  it('rejects reuse percentages and rating values outside their bounds', () => {
    expect(HackathonEntrySchema.safeParse(validEntry).success).toBe(true);
    expect(
      HackathonEntrySchema.safeParse({ ...validEntry, reusePercentage: 101 }).success,
    ).toBe(false);
    expect(HackathonEntrySchema.safeParse({ ...validEntry, strategicFit: 11 }).success).toBe(
      false,
    );
  });

  it('requires explicit conditions for a conditional go decision', () => {
    expect(
      HackathonEntrySchema.safeParse({
        ...validEntry,
        founderDecision: 'conditional_go',
        founderRationale: null,
      }).success,
    ).toBe(false);
    expect(
      HackathonEntrySchema.safeParse({
        ...validEntry,
        founderDecision: 'conditional_go',
        founderRationale: 'Proceed only after the official existing-code rule is accepted.',
      }).success,
    ).toBe(true);
  });

  it('rejects malformed and all-zero Git SHAs for an active build', () => {
    expect(HackathonBuildSchema.safeParse(validBuild).success).toBe(true);
    expect(
      HackathonBuildSchema.safeParse({
        ...validBuild,
        status: 'active',
        baseCommitSha: 'not-a-sha',
      }).success,
    ).toBe(false);
    expect(
      HackathonBuildSchema.safeParse({
        ...validBuild,
        status: 'active',
        baseCommitSha: '0'.repeat(40),
      }).success,
    ).toBe(false);
    expect(
      HackathonBuildSchema.safeParse({
        ...validBuild,
        status: 'active',
        currentCommitSha: '0'.repeat(40),
      }).success,
    ).toBe(false);
  });

  it('requires an exact lowercase SHA-256 digest for a recorded submission', () => {
    const submission = {
      id: 'submission:test',
      entryId: 'entry:test',
      portalUrl: 'https://example.test/submission/123',
      submittedAt: NOW,
      narrativeProfileId: 'narrative:test',
      canonicalDemoVersionId: 'demo-version:test',
      repositoryCommitSha: COMMIT_SHA,
      receiptAssetId: 'asset:receipt',
      contentSha256: SHA256,
      status: 'submitted' as const,
      createdAt: NOW,
      updatedAt: NOW,
    };
    expect(HackathonSubmissionSchema.safeParse(submission).success).toBe(true);
    expect(
      HackathonSubmissionSchema.safeParse({ ...submission, contentSha256: 'A'.repeat(64) }).success,
    ).toBe(false);
  });
});
