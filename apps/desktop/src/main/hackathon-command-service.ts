import { z } from 'zod';

import type {
  CompleteFounderCommandResult,
  HackathonCommandMap,
} from '../shared/hackathon-contracts';
import type { HackathonService } from './hackathon-service';

const id = z.string().trim().min(1).max(300);
const nullableId = id.nullable();
const nullableText = z.string().max(1_000_000).nullable();
const nullableUrl = z.string().trim().url().max(4_096).nullable();
const nullableDate = z.string().date().nullable();
const nullableDateTime = z.string().datetime({ offset: true }).nullable();
const rating = z.number().int().min(1).max(10);
const sha256 = z.string().regex(/^[a-f0-9]{64}$/u);

const organizationKind = z.enum([
  'company',
  'foundation',
  'protocol',
  'community',
  'university',
  'government',
  'investor',
  'other',
]);
const opportunityType = z.enum([
  'investor',
  'accelerator',
  'grant',
  'hackathon',
  'startup_program',
  'cloud_credits',
  'strategic_partner',
  'sponsor',
  'design_partner',
]);
const opportunityStatus = z.enum([
  'open',
  'upcoming',
  'rolling',
  'closed_recurring',
  'watchlist',
  'cancelled',
]);
const opportunityFormat = z.enum(['online', 'in_person', 'hybrid', 'unknown']);
const freshness = z.enum(['current', 'aging', 'stale', 'unknown']);
const confidence = z.enum(['verified', 'supported', 'inferred', 'unknown', 'stale']);
const cycleState = z.enum([
  'announced',
  'registration',
  'building',
  'submission',
  'judging',
  'completed',
  'cancelled',
  'watchlist',
]);
const ruleType = z.enum([
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
const entryState = z.enum([
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

const organizationSave = z
  .object({
    id: id.optional(),
    name: z.string().trim().min(1).max(1_000),
    kind: organizationKind,
    website: nullableUrl,
    description: nullableText,
    linkedFirmId: nullableId,
    isPublic: z.boolean(),
    contributionEligible: z.boolean(),
  })
  .strict();

const opportunitySave = z
  .object({
    id: id.optional(),
    organizerOrganizationId: nullableId,
    name: z.string().trim().min(1).max(2_000),
    opportunityType,
    status: opportunityStatus,
    publicUrl: nullableUrl,
    applicationUrl: nullableUrl,
    openDate: nullableDate,
    deadline: nullableDate,
    startDate: nullableDate,
    endDate: nullableDate,
    format: opportunityFormat.nullable(),
    location: nullableText,
    eligibilitySummary: nullableText,
    termsSummary: nullableText,
    capitalPrizeSummary: nullableText,
    freshnessState: freshness,
    reviewState: z.enum(['unreviewed', 'reviewed', 'conflicted', 'rejected']),
  })
  .strict();

const cycleSave = z
  .object({
    id: id.optional(),
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
    format: opportunityFormat,
    location: nullableText,
    state: cycleState,
    rulesSourceId: nullableId,
    rulesRetrievedAt: nullableDateTime,
  })
  .strict();

const trackSave = z
  .object({
    id: id.optional(),
    cycleId: id,
    name: z.string().trim().min(1).max(1_000),
    goals: nullableText,
    judgingCriteria: z.array(z.string().trim().min(1).max(10_000)).max(1_000),
  })
  .strict();

const sponsorSave = z
  .object({
    cycleId: id,
    organizationId: id,
    contactPersonId: nullableId,
    relationshipState: z.enum([
      'unresearched',
      'identified',
      'contacted',
      'meeting',
      'partner',
      'closed',
    ]),
  })
  .strict();

const bountySave = z
  .object({
    id: id.optional(),
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
    freshnessState: freshness,
    conflictLockInNotes: nullableText,
  })
  .strict();

const ruleSave = z
  .object({
    id: id.optional(),
    cycleId: id,
    ruleType,
    value: z.unknown(),
    blocking: z.boolean(),
    sourceId: nullableId,
    observedAt: nullableDateTime,
    confidence,
  })
  .strict();

const entryCreate = z
  .object({
    id: id.optional(),
    cycleId: id,
    legalEntityId: id,
    leadVentureId: id,
    supportingVentureIds: z.array(id).max(100),
    narrativeProfileId: id,
    canonicalDemoVersionId: id,
    trackIds: z.array(id).max(100),
    bountyIds: z.array(id).max(500),
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

const eligibilityProfile = z
  .object({
    country: z.string().trim().min(1).max(300).nullable(),
    founderAge: z.number().int().min(0).max(150).nullable(),
    isStudent: z.boolean().nullable(),
    companyFoundedOn: nullableDate,
    teamSize: z.number().int().min(1).max(10_000).nullable(),
    usesExistingCode: z.boolean().nullable(),
    willOpenSource: z.boolean().nullable(),
    technologies: z.array(z.string().trim().min(1).max(500)).max(1_000),
    attendanceMode: opportunityFormat,
    canAttendInPerson: z.boolean().nullable(),
    priorFundingUsd: z.number().nonnegative().nullable(),
    participantIds: z.array(id).max(1_000),
    submissionLanguage: z.string().trim().min(1).max(200).nullable(),
    availableArtifacts: z.array(z.string().trim().min(1).max(1_000)).max(1_000),
  })
  .strict();

const schemas = {
  'organization.save': organizationSave,
  'opportunity.save': opportunitySave,
  'opportunity.source.review': z
    .object({
      opportunityId: id,
      sourceId: id,
      sourceRole: z.string().trim().min(1).max(500),
      decision: z.enum(['accepted', 'rejected']),
    })
    .strict(),
  'hackathon.cycle.save': cycleSave,
  'hackathon.track.save': trackSave,
  'hackathon.sponsor.save': sponsorSave,
  'hackathon.bounty.save': bountySave,
  'hackathon.rule.save': ruleSave,
  'hackathon.rule.review': z
    .object({ id, decision: z.enum(['accepted', 'rejected']) })
    .strict(),
  'hackathon.entry.create': entryCreate,
  'hackathon.entry.evaluateEligibility': z
    .object({ id, profile: eligibilityProfile })
    .strict(),
  'hackathon.eligibility.review': z
    .object({ id, decision: z.enum(['accepted', 'rejected']) })
    .strict(),
  'hackathon.entry.decide': z
    .object({
      id,
      decision: z.enum(['go', 'conditional_go', 'no_go']),
      rationale: nullableText,
    })
    .strict(),
  'hackathon.entry.transition': z.object({ id, toState: entryState }).strict(),
  'hackathon.entry.get': z.object({ id }).strict(),
} satisfies Record<keyof HackathonCommandMap, z.ZodTypeAny>;

const commandNames = new Set<string>(Object.keys(schemas));

export function isHackathonCommand(name: string): name is keyof HackathonCommandMap {
  return commandNames.has(name);
}

export class HackathonCommandService {
  readonly #service: HackathonService;

  constructor(service: HackathonService) {
    this.#service = service;
  }

  async execute<K extends keyof HackathonCommandMap>(
    name: K,
    untrustedPayload: unknown,
  ): Promise<CompleteFounderCommandResult<K>> {
    const payload = schemas[name].parse(untrustedPayload);
    let result: unknown;
    switch (name) {
      case 'organization.save':
        result = await this.#service.saveOrganization(payload as HackathonCommandMap['organization.save']);
        break;
      case 'opportunity.save':
        result = await this.#service.saveOpportunity(payload as HackathonCommandMap['opportunity.save']);
        break;
      case 'opportunity.source.review':
        result = await this.#service.reviewOpportunitySource(
          payload as HackathonCommandMap['opportunity.source.review'],
        );
        break;
      case 'hackathon.cycle.save':
        result = await this.#service.saveCycle(payload as HackathonCommandMap['hackathon.cycle.save']);
        break;
      case 'hackathon.track.save':
        result = await this.#service.saveTrack(payload as HackathonCommandMap['hackathon.track.save']);
        break;
      case 'hackathon.sponsor.save':
        result = await this.#service.saveSponsor(payload as HackathonCommandMap['hackathon.sponsor.save']);
        break;
      case 'hackathon.bounty.save':
        result = await this.#service.saveBounty(payload as HackathonCommandMap['hackathon.bounty.save']);
        break;
      case 'hackathon.rule.save':
        result = await this.#service.saveRule(payload as HackathonCommandMap['hackathon.rule.save']);
        break;
      case 'hackathon.rule.review': {
        const value = payload as HackathonCommandMap['hackathon.rule.review'];
        result = await this.#service.reviewRule(value.id, value.decision);
        break;
      }
      case 'hackathon.entry.create':
        result = await this.#service.createEntry(payload as HackathonCommandMap['hackathon.entry.create']);
        break;
      case 'hackathon.entry.evaluateEligibility': {
        const value = payload as HackathonCommandMap['hackathon.entry.evaluateEligibility'];
        result = await this.#service.evaluateEligibility(value.id, value.profile);
        break;
      }
      case 'hackathon.eligibility.review': {
        const value = payload as HackathonCommandMap['hackathon.eligibility.review'];
        result = await this.#service.reviewEligibility(value.id, value.decision);
        break;
      }
      case 'hackathon.entry.decide':
        result = await this.#service.decideEntry(payload as HackathonCommandMap['hackathon.entry.decide']);
        break;
      case 'hackathon.entry.transition':
        result = await this.#service.transitionEntry(
          payload as HackathonCommandMap['hackathon.entry.transition'],
        );
        break;
      case 'hackathon.entry.get':
        result = await this.#service.getEntry(
          (payload as HackathonCommandMap['hackathon.entry.get']).id,
        );
        break;
      default:
        throw new Error(`Unsupported Hackathon Studio command: ${String(name)}`);
    }
    return result as CompleteFounderCommandResult<K>;
  }
}
