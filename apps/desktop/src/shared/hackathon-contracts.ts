import type {
  DistributionItem,
  DistributionPlan,
  EligibilityEvaluation,
  HackathonAsset,
  HackathonBounty,
  HackathonBuild,
  HackathonConversion,
  HackathonCycle,
  HackathonEntryDetail as CoreHackathonEntryDetail,
  HackathonEntrySummary as CoreHackathonEntrySummary,
  HackathonResult,
  HackathonRule,
  HackathonSponsor,
  HackathonSubmission,
  HackathonTrack,
  Organization,
  Opportunity,
  OpportunitySource,
} from '@outreachr/core';
import type {
  FounderAppBootstrap,
  FounderBootstrapCommandName,
  FounderCommandMap,
  FounderCommandName,
  FounderCommandResult,
} from './venture-contracts';

export type OrganizationSummary = Organization;
export type OpportunitySummary = Opportunity;
export type OpportunitySourceSummary = OpportunitySource;
export type HackathonCycleSummary = HackathonCycle;
export type HackathonTrackSummary = HackathonTrack;
export type HackathonSponsorSummary = HackathonSponsor;
export type HackathonBountySummary = HackathonBounty;
export type HackathonRuleSummary = HackathonRule;
export type HackathonEntrySummary = CoreHackathonEntrySummary;
export type HackathonBuildSummary = HackathonBuild;
export type HackathonAssetSummary = HackathonAsset;
export type HackathonDistributionSummary = DistributionPlan;
export type HackathonDistributionItemSummary = DistributionItem;
export type HackathonSubmissionSummary = HackathonSubmission;
export type HackathonResultSummary = HackathonResult;
export type HackathonConversionSummary = HackathonConversion;
export type HackathonEligibilitySummary = EligibilityEvaluation;

