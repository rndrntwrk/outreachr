export type FounderDecision = 'pending' | 'go' | 'conditional_go' | 'no_go';
export type EligibilityStatus = 'eligible' | 'ineligible' | 'uncertain';
export type FounderReviewState = 'pending' | 'accepted' | 'rejected';
export type BuildStatus = 'draft' | 'approved' | 'active' | 'completed' | 'cancelled';
export type CiState = 'not_run' | 'running' | 'passed' | 'failed' | 'blocked';
export type SecurityState = 'pending' | 'passed' | 'failed' | 'not_required';
export type AssetStatus = 'missing' | 'draft' | 'ready' | 'approved' | 'rejected';
export type DistributionPlanStatus = 'draft' | 'approved' | 'active' | 'completed' | 'cancelled';
export type DistributionPhase = 'pre_event' | 'submission_day' | 'post_result';
export type HackathonEntryState =
  | 'candidate'
  | 'approved'
  | 'scoped'
  | 'building'
  | 'verification'
  | 'submission_ready'
  | 'submitted'
  | 'judging'
  | 'finalist'
  | 'won'
  | 'not_selected'
  | 'withdrawn'
  | 'converted'
  | 'archived';

export interface ReadinessEligibility {
  status: EligibilityStatus;
  rulesSnapshotSha256: string;
  founderReviewState: FounderReviewState;
}

export interface ReadinessBuild {
  status: BuildStatus;
  ciState: CiState;
  securityReviewState: SecurityState;
  evidenceManifestSha256: string | null;
  currentCommitSha: string | null;
}

export interface ReadinessAsset {
  id: string;
  status: AssetStatus;
  founderReviewState: FounderReviewState;
}

export interface ReadinessInput {
  founderDecision: FounderDecision;
  hasLeadVenture: boolean;
  narrativeApproved: boolean;
  demoApproved: boolean;
  currentRulesSha256: string | null;
  eligibility: ReadinessEligibility | null;
  pendingBlockingRules: number;
  build: ReadinessBuild | null;
  requiredAssets: ReadinessAsset[];
  distributionPlanStatus: DistributionPlanStatus | null;
  distributionItemPhases: DistributionPhase[];
  receiptRecorded: boolean;
}

export interface HackathonReadiness {
  authorityReady: boolean;
  decisionReady: boolean;
  eligibilityReady: boolean;
  buildPlanReady: boolean;
  technicalEvidenceReady: boolean;
  assetsReady: boolean;
  distributionReady: boolean;
  receiptReady: boolean;
  readyForBuild: boolean;
  readyForSubmission: boolean;
  blockingReasons: string[];
}

export interface TransitionResult {
  allowed: boolean;
  reason: string | null;
  blockingReasons: string[];
}

const NON_ZERO_GIT_SHA = /^(?!0{40}$)[a-f0-9]{40}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const REQUIRED_DISTRIBUTION_PHASES = [
  'pre_event',
  'submission_day',
  'post_result',
] as const satisfies readonly DistributionPhase[];

const TRANSITIONS: Readonly<Record<HackathonEntryState, readonly HackathonEntryState[]>> = {
  candidate: ['approved', 'withdrawn', 'archived'],
  approved: ['scoped', 'withdrawn', 'archived'],
  scoped: ['building', 'withdrawn', 'archived'],
  building: ['verification', 'withdrawn'],
  verification: ['building', 'submission_ready', 'withdrawn'],
  submission_ready: ['verification', 'submitted', 'withdrawn'],
  submitted: ['judging', 'withdrawn'],
  judging: ['finalist', 'won', 'not_selected'],
  finalist: ['won', 'not_selected', 'converted'],
  won: ['converted', 'archived'],
  not_selected: ['converted', 'archived'],
  withdrawn: ['archived'],
  converted: ['archived'],
  archived: [],
};

function uniqueReasons(reasons: string[]): string[] {
  return [...new Set(reasons)];
}

