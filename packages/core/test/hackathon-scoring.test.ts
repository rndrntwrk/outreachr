import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  HACKATHON_SCORE_POLICY,
  calculateHackathonScore,
  evaluateHackathonGoNoGo,
  type HackathonGoNoGoInput,
} from '../src/index.js';

const EVALUATED_AT = '2026-08-15T12:00:00.000Z';
const DEADLINE = '2026-08-20T12:00:00.000Z';

function decisionInput(overrides: Partial<HackathonGoNoGoInput> = {}): HackathonGoNoGoInput {
  return {
    strategicFit: 9,
    acceptanceProbability: 7,
    capitalUpside: 8,
    distributionUpside: 9,
    technicalLeverage: 9,
    credibility: 8,
    urgency: 8,
    effortEfficiency: 8,
    lockInSafety: 8,
    reusePercentage: 80,
    estimatedHours: 48,
    deadline: DEADLINE,
    evaluatedAt: EVALUATED_AT,
    hasLegalEntity: true,
    hasLeadVenture: true,
    hasApprovedNarrative: true,
    hasApprovedDemo: true,
    eligibilityStatus: 'eligible',
    pendingBlockingRules: 0,
    founderConditions: [],
    ...overrides,
  };
}

describe('hackathon portfolio scoring', () => {
  it('uses the exact founder policy and returns a deterministic one-decimal score', () => {
    const resource = JSON.parse(
      readFileSync(
        new URL('../../../resources/rndrntwrk/hackathon-score-policy.json', import.meta.url),
        'utf8',
      ),
    ) as unknown;
    expect(resource).toEqual(HACKATHON_SCORE_POLICY);
    expect(Object.values(HACKATHON_SCORE_POLICY).reduce((sum, weight) => sum + weight, 0)).toBe(
      100,
    );
    expect(calculateHackathonScore(decisionInput())).toBe(83.7);
  });

  it('recommends go only when score, reuse, effort, authority, eligibility and time all pass', () => {
    expect(evaluateHackathonGoNoGo(decisionInput())).toMatchObject({
      recommendation: 'go',
      weightedScore: 83.7,
      blockingReasons: [],
      conditions: [],
    });
  });

  it('recommends no-go for low reuse even when the weighted score is otherwise competitive', () => {
    const result = evaluateHackathonGoNoGo(
      decisionInput({
        strategicFit: 8,
        reusePercentage: 35,
        distributionUpside: 8,
        technicalLeverage: 8,
        capitalUpside: 7,
        credibility: 7,
        urgency: 7,
        effortEfficiency: 7,
        lockInSafety: 7,
      }),
    );
    expect(result.weightedScore).toBe(69.3);
    expect(result.recommendation).toBe('no_go');
    expect(result.blockingReasons).toContain('Reuse is below the 40% no-go floor.');
  });

  it('recommends no-go for unsafe platform lock-in despite a score above the go threshold', () => {
    const result = evaluateHackathonGoNoGo(
      decisionInput({
        strategicFit: 8,
        reusePercentage: 75,
        distributionUpside: 8,
        technicalLeverage: 8,
        capitalUpside: 7,
        acceptanceProbability: 7,
        credibility: 8,
        urgency: 7,
        effortEfficiency: 7,
        lockInSafety: 2,
      }),
    );
    expect(result.weightedScore).toBe(74.8);
    expect(result.recommendation).toBe('no_go');
    expect(result.blockingReasons).toContain('Platform lock-in safety is 2 or lower.');
  });

  it('allows a conditional-go recommendation only with explicit founder conditions', () => {
    const conditional = decisionInput({
      strategicFit: 7,
      acceptanceProbability: 6,
      capitalUpside: 6,
      distributionUpside: 7,
      technicalLeverage: 7,
      credibility: 7,
      urgency: 6,
      effortEfficiency: 5,
      lockInSafety: 6,
      reusePercentage: 65,
      estimatedHours: 90,
      founderConditions: ['Reduce the scope below 80 hours before approval.'],
    });
    expect(calculateHackathonScore(conditional)).toBe(65.9);
    expect(evaluateHackathonGoNoGo(conditional).recommendation).toBe('conditional_go');
    expect(
      evaluateHackathonGoNoGo({ ...conditional, founderConditions: [] }).recommendation,
    ).toBe('no_go');
  });
});
