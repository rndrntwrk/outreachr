import {
  EvidenceConfidenceSchema,
  FreshnessStateSchema,
  GitCommitShaSchema,
  HackathonAssetKindSchema,
  HackathonAssetStatusSchema,
  HackathonBuildStatusSchema,
  HackathonCiStateSchema,
  HackathonConversionKindSchema,
  HackathonConversionStatusSchema,
  HackathonCycleStateSchema,
  HackathonEntryStateSchema,
  HackathonResultOutcomeSchema,
  HackathonRuleTypeSchema,
  HackathonSponsorRelationshipStateSchema,
  HackathonSubmissionStatusSchema,
  MergeDecisionSchema,
  OpportunityFormatSchema,
  OpportunityReviewStateSchema,
  OpportunityStatusSchema,
  OpportunityTypeSchema,
  OrganizationKindSchema,
  OrganizationOriginSchema,
  SecurityReviewStateSchema,
  Sha256Schema,
} from '@outreachr/core';
import { z } from 'zod';
import type {
  HackathonCommandMap,
  HackathonCommandName,
  HackathonCommandResultMap,
} from '../shared/hackathon-contracts';
import type { HackathonService } from './hackathon-service';
import type { OpportunityService } from './opportunity-service';

const id = z.string().trim().min(1).max(300);
const optionalId = id.optional();
const nullableId = id.nullable();
const nullableUrl = z.string().trim().url().max(4_096).nullable();
const nullableText = z.string().max(1_000_000).nullable();
const nullableDate = z.string().date().nullable();
const nullableDateTime = z.string().datetime({ offset: true }).nullable();
const rating = z.number().int().min(1).max(10);
const stringList = z.array(z.string().trim().min(1).max(10_000)).max(1_000);

const organizationSave = z
  .object({
    id: optionalId,
    name: z.string().trim().min(1).max(500),
    kind: OrganizationKindSchema,
    website: nullableUrl,
    description: nullableText,
    linkedFirmId: nullableId,
    isPublic: z.boolean(),
    contributionEligible: z.boolean(),
    origin: OrganizationOriginSchema,
  })
  .strict();

const opportunitySave = z
  .object({
    id: optionalId,
    organizerOrganizationId: nullableId,
    name: z.string().trim().min(1).max(1_000),
    opportunityType: OpportunityTypeSchema,
    status: OpportunityStatusSchema,
    publicUrl: nullableUrl,
    applicationUrl: nullableUrl,
    openDate: nullableDate,
    deadline: nullableDate,
    startDate: nullableDate,
    endDate: nullableDate,
    format: OpportunityFormatSchema.nullable(),
    location: z.string().trim().min(1).max(2_000).nullable(),
    eligibilitySummary: nullableText,
    termsSummary: nullableText,
    capitalPrizeSummary: nullableText,
    freshnessState: FreshnessStateSchema,
    reviewState: OpportunityReviewStateSchema,
    importedPackageId: z.string().trim().min(1).max(500).nullable(),
    importedPackageDigest: Sha256Schema.nullable(),
  })
  .strict();

const cycleSave = z
  .object({
    id: optionalId,
    opportunityId: id,
    cycleName: z.string().trim().min(1).max(1_000),
    registrationOpenAt: nullableDateTime,
    registrationCloseAt: nullableDateTime,
    buildStartAt: nullableDateTime,
    buildEndAt: nullableDateTime,
    submissionDeadlineAt: nullableDateTime,
    judgingStartAt: nullableDateTime,
    judgingEndAt: nullableDateTime,
    demoDayAt: nullableDateTime,
    resultAt: nullableDateTime,
    format: OpportunityFormatSchema,
    location: z.string().trim().min(1).max(2_000).nullable(),
    state: HackathonCycleStateSchema,
    rulesSourceId: nullableId,
    rulesRetrievedAt: nullableDateTime,
  })
  .strict();

