import type {
  FounderAppBootstrap,
  FounderCommandMap,
  FounderCommandName,
  FounderCommandResult,
} from './venture-contracts';

export type OrganizationKind =
  | 'company'
  | 'foundation'
  | 'protocol'
  | 'community'
  | 'university'
  | 'government'
  | 'investor'
  | 'other';
export type OpportunityType =
  | 'investor'
  | 'accelerator'
  | 'grant'
  | 'hackathon'
  | 'startup_program'
  | 'cloud_credits'
  | 'strategic_partner'
  | 'sponsor'
  | 'design_partner';
export type OpportunityStatus =
  | 'open'
  | 'upcoming'
  | 'rolling'
  | 'closed_recurring'
  | 'watchlist'
  | 'cancelled';
export type OpportunityFormat = 'online' | 'in_person' | 'hybrid' | 'unknown';
export type OpportunityFreshness = 'current' | 'aging' | 'stale' | 'unknown';
export type OpportunityReviewState = 'unreviewed' | 'reviewed' | 'conflicted' | 'rejected';
export type EvidenceReviewState = 'pending' | 'accepted' | 'rejected';
export type EvidenceConfidence = 'verified' | 'supported' | 'inferred' | 'unknown' | 'stale';

export type HackathonCycleState =
  | 'announced'
  | 'registration'
  | 'building'
  | 'submission'
  | 'judging'
  | 'completed'
  | 'cancelled'
  | 'watchlist';
export type HackathonEntryState =
  | 'candidate'
  | 'approved'
  | 'scoped'
  | 'building'
  | 'verification'
  | 'submission_ready'
  | 'submitted'
  | 'judging'
  | 'completed'
  | 'withdrawn'
  | 'rejected';
export type HackathonFounderDecision = 'pending' | 'go' | 'conditional_go' | 'no_go';
export type HackathonEligibilityStatus = 'eligible' | 'ineligible' | 'uncertain';
export type HackathonRuleType =
  | 'geography'
  | 'age'
  | 'student_status'
  | 'company_age'
  | 'existing_code'
  | 'team_size'
  | 'open_source'
  | 'required_technology'
  | 'attendance'
  | 'funding_limit'
  | 'submission_language'
  | 'prior_participation'
  | 'required_artifact'
  | 'other';
export type HackathonBuildStatus = 'draft' | 'approved' | 'active' | 'completed' | 'cancelled';
export type HackathonAssetStatus = 'missing' | 'draft' | 'ready' | 'approved';
export type DistributionPlanStatus = 'draft' | 'approved' | 'active' | 'completed' | 'cancelled';
export type DistributionPhase = 'pre_event' | 'build_period' | 'submission_day' | 'judging' | 'post_result';

export interface OrganizationSummary {
  id: string;
  name: string;
  normalizedName: string;
  kind: OrganizationKind;
  website: string | null;
  description: string | null;
  linkedFirmId: string | null;
  isPublic: boolean;
  contributionEligible: boolean;
  origin: 'local' | 'atlas' | 'import' | 'contribution';
}

export interface OpportunitySummary {
  id: string;
  organizerOrganizationId: string | null;
  organizerName: string | null;
  name: string;
  opportunityType: OpportunityType;
  status: OpportunityStatus;
  publicUrl: string | null;
  applicationUrl: string | null;
  openDate: string | null;
  deadline: string | null;
  startDate: string | null;
  endDate: string | null;
  format: OpportunityFormat | null;
  location: string | null;
  eligibilitySummary: string | null;
  termsSummary: string | null;
  capitalPrizeSummary: string | null;
  freshnessState: OpportunityFreshness;
  reviewState: OpportunityReviewState;
}

export interface OpportunityEvidenceSummary {
  opportunityId: string;
  sourceId: string;
  sourceRole: string;
  observedAt: string;
  confidence: EvidenceConfidence;
  reviewState: EvidenceReviewState;
  reviewedAt: string | null;
}

export interface HackathonTrackSummary {
  id: string;
  cycleId: string;
  name: string;
  goals: string | null;
  judgingCriteria: unknown[];
}

export interface HackathonSponsorSummary {
  cycleId: string;
  organizationId: string;
  organizationName: string;
  contactPersonId: string | null;
  relationshipState:
    | 'unresearched'
    | 'identified'
    | 'contacted'
    | 'meeting'
    | 'partner'
    | 'closed';
}

