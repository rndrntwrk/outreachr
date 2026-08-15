import { describe, expect, it } from 'vitest';

import { HackathonEligibilityEvaluationSchema } from '../src/index.js';

const evaluation = {
  id: 'eligibility:test',
  entryId: 'entry:test',
  status: 'eligible',
  evaluatedAt: '2026-08-15T12:00:00.000Z',
  rulesSnapshotSha256: 'a'.repeat(64),
  detail: [
    {
      ruleId: 'rule:existing-code',
      ruleType: 'existing_code',
      blocking: true,
      status: 'eligible',
      reason: 'Existing-code usage satisfies the reviewed rule.',
    },
  ],
  founderReviewState: 'pending',
  reviewedAt: null,
};

describe('Hackathon Studio eligibility evidence', () => {
  it('accepts the exact structured rule detail emitted by the evaluator', () => {
    expect(HackathonEligibilityEvaluationSchema.parse(evaluation).detail).toEqual(
      evaluation.detail,
    );
  });

  it('rejects opaque or incomplete eligibility detail records', () => {
    expect(
      HackathonEligibilityEvaluationSchema.safeParse({
        ...evaluation,
        detail: [{ ruleId: 'rule:existing-code', status: 'eligible' }],
      }).success,
    ).toBe(false);
  });
});
