import type { CoreVault } from './database.js';
import { calculateHackathonScore } from './hackathon-scoring.js';
import {
  calculateHackathonReadiness,
  canTransitionHackathonEntry,
  type HackathonReadiness,
} from './hackathon-state.js';
import {
  DistributionItemSchema,
  DistributionPlanSchema,
  EntryDecisionSchema,
  EntryTransitionSchema,
  EntryVentureSchema,
  HackathonAssetSchema,
  HackathonBountySchema,
  HackathonBuildSchema,
  HackathonConversionSchema,
  HackathonCycleSchema,
  HackathonEligibilityEvaluationSchema,
  HackathonEntryCreateSchema,
  HackathonEntrySchema,
  HackathonResultSchema,
  HackathonRuleSchema,
  HackathonSponsorSchema,
  HackathonSubmissionSchema,
  HackathonTrackSchema,
  hackathonRulesDigest,
  type DistributionItem,
  type DistributionItemInput,
  type DistributionPlan,
  type DistributionPlanInput,
  type EligibilityEvaluation,
  type EligibilityEvaluationInput,
  type EntryDecisionInput,
  type EntryTransitionInput,
  type EntryVenture,
  type EntryVentureInput,
  type HackathonAsset,
  type HackathonAssetInput,
  type HackathonBounty,
  type HackathonBountyInput,
  type HackathonBuild,
  type HackathonBuildInput,
  type HackathonConversion,
  type HackathonConversionInput,
  type HackathonCycle,
  type HackathonCycleInput,
  type HackathonEntry,
  type HackathonEntryCreateInput,
  type HackathonEntryDetail,
  type HackathonEntryFilter,
  type HackathonEntrySummary,
  type HackathonResult,
  type HackathonResultInput,
  type HackathonRule,
  type HackathonRuleInput,
  type HackathonSponsor,
  type HackathonSponsorInput,
  type HackathonSubmission,
  type HackathonSubmissionInput,
  type HackathonTrack,
  type HackathonTrackInput,
} from './hackathon-validation-v11.js';
import { appendAuditEntry } from './repository.js';
import { IdSchema, IsoDateTimeSchema, stableJson } from './validation.js';