const entryCreate = z
  .object({
    id: optionalId,
    cycleId: id,
    legalEntityId: id,
    leadVentureId: id,
    supportingVentureIds: z.array(id).max(100),
    narrativeProfileId: id,
    canonicalDemoVersionId: id,
    trackIds: z.array(id).max(100),
    bountyIds: z.array(id).max(100),
    submissionConcept: z.string().trim().min(1).max(1_000_000),
    userOutcome: z.string().trim().min(1).max(1_000_000),
    ecosystemAdapter: z.string().trim().min(1).max(1_000_000),
    estimatedHours: z.number().int().min(1).max(1_000),
    reusePercentage: z.number().int().min(0).max(100),
    strategicFit: rating,
    acceptanceProbability: rating,
    capitalUpside: rating,
    distributionUpside: rating,
    technicalLeverage: rating,
    credibility: rating,
    urgency: rating,
    effortEfficiency: rating,
    lockInSafety: rating,
  })
  .strict();

const buildSave = z
  .object({
    id: optionalId,
    entryId: id,
    status: HackathonBuildStatusSchema,
    repository: z.string().trim().min(1).max(4_096),
    baseCommitSha: GitCommitShaSchema,
    branchName: z.string().trim().min(1).max(2_000),
    worktreeReference: z.string().trim().min(1).max(4_096).nullable(),
    adapterPath: z.string().trim().min(1).max(4_096).nullable(),
    ownerAgent: z.string().trim().min(1).max(500).nullable(),
    toolPolicy: z.record(z.string(), z.unknown()),
    budgetUsd: z.number().nonnegative().nullable(),
    budgetHours: z.number().int().min(1).max(1_000).nullable(),
    startConditions: z.string().trim().min(1).max(1_000_000),
    stopConditions: z.string().trim().min(1).max(1_000_000),
    currentCommitSha: GitCommitShaSchema.nullable(),
    ciState: HackathonCiStateSchema,
    securityReviewState: SecurityReviewStateSchema,
    evidenceManifestSha256: Sha256Schema.nullable(),
    mergeDecision: MergeDecisionSchema,
    startedAt: nullableDateTime,
    completedAt: nullableDateTime,
  })
  .strict();

const assetSave = z
  .object({
    id: optionalId,
    entryId: id,
    kind: HackathonAssetKindSchema,
    required: z.boolean(),
    status: HackathonAssetStatusSchema,
    reference: z.string().trim().min(1).max(10_000).nullable(),
    contentSha256: Sha256Schema.nullable(),
    reviewDecision: z.enum(['accept', 'reject']).optional(),
  })
  .strict();

const distributionSave = z
  .object({
    id: optionalId,
    entryId: id,
    summary: z.string().trim().min(1).max(1_000_000),
    status: z.enum(['draft', 'approved', 'active', 'completed', 'cancelled']),
    contentSha256: Sha256Schema,
  })
  .strict();

const distributionItemSave = z
  .object({
    id: optionalId,
    planId: id,
    kind: z.enum([
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
    ]),
    phase: z.enum(['pre_event', 'submission_day', 'post_result']),
    status: z.enum(['planned', 'ready', 'published', 'cancelled']),
    title: z.string().trim().min(1).max(2_000),
    scheduledAt: nullableDateTime,
    completedAt: nullableDateTime,
    reference: z.string().trim().min(1).max(10_000).nullable(),
  })
  .strict();