export interface HackathonBountySummary {
  id: string;
  cycleId: string;
  sponsorOrganizationId: string | null;
  sponsorName: string | null;
  trackId: string | null;
  trackName: string | null;
  title: string;
  amountValue: number | null;
  amountAsset: string | null;
  requiredTechnology: string | null;
  eligibility: string | null;
  judgingCriteria: string | null;
  submissionRequirements: string | null;
  sourceId: string | null;
  freshnessState: OpportunityFreshness;
  conflictLockInNotes: string | null;
}

export interface HackathonRuleSummary {
  id: string;
  cycleId: string;
  ruleType: HackathonRuleType;
  value: unknown;
  blocking: boolean;
  sourceId: string | null;
  observedAt: string | null;
  confidence: EvidenceConfidence;
  reviewState: EvidenceReviewState;
  reviewedAt: string | null;
}

export interface HackathonCycleSummary {
  id: string;
  opportunityId: string;
  opportunityName: string;
  organizerName: string | null;
  cycleName: string;
  registrationOpenAt: string | null;
  registrationCloseAt: string | null;
  buildStartAt: string | null;
  buildEndAt: string | null;
  submissionDeadlineAt: string | null;
  judgingStartAt: string | null;
  judgingEndAt: string | null;
  demoDayAt: string | null;
  resultAt: string | null;
  format: OpportunityFormat;
  location: string | null;
  state: HackathonCycleState;
  rulesSourceId: string | null;
  rulesRetrievedAt: string | null;
  rulesSha256: string | null;
  entryCount: number;
  trackCount: number;
  bountyCount: number;
}

export interface EligibilityRuleDetailSummary {
  ruleId: string;
  ruleType: HackathonRuleType;
  blocking: boolean;
  status: HackathonEligibilityStatus;
  reason: string;
}

export interface HackathonEligibilitySummary {
  id: string;
  entryId: string;
  status: HackathonEligibilityStatus;
  evaluatedAt: string;
  rulesSnapshotSha256: string;
  detail: EligibilityRuleDetailSummary[];
  founderReviewState: EvidenceReviewState;
  reviewedAt: string | null;
}

