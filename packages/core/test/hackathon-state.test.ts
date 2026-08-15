import { describe, expect, it } from 'vitest';

import {
  calculateHackathonReadiness,
  canTransitionHackathonEntry,
  type ReadinessInput,
} from '../src/index.js';

const SHA256 = 'a'.repeat(64);

function readinessInput(overrides: Partial<ReadinessInput> = {}): ReadinessInput {
  return {
    founderDecision: 'go',
    hasLeadVenture: true,
    narrativeApproved: true,
    demoApproved: true,
    currentRulesSha256: SHA256,
    eligibility: {
      status: 'eligible',
      rulesSnapshotSha256: SHA256,
      founderReviewState: 'accepted',
    },
    pendingBlockingRules: 0,
    build: {
      status: 'active',
      ciState: 'passed',
      securityReviewState: 'passed',
      evidenceManifestSha256: SHA256,
      currentCommitSha: 'b'.repeat(40),
    },
    requiredAssets: [
      { id: 'asset:readme', status: 'approved', founderReviewState: 'accepted' },
    ],
    distributionPlanStatus: 'approved',
    distributionItemPhases: ['pre_event', 'submission_day', 'post_result'],
    receiptRecorded: true,
    ...overrides,
  };
}

describe('hackathon entry readiness and state transitions', () => {
  it('reports every readiness dimension for a complete entry', () => {
    expect(calculateHackathonReadiness(readinessInput())).toEqual({
      authorityReady: true,
      decisionReady: true,
      eligibilityReady: true,
      buildPlanReady: true,
      technicalEvidenceReady: true,
      assetsReady: true,
      distributionReady: true,
      receiptReady: true,
      readyForBuild: true,
      readyForSubmission: true,
      blockingReasons: [],
    });
  });

  it('fails readiness for a stale eligibility digest and incomplete distribution phases', () => {
    const readiness = calculateHackathonReadiness(
      readinessInput({
        eligibility: {
          status: 'eligible',
          rulesSnapshotSha256: 'c'.repeat(64),
          founderReviewState: 'accepted',
        },
        distributionItemPhases: ['pre_event', 'submission_day'],
      }),
    );
    expect(readiness.readyForSubmission).toBe(false);
    expect(readiness.blockingReasons).toEqual(
      expect.arrayContaining([
        'Eligibility was not accepted for the current rules digest.',
        'Distribution requires pre-event, submission-day and post-result items.',
      ]),
    );
  });

  it('enforces the ordered build sequence and readiness-specific gates', () => {
    const ready = calculateHackathonReadiness(readinessInput());
    const notReady = calculateHackathonReadiness(
      readinessInput({ distributionPlanStatus: 'draft' }),
    );

    expect(canTransitionHackathonEntry('candidate', 'approved', ready).allowed).toBe(true);
    expect(canTransitionHackathonEntry('candidate', 'building', ready).allowed).toBe(false);
    expect(canTransitionHackathonEntry('approved', 'scoped', ready).allowed).toBe(true);
    expect(canTransitionHackathonEntry('scoped', 'building', notReady).allowed).toBe(false);
    expect(canTransitionHackathonEntry('scoped', 'building', ready).allowed).toBe(true);
    expect(canTransitionHackathonEntry('building', 'verification', ready).allowed).toBe(true);
    expect(canTransitionHackathonEntry('verification', 'submission_ready', notReady).allowed).toBe(
      false,
    );
    expect(canTransitionHackathonEntry('verification', 'submission_ready', ready).allowed).toBe(
      true,
    );
  });

  it('requires a durable receipt before submitted and preserves terminal branches', () => {
    const withoutReceipt = calculateHackathonReadiness(
      readinessInput({ receiptRecorded: false }),
    );
    const ready = calculateHackathonReadiness(readinessInput());

    expect(
      canTransitionHackathonEntry('submission_ready', 'submitted', withoutReceipt).allowed,
    ).toBe(false);
    expect(canTransitionHackathonEntry('submission_ready', 'submitted', ready).allowed).toBe(true);
    expect(canTransitionHackathonEntry('submitted', 'judging', ready).allowed).toBe(true);
    expect(canTransitionHackathonEntry('judging', 'won', ready).allowed).toBe(true);
    expect(canTransitionHackathonEntry('won', 'converted', ready).allowed).toBe(true);
    expect(canTransitionHackathonEntry('converted', 'archived', ready).allowed).toBe(true);
    expect(canTransitionHackathonEntry('archived', 'candidate', ready).allowed).toBe(false);
  });
});