export interface CycleRow {
  id: string;
  opportunity_id: string;
  cycle_name: string;
  registration_open_at: string | null;
  registration_close_at: string | null;
  build_start_at: string | null;
  build_end_at: string | null;
  submission_deadline_at: string | null;
  judging_start_at: string | null;
  judging_end_at: string | null;
  demo_day_at: string | null;
  result_at: string | null;
  format: string;
  location: string | null;
  state: string;
  rules_source_id: string | null;
  rules_retrieved_at: string | null;
  rules_sha256: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrackRow {
  id: string;
  cycle_id: string;
  name: string;
  goals: string | null;
  judging_criteria_json: string;
  created_at: string;
  updated_at: string;
}

export interface SponsorRow {
  cycle_id: string;
  organization_id: string;
  contact_person_id: string | null;
  relationship_state: string;
  created_at: string;
  updated_at: string;
}

export interface BountyRow {
  id: string;
  cycle_id: string;
  sponsor_organization_id: string | null;
  track_id: string | null;
  title: string;
  amount_value: number | null;
  amount_asset: string | null;
  required_technology: string | null;
  eligibility: string | null;
  judging_criteria: string | null;
  submission_requirements: string | null;
  source_id: string | null;
  freshness_state: string;
  conflict_lock_in_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RuleRow {
  id: string;
  cycle_id: string;
  rule_type: string;
  value_json: string;
  blocking: number;
  source_id: string | null;
  observed_at: string | null;
  confidence: string;
  review_state: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EntryRow {
  id: string;
  cycle_id: string;
  legal_entity_id: string;
  narrative_profile_id: string;
  canonical_demo_version_id: string;
  submission_concept: string;
  user_outcome: string;
  ecosystem_adapter: string;
  estimated_hours: number;
  reuse_percentage: number;
  strategic_fit: number;
  acceptance_probability: number;
  capital_upside: number;
  distribution_upside: number;
  technical_leverage: number;
  credibility: number;
  urgency: number;
  effort_efficiency: number;
  lock_in_safety: number;
  weighted_score: number;
  founder_decision: string;
  founder_rationale: string | null;
  state: string;
  created_at: string;
  updated_at: string;
}

export interface EntryVentureRow {
  entry_id: string;
  venture_id: string;
  role: string;
  created_at: string;
}

export interface EligibilityRow {
  id: string;
  entry_id: string;
  status: string;
  evaluated_at: string;
  rules_snapshot_sha256: string;
  detail_json: string;
  founder_review_state: string;
  reviewed_at: string | null;
}

export interface BuildRow {
  id: string;
  entry_id: string;
  status: string;
  repository: string;
  base_commit_sha: string;
  branch_name: string;
  worktree_reference: string | null;
  adapter_path: string | null;
  owner_agent: string | null;
  tool_policy_json: string;
  budget_usd: number | null;
  budget_hours: number | null;
  start_conditions: string;
  stop_conditions: string;
  current_commit_sha: string | null;
  ci_state: string;
  security_review_state: string;
  evidence_manifest_sha256: string | null;
  merge_decision: string;
  approved_by: string | null;
  approved_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssetRow {
  id: string;
  entry_id: string;
  kind: string;
  required: number;
  status: string;
  reference: string | null;
  content_sha256: string | null;
  founder_review_state: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DistributionPlanRow {
  id: string;
  entry_id: string;
  summary: string;
  status: string;
  content_sha256: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DistributionItemRow {
  id: string;
  plan_id: string;
  kind: string;
  phase: string;
  status: string;
  title: string;
  scheduled_at: string | null;
  completed_at: string | null;
  reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmissionRow {
  id: string;
  entry_id: string;
  portal_url: string;
  submitted_at: string;
  narrative_profile_id: string;
  canonical_demo_version_id: string;
  repository_commit_sha: string;
  receipt_asset_id: string;
  content_sha256: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ResultRow {
  id: string;
  entry_id: string;
  outcome: string;
  placement: string | null;
  prize_value: number | null;
  prize_asset: string | null;
  credits_json: string;
  invitations_json: string;
  recorded_at: string;
  created_at: string;
  updated_at: string;
}

export interface ConversionRow {
  id: string;
  entry_id: string;
  kind: string;
  organization_id: string | null;
  title: string;
  detail: string | null;
  value_usd: number | null;
  status: string;
  reference_url: string | null;
  occurred_at: string | null;
  created_at: string;
  updated_at: string;
}

export function bool(value: boolean): number {
  return value ? 1 : 0;
}

export function parseJson(value: string, label: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new Error(`${label} contains invalid JSON`);
  }
}

export function parseStringArray(value: string, label: string): string[] {
  const parsed = parseJson(value, label);
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) {
    throw new Error(`${label} must be a JSON string array`);
  }
  return parsed;
}

export function mapCycle(row: CycleRow): HackathonCycle {
  return HackathonCycleSchema.parse({
    id: row.id,
    opportunityId: row.opportunity_id,
    cycleName: row.cycle_name,
    registrationOpenAt: row.registration_open_at,
    registrationCloseAt: row.registration_close_at,
    buildStartAt: row.build_start_at,
    buildEndAt: row.build_end_at,
    submissionDeadlineAt: row.submission_deadline_at,
    judgingStartAt: row.judging_start_at,
    judgingEndAt: row.judging_end_at,
    demoDayAt: row.demo_day_at,
    resultAt: row.result_at,
    format: row.format,
    location: row.location,
    state: row.state,
    rulesSourceId: row.rules_source_id,
    rulesRetrievedAt: row.rules_retrieved_at,
    rulesSha256: row.rules_sha256,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function mapTrack(row: TrackRow): HackathonTrack {
  return HackathonTrackSchema.parse({
    id: row.id,
    cycleId: row.cycle_id,
    name: row.name,
    goals: row.goals,
    judgingCriteria: parseStringArray(row.judging_criteria_json, 'judging_criteria_json'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function mapSponsor(row: SponsorRow): HackathonSponsor {
  return HackathonSponsorSchema.parse({
    cycleId: row.cycle_id,
    organizationId: row.organization_id,
    contactPersonId: row.contact_person_id,
    relationshipState: row.relationship_state,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function mapBounty(row: BountyRow): HackathonBounty {
  return HackathonBountySchema.parse({
    id: row.id,
    cycleId: row.cycle_id,
    sponsorOrganizationId: row.sponsor_organization_id,
    trackId: row.track_id,
    title: row.title,
    amountValue: row.amount_value,
    amountAsset: row.amount_asset,
    requiredTechnology: row.required_technology,
    eligibility: row.eligibility,
    judgingCriteria: row.judging_criteria,
    submissionRequirements: row.submission_requirements,
    sourceId: row.source_id,
    freshnessState: row.freshness_state,
    conflictLockInNotes: row.conflict_lock_in_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function mapRule(row: RuleRow): HackathonRule {
  return HackathonRuleSchema.parse({
    id: row.id,
    cycleId: row.cycle_id,
    ruleType: row.rule_type,
    value: parseJson(row.value_json, 'value_json'),
    blocking: row.blocking === 1,
    sourceId: row.source_id,
    observedAt: row.observed_at,
    confidence: row.confidence,
    reviewState: row.review_state,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function mapEntry(row: EntryRow): HackathonEntry {
  return HackathonEntrySchema.parse({
    id: row.id,
    cycleId: row.cycle_id,
    legalEntityId: row.legal_entity_id,
    narrativeProfileId: row.narrative_profile_id,
    canonicalDemoVersionId: row.canonical_demo_version_id,
    submissionConcept: row.submission_concept,
    userOutcome: row.user_outcome,
    ecosystemAdapter: row.ecosystem_adapter,
    estimatedHours: row.estimated_hours,
    reusePercentage: row.reuse_percentage,
    strategicFit: row.strategic_fit,
    acceptanceProbability: row.acceptance_probability,
    capitalUpside: row.capital_upside,
    distributionUpside: row.distribution_upside,
    technicalLeverage: row.technical_leverage,
    credibility: row.credibility,
    urgency: row.urgency,
    effortEfficiency: row.effort_efficiency,
    lockInSafety: row.lock_in_safety,
    weightedScore: row.weighted_score,
    founderDecision: row.founder_decision,
    founderRationale: row.founder_rationale,
    state: row.state,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function mapEntryVenture(row: EntryVentureRow): EntryVenture {
  return EntryVentureSchema.parse({
    entryId: row.entry_id,
    ventureId: row.venture_id,
    role: row.role,
    createdAt: row.created_at,
  });
}

export function mapEligibility(row: EligibilityRow): EligibilityEvaluation {
  return HackathonEligibilityEvaluationSchema.parse({
    id: row.id,
    entryId: row.entry_id,
    status: row.status,
    evaluatedAt: row.evaluated_at,
    rulesSnapshotSha256: row.rules_snapshot_sha256,
    detail: parseJson(row.detail_json, 'detail_json'),
    founderReviewState: row.founder_review_state,
    reviewedAt: row.reviewed_at,
  });
}

export function mapBuild(row: BuildRow): HackathonBuild {
  return HackathonBuildSchema.parse({
    id: row.id,
    entryId: row.entry_id,
    status: row.status,
    repository: row.repository,
    baseCommitSha: row.base_commit_sha,
    branchName: row.branch_name,
    worktreeReference: row.worktree_reference,
    adapterPath: row.adapter_path,
    ownerAgent: row.owner_agent,
    toolPolicy: parseJson(row.tool_policy_json, 'tool_policy_json'),
    budgetUsd: row.budget_usd,
    budgetHours: row.budget_hours,
    startConditions: row.start_conditions,
    stopConditions: row.stop_conditions,
    currentCommitSha: row.current_commit_sha,
    ciState: row.ci_state,
    securityReviewState: row.security_review_state,
    evidenceManifestSha256: row.evidence_manifest_sha256,
    mergeDecision: row.merge_decision,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function mapAsset(row: AssetRow): HackathonAsset {
  return HackathonAssetSchema.parse({
    id: row.id,
    entryId: row.entry_id,
    kind: row.kind,
    required: row.required === 1,
    status: row.status,
    reference: row.reference,
    contentSha256: row.content_sha256,
    founderReviewState: row.founder_review_state,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function mapDistributionPlan(row: DistributionPlanRow): DistributionPlan {
  return DistributionPlanSchema.parse({
    id: row.id,
    entryId: row.entry_id,
    summary: row.summary,
    status: row.status,
    contentSha256: row.content_sha256,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function mapDistributionItem(row: DistributionItemRow): DistributionItem {
  return DistributionItemSchema.parse({
    id: row.id,
    planId: row.plan_id,
    kind: row.kind,
    phase: row.phase,
    status: row.status,
    title: row.title,
    scheduledAt: row.scheduled_at,
    completedAt: row.completed_at,
    reference: row.reference,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function mapSubmission(row: SubmissionRow): HackathonSubmission {
  return HackathonSubmissionSchema.parse({
    id: row.id,
    entryId: row.entry_id,
    portalUrl: row.portal_url,
    submittedAt: row.submitted_at,
    narrativeProfileId: row.narrative_profile_id,
    canonicalDemoVersionId: row.canonical_demo_version_id,
    repositoryCommitSha: row.repository_commit_sha,
    receiptAssetId: row.receipt_asset_id,
    contentSha256: row.content_sha256,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function mapResult(row: ResultRow): HackathonResult {
  return HackathonResultSchema.parse({
    id: row.id,
    entryId: row.entry_id,
    outcome: row.outcome,
    placement: row.placement,
    prizeValue: row.prize_value,
    prizeAsset: row.prize_asset,
    credits: parseStringArray(row.credits_json, 'credits_json'),
    invitations: parseStringArray(row.invitations_json, 'invitations_json'),
    recordedAt: row.recorded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function mapConversion(row: ConversionRow): HackathonConversion {
  return HackathonConversionSchema.parse({
    id: row.id,
    entryId: row.entry_id,
    kind: row.kind,
    organizationId: row.organization_id,
    title: row.title,
    detail: row.detail,
    valueUsd: row.value_usd,
    status: row.status,
    referenceUrl: row.reference_url,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function sameJson(left: unknown, right: unknown): boolean {
  return stableJson(left) === stableJson(right);
}