export interface HackathonBuildSummary {
  id: string;
  entryId: string;
  status: HackathonBuildStatus;
  repository: string;
  baseCommitSha: string;
  branchName: string;
  worktreeReference: string | null;
  adapterPath: string | null;
  ownerAgent: string | null;
  toolPolicy: unknown;
  budgetUsd: number | null;
  budgetHours: number | null;
  startConditions: string;
  stopConditions: string;
  currentCommitSha: string | null;
  ciState: 'pending' | 'passed' | 'failed' | 'not_required';
  securityReviewState: 'pending' | 'passed' | 'failed' | 'not_required';
  evidenceManifestSha256: string | null;
  mergeDecision: 'pending' | 'approved' | 'rejected' | 'not_applicable';
  approvedBy: string | null;
  approvedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface HackathonAssetSummary {
  id: string;
  entryId: string;
  kind: string;
  required: boolean;
  status: HackathonAssetStatus;
  reference: string | null;
  contentSha256: string | null;
  founderReviewState: EvidenceReviewState;
  reviewedAt: string | null;
}

export interface DistributionPlanSummary {
  id: string;
  entryId: string;
  summary: string;
  status: DistributionPlanStatus;
  contentSha256: string;
  approvedBy: string | null;
  approvedAt: string | null;
}

export interface DistributionItemSummary {
  id: string;
  planId: string;
  kind: string;
  phase: DistributionPhase;
  status: 'planned' | 'ready' | 'published' | 'completed' | 'cancelled';
  title: string;
  scheduledAt: string | null;
  completedAt: string | null;
  reference: string | null;
}

export interface HackathonSubmissionSummary {
  id: string;
  entryId: string;
  portalUrl: string;
  submittedAt: string;
  narrativeProfileId: string;
  canonicalDemoVersionId: string;
  repositoryCommitSha: string;
  receiptAssetId: string;
  contentSha256: string;
  status: 'submitted' | 'withdrawn' | 'disqualified';
}

export interface HackathonResultSummary {
  id: string;
  entryId: string;
  outcome: string;
  placement: string | null;
  prizeValue: number | null;
  prizeAsset: string | null;
  credits: string[];
  invitations: string[];
  recordedAt: string;
}

export interface HackathonConversionSummary {
  id: string;
  entryId: string;
  kind: string;
  organizationId: string | null;
  organizationName: string | null;
  title: string;
  detail: string | null;
  valueUsd: number | null;
  status: string;
  referenceUrl: string | null;
  occurredAt: string | null;
}

export interface HackathonReadinessSummary {
  approvalReady: boolean;
  scopeReady: boolean;
  buildReady: boolean;
  verificationReady: boolean;
  submissionReady: boolean;
  submissionRecorded: boolean;
  blockers: string[];
}

export interface HackathonEntrySummary {
  id: string;
  cycleId: string;
  opportunityName: string;
  cycleName: string;
  organizerName: string | null;
  legalEntityId: string;
  legalEntityName: string;
  leadVentureId: string | null;
  leadVentureName: string | null;
  supportingVentureIds: string[];
  supportingVentureNames: string[];
  narrativeProfileId: string;
  narrativeVersion: number;
  narrativeDigest: string;
  canonicalDemoVersionId: string;
  canonicalDemoId: string;
  canonicalDemoName: string;
  canonicalDemoVersion: number;
  baselineRepository: string;
  baselineCommitSha: string;
  submissionConcept: string;
  userOutcome: string;
  ecosystemAdapter: string;
  estimatedHours: number;
  reusePercentage: number;
  weightedScore: number;
  founderDecision: HackathonFounderDecision;
  founderRationale: string | null;
  state: HackathonEntryState;
  eligibilityStatus: HackathonEligibilityStatus | null;
  nextDeadlineAt: string | null;
  readiness: HackathonReadinessSummary;
}

export interface HackathonEntryDetail extends HackathonEntrySummary {
  trackIds: string[];
  bountyIds: string[];
  eligibilityEvaluations: HackathonEligibilitySummary[];
  build: HackathonBuildSummary | null;
  assets: HackathonAssetSummary[];
  distributionPlan: DistributionPlanSummary | null;
  distributionItems: DistributionItemSummary[];
  submission: HackathonSubmissionSummary | null;
  result: HackathonResultSummary | null;
  conversions: HackathonConversionSummary[];
}

export interface HackathonPortfolioMetrics {
  openUpcomingRollingCycles: number;
  candidateEntries: number;
  activeBuilds: number;
  submissionReadyEntries: number;
  submittedEntries: number;
  finalistOrWinnerEntries: number;
  nextDeadlineAt: string | null;
  blockedEntries: number;
  estimatedActiveHours: number;
}

export interface HackathonBootstrap {
  organizations: OrganizationSummary[];
  opportunities: OpportunitySummary[];
  cycles: HackathonCycleSummary[];
  entries: HackathonEntrySummary[];
  portfolio: HackathonPortfolioMetrics;
}

export type CompleteFounderAppBootstrap = FounderAppBootstrap & HackathonBootstrap;

export interface OrganizationSaveInput {
  id?: string;
  name: string;
  kind: OrganizationKind;
  website: string | null;
  description: string | null;
  linkedFirmId: string | null;
  isPublic: boolean;
  contributionEligible: boolean;
}

export interface OpportunitySaveInput {
  id?: string;
  organizerOrganizationId: string | null;
  name: string;
  opportunityType: OpportunityType;
  status: OpportunityStatus;
  publicUrl: string | null;
  applicationUrl: string | null;
  openDate: string | null;
  deadline: string | null;
  startDate: string | null;
  endDate: string | null;
  format: OpportunityFormat | null;
  location: string | null;
  eligibilitySummary: string | null;
  termsSummary: string | null;
  capitalPrizeSummary: string | null;
  freshnessState: OpportunityFreshness;
  reviewState: OpportunityReviewState;
}

export interface HackathonCycleSaveInput {
  id?: string;
  opportunityId: string;
  cycleName: string;
  registrationOpenAt: string | null;
  registrationCloseAt: string | null;
  buildStartAt: string | null;
  buildEndAt: string | null;
  submissionDeadlineAt: string | null;
  judgingStartAt: string | null;
  judgingEndAt: string | null;
  demoDayAt: string | null;
  resultAt: string | null;
  format: OpportunityFormat;
  location: string | null;
  state: HackathonCycleState;
  rulesSourceId: string | null;
  rulesRetrievedAt: string | null;
}

export interface HackathonEntryCreateCommand {
  id?: string;
  cycleId: string;
  legalEntityId: string;
  leadVentureId: string;
  supportingVentureIds: string[];
  narrativeProfileId: string;
  canonicalDemoVersionId: string;
  trackIds: string[];
  bountyIds: string[];
  submissionConcept: string;
  userOutcome: string;
  ecosystemAdapter: string;
  estimatedHours: number;
  reusePercentage: number;
  strategicFit: number;
  acceptanceProbability: number;
  capitalUpside: number;
  distributionUpside: number;
  technicalLeverage: number;
  credibility: number;
  urgency: number;
  effortEfficiency: number;
  lockInSafety: number;
}

export interface EligibilityProfileInput {
  country: string | null;
  founderAge: number | null;
  isStudent: boolean | null;
  companyFoundedOn: string | null;
  teamSize: number | null;
  usesExistingCode: boolean | null;
  willOpenSource: boolean | null;
  technologies: string[];
  attendanceMode: OpportunityFormat;
  canAttendInPerson: boolean | null;
  priorFundingUsd: number | null;
  participantIds: string[];
  submissionLanguage: string | null;
  availableArtifacts: string[];
}

export interface HackathonCommandMap {
  'organization.save': OrganizationSaveInput;
  'opportunity.save': OpportunitySaveInput;
  'opportunity.source.review': {
    opportunityId: string;
    sourceId: string;
    sourceRole: string;
    decision: 'accepted' | 'rejected';
  };
  'hackathon.cycle.save': HackathonCycleSaveInput;
  'hackathon.track.save': Omit<HackathonTrackSummary, 'id'> & { id?: string };
  'hackathon.sponsor.save': Omit<HackathonSponsorSummary, 'organizationName'>;
  'hackathon.bounty.save': Omit<HackathonBountySummary, 'id' | 'sponsorName' | 'trackName'> & {
    id?: string;
  };
  'hackathon.rule.save': Omit<HackathonRuleSummary, 'id' | 'reviewState' | 'reviewedAt'> & {
    id?: string;
  };
  'hackathon.rule.review': { id: string; decision: 'accepted' | 'rejected' };
  'hackathon.entry.create': HackathonEntryCreateCommand;
  'hackathon.entry.evaluateEligibility': { id: string; profile: EligibilityProfileInput };
  'hackathon.eligibility.review': { id: string; decision: 'accepted' | 'rejected' };
  'hackathon.entry.decide': {
    id: string;
    decision: Exclude<HackathonFounderDecision, 'pending'>;
    rationale: string | null;
  };
  'hackathon.entry.transition': { id: string; toState: HackathonEntryState };
  'hackathon.entry.get': { id: string };
}

export interface HackathonCommandResultMap {
  'organization.save': OrganizationSummary;
  'opportunity.save': OpportunitySummary;
  'opportunity.source.review': OpportunityEvidenceSummary;
  'hackathon.cycle.save': HackathonCycleSummary;
  'hackathon.track.save': HackathonTrackSummary;
  'hackathon.sponsor.save': HackathonSponsorSummary;
  'hackathon.bounty.save': HackathonBountySummary;
  'hackathon.rule.save': HackathonRuleSummary;
  'hackathon.rule.review': HackathonRuleSummary;
  'hackathon.entry.create': HackathonEntrySummary;
  'hackathon.entry.evaluateEligibility': HackathonEligibilitySummary;
  'hackathon.eligibility.review': HackathonEligibilitySummary;
  'hackathon.entry.decide': HackathonEntrySummary;
  'hackathon.entry.transition': HackathonEntrySummary;
  'hackathon.entry.get': HackathonEntryDetail;
}

export type CompleteFounderCommandMap = FounderCommandMap & HackathonCommandMap;
export type CompleteFounderCommandName = keyof CompleteFounderCommandMap;
export type CompleteFounderCommandResult<K extends CompleteFounderCommandName> =
  K extends keyof HackathonCommandResultMap
    ? HackathonCommandResultMap[K]
    : K extends FounderCommandName
      ? FounderCommandResult<K>
      : never;
