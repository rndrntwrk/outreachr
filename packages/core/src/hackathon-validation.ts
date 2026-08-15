import { createHash } from 'node:crypto';
import { z } from 'zod';

import {
  EvidenceConfidenceSchema,
  EvidenceReviewStateSchema,
  OpportunityFormatSchema,
} from './opportunity-validation.js';
import { IdSchema, IsoDateTimeSchema, UrlSchema, stableJson } from './validation.js';
import { GitCommitShaSchema, Sha256Schema } from './venture-validation.js';

export const HackathonCycleStateSchema = z.enum([
  'announced',
  'registration',
  'building',
  'submission',
  'judging',
  'completed',
  'cancelled',
  'watchlist',
]);

export const HackathonSponsorRelationshipStateSchema = z.enum([
  'unresearched',
  'identified',
  'contacted',
  'meeting',
  'partner',
  'closed',
]);

export const HackathonRuleTypeSchema = z.enum([
  'geography',
  'age',
  'student_status',
  'company_age',
  'existing_code',
  'team_size',
  'intellectual_property',
  'open_source',
  'required_technology',
  'attendance',
  'prior_funding',
  'prohibited_participant',
  'submission_language',
  'required_artifact',
  'other',
]);

export const HackathonEntryStateSchema = z.enum([
  'candidate',
  'approved',
  'scoped',
  'building',
  'verification',
  'submission_ready',
  'submitted',
  'judging',
  'finalist',
  'won',
  'not_selected',
  'withdrawn',
  'converted',
  'archived',
]);

export const FounderDecisionSchema = z.enum(['pending', 'go', 'conditional_go', 'no_go']);
export const EntryVentureRoleSchema = z.enum(['lead', 'supporting']);
export const EligibilityStatusSchema = z.enum(['eligible', 'ineligible', 'uncertain']);
export const FounderReviewStateSchema = z.enum(['pending', 'accepted', 'rejected']);
export const HackathonBuildStatusSchema = z.enum([
  'draft',
  'approved',
  'active',
  'completed',
  'cancelled',
]);
export const HackathonCiStateSchema = z.enum([
  'not_run',
  'running',
  'passed',
  'failed',
  'blocked',
]);
export const SecurityReviewStateSchema = z.enum([
  'pending',
  'passed',
  'failed',
  'not_required',
]);
export const MergeDecisionSchema = z.enum(['pending', 'merge', 'do_not_merge', 'superseded']);
export const HackathonAssetKindSchema = z.enum([
  'readme',
  'repository',
  'architecture',
  'screenshot',
  'demo_video',
  'pitch_deck',
  'submission_text',
  'license',
  'open_source_notice',
  'receipt',
  'other',
]);
export const HackathonAssetStatusSchema = z.enum([
  'missing',
  'draft',
  'ready',
  'approved',
  'rejected',
]);
export const DistributionPlanStatusSchema = z.enum([
  'draft',
  'approved',
  'active',
  'completed',
  'cancelled',
]);
export const DistributionItemKindSchema = z.enum([
  'pre_build_announcement',
  'build_in_public_update',
  '555stream_session',
  'arcade_activation',
  'technical_article',
  'launch_post',
  'thread',
  'clip',
  'sponsor_acknowledgement',
  'judge_follow_up',
  'investor_update',
  'partner_follow_up',
  'post_result_announcement',
  'open_source_release',
  'other',
]);
export const DistributionItemPhaseSchema = z.enum([
  'pre_event',
  'submission_day',
  'post_result',
]);
export const DistributionItemStatusSchema = z.enum([
  'planned',
  'ready',
  'published',
  'cancelled',
]);
export const HackathonSubmissionStatusSchema = z.enum([
  'submitted',
  'accepted',
  'rejected',
  'withdrawn',
]);
export const HackathonResultOutcomeSchema = z.enum([
  'finalist',
  'won',
  'not_selected',
  'withdrawn',
  'cancelled',
  'other',
]);
export const HackathonConversionKindSchema = z.enum([
  'grant',
  'accelerator',
  'pilot',
  'investor_meeting',
  'sponsor_relationship',
  'partner_integration',
  'user_growth',
  'media_coverage',
  'reusable_demo',
  'other',
]);
export const HackathonConversionStatusSchema = z.enum([
  'identified',
  'active',
  'won',
  'lost',
  'completed',
]);

