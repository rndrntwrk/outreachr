export const HACKATHON_SCORE_POLICY = {
  strategicFit: 20,
  reuse: 15,
  distributionUpside: 15,
  technicalLeverage: 10,
  capitalUpside: 10,
  credibility: 10,
  acceptanceProbability: 8,
  urgency: 5,
  effortEfficiency: 4,
  lockInSafety: 3,
} as const;

export interface HackathonScoreInput {
  strategicFit: number;
  acceptanceProbability: number;
  capitalUpside: number;
  distributionUpside: number;
  technicalLeverage: number;
  credibility: number;
  urgency: number;
  effortEfficiency: number;
  lockInSafety: number;
  reusePercentage: number;
  estimatedHours: number;
  deadline: string | null;
  evaluatedAt: string;
}

export type HackathonDecisionRecommendation = 'go' | 'conditional_go' | 'no_go';
export type HackathonEligibilityDecisionStatus = 'eligible' | 'ineligible' | 'uncertain' | null;

export interface HackathonGoNoGoInput extends HackathonScoreInput {
  hasLegalEntity: boolean;
  hasLeadVenture: boolean;
  hasApprovedNarrative: boolean;
  hasApprovedDemo: boolean;
  eligibilityStatus: HackathonEligibilityDecisionStatus;
  pendingBlockingRules: number;
  founderConditions: string[];
}

export interface GoNoGoResult {
  recommendation: HackathonDecisionRecommendation;
  weightedScore: number;
  blockingReasons: string[];
  conditions: string[];
}

const RATING_FIELDS = [
  'strategicFit',
  'acceptanceProbability',
  'capitalUpside',
  'distributionUpside',
  'technicalLeverage',
  'credibility',
  'urgency',
  'effortEfficiency',
  'lockInSafety',
] as const satisfies readonly (keyof HackathonScoreInput)[];

function finiteNumber(value: number, field: string): number {
  if (!Number.isFinite(value)) throw new TypeError(`${field} must be a finite number`);
  return value;
}

function boundedNumber(value: number, minimum: number, maximum: number, field: string): number {
  finiteNumber(value, field);
  if (value < minimum || value > maximum) {
    throw new RangeError(`${field} must be between ${minimum} and ${maximum}`);
  }
  return value;
}

function validatedScoreInput(input: HackathonScoreInput): HackathonScoreInput {
  for (const field of RATING_FIELDS) boundedNumber(input[field], 1, 10, field);
  boundedNumber(input.reusePercentage, 0, 100, 'reusePercentage');
  boundedNumber(input.estimatedHours, 1, 1_000, 'estimatedHours');
  if (Number.isNaN(Date.parse(input.evaluatedAt))) {
    throw new TypeError('evaluatedAt must be a valid date-time');
  }
  if (input.deadline !== null && Number.isNaN(Date.parse(input.deadline))) {
    throw new TypeError('deadline must be null or a valid date-time');
  }
  return input;
}

function ratingContribution(rating: number, weight: number): number {
  return (rating / 10) * weight;
}

export function calculateHackathonScore(input: HackathonScoreInput): number {
  const value = validatedScoreInput(input);
  const score =
    ratingContribution(value.strategicFit, HACKATHON_SCORE_POLICY.strategicFit) +
    (value.reusePercentage / 100) * HACKATHON_SCORE_POLICY.reuse +
    ratingContribution(value.distributionUpside, HACKATHON_SCORE_POLICY.distributionUpside) +
    ratingContribution(value.technicalLeverage, HACKATHON_SCORE_POLICY.technicalLeverage) +
    ratingContribution(value.capitalUpside, HACKATHON_SCORE_POLICY.capitalUpside) +
    ratingContribution(value.credibility, HACKATHON_SCORE_POLICY.credibility) +
    ratingContribution(
      value.acceptanceProbability,
      HACKATHON_SCORE_POLICY.acceptanceProbability,
    ) +
    ratingContribution(value.urgency, HACKATHON_SCORE_POLICY.urgency) +
    ratingContribution(value.effortEfficiency, HACKATHON_SCORE_POLICY.effortEfficiency) +
    ratingContribution(value.lockInSafety, HACKATHON_SCORE_POLICY.lockInSafety);
  return Math.round((score + 1e-9) * 10) / 10;
}