const schemas: Record<HackathonCommandName, z.ZodTypeAny> = {
  'organization.save': organizationSave,
  'opportunity.save': opportunitySave,
  'opportunity.source.attach': z
    .object({
      opportunityId: id,
      sourceId: id,
      sourceRole: z.string().trim().min(1).max(500),
      observedAt: z.string().datetime({ offset: true }),
      confidence: EvidenceConfidenceSchema,
    })
    .strict(),
  'opportunity.source.review': z
    .object({
      opportunityId: id,
      sourceId: id,
      sourceRole: z.string().trim().min(1).max(500),
      decision: z.enum(['accept', 'reject']),
    })
    .strict(),
  'hackathon.cycle.save': cycleSave,
  'hackathon.track.save': z
    .object({
      id: optionalId,
      cycleId: id,
      name: z.string().trim().min(1).max(1_000),
      goals: nullableText,
      judgingCriteria: stringList,
    })
    .strict(),
  'hackathon.sponsor.save': z
    .object({
      cycleId: id,
      organizationId: id,
      contactPersonId: nullableId,
      relationshipState: HackathonSponsorRelationshipStateSchema,
    })
    .strict(),
  'hackathon.bounty.save': z
    .object({
      id: optionalId,
      cycleId: id,
      sponsorOrganizationId: nullableId,
      trackId: nullableId,
      title: z.string().trim().min(1).max(2_000),
      amountValue: z.number().nonnegative().nullable(),
      amountAsset: z.string().trim().min(1).max(200).nullable(),
      requiredTechnology: nullableText,
      eligibility: nullableText,
      judgingCriteria: nullableText,
      submissionRequirements: nullableText,
      sourceId: nullableId,
      freshnessState: FreshnessStateSchema,
      conflictLockInNotes: nullableText,
    })
    .strict(),
  'hackathon.rule.save': z
    .object({
      id: optionalId,
      cycleId: id,
      ruleType: HackathonRuleTypeSchema,
      value: z.unknown(),
      blocking: z.boolean(),
      sourceId: nullableId,
      observedAt: nullableDateTime,
      confidence: EvidenceConfidenceSchema,
    })
    .strict(),
  'hackathon.rule.review': z.object({ id, decision: z.enum(['accept', 'reject']) }).strict(),
  'hackathon.entry.create': entryCreate,
  'hackathon.entry.score': z.object({ id }).strict(),
  'hackathon.entry.evaluateEligibility': z.object({ id }).strict(),
  'hackathon.eligibility.review': z
    .object({ id, decision: z.enum(['accept', 'reject']) })
    .strict(),
  'hackathon.entry.decide': z
    .object({
      id,
      decision: z.enum(['go', 'conditional_go', 'no_go']),
      rationale: z.string().trim().min(1).max(100_000).nullable(),
    })
    .strict(),
  'hackathon.entry.transition': z.object({ id, toState: HackathonEntryStateSchema }).strict(),
  'hackathon.build.save': buildSave,
  'hackathon.asset.save': assetSave,
  'hackathon.distribution.save': distributionSave,
  'hackathon.distributionItem.save': distributionItemSave,
  'hackathon.submission.save': z
    .object({
      id: optionalId,
      entryId: id,
      portalUrl: z.string().trim().url().max(4_096),
      submittedAt: z.string().datetime({ offset: true }).optional(),
      narrativeProfileId: id,
      canonicalDemoVersionId: id,
      repositoryCommitSha: GitCommitShaSchema,
      receiptAssetId: id,
      contentSha256: Sha256Schema,
      status: HackathonSubmissionStatusSchema,
    })
    .strict(),
  'hackathon.result.save': z
    .object({
      id: optionalId,
      entryId: id,
      outcome: HackathonResultOutcomeSchema,
      placement: z.string().trim().min(1).max(500).nullable(),
      prizeValue: z.number().nonnegative().nullable(),
      prizeAsset: z.string().trim().min(1).max(200).nullable(),
      credits: stringList,
      invitations: stringList,
      recordedAt: z.string().datetime({ offset: true }).optional(),
    })
    .strict(),
  'hackathon.conversion.save': z
    .object({
      id: optionalId,
      entryId: id,
      kind: HackathonConversionKindSchema,
      organizationId: nullableId,
      title: z.string().trim().min(1).max(2_000),
      detail: nullableText,
      valueUsd: z.number().nonnegative().nullable(),
      status: HackathonConversionStatusSchema,
      referenceUrl: nullableUrl,
      occurredAt: nullableDateTime,
    })
    .strict(),
  'hackathon.entry.get': z.object({ id }).strict(),
};

const commandNames = new Set<string>(Object.keys(schemas));

export function isHackathonCommand(name: string): name is HackathonCommandName {
  return commandNames.has(name);
}

export class HackathonCommandService {
  readonly #opportunities: OpportunityService;
  readonly #hackathons: HackathonService;

  constructor(options: { opportunities: OpportunityService; hackathons: HackathonService }) {
    this.#opportunities = options.opportunities;
    this.#hackathons = options.hackathons;
  }