interface RefinementContext {
  addIssue(issue: {
    code: typeof z.ZodIssueCode.custom;
    path: Array<string | number>;
    message: string;
  }): void;
}

const NullableDateTimeSchema = IsoDateTimeSchema.nullable().default(null);
const NullableTextSchema = z.string().max(1_000_000).nullable().default(null);
const RequiredTextSchema = z.string().trim().min(1).max(1_000_000);
const RatingSchema = z.number().int().min(1).max(10);
const NonZeroCommitShaSchema = GitCommitShaSchema.refine((value) => !/^0{40}$/u.test(value), {
  message: 'A real Git commit SHA is required',
});

function knownInstantOrder(
  left: string | null,
  right: string | null,
  context: RefinementContext,
  path: string,
  message: string,
): void {
  if (left === null || right === null) return;
  if (Date.parse(left) <= Date.parse(right)) return;
  context.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
}

function reviewMetadata(
  state: z.output<typeof FounderReviewStateSchema> | z.output<typeof EvidenceReviewStateSchema>,
  reviewedAt: string | null,
  context: RefinementContext,
): void {
  if (state === 'pending' && reviewedAt !== null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['reviewedAt'],
      message: 'Pending review cannot have a review timestamp',
    });
  }
  if (state !== 'pending' && reviewedAt === null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['reviewedAt'],
      message: 'A completed review requires a review timestamp',
    });
  }
}