function hoursUntilDeadline(input: HackathonScoreInput): number | null {
  if (input.deadline === null) return null;
  return (Date.parse(input.deadline) - Date.parse(input.evaluatedAt)) / 3_600_000;
}

function normalizedConditions(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function evaluateHackathonGoNoGo(input: HackathonGoNoGoInput): GoNoGoResult {
  const weightedScore = calculateHackathonScore(input);
  if (!Number.isInteger(input.pendingBlockingRules) || input.pendingBlockingRules < 0) {
    throw new RangeError('pendingBlockingRules must be a non-negative integer');
  }
  const conditions = normalizedConditions(input.founderConditions);
  const blockingReasons: string[] = [];
  const hardNoReasons: string[] = [];
  const authorityReady =
    input.hasLegalEntity &&
    input.hasLeadVenture &&
    input.hasApprovedNarrative &&
    input.hasApprovedDemo;
  const deadlineHours = hoursUntilDeadline(input);

  if (!authorityReady) {
    blockingReasons.push(
      'A legal entity, lead venture, approved hackathon narrative and approved demo are required.',
    );
  }
  if (input.eligibilityStatus !== 'eligible') {
    blockingReasons.push(
      input.eligibilityStatus === 'ineligible'
        ? 'The current eligibility evaluation is ineligible.'
        : 'Eligibility must be resolved and accepted before a go decision.',
    );
  }
  if (input.pendingBlockingRules > 0) {
    blockingReasons.push('All blocking rules must be reviewed before a go decision.');
  }
  if (weightedScore < 70) {
    blockingReasons.push('Weighted score is below the 70-point go threshold.');
  }
  if (input.reusePercentage < 60) {
    blockingReasons.push('Reuse is below the 60% go threshold.');
  }
  if (input.estimatedHours > 80) {
    blockingReasons.push('Estimated effort exceeds the 80-hour go budget.');
  }
  if (deadlineHours !== null && deadlineHours < 48) {
    blockingReasons.push('Fewer than 48 hours remain before the deadline.');
  }

  if (input.eligibilityStatus === 'ineligible') {
    hardNoReasons.push('The current eligibility evaluation is ineligible.');
  }
  if (input.reusePercentage < 40) {
    hardNoReasons.push('Reuse is below the 40% no-go floor.');
  }
  if (input.estimatedHours > 120) {
    hardNoReasons.push('Estimated effort exceeds the 120-hour no-go ceiling.');
  }
  if (deadlineHours !== null && deadlineHours <= 0) {
    hardNoReasons.push('The opportunity deadline has passed.');
  }
  if (input.lockInSafety <= 2) {
    hardNoReasons.push('Platform lock-in safety is 2 or lower.');
  }

  for (const reason of hardNoReasons) {
    if (!blockingReasons.includes(reason)) blockingReasons.push(reason);
  }

  const goReady =
    weightedScore >= 70 &&
    input.reusePercentage >= 60 &&
    input.estimatedHours <= 80 &&
    authorityReady &&
    input.eligibilityStatus === 'eligible' &&
    input.pendingBlockingRules === 0 &&
    (deadlineHours === null || deadlineHours >= 48) &&
    hardNoReasons.length === 0;
  if (goReady) {
    return { recommendation: 'go', weightedScore, blockingReasons: [], conditions: [] };
  }

  const conditionalReady =
    weightedScore >= 65 &&
    conditions.length > 0 &&
    authorityReady &&
    input.eligibilityStatus !== 'ineligible' &&
    (deadlineHours === null || deadlineHours > 0) &&
    hardNoReasons.length === 0;
  return {
    recommendation: conditionalReady ? 'conditional_go' : 'no_go',
    weightedScore,
    blockingReasons,
    conditions: conditionalReady ? conditions : [],
  };
}