export interface HackathonReadinessSummary {
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

export type HackathonEntryDetail = CoreHackathonEntryDetail & {
  readiness: HackathonReadinessSummary;
};

export interface HackathonPortfolioMetrics {
  openUpcomingRollingCycles: number;
  candidateEntries: number;
  approvedActiveBuilds: number;
  submissionReadyEntries: number;
  submittedEntries: number;
  finalistsWins: number;
  nextDeadlineAt: string | null;
  blockedEntries: number;
  estimatedActiveHours: number;
}

export interface HackathonBootstrap {
  organizations: OrganizationSummary[];
  opportunities: OpportunitySummary[];
  hackathonCycles: HackathonCycleSummary[];
  hackathonEntries: HackathonEntrySummary[];
  hackathonPortfolio: HackathonPortfolioMetrics;
}

export type StudioAppBootstrap = FounderAppBootstrap & HackathonBootstrap;

export type OrganizationSaveInput = Omit<
  OrganizationSummary,
  'id' | 'normalizedName' | 'createdAt' | 'updatedAt'
> & { id?: string };

export type OpportunitySaveInput = Omit<OpportunitySummary, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

export type OpportunitySourceAttachInput = Omit<
  OpportunitySourceSummary,
  'reviewState' | 'reviewedAt' | 'createdAt'
>;

export interface OpportunitySourceReviewInput {
  opportunityId: string;
  sourceId: string;
  sourceRole: string;
  decision: 'accept' | 'reject';
}

export type HackathonCycleSaveInput = Omit<
  HackathonCycleSummary,
  'id' | 'rulesSha256' | 'createdAt' | 'updatedAt'
> & { id?: string };

export type HackathonTrackSaveInput = Omit<
  HackathonTrackSummary,
  'id' | 'createdAt' | 'updatedAt'
> & { id?: string };

export type HackathonSponsorSaveInput = Omit<
  HackathonSponsorSummary,
  'createdAt' | 'updatedAt'
>;

export type HackathonBountySaveInput = Omit<
  HackathonBountySummary,
  'id' | 'createdAt' | 'updatedAt'
> & { id?: string };

export type HackathonRuleSaveInput = Omit<
  HackathonRuleSummary,
  'id' | 'reviewState' | 'reviewedAt' | 'createdAt' | 'updatedAt'
> & { id?: string };

export interface HackathonRuleReviewInput {
  id: string;
  decision: 'accept' | 'reject';
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

export interface HackathonEntryDecisionCommand {
  id: string;
  decision: 'go' | 'conditional_go' | 'no_go';
  rationale: string | null;
}

export interface HackathonEntryTransitionCommand {
  id: string;
  toState: HackathonEntrySummary['state'];
}

export type HackathonBuildSaveInput = Omit<
  HackathonBuildSummary,
  'id' | 'approvedBy' | 'approvedAt' | 'createdAt' | 'updatedAt'
> & { id?: string };

export type HackathonAssetSaveInput = Omit<
  HackathonAssetSummary,
  'id' | 'founderReviewState' | 'reviewedAt' | 'createdAt' | 'updatedAt'
> & {
  id?: string;
  reviewDecision?: 'accept' | 'reject';
};

export type HackathonDistributionSaveInput = Omit<
  HackathonDistributionSummary,
  'id' | 'approvedBy' | 'approvedAt' | 'createdAt' | 'updatedAt'
> & { id?: string };

export type HackathonDistributionItemSaveInput = Omit<
  HackathonDistributionItemSummary,
  'id' | 'createdAt' | 'updatedAt'
> & { id?: string };

export type HackathonSubmissionSaveInput = Omit<
  HackathonSubmissionSummary,
  'id' | 'submittedAt' | 'createdAt' | 'updatedAt'
> & { id?: string; submittedAt?: string };

export type HackathonResultSaveInput = Omit<
  HackathonResultSummary,
  'id' | 'recordedAt' | 'createdAt' | 'updatedAt'
> & { id?: string; recordedAt?: string };

export type HackathonConversionSaveInput = Omit<
  HackathonConversionSummary,
  'id' | 'createdAt' | 'updatedAt'
> & { id?: string };

export interface HackathonCommandMap {
  'organization.save': OrganizationSaveInput;
  'opportunity.save': OpportunitySaveInput;
  'opportunity.source.attach': OpportunitySourceAttachInput;
  'opportunity.source.review': OpportunitySourceReviewInput;
  'hackathon.cycle.save': HackathonCycleSaveInput;
  'hackathon.track.save': HackathonTrackSaveInput;
  'hackathon.sponsor.save': HackathonSponsorSaveInput;
  'hackathon.bounty.save': HackathonBountySaveInput;
  'hackathon.rule.save': HackathonRuleSaveInput;
  'hackathon.rule.review': HackathonRuleReviewInput;
  'hackathon.entry.create': HackathonEntryCreateCommand;
  'hackathon.entry.score': { id: string };
  'hackathon.entry.evaluateEligibility': { id: string };
  'hackathon.eligibility.review': { id: string; decision: 'accept' | 'reject' };
  'hackathon.entry.decide': HackathonEntryDecisionCommand;
  'hackathon.entry.transition': HackathonEntryTransitionCommand;
  'hackathon.build.save': HackathonBuildSaveInput;
  'hackathon.asset.save': HackathonAssetSaveInput;
  'hackathon.distribution.save': HackathonDistributionSaveInput;
  'hackathon.distributionItem.save': HackathonDistributionItemSaveInput;
  'hackathon.submission.save': HackathonSubmissionSaveInput;
  'hackathon.result.save': HackathonResultSaveInput;
  'hackathon.conversion.save': HackathonConversionSaveInput;
  'hackathon.entry.get': { id: string };
}

export interface HackathonCommandResultMap {
  'organization.save': OrganizationSummary;
  'opportunity.save': OpportunitySummary;
  'opportunity.source.attach': OpportunitySourceSummary;
  'opportunity.source.review': OpportunitySourceSummary;
  'hackathon.cycle.save': HackathonCycleSummary;
  'hackathon.track.save': HackathonTrackSummary;
  'hackathon.sponsor.save': HackathonSponsorSummary;
  'hackathon.bounty.save': HackathonBountySummary;
  'hackathon.rule.save': HackathonRuleSummary;
  'hackathon.rule.review': HackathonRuleSummary;
  'hackathon.entry.create': HackathonEntrySummary;
  'hackathon.entry.score': { id: string; weightedScore: number };
  'hackathon.entry.evaluateEligibility': HackathonEligibilitySummary;
  'hackathon.eligibility.review': HackathonEligibilitySummary;
  'hackathon.entry.decide': HackathonEntrySummary;
  'hackathon.entry.transition': HackathonEntrySummary;
  'hackathon.build.save': HackathonBuildSummary;
  'hackathon.asset.save': HackathonAssetSummary;
  'hackathon.distribution.save': HackathonDistributionSummary;
  'hackathon.distributionItem.save': HackathonDistributionItemSummary;
  'hackathon.submission.save': HackathonSubmissionSummary;
  'hackathon.result.save': HackathonResultSummary;
  'hackathon.conversion.save': HackathonConversionSummary;
  'hackathon.entry.get': HackathonEntryDetail;
}

export type StudioCommandMap = FounderCommandMap & HackathonCommandMap;
export type StudioCommandName = keyof StudioCommandMap;
export type HackathonCommandName = keyof HackathonCommandMap;

export type StudioCommandResult<K extends StudioCommandName> =
  K extends keyof HackathonCommandResultMap
    ? HackathonCommandResultMap[K]
    : K extends FounderBootstrapCommandName
      ? StudioAppBootstrap
      : K extends FounderCommandName
        ? FounderCommandResult<K>
        : never;