export const HackathonCycleSchema = z
  .object({
    id: IdSchema,
    opportunityId: IdSchema,
    cycleName: z.string().trim().min(1).max(1_000),
    registrationOpenAt: NullableDateTimeSchema,
    registrationCloseAt: NullableDateTimeSchema,
    buildStartAt: NullableDateTimeSchema,
    buildEndAt: NullableDateTimeSchema,
    submissionDeadlineAt: NullableDateTimeSchema,
    judgingStartAt: NullableDateTimeSchema,
    judgingEndAt: NullableDateTimeSchema,
    demoDayAt: NullableDateTimeSchema,
    resultAt: NullableDateTimeSchema,
    format: OpportunityFormatSchema,
    location: z.string().trim().min(1).max(2_000).nullable().default(null),
    state: HackathonCycleStateSchema,
    rulesSourceId: IdSchema.nullable().default(null),
    rulesRetrievedAt: NullableDateTimeSchema,
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .superRefine((cycle, context) => {
    knownInstantOrder(
      cycle.registrationOpenAt,
      cycle.registrationCloseAt,
      context,
      'registrationOpenAt',
      'Registration opening must not follow registration close',
    );
    knownInstantOrder(
      cycle.buildStartAt,
      cycle.buildEndAt,
      context,
      'buildStartAt',
      'Build start must not follow build end',
    );
    knownInstantOrder(
      cycle.buildEndAt,
      cycle.submissionDeadlineAt,
      context,
      'buildEndAt',
      'Build end must not follow the submission deadline',
    );
    knownInstantOrder(
      cycle.judgingStartAt,
      cycle.judgingEndAt,
      context,
      'judgingStartAt',
      'Judging start must not follow judging end',
    );
  });
export type HackathonCycleInput = z.input<typeof HackathonCycleSchema>;
export type HackathonCycle = z.output<typeof HackathonCycleSchema>;

export const HackathonTrackSchema = z.object({
  id: IdSchema,
  cycleId: IdSchema,
  name: z.string().trim().min(1).max(1_000),
  goals: NullableTextSchema,
  judgingCriteria: z.array(z.string().trim().min(1).max(10_000)).max(1_000).default([]),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type HackathonTrackInput = z.input<typeof HackathonTrackSchema>;
export type HackathonTrack = z.output<typeof HackathonTrackSchema>;

export const HackathonSponsorSchema = z.object({
  cycleId: IdSchema,
  organizationId: IdSchema,
  contactPersonId: IdSchema.nullable().default(null),
  relationshipState: HackathonSponsorRelationshipStateSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type HackathonSponsorInput = z.input<typeof HackathonSponsorSchema>;
export type HackathonSponsor = z.output<typeof HackathonSponsorSchema>;

export const HackathonBountySchema = z.object({
  id: IdSchema,
  cycleId: IdSchema,
  sponsorOrganizationId: IdSchema.nullable().default(null),
  trackId: IdSchema.nullable().default(null),
  title: z.string().trim().min(1).max(2_000),
  amountValue: z.number().nonnegative().nullable().default(null),
  amountAsset: z.string().trim().min(1).max(200).nullable().default(null),
  requiredTechnology: NullableTextSchema,
  eligibility: NullableTextSchema,
  judgingCriteria: NullableTextSchema,
  submissionRequirements: NullableTextSchema,
  sourceId: IdSchema.nullable().default(null),
  freshnessState: z.enum(['current', 'aging', 'stale', 'unknown']),
  conflictLockInNotes: NullableTextSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type HackathonBountyInput = z.input<typeof HackathonBountySchema>;
export type HackathonBounty = z.output<typeof HackathonBountySchema>;

export const HackathonRuleSchema = z
  .object({
    id: IdSchema,
    cycleId: IdSchema,
    ruleType: HackathonRuleTypeSchema,
    value: z.unknown(),
    blocking: z.boolean().default(true),
    sourceId: IdSchema.nullable().default(null),
    observedAt: NullableDateTimeSchema,
    confidence: EvidenceConfidenceSchema,
    reviewState: EvidenceReviewStateSchema,
    reviewedAt: NullableDateTimeSchema,
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .superRefine((rule, context) => reviewMetadata(rule.reviewState, rule.reviewedAt, context));
export type HackathonRuleInput = z.input<typeof HackathonRuleSchema>;
export type HackathonRule = z.output<typeof HackathonRuleSchema>;

const HackathonEntryContentShape = {
  cycleId: IdSchema,
  legalEntityId: IdSchema,
  narrativeProfileId: IdSchema,
  canonicalDemoVersionId: IdSchema,
  submissionConcept: RequiredTextSchema,
  userOutcome: RequiredTextSchema,
  ecosystemAdapter: RequiredTextSchema,
  estimatedHours: z.number().int().min(1).max(1_000),
  reusePercentage: z.number().int().min(0).max(100),
  strategicFit: RatingSchema,
  acceptanceProbability: RatingSchema,
  capitalUpside: RatingSchema,
  distributionUpside: RatingSchema,
  technicalLeverage: RatingSchema,
  credibility: RatingSchema,
  urgency: RatingSchema,
  effortEfficiency: RatingSchema,
  lockInSafety: RatingSchema,
} as const;

export const HackathonEntrySchema = z
  .object({
    id: IdSchema,
    ...HackathonEntryContentShape,
    weightedScore: z.number().min(0).max(100),
    founderDecision: FounderDecisionSchema,
    founderRationale: z.string().trim().min(1).max(100_000).nullable().default(null),
    state: HackathonEntryStateSchema,
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .superRefine((entry, context) => {
    if (entry.founderDecision === 'conditional_go' && entry.founderRationale === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['founderRationale'],
        message: 'A conditional go decision requires explicit founder conditions',
      });
    }
  });
export type HackathonEntryInput = z.input<typeof HackathonEntrySchema>;
export type HackathonEntry = z.output<typeof HackathonEntrySchema>;

export const HackathonEntryCreateSchema = z.object({
  id: IdSchema,
  ...HackathonEntryContentShape,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type HackathonEntryCreateInput = z.input<typeof HackathonEntryCreateSchema>;

export const EntryVentureSchema = z.object({
  entryId: IdSchema,
  ventureId: IdSchema,
  role: EntryVentureRoleSchema,
  createdAt: IsoDateTimeSchema,
});
export type EntryVentureInput = z.input<typeof EntryVentureSchema>;
export type EntryVenture = z.output<typeof EntryVentureSchema>;

export const HackathonEntryTrackSchema = z.object({
  entryId: IdSchema,
  trackId: IdSchema,
  createdAt: IsoDateTimeSchema,
});
export type HackathonEntryTrackInput = z.input<typeof HackathonEntryTrackSchema>;
export type HackathonEntryTrack = z.output<typeof HackathonEntryTrackSchema>;

export const HackathonEntryBountySchema = z.object({
  entryId: IdSchema,
  bountyId: IdSchema,
  createdAt: IsoDateTimeSchema,
});
export type HackathonEntryBountyInput = z.input<typeof HackathonEntryBountySchema>;
export type HackathonEntryBounty = z.output<typeof HackathonEntryBountySchema>;

export const HackathonEligibilityEvaluationSchema = z
  .object({
    id: IdSchema,
    entryId: IdSchema,
    status: EligibilityStatusSchema,
    evaluatedAt: IsoDateTimeSchema,
    rulesSnapshotSha256: Sha256Schema,
    detail: z.array(z.record(z.string(), z.unknown())).max(1_000),
    founderReviewState: FounderReviewStateSchema,
    reviewedAt: NullableDateTimeSchema,
  })
  .superRefine((evaluation, context) =>
    reviewMetadata(evaluation.founderReviewState, evaluation.reviewedAt, context),
  );
export type EligibilityEvaluationInput = z.input<typeof HackathonEligibilityEvaluationSchema>;
export type EligibilityEvaluation = z.output<typeof HackathonEligibilityEvaluationSchema>;

export const HackathonBuildSchema = z
  .object({
    id: IdSchema,
    entryId: IdSchema,
    status: HackathonBuildStatusSchema,
    repository: z.string().trim().min(1).max(4_096),
    baseCommitSha: GitCommitShaSchema,
    branchName: z.string().trim().min(1).max(2_000),
    worktreeReference: z.string().trim().min(1).max(4_096).nullable().default(null),
    adapterPath: z.string().trim().min(1).max(4_096).nullable().default(null),
    ownerAgent: z.string().trim().min(1).max(500).nullable().default(null),
    toolPolicy: z.record(z.string(), z.unknown()).default({}),
    budgetUsd: z.number().nonnegative().nullable().default(null),
    budgetHours: z.number().int().min(1).max(1_000).nullable().default(null),
    startConditions: RequiredTextSchema,
    stopConditions: RequiredTextSchema,
    currentCommitSha: GitCommitShaSchema.nullable().default(null),
    ciState: HackathonCiStateSchema,
    securityReviewState: SecurityReviewStateSchema,
    evidenceManifestSha256: Sha256Schema.nullable().default(null),
    mergeDecision: MergeDecisionSchema,
    approvedBy: IdSchema.nullable().default(null),
    approvedAt: NullableDateTimeSchema,
    startedAt: NullableDateTimeSchema,
    completedAt: NullableDateTimeSchema,
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .superRefine((build, context) => {
    const requiresApproval = ['approved', 'active', 'completed'].includes(build.status);
    const hasAnyApproval = build.approvedBy !== null || build.approvedAt !== null;
    const hasCompleteApproval = build.approvedBy !== null && build.approvedAt !== null;
    if (build.status === 'draft' && hasAnyApproval) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['approvedAt'],
        message: 'A draft build cannot have approval metadata',
      });
    }
    if (requiresApproval && !hasCompleteApproval) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['approvedAt'],
        message: 'An approved, active or completed build requires approval metadata',
      });
    }
    if (build.status === 'cancelled' && hasAnyApproval && !hasCompleteApproval) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['approvedAt'],
        message: 'Cancelled build approval metadata must be complete when present',
      });
    }
    if (requiresApproval && /^0{40}$/u.test(build.baseCommitSha)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['baseCommitSha'],
        message: 'An approved or active build requires a real base commit',
      });
    }
    if (
      ['active', 'completed'].includes(build.status) &&
      (build.currentCommitSha === null || /^0{40}$/u.test(build.currentCommitSha))
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['currentCommitSha'],
        message: 'An active or completed build requires a real current commit',
      });
    }
  });
export type HackathonBuildInput = z.input<typeof HackathonBuildSchema>;
export type HackathonBuild = z.output<typeof HackathonBuildSchema>;

export const HackathonAssetSchema = z
  .object({
    id: IdSchema,
    entryId: IdSchema,
    kind: HackathonAssetKindSchema,
    required: z.boolean().default(false),
    status: HackathonAssetStatusSchema,
    reference: z.string().trim().min(1).max(10_000).nullable().default(null),
    contentSha256: Sha256Schema.nullable().default(null),
    founderReviewState: FounderReviewStateSchema,
    reviewedAt: NullableDateTimeSchema,
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .superRefine((asset, context) => {
    reviewMetadata(asset.founderReviewState, asset.reviewedAt, context);
    if (
      asset.status === 'approved' &&
      (asset.founderReviewState !== 'accepted' || asset.reference === null)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['status'],
        message: 'An approved asset requires an accepted founder review and a reference',
      });
    }
  });
export type HackathonAssetInput = z.input<typeof HackathonAssetSchema>;
export type HackathonAsset = z.output<typeof HackathonAssetSchema>;

export const DistributionPlanSchema = z
  .object({
    id: IdSchema,
    entryId: IdSchema,
    summary: RequiredTextSchema,
    status: DistributionPlanStatusSchema,
    contentSha256: Sha256Schema,
    approvedBy: IdSchema.nullable().default(null),
    approvedAt: NullableDateTimeSchema,
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .superRefine((plan, context) => {
    const requiresApproval = ['approved', 'active', 'completed'].includes(plan.status);
    const hasAnyApproval = plan.approvedBy !== null || plan.approvedAt !== null;
    const hasCompleteApproval = plan.approvedBy !== null && plan.approvedAt !== null;
    if (plan.status === 'draft' && hasAnyApproval) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['approvedAt'],
        message: 'A draft distribution plan cannot have approval metadata',
      });
    }
    if (requiresApproval && !hasCompleteApproval) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['approvedAt'],
        message: 'An approved, active or completed distribution plan requires approval metadata',
      });
    }
    if (plan.status === 'cancelled' && hasAnyApproval && !hasCompleteApproval) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['approvedAt'],
        message: 'Cancelled distribution plan approval metadata must be complete when present',
      });
    }
  });