  async execute<K extends HackathonCommandName>(
    name: K,
    untrustedPayload: unknown,
  ): Promise<HackathonCommandResultMap[K]> {
    const payload = schemas[name].parse(untrustedPayload) as HackathonCommandMap[K];
    let result: unknown;
    switch (name) {
      case 'organization.save':
        result = await this.#opportunities.saveOrganization(payload as HackathonCommandMap['organization.save']);
        break;
      case 'opportunity.save':
        result = await this.#opportunities.saveOpportunity(payload as HackathonCommandMap['opportunity.save']);
        break;
      case 'opportunity.source.attach':
        result = await this.#opportunities.attachSource(
          payload as HackathonCommandMap['opportunity.source.attach'],
        );
        break;
      case 'opportunity.source.review':
        result = await this.#opportunities.reviewSource(
          payload as HackathonCommandMap['opportunity.source.review'],
        );
        break;
      case 'hackathon.cycle.save':
        result = await this.#hackathons.saveCycle(payload as HackathonCommandMap['hackathon.cycle.save']);
        break;
      case 'hackathon.track.save':
        result = await this.#hackathons.saveTrack(payload as HackathonCommandMap['hackathon.track.save']);
        break;
      case 'hackathon.sponsor.save':
        result = await this.#hackathons.saveSponsor(payload as HackathonCommandMap['hackathon.sponsor.save']);
        break;
      case 'hackathon.bounty.save':
        result = await this.#hackathons.saveBounty(payload as HackathonCommandMap['hackathon.bounty.save']);
        break;
      case 'hackathon.rule.save':
        result = await this.#hackathons.saveRule(payload as HackathonCommandMap['hackathon.rule.save']);
        break;
      case 'hackathon.rule.review': {
        const value = payload as HackathonCommandMap['hackathon.rule.review'];
        result = await this.#hackathons.reviewRule(value.id, value.decision);
        break;
      }
      case 'hackathon.entry.create':
        result = await this.#hackathons.createEntry(payload as HackathonCommandMap['hackathon.entry.create']);
        break;
      case 'hackathon.entry.score':
        result = await this.#hackathons.scoreEntry((payload as HackathonCommandMap['hackathon.entry.score']).id);
        break;
      case 'hackathon.entry.evaluateEligibility':
        result = await this.#hackathons.evaluateEligibility(
          (payload as HackathonCommandMap['hackathon.entry.evaluateEligibility']).id,
        );
        break;
      case 'hackathon.eligibility.review': {
        const value = payload as HackathonCommandMap['hackathon.eligibility.review'];
        result = await this.#hackathons.reviewEligibility(value.id, value.decision);
        break;
      }
      case 'hackathon.entry.decide':
        result = await this.#hackathons.decideEntry(payload as HackathonCommandMap['hackathon.entry.decide']);
        break;
      case 'hackathon.entry.transition':
        result = await this.#hackathons.transitionEntry(
          payload as HackathonCommandMap['hackathon.entry.transition'],
        );
        break;
      case 'hackathon.build.save':
        result = await this.#hackathons.saveBuild(payload as HackathonCommandMap['hackathon.build.save']);
        break;
      case 'hackathon.asset.save':
        result = await this.#hackathons.saveAsset(payload as HackathonCommandMap['hackathon.asset.save']);
        break;
      case 'hackathon.distribution.save':
        result = await this.#hackathons.saveDistribution(
          payload as HackathonCommandMap['hackathon.distribution.save'],
        );
        break;
      case 'hackathon.distributionItem.save':
        result = await this.#hackathons.saveDistributionItem(
          payload as HackathonCommandMap['hackathon.distributionItem.save'],
        );
        break;
      case 'hackathon.submission.save':
        result = await this.#hackathons.saveSubmission(
          payload as HackathonCommandMap['hackathon.submission.save'],
        );
        break;
      case 'hackathon.result.save':
        result = await this.#hackathons.saveResult(payload as HackathonCommandMap['hackathon.result.save']);
        break;
      case 'hackathon.conversion.save':
        result = await this.#hackathons.saveConversion(
          payload as HackathonCommandMap['hackathon.conversion.save'],
        );
        break;
      case 'hackathon.entry.get':
        result = await this.#hackathons.getEntry((payload as HackathonCommandMap['hackathon.entry.get']).id);
        break;
      default:
        throw new Error(`Unsupported Hackathon Studio command: ${String(name)}`);
    }
    return result as HackathonCommandResultMap[K];
  }
}