export function calculateHackathonReadiness(input: ReadinessInput): HackathonReadiness {
  if (!Number.isInteger(input.pendingBlockingRules) || input.pendingBlockingRules < 0) {
    throw new RangeError('pendingBlockingRules must be a non-negative integer');
  }
  const authorityReady = input.hasLeadVenture && input.narrativeApproved && input.demoApproved;
  const decisionReady = input.founderDecision === 'go' || input.founderDecision === 'conditional_go';
  const eligibilityReady =
    input.currentRulesSha256 !== null &&
    SHA256.test(input.currentRulesSha256) &&
    input.eligibility !== null &&
    input.eligibility.status === 'eligible' &&
    input.eligibility.founderReviewState === 'accepted' &&
    input.eligibility.rulesSnapshotSha256 === input.currentRulesSha256 &&
    input.pendingBlockingRules === 0;
  const buildPlanReady =
    input.build !== null && ['approved', 'active', 'completed'].includes(input.build.status);
  const technicalEvidenceReady =
    input.build !== null &&
    input.build.ciState === 'passed' &&
    ['passed', 'not_required'].includes(input.build.securityReviewState) &&
    input.build.evidenceManifestSha256 !== null &&
    SHA256.test(input.build.evidenceManifestSha256) &&
    input.build.currentCommitSha !== null &&
    NON_ZERO_GIT_SHA.test(input.build.currentCommitSha);
  const assetsReady =
    input.requiredAssets.length > 0 &&
    input.requiredAssets.every(
      (asset) => asset.status === 'approved' && asset.founderReviewState === 'accepted',
    );
  const phases = new Set(input.distributionItemPhases);
  const distributionReady =
    input.distributionPlanStatus !== null &&
    ['approved', 'active', 'completed'].includes(input.distributionPlanStatus) &&
    REQUIRED_DISTRIBUTION_PHASES.every((phase) => phases.has(phase));
  const receiptReady = input.receiptRecorded;
  const readyForBuild =
    authorityReady && decisionReady && eligibilityReady && buildPlanReady && distributionReady;
  const readyForSubmission =
    readyForBuild && technicalEvidenceReady && assetsReady && distributionReady;
  const blockingReasons: string[] = [];

  if (!authorityReady) {
    blockingReasons.push('A lead venture, approved hackathon narrative and approved demo are required.');
  }
  if (!decisionReady) {
    blockingReasons.push('Founder decision must be go or conditional go.');
  }
  if (!eligibilityReady) {
    blockingReasons.push('Eligibility was not accepted for the current rules digest.');
  }
  if (!buildPlanReady) {
    blockingReasons.push('An approved build plan is required.');
  }
  if (!technicalEvidenceReady) {
    blockingReasons.push(
      'CI, security review, a real current commit and an evidence manifest are required.',
    );
  }
  if (!assetsReady) {
    blockingReasons.push('All required submission assets must be founder-approved.');
  }
  if (!distributionReady) {
    blockingReasons.push(
      'Distribution requires pre-event, submission-day and post-result items.',
    );
  }
  if (!receiptReady) {
    blockingReasons.push('A durable submission receipt is required before submitted state.');
  }

  return {
    authorityReady,
    decisionReady,
    eligibilityReady,
    buildPlanReady,
    technicalEvidenceReady,
    assetsReady,
    distributionReady,
    receiptReady,
    readyForBuild,
    readyForSubmission,
    blockingReasons: uniqueReasons(blockingReasons),
  };
}

function denied(reason: string, readiness: HackathonReadiness): TransitionResult {
  return { allowed: false, reason, blockingReasons: readiness.blockingReasons };
}

export function canTransitionHackathonEntry(
  from: HackathonEntryState,
  to: HackathonEntryState,
  readiness: HackathonReadiness,
): TransitionResult {
  if (!TRANSITIONS[from].includes(to)) {
    return denied(`Transition from ${from} to ${to} is not allowed.`, readiness);
  }
  if (from === 'candidate' && to === 'approved') {
    if (!readiness.authorityReady || !readiness.decisionReady || !readiness.eligibilityReady) {
      return denied('Approval requires authority, a founder go decision and accepted eligibility.', readiness);
    }
  }
  if (from === 'approved' && to === 'scoped') {
    if (!readiness.authorityReady || !readiness.decisionReady) {
      return denied('Scoping requires approved authority and a founder go decision.', readiness);
    }
  }
  if (from === 'scoped' && to === 'building' && !readiness.readyForBuild) {
    return denied('Building requires accepted eligibility plus approved build and distribution plans.', readiness);
  }
  if (from === 'verification' && to === 'submission_ready' && !readiness.readyForSubmission) {
    return denied('Submission readiness gates are incomplete.', readiness);
  }
  if (from === 'submission_ready' && to === 'submitted' && !readiness.receiptReady) {
    return denied('A durable receipt is required before submitted state.', readiness);
  }
  return { allowed: true, reason: null, blockingReasons: [] };
}