export type DistributionPlanInput = z.input<typeof DistributionPlanSchema>;
export type DistributionPlan = z.output<typeof DistributionPlanSchema>;

export const DistributionItemSchema = z.object({
  id: IdSchema,
  planId: IdSchema,
  kind: DistributionItemKindSchema,
  phase: DistributionItemPhaseSchema,
  status: DistributionItemStatusSchema,
  title: z.string().trim().min(1).max(2_000),
  scheduledAt: NullableDateTimeSchema,
  completedAt: NullableDateTimeSchema,
  reference: z.string().trim().min(1).max(10_000).nullable().default(null),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type DistributionItemInput = z.input<typeof DistributionItemSchema>;
export type DistributionItem = z.output<typeof DistributionItemSchema>;

export const HackathonSubmissionSchema = z.object({
  id: IdSchema,
  entryId: IdSchema,
  portalUrl: UrlSchema,
  submittedAt: IsoDateTimeSchema,
  narrativeProfileId: IdSchema,
  canonicalDemoVersionId: IdSchema,
  repositoryCommitSha: NonZeroCommitShaSchema,
  receiptAssetId: IdSchema,
  contentSha256: Sha256Schema,
  status: HackathonSubmissionStatusSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type HackathonSubmissionInput = z.input<typeof HackathonSubmissionSchema>;
export type HackathonSubmission = z.output<typeof HackathonSubmissionSchema>;

export const HackathonResultSchema = z.object({
  id: IdSchema,
  entryId: IdSchema,
  outcome: HackathonResultOutcomeSchema,
  placement: z.string().trim().min(1).max(500).nullable().default(null),
  prizeValue: z.number().nonnegative().nullable().default(null),
  prizeAsset: z.string().trim().min(1).max(200).nullable().default(null),
  credits: z.array(z.string().trim().min(1).max(10_000)).max(1_000).default([]),
  invitations: z.array(z.string().trim().min(1).max(10_000)).max(1_000).default([]),
  recordedAt: IsoDateTimeSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type HackathonResultInput = z.input<typeof HackathonResultSchema>;
export type HackathonResult = z.output<typeof HackathonResultSchema>;

export const HackathonConversionSchema = z.object({
  id: IdSchema,
  entryId: IdSchema,
  kind: HackathonConversionKindSchema,
  organizationId: IdSchema.nullable().default(null),
  title: z.string().trim().min(1).max(2_000),
  detail: NullableTextSchema,
  valueUsd: z.number().nonnegative().nullable().default(null),
  status: HackathonConversionStatusSchema,
  referenceUrl: UrlSchema.nullable().default(null),
  occurredAt: NullableDateTimeSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type HackathonConversionInput = z.input<typeof HackathonConversionSchema>;
export type HackathonConversion = z.output<typeof HackathonConversionSchema>;

export const EntryDecisionSchema = z.object({
  id: IdSchema,
  decision: FounderDecisionSchema,
  rationale: z.string().trim().min(1).max(100_000).nullable().default(null),
  decidedAt: IsoDateTimeSchema,
});
export type EntryDecisionInput = z.input<typeof EntryDecisionSchema>;

export const EntryTransitionSchema = z.object({
  id: IdSchema,
  toState: HackathonEntryStateSchema,
  transitionedAt: IsoDateTimeSchema,
});
export type EntryTransitionInput = z.input<typeof EntryTransitionSchema>;

export interface HackathonEntryFilter {
  cycleId?: string;
  legalEntityId?: string;
  ventureId?: string;
  canonicalDemoVersionId?: string;
  state?: z.output<typeof HackathonEntryStateSchema>;
  founderDecision?: z.output<typeof FounderDecisionSchema>;
}

export interface HackathonEntrySummary extends HackathonEntry {
  leadVentureId: string | null;
  eligibilityStatus: z.output<typeof EligibilityStatusSchema> | null;
  nextDeadlineAt: string | null;
}

export interface HackathonEntryDetail extends HackathonEntrySummary {
  ventures: EntryVenture[];
  trackIds: string[];
  bountyIds: string[];
  eligibilityEvaluations: EligibilityEvaluation[];
  build: HackathonBuild | null;
  assets: HackathonAsset[];
  distributionPlan: DistributionPlan | null;
  distributionItems: DistributionItem[];
  submission: HackathonSubmission | null;
  result: HackathonResult | null;
  conversions: HackathonConversion[];
}

export function hackathonRulesDigest(rules: readonly HackathonRule[]): string {
  const canonical = rules
    .map((rule) => ({
      id: rule.id,
      ruleType: rule.ruleType,
      value: rule.value,
      blocking: rule.blocking,
      sourceId: rule.sourceId,
      observedAt: rule.observedAt,
      confidence: rule.confidence,
      reviewState: rule.reviewState,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
  return createHash('sha256').update(stableJson(canonical), 'utf8').digest('hex');
}
