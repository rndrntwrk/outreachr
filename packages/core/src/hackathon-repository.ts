import type { SqlValue } from 'sql.js';

import type { CoreVault } from './database.js';
import { calculateHackathonScore, evaluateHackathonGoNoGo } from './hackathon-scoring.js';
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

interface CycleRow {
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

interface TrackRow {
  id: string;
  cycle_id: string;
  name: string;
  goals: string | null;
  judging_criteria_json: string;
  created_at: string;
  updated_at: string;
}

interface SponsorRow {
  cycle_id: string;
  organization_id: string;
  contact_person_id: string | null;
  relationship_state: string;
  created_at: string;
  updated_at: string;
}

interface BountyRow {
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

interface RuleRow {
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

interface EntryRow {
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

interface EntryVentureRow {
  entry_id: string;
  venture_id: string;
  role: string;
  created_at: string;
}

interface EvaluationRow {
  id: string;
  entry_id: string;
  status: string;
  evaluated_at: string;
  rules_snapshot_sha256: string;
  detail_json: string;
  founder_review_state: string;
  reviewed_at: string | null;
}

interface BuildRow {
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

interface AssetRow {
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

interface DistributionPlanRow {
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

interface DistributionItemRow {
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

interface SubmissionRow {
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

interface ResultRow {
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

interface ConversionRow {
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

function jsonValue(value: string, label: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new Error(`${label} contains invalid JSON`);
  }
}

function stringArray(value: string, label: string): string[] {
  const parsed = jsonValue(value, label);
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) {
    throw new Error(`${label} must contain a JSON string array`);
  }
  return parsed;
}

function mapCycle(row: CycleRow): HackathonCycle {
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

function mapTrack(row: TrackRow): HackathonTrack {
  return HackathonTrackSchema.parse({
    id: row.id,
    cycleId: row.cycle_id,
    name: row.name,
    goals: row.goals,
    judgingCriteria: stringArray(row.judging_criteria_json, 'judging_criteria_json'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mapSponsor(row: SponsorRow): HackathonSponsor {
  return HackathonSponsorSchema.parse({
    cycleId: row.cycle_id,
    organizationId: row.organization_id,
    contactPersonId: row.contact_person_id,
    relationshipState: row.relationship_state,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mapBounty(row: BountyRow): HackathonBounty {
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

function mapRule(row: RuleRow): HackathonRule {
  return HackathonRuleSchema.parse({
    id: row.id,
    cycleId: row.cycle_id,
    ruleType: row.rule_type,
    value: jsonValue(row.value_json, 'value_json'),
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

function mapEntry(row: EntryRow): HackathonEntry {
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

function mapEntryVenture(row: EntryVentureRow): EntryVenture {
  return EntryVentureSchema.parse({
    entryId: row.entry_id,
    ventureId: row.venture_id,
    role: row.role,
    createdAt: row.created_at,
  });
}

function mapEvaluation(row: EvaluationRow): EligibilityEvaluation {
  const detail = jsonValue(row.detail_json, 'detail_json');
  if (!Array.isArray(detail)) throw new Error('detail_json must contain an array');
  return HackathonEligibilityEvaluationSchema.parse({
    id: row.id,
    entryId: row.entry_id,
    status: row.status,
    evaluatedAt: row.evaluated_at,
    rulesSnapshotSha256: row.rules_snapshot_sha256,
    detail,
    founderReviewState: row.founder_review_state,
    reviewedAt: row.reviewed_at,
  });
}

function mapBuild(row: BuildRow): HackathonBuild {
  const toolPolicy = jsonValue(row.tool_policy_json, 'tool_policy_json');
  if (toolPolicy === null || typeof toolPolicy !== 'object' || Array.isArray(toolPolicy)) {
    throw new Error('tool_policy_json must contain an object');
  }
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
    toolPolicy,
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

function mapAsset(row: AssetRow): HackathonAsset {
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

function mapDistributionPlan(row: DistributionPlanRow): DistributionPlan {
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

function mapDistributionItem(row: DistributionItemRow): DistributionItem {
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

function mapSubmission(row: SubmissionRow): HackathonSubmission {
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

function mapResult(row: ResultRow): HackathonResult {
  return HackathonResultSchema.parse({
    id: row.id,
    entryId: row.entry_id,
    outcome: row.outcome,
    placement: row.placement,
    prizeValue: row.prize_value,
    prizeAsset: row.prize_asset,
    credits: stringArray(row.credits_json, 'credits_json'),
    invitations: stringArray(row.invitations_json, 'invitations_json'),
    recordedAt: row.recorded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mapConversion(row: ConversionRow): HackathonConversion {
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

function immutableBuildPlan(build: HackathonBuild): string {
  return stableJson({
    entryId: build.entryId,
    repository: build.repository,
    baseCommitSha: build.baseCommitSha,
    branchName: build.branchName,
    adapterPath: build.adapterPath,
    ownerAgent: build.ownerAgent,
    toolPolicy: build.toolPolicy,
    budgetUsd: build.budgetUsd,
    budgetHours: build.budgetHours,
    startConditions: build.startConditions,
    stopConditions: build.stopConditions,
  });
}

function immutableAsset(asset: HackathonAsset): string {
  return stableJson({
    entryId: asset.entryId,
    kind: asset.kind,
    required: asset.required,
    reference: asset.reference,
    contentSha256: asset.contentSha256,
  });
}

export class HackathonRepository {
  constructor(readonly vault: CoreVault) {}

  private audit(
    action: string,
    entityType: string,
    entityId: string,
    detail: unknown,
    occurredAt: string,
    actorType = 'founder',
    actorId: string | null = 'founder',
  ): void {
    appendAuditEntry(this.vault, {
      occurredAt,
      actorType,
      actorId,
      action,
      entityType,
      entityId,
      detail,
    });
  }

  private requireCycle(idInput: string): HackathonCycle {
    const id = IdSchema.parse(idInput);
    const row = this.vault.one<CycleRow>('SELECT * FROM hackathon_cycles WHERE id=?', [id]);
    if (!row) throw new Error(`Hackathon cycle ${id} does not exist`);
    return mapCycle(row);
  }

  private requireEntry(idInput: string): HackathonEntry {
    const id = IdSchema.parse(idInput);
    const row = this.vault.one<EntryRow>('SELECT * FROM hackathon_entries WHERE id=?', [id]);
    if (!row) throw new Error(`Hackathon entry ${id} does not exist`);
    return mapEntry(row);
  }

  private requireRule(idInput: string): HackathonRule {
    const id = IdSchema.parse(idInput);
    const row = this.vault.one<RuleRow>('SELECT * FROM hackathon_rules WHERE id=?', [id]);
    if (!row) throw new Error(`Hackathon rule ${id} does not exist`);
    return mapRule(row);
  }

  private requireBuild(idInput: string): HackathonBuild {
    const id = IdSchema.parse(idInput);
    const row = this.vault.one<BuildRow>('SELECT * FROM hackathon_builds WHERE id=?', [id]);
    if (!row) throw new Error(`Hackathon build ${id} does not exist`);
    return mapBuild(row);
  }

  private requireAsset(idInput: string): HackathonAsset {
    const id = IdSchema.parse(idInput);
    const row = this.vault.one<AssetRow>('SELECT * FROM hackathon_assets WHERE id=?', [id]);
    if (!row) throw new Error(`Hackathon asset ${id} does not exist`);
    return mapAsset(row);
  }

  private requireDistributionPlan(idInput: string): DistributionPlan {
    const id = IdSchema.parse(idInput);
    const row = this.vault.one<DistributionPlanRow>(
      'SELECT * FROM hackathon_distribution_plans WHERE id=?',
      [id],
    );
    if (!row) throw new Error(`Hackathon distribution plan ${id} does not exist`);
    return mapDistributionPlan(row);
  }

  private currentRulesDigest(cycleIdInput: string): string | null {
    const cycleId = IdSchema.parse(cycleIdInput);
    const value = this.vault.scalar('SELECT rules_sha256 FROM hackathon_cycles WHERE id=?', [cycleId]);
    return typeof value === 'string' ? value : null;
  }

  private refreshRulesDigest(cycleIdInput: string, updatedAtInput: string): string {
    const cycleId = IdSchema.parse(cycleIdInput);
    const updatedAt = IsoDateTimeSchema.parse(updatedAtInput);
    const digest = hackathonRulesDigest(this.listRules(cycleId));
    this.vault.run('UPDATE hackathon_cycles SET rules_sha256=?,updated_at=? WHERE id=?', [
      digest,
      updatedAt,
      cycleId,
    ]);
    return digest;
  }

  upsertCycle(input: HackathonCycleInput): HackathonCycle {
    const parsed = HackathonCycleSchema.parse(input);
    const existing = this.vault.one<CycleRow>('SELECT * FROM hackathon_cycles WHERE id=?', [
      parsed.id,
    ]);
    const hasRulesDigest = Object.prototype.hasOwnProperty.call(input, 'rulesSha256');
    const value = {
      ...parsed,
      rulesSha256: hasRulesDigest ? parsed.rulesSha256 : (existing?.rules_sha256 ?? null),
    };

    this.vault.transaction(() => {
      this.vault.run(
        `INSERT INTO hackathon_cycles(
          id,opportunity_id,cycle_name,registration_open_at,registration_close_at,build_start_at,
          build_end_at,submission_deadline_at,judging_start_at,judging_end_at,demo_day_at,result_at,
          format,location,state,rules_source_id,rules_retrieved_at,rules_sha256,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
          opportunity_id=excluded.opportunity_id,cycle_name=excluded.cycle_name,
          registration_open_at=excluded.registration_open_at,
          registration_close_at=excluded.registration_close_at,build_start_at=excluded.build_start_at,
          build_end_at=excluded.build_end_at,submission_deadline_at=excluded.submission_deadline_at,
          judging_start_at=excluded.judging_start_at,judging_end_at=excluded.judging_end_at,
          demo_day_at=excluded.demo_day_at,result_at=excluded.result_at,format=excluded.format,
          location=excluded.location,state=excluded.state,rules_source_id=excluded.rules_source_id,
          rules_retrieved_at=excluded.rules_retrieved_at,rules_sha256=excluded.rules_sha256,
          updated_at=excluded.updated_at`,
        [
          value.id,
          value.opportunityId,
          value.cycleName,
          value.registrationOpenAt,
          value.registrationCloseAt,
          value.buildStartAt,
          value.buildEndAt,
          value.submissionDeadlineAt,
          value.judgingStartAt,
          value.judgingEndAt,
          value.demoDayAt,
          value.resultAt,
          value.format,
          value.location,
          value.state,
          value.rulesSourceId,
          value.rulesRetrievedAt,
          value.rulesSha256,
          value.createdAt,
          value.updatedAt,
        ],
      );
      this.audit(
        'hackathon.cycle_upserted',
        'hackathon_cycle',
        value.id,
        { opportunityId: value.opportunityId, state: value.state },
        value.updatedAt,
      );
    });
    return this.requireCycle(value.id);
  }

  listCycles(): HackathonCycle[] {
    return this.vault
      .all<CycleRow>('SELECT * FROM hackathon_cycles ORDER BY submission_deadline_at IS NULL,submission_deadline_at,id')
      .map(mapCycle);
  }

  upsertTrack(input: HackathonTrackInput): HackathonTrack {
    const value = HackathonTrackSchema.parse(input);
    this.requireCycle(value.cycleId);
    this.vault.transaction(() => {
      this.vault.run(
        `INSERT INTO hackathon_tracks(id,cycle_id,name,goals,judging_criteria_json,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
          cycle_id=excluded.cycle_id,name=excluded.name,goals=excluded.goals,
          judging_criteria_json=excluded.judging_criteria_json,updated_at=excluded.updated_at`,
        [
          value.id,
          value.cycleId,
          value.name,
          value.goals,
          stableJson(value.judgingCriteria),
          value.createdAt,
          value.updatedAt,
        ],
      );
      this.audit(
        'hackathon.track_upserted',
        'hackathon_track',
        value.id,
        { cycleId: value.cycleId },
        value.updatedAt,
      );
    });
    const row = this.vault.one<TrackRow>('SELECT * FROM hackathon_tracks WHERE id=?', [value.id]);
    return mapTrack(row!);
  }

  listTracks(cycleIdInput?: string): HackathonTrack[] {
    const rows = cycleIdInput
      ? this.vault.all<TrackRow>('SELECT * FROM hackathon_tracks WHERE cycle_id=? ORDER BY name,id', [
          IdSchema.parse(cycleIdInput),
        ])
      : this.vault.all<TrackRow>('SELECT * FROM hackathon_tracks ORDER BY cycle_id,name,id');
    return rows.map(mapTrack);
  }

  upsertSponsor(input: HackathonSponsorInput): HackathonSponsor {
    const value = HackathonSponsorSchema.parse(input);
    this.requireCycle(value.cycleId);
    this.vault.transaction(() => {
      this.vault.run(
        `INSERT INTO hackathon_sponsors(
          cycle_id,organization_id,contact_person_id,relationship_state,created_at,updated_at
        ) VALUES (?,?,?,?,?,?) ON CONFLICT(cycle_id,organization_id) DO UPDATE SET
          contact_person_id=excluded.contact_person_id,relationship_state=excluded.relationship_state,
          updated_at=excluded.updated_at`,
        [
          value.cycleId,
          value.organizationId,
          value.contactPersonId,
          value.relationshipState,
          value.createdAt,
          value.updatedAt,
        ],
      );
      this.audit(
        'hackathon.sponsor_upserted',
        'hackathon_cycle',
        value.cycleId,
        { organizationId: value.organizationId, relationshipState: value.relationshipState },
        value.updatedAt,
      );
    });
    const row = this.vault.one<SponsorRow>(
      'SELECT * FROM hackathon_sponsors WHERE cycle_id=? AND organization_id=?',
      [value.cycleId, value.organizationId],
    );
    return mapSponsor(row!);
  }

  listSponsors(cycleIdInput?: string): HackathonSponsor[] {
    const rows = cycleIdInput
      ? this.vault.all<SponsorRow>(
          'SELECT * FROM hackathon_sponsors WHERE cycle_id=? ORDER BY organization_id',
          [IdSchema.parse(cycleIdInput)],
        )
      : this.vault.all<SponsorRow>('SELECT * FROM hackathon_sponsors ORDER BY cycle_id,organization_id');
    return rows.map(mapSponsor);
  }

  upsertBounty(input: HackathonBountyInput): HackathonBounty {
    const value = HackathonBountySchema.parse(input);
    this.requireCycle(value.cycleId);
    this.vault.transaction(() => {
      this.vault.run(
        `INSERT INTO hackathon_bounties(
          id,cycle_id,sponsor_organization_id,track_id,title,amount_value,amount_asset,
          required_technology,eligibility,judging_criteria,submission_requirements,source_id,
          freshness_state,conflict_lock_in_notes,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
          cycle_id=excluded.cycle_id,sponsor_organization_id=excluded.sponsor_organization_id,
          track_id=excluded.track_id,title=excluded.title,amount_value=excluded.amount_value,
          amount_asset=excluded.amount_asset,required_technology=excluded.required_technology,
          eligibility=excluded.eligibility,judging_criteria=excluded.judging_criteria,
          submission_requirements=excluded.submission_requirements,source_id=excluded.source_id,
          freshness_state=excluded.freshness_state,
          conflict_lock_in_notes=excluded.conflict_lock_in_notes,updated_at=excluded.updated_at`,
        [
          value.id,
          value.cycleId,
          value.sponsorOrganizationId,
          value.trackId,
          value.title,
          value.amountValue,
          value.amountAsset,
          value.requiredTechnology,
          value.eligibility,
          value.judgingCriteria,
          value.submissionRequirements,
          value.sourceId,
          value.freshnessState,
          value.conflictLockInNotes,
          value.createdAt,
          value.updatedAt,
        ],
      );
      this.audit(
        'hackathon.bounty_upserted',
        'hackathon_bounty',
        value.id,
        { cycleId: value.cycleId, trackId: value.trackId },
        value.updatedAt,
      );
    });
    const row = this.vault.one<BountyRow>('SELECT * FROM hackathon_bounties WHERE id=?', [value.id]);
    return mapBounty(row!);
  }

  listBounties(cycleIdInput?: string): HackathonBounty[] {
    const rows = cycleIdInput
      ? this.vault.all<BountyRow>(
          'SELECT * FROM hackathon_bounties WHERE cycle_id=? ORDER BY title,id',
          [IdSchema.parse(cycleIdInput)],
        )
      : this.vault.all<BountyRow>('SELECT * FROM hackathon_bounties ORDER BY cycle_id,title,id');
    return rows.map(mapBounty);
  }

  upsertRule(input: HackathonRuleInput): HackathonRule {
    const value = HackathonRuleSchema.parse(input);
    this.requireCycle(value.cycleId);
    const existing = this.vault.one<RuleRow>('SELECT * FROM hackathon_rules WHERE id=?', [value.id]);
    if (existing && existing.review_state !== 'pending') {
      const current = mapRule(existing);
      if (stableJson(current) === stableJson(value)) return current;
      throw new Error('Reviewed hackathon rules are immutable');
    }
    if (!existing && (value.reviewState !== 'pending' || value.reviewedAt !== null)) {
      throw new Error('New hackathon rules must start pending');
    }

    this.vault.transaction(() => {
      this.vault.run(
        `INSERT INTO hackathon_rules(
          id,cycle_id,rule_type,value_json,blocking,source_id,observed_at,confidence,
          review_state,reviewed_at,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
          cycle_id=excluded.cycle_id,rule_type=excluded.rule_type,value_json=excluded.value_json,
          blocking=excluded.blocking,source_id=excluded.source_id,observed_at=excluded.observed_at,
          confidence=excluded.confidence,review_state=excluded.review_state,
          reviewed_at=excluded.reviewed_at,updated_at=excluded.updated_at`,
        [
          value.id,
          value.cycleId,
          value.ruleType,
          stableJson(value.value),
          value.blocking ? 1 : 0,
          value.sourceId,
          value.observedAt,
          value.confidence,
          value.reviewState,
          value.reviewedAt,
          value.createdAt,
          value.updatedAt,
        ],
      );
      this.audit(
        'hackathon.rule_upserted',
        'hackathon_rule',
        value.id,
        { cycleId: value.cycleId, blocking: value.blocking },
        value.updatedAt,
      );
    });
    return this.requireRule(value.id);
  }

  reviewRule(
    idInput: string,
    decisionInput: 'accept' | 'reject' | 'accepted' | 'rejected',
    reviewedAtInput: string,
  ): HackathonRule {
    const id = IdSchema.parse(idInput);
    const reviewedAt = IsoDateTimeSchema.parse(reviewedAtInput);
    const current = this.requireRule(id);
    if (current.reviewState !== 'pending') throw new Error('Reviewed hackathon rules are immutable');
    const decision = decisionInput === 'accept' || decisionInput === 'accepted' ? 'accepted' : 'rejected';

    return this.vault.transaction(() => {
      this.vault.run(
        `UPDATE hackathon_rules SET review_state=?,reviewed_at=?,updated_at=?
         WHERE id=? AND review_state='pending'`,
        [decision, reviewedAt, reviewedAt, id],
      );
      const digest = this.refreshRulesDigest(current.cycleId, reviewedAt);
      this.audit(
        'hackathon.rule_reviewed',
        'hackathon_rule',
        id,
        { decision, cycleId: current.cycleId, rulesSnapshotSha256: digest },
        reviewedAt,
      );
      return this.requireRule(id);
    });
  }

  listRules(cycleIdInput?: string): HackathonRule[] {
    const rows = cycleIdInput
      ? this.vault.all<RuleRow>('SELECT * FROM hackathon_rules WHERE cycle_id=? ORDER BY id', [
          IdSchema.parse(cycleIdInput),
        ])
      : this.vault.all<RuleRow>('SELECT * FROM hackathon_rules ORDER BY cycle_id,id');
    return rows.map(mapRule);
  }

  createEntry(input: HackathonEntryCreateInput): HackathonEntry {
    const value = HackathonEntryCreateSchema.parse(input);
    const cycle = this.requireCycle(value.cycleId);
    const weightedScore = calculateHackathonScore({
      strategicFit: value.strategicFit,
      acceptanceProbability: value.acceptanceProbability,
      capitalUpside: value.capitalUpside,
      distributionUpside: value.distributionUpside,
      technicalLeverage: value.technicalLeverage,
      credibility: value.credibility,
      urgency: value.urgency,
      effortEfficiency: value.effortEfficiency,
      lockInSafety: value.lockInSafety,
      reusePercentage: value.reusePercentage,
      estimatedHours: value.estimatedHours,
      deadline: cycle.submissionDeadlineAt,
      evaluatedAt: value.createdAt,
    });

    this.vault.transaction(() => {
      this.vault.run(
        `INSERT INTO hackathon_entries(
          id,cycle_id,legal_entity_id,narrative_profile_id,canonical_demo_version_id,
          submission_concept,user_outcome,ecosystem_adapter,estimated_hours,reuse_percentage,
          strategic_fit,acceptance_probability,capital_upside,distribution_upside,
          technical_leverage,credibility,urgency,effort_efficiency,lock_in_safety,weighted_score,
          founder_decision,founder_rationale,state,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          value.id,
          value.cycleId,
          value.legalEntityId,
          value.narrativeProfileId,
          value.canonicalDemoVersionId,
          value.submissionConcept,
          value.userOutcome,
          value.ecosystemAdapter,
          value.estimatedHours,
          value.reusePercentage,
          value.strategicFit,
          value.acceptanceProbability,
          value.capitalUpside,
          value.distributionUpside,
          value.technicalLeverage,
          value.credibility,
          value.urgency,
          value.effortEfficiency,
          value.lockInSafety,
          weightedScore,
          'pending',
          null,
          'candidate',
          value.createdAt,
          value.updatedAt,
        ],
      );
      this.audit(
        'hackathon.entry_created',
        'hackathon_entry',
        value.id,
        { cycleId: value.cycleId, weightedScore },
        value.createdAt,
      );
    });
    return this.requireEntry(value.id);
  }

  replaceEntryVentures(
    entryIdInput: string,
    venturesInput: EntryVentureInput[],
  ): void {
    const entry = this.requireEntry(entryIdInput);
    if (entry.state !== 'candidate') {
      throw new Error('Only candidate entries can change venture assignments');
    }
    const ventures = venturesInput.map((input) => EntryVentureSchema.parse(input));
    if (ventures.some((venture) => venture.entryId !== entry.id)) {
      throw new Error('Every venture assignment must target the selected entry');
    }
    if (ventures.filter((venture) => venture.role === 'lead').length > 1) {
      throw new Error('A hackathon entry can have at most one lead venture');
    }
    const createdAt = ventures[0]?.createdAt ?? entry.updatedAt;

    this.vault.transaction(() => {
      this.vault.run('DELETE FROM hackathon_entry_ventures WHERE entry_id=?', [entry.id]);
      for (const venture of ventures) {
        this.vault.run(
          'INSERT INTO hackathon_entry_ventures(entry_id,venture_id,role,created_at) VALUES (?,?,?,?)',
          [venture.entryId, venture.ventureId, venture.role, venture.createdAt],
        );
      }
      this.audit(
        'hackathon.entry_ventures_replaced',
        'hackathon_entry',
        entry.id,
        { ventures: ventures.map(({ ventureId, role }) => ({ ventureId, role })) },
        createdAt,
      );
    });
  }

  replaceEntryTracks(entryIdInput: string, trackIdsInput: string[], createdAtInput: string): void {
    const entry = this.requireEntry(entryIdInput);
    if (entry.state !== 'candidate') throw new Error('Only candidate entries can change track assignments');
    const createdAt = IsoDateTimeSchema.parse(createdAtInput);
    const trackIds = [...new Set(trackIdsInput.map((id) => IdSchema.parse(id)))];
    this.vault.transaction(() => {
      this.vault.run('DELETE FROM hackathon_entry_tracks WHERE entry_id=?', [entry.id]);
      for (const trackId of trackIds) {
        this.vault.run(
          'INSERT INTO hackathon_entry_tracks(entry_id,track_id,created_at) VALUES (?,?,?)',
          [entry.id, trackId, createdAt],
        );
      }
      this.audit(
        'hackathon.entry_tracks_replaced',
        'hackathon_entry',
        entry.id,
        { trackIds },
        createdAt,
      );
    });
  }

  replaceEntryBounties(entryIdInput: string, bountyIdsInput: string[], createdAtInput: string): void {
    const entry = this.requireEntry(entryIdInput);
    if (entry.state !== 'candidate') throw new Error('Only candidate entries can change bounty assignments');
    const createdAt = IsoDateTimeSchema.parse(createdAtInput);
    const bountyIds = [...new Set(bountyIdsInput.map((id) => IdSchema.parse(id)))];
    this.vault.transaction(() => {
      this.vault.run('DELETE FROM hackathon_entry_bounties WHERE entry_id=?', [entry.id]);
      for (const bountyId of bountyIds) {
        this.vault.run(
          'INSERT INTO hackathon_entry_bounties(entry_id,bounty_id,created_at) VALUES (?,?,?)',
          [entry.id, bountyId, createdAt],
        );
      }
      this.audit(
        'hackathon.entry_bounties_replaced',
        'hackathon_entry',
        entry.id,
        { bountyIds },
        createdAt,
      );
    });
  }

  saveEligibilityEvaluation(input: EligibilityEvaluationInput): EligibilityEvaluation {
    const value = HackathonEligibilityEvaluationSchema.parse(input);
    const entry = this.requireEntry(value.entryId);
    const currentRules = this.currentRulesDigest(entry.cycleId);
    if (value.founderReviewState === 'accepted' && currentRules !== value.rulesSnapshotSha256) {
      throw new Error('Accepted eligibility must match the current rules digest');
    }
    const existing = this.vault.one<EvaluationRow>(
      'SELECT * FROM hackathon_eligibility_evaluations WHERE id=?',
      [value.id],
    );
    if (existing && existing.founder_review_state !== 'pending') {
      const current = mapEvaluation(existing);
      if (stableJson(current) === stableJson(value)) return current;
      throw new Error('Reviewed eligibility evaluations are immutable');
    }

    this.vault.transaction(() => {
      if (!existing) {
        this.vault.run(
          `INSERT INTO hackathon_eligibility_evaluations(
            id,entry_id,status,evaluated_at,rules_snapshot_sha256,detail_json,
            founder_review_state,reviewed_at
          ) VALUES (?,?,?,?,?,?,?,?)`,
          [
            value.id,
            value.entryId,
            value.status,
            value.evaluatedAt,
            value.rulesSnapshotSha256,
            stableJson(value.detail),
            'pending',
            null,
          ],
        );
      } else {
        this.vault.run(
          `UPDATE hackathon_eligibility_evaluations SET entry_id=?,status=?,evaluated_at=?,
           rules_snapshot_sha256=?,detail_json=? WHERE id=? AND founder_review_state='pending'`,
          [
            value.entryId,
            value.status,
            value.evaluatedAt,
            value.rulesSnapshotSha256,
            stableJson(value.detail),
            value.id,
          ],
        );
      }
      if (value.founderReviewState !== 'pending') {
        this.vault.run(
          `UPDATE hackathon_eligibility_evaluations
           SET founder_review_state=?,reviewed_at=? WHERE id=? AND founder_review_state='pending'`,
          [value.founderReviewState, value.reviewedAt, value.id],
        );
      }
      this.audit(
        'hackathon.eligibility_saved',
        'hackathon_entry',
        value.entryId,
        {
          evaluationId: value.id,
          status: value.status,
          rulesSnapshotSha256: value.rulesSnapshotSha256,
          founderReviewState: value.founderReviewState,
        },
        value.reviewedAt ?? value.evaluatedAt,
      );
    });
    const row = this.vault.one<EvaluationRow>(
      'SELECT * FROM hackathon_eligibility_evaluations WHERE id=?',
      [value.id],
    );
    return mapEvaluation(row!);
  }

  decideEntry(input: EntryDecisionInput): HackathonEntry {
    const value = EntryDecisionSchema.parse(input);
    const entry = this.requireEntry(value.id);
    if (entry.state !== 'candidate') throw new Error('Only candidate entries can be decided');
    if (value.decision === 'conditional_go' && !value.rationale) {
      throw new Error('A conditional go decision requires explicit founder conditions');
    }
    const cycle = this.requireCycle(entry.cycleId);
    const leadVenture = this.vault.scalar(
      "SELECT venture_id FROM hackathon_entry_ventures WHERE entry_id=? AND role='lead'",
      [entry.id],
    );
    const narrativeApproved = Boolean(
      this.vault.scalar(
        `SELECT 1 FROM narrative_profiles WHERE id=? AND legal_entity_id=?
         AND purpose='hackathon' AND approval_state='approved'`,
        [entry.narrativeProfileId, entry.legalEntityId],
      ),
    );
    const demoApproved = Boolean(
      this.vault.scalar(
        "SELECT 1 FROM canonical_demo_versions WHERE id=? AND approval_state='approved'",
        [entry.canonicalDemoVersionId],
      ),
    );
    const currentRules = cycle.rulesSha256;
    const evaluation = currentRules
      ? this.vault.one<EvaluationRow>(
          `SELECT * FROM hackathon_eligibility_evaluations
           WHERE entry_id=? AND rules_snapshot_sha256=?
           ORDER BY evaluated_at DESC,id DESC LIMIT 1`,
          [entry.id, currentRules],
        )
      : null;
    const pendingBlockingRules = Number(
      this.vault.scalar(
        `SELECT COUNT(*) FROM hackathon_rules WHERE cycle_id=? AND blocking=1
         AND (review_state!='accepted' OR confidence IN ('unknown','stale'))`,
        [entry.cycleId],
      ) ?? 0,
    );
    const weightedScore = calculateHackathonScore({
      strategicFit: entry.strategicFit,
      acceptanceProbability: entry.acceptanceProbability,
      capitalUpside: entry.capitalUpside,
      distributionUpside: entry.distributionUpside,
      technicalLeverage: entry.technicalLeverage,
      credibility: entry.credibility,
      urgency: entry.urgency,
      effortEfficiency: entry.effortEfficiency,
      lockInSafety: entry.lockInSafety,
      reusePercentage: entry.reusePercentage,
      estimatedHours: entry.estimatedHours,
      deadline: cycle.submissionDeadlineAt,
      evaluatedAt: value.decidedAt,
    });
    const recommendation = evaluateHackathonGoNoGo({
      strategicFit: entry.strategicFit,
      acceptanceProbability: entry.acceptanceProbability,
      capitalUpside: entry.capitalUpside,
      distributionUpside: entry.distributionUpside,
      technicalLeverage: entry.technicalLeverage,
      credibility: entry.credibility,
      urgency: entry.urgency,
      effortEfficiency: entry.effortEfficiency,
      lockInSafety: entry.lockInSafety,
      reusePercentage: entry.reusePercentage,
      estimatedHours: entry.estimatedHours,
      deadline: cycle.submissionDeadlineAt,
      evaluatedAt: value.decidedAt,
      hasLegalEntity: true,
      hasLeadVenture: typeof leadVenture === 'string',
      hasApprovedNarrative: narrativeApproved,
      hasApprovedDemo: demoApproved,
      eligibilityStatus:
        evaluation && evaluation.founder_review_state === 'accepted'
          ? (evaluation.status as 'eligible' | 'ineligible' | 'uncertain')
          : null,
      pendingBlockingRules,
      founderConditions:
        value.decision === 'conditional_go' && value.rationale ? [value.rationale] : [],
    });

    this.vault.transaction(() => {
      this.vault.run(
        `UPDATE hackathon_entries SET founder_decision=?,founder_rationale=?,
         weighted_score=?,updated_at=? WHERE id=? AND state='candidate'`,
        [value.decision, value.rationale, weightedScore, value.decidedAt, entry.id],
      );
      this.audit(
        'hackathon.entry_decided',
        'hackathon_entry',
        entry.id,
        {
          founderDecision: value.decision,
          founderRationale: value.rationale,
          weightedScore,
          recommendation: recommendation.recommendation,
          blockingReasons: recommendation.blockingReasons,
          scoreSnapshot: {
            strategicFit: entry.strategicFit,
            acceptanceProbability: entry.acceptanceProbability,
            capitalUpside: entry.capitalUpside,
            distributionUpside: entry.distributionUpside,
            technicalLeverage: entry.technicalLeverage,
            credibility: entry.credibility,
            urgency: entry.urgency,
            effortEfficiency: entry.effortEfficiency,
            lockInSafety: entry.lockInSafety,
            reusePercentage: entry.reusePercentage,
            estimatedHours: entry.estimatedHours,
          },
          rulesSnapshotSha256: currentRules,
        },
        value.decidedAt,
      );
    });
    return this.requireEntry(entry.id);
  }

  private readiness(entryIdInput: string): HackathonReadiness {
    const detail = this.getEntry(entryIdInput);
    if (!detail) throw new Error(`Hackathon entry ${entryIdInput} does not exist`);
    const cycle = this.requireCycle(detail.cycleId);
    const currentRules = cycle.rulesSha256;
    const eligibility = currentRules
      ? detail.eligibilityEvaluations.find(
          (evaluation) => evaluation.rulesSnapshotSha256 === currentRules,
        ) ?? null
      : null;
    const pendingBlockingRules = Number(
      this.vault.scalar(
        `SELECT COUNT(*) FROM hackathon_rules WHERE cycle_id=? AND blocking=1
         AND (review_state!='accepted' OR confidence IN ('unknown','stale'))`,
        [detail.cycleId],
      ) ?? 0,
    );
    return calculateHackathonReadiness({
      founderDecision: detail.founderDecision,
      hasLeadVenture: detail.leadVentureId !== null,
      narrativeApproved: Boolean(
        this.vault.scalar(
          "SELECT 1 FROM narrative_profiles WHERE id=? AND purpose='hackathon' AND approval_state='approved'",
          [detail.narrativeProfileId],
        ),
      ),
      demoApproved: Boolean(
        this.vault.scalar(
          "SELECT 1 FROM canonical_demo_versions WHERE id=? AND approval_state='approved'",
          [detail.canonicalDemoVersionId],
        ),
      ),
      currentRulesSha256: currentRules,
      eligibility: eligibility
        ? {
            status: eligibility.status,
            rulesSnapshotSha256: eligibility.rulesSnapshotSha256,
            founderReviewState: eligibility.founderReviewState,
          }
        : null,
      pendingBlockingRules,
      build: detail.build
        ? {
            status: detail.build.status,
            ciState: detail.build.ciState,
            securityReviewState: detail.build.securityReviewState,
            evidenceManifestSha256: detail.build.evidenceManifestSha256,
            currentCommitSha: detail.build.currentCommitSha,
          }
        : null,
      requiredAssets: detail.assets
        .filter((asset) => asset.required)
        .map((asset) => ({
          id: asset.id,
          status: asset.status,
          founderReviewState: asset.founderReviewState,
        })),
      distributionPlanStatus: detail.distributionPlan?.status ?? null,
      distributionItemPhases: detail.distributionItems
        .filter((item) => item.status !== 'cancelled')
        .map((item) => item.phase),
      receiptRecorded: detail.submission !== null,
    });
  }

  transitionEntry(input: EntryTransitionInput): HackathonEntry {
    const value = EntryTransitionSchema.parse(input);
    const entry = this.requireEntry(value.id);
    const readiness = this.readiness(entry.id);
    const transition = canTransitionHackathonEntry(entry.state, value.toState, readiness);
    if (!transition.allowed) throw new Error(transition.reason ?? 'Hackathon entry transition is blocked');

    this.vault.transaction(() => {
      this.vault.run('UPDATE hackathon_entries SET state=?,updated_at=? WHERE id=?', [
        value.toState,
        value.transitionedAt,
        entry.id,
      ]);
      this.audit(
        'hackathon.entry_transitioned',
        'hackathon_entry',
        entry.id,
        {
          fromState: entry.state,
          toState: value.toState,
          founderDecision: entry.founderDecision,
          weightedScore: entry.weightedScore,
          rulesSnapshotSha256: this.currentRulesDigest(entry.cycleId),
          readiness,
        },
        value.transitionedAt,
      );
    });
    return this.requireEntry(entry.id);
  }

  saveBuild(input: HackathonBuildInput): HackathonBuild {
    const value = HackathonBuildSchema.parse(input);
    this.requireEntry(value.entryId);
    const row = this.vault.one<BuildRow>('SELECT * FROM hackathon_builds WHERE id=?', [value.id]);
    const existing = row ? mapBuild(row) : null;
    if (!existing && value.status !== 'draft') {
      throw new Error('A new hackathon build must start as a draft');
    }
    if (existing && existing.status !== 'draft' && immutableBuildPlan(existing) !== immutableBuildPlan(value)) {
      throw new Error('Approved hackathon build plan is immutable');
    }

    this.vault.transaction(() => {
      if (!existing) {
        this.vault.run(
          `INSERT INTO hackathon_builds(
            id,entry_id,status,repository,base_commit_sha,branch_name,worktree_reference,
            adapter_path,owner_agent,tool_policy_json,budget_usd,budget_hours,start_conditions,
            stop_conditions,current_commit_sha,ci_state,security_review_state,
            evidence_manifest_sha256,merge_decision,approved_by,approved_at,started_at,
            completed_at,created_at,updated_at
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            value.id,
            value.entryId,
            'draft',
            value.repository,
            value.baseCommitSha,
            value.branchName,
            value.worktreeReference,
            value.adapterPath,
            value.ownerAgent,
            stableJson(value.toolPolicy),
            value.budgetUsd,
            value.budgetHours,
            value.startConditions,
            value.stopConditions,
            value.status === 'draft' ? value.currentCommitSha : null,
            value.status === 'draft' ? value.ciState : 'not_run',
            value.status === 'draft' ? value.securityReviewState : 'pending',
            value.status === 'draft' ? value.evidenceManifestSha256 : null,
            value.status === 'draft' ? value.mergeDecision : 'pending',
            null,
            null,
            null,
            null,
            value.createdAt,
            value.updatedAt,
          ],
        );
      } else if (existing.status === 'draft' && value.status === 'draft') {
        this.vault.run(
          `UPDATE hackathon_builds SET entry_id=?,repository=?,base_commit_sha=?,branch_name=?,
           worktree_reference=?,adapter_path=?,owner_agent=?,tool_policy_json=?,budget_usd=?,
           budget_hours=?,start_conditions=?,stop_conditions=?,current_commit_sha=?,ci_state=?,
           security_review_state=?,evidence_manifest_sha256=?,merge_decision=?,updated_at=? WHERE id=?`,
          [
            value.entryId,
            value.repository,
            value.baseCommitSha,
            value.branchName,
            value.worktreeReference,
            value.adapterPath,
            value.ownerAgent,
            stableJson(value.toolPolicy),
            value.budgetUsd,
            value.budgetHours,
            value.startConditions,
            value.stopConditions,
            value.currentCommitSha,
            value.ciState,
            value.securityReviewState,
            value.evidenceManifestSha256,
            value.mergeDecision,
            value.updatedAt,
            value.id,
          ],
        );
      }

      let currentStatus = existing?.status ?? 'draft';
      if (currentStatus === 'draft' && value.status !== 'draft') {
        this.vault.run(
          `UPDATE hackathon_builds SET status='approved',approved_by=?,approved_at=?,
           worktree_reference=?,current_commit_sha=?,ci_state=?,security_review_state=?,
           evidence_manifest_sha256=?,merge_decision=?,started_at=?,completed_at=?,updated_at=?
           WHERE id=?`,
          [
            value.approvedBy,
            value.approvedAt,
            value.worktreeReference,
            value.currentCommitSha,
            value.ciState,
            value.securityReviewState,
            value.evidenceManifestSha256,
            value.mergeDecision,
            value.startedAt,
            value.completedAt,
            value.updatedAt,
            value.id,
          ],
        );
        currentStatus = 'approved';
      }
      if (currentStatus === 'approved' && ['active', 'completed'].includes(value.status)) {
        this.vault.run(
          `UPDATE hackathon_builds SET status='active',worktree_reference=?,current_commit_sha=?,
           ci_state=?,security_review_state=?,evidence_manifest_sha256=?,merge_decision=?,
           started_at=?,completed_at=?,updated_at=? WHERE id=?`,
          [
            value.worktreeReference,
            value.currentCommitSha,
            value.ciState,
            value.securityReviewState,
            value.evidenceManifestSha256,
            value.mergeDecision,
            value.startedAt,
            value.completedAt,
            value.updatedAt,
            value.id,
          ],
        );
        currentStatus = 'active';
      }
      if (currentStatus === 'active' && value.status === 'completed') {
        this.vault.run(
          `UPDATE hackathon_builds SET status='completed',worktree_reference=?,current_commit_sha=?,
           ci_state=?,security_review_state=?,evidence_manifest_sha256=?,merge_decision=?,
           completed_at=?,updated_at=? WHERE id=?`,
          [
            value.worktreeReference,
            value.currentCommitSha,
            value.ciState,
            value.securityReviewState,
            value.evidenceManifestSha256,
            value.mergeDecision,
            value.completedAt,
            value.updatedAt,
            value.id,
          ],
        );
        currentStatus = 'completed';
      }
      if (value.status === 'cancelled' && currentStatus !== 'cancelled') {
        this.vault.run(
          `UPDATE hackathon_builds SET status='cancelled',worktree_reference=?,current_commit_sha=?,
           ci_state=?,security_review_state=?,evidence_manifest_sha256=?,merge_decision=?,
           completed_at=?,updated_at=? WHERE id=?`,
          [
            value.worktreeReference,
            value.currentCommitSha,
            value.ciState,
            value.securityReviewState,
            value.evidenceManifestSha256,
            value.mergeDecision,
            value.completedAt,
            value.updatedAt,
            value.id,
          ],
        );
      }
      if (existing && existing.status !== 'draft' && existing.status === value.status) {
        this.vault.run(
          `UPDATE hackathon_builds SET worktree_reference=?,current_commit_sha=?,ci_state=?,
           security_review_state=?,evidence_manifest_sha256=?,merge_decision=?,started_at=?,
           completed_at=?,updated_at=? WHERE id=?`,
          [
            value.worktreeReference,
            value.currentCommitSha,
            value.ciState,
            value.securityReviewState,
            value.evidenceManifestSha256,
            value.mergeDecision,
            value.startedAt,
            value.completedAt,
            value.updatedAt,
            value.id,
          ],
        );
      }
      this.audit(
        'hackathon.build_saved',
        'hackathon_entry',
        value.entryId,
        { buildId: value.id, status: value.status, currentCommitSha: value.currentCommitSha },
        value.updatedAt,
      );
    });
    return this.requireBuild(value.id);
  }

  saveAsset(input: HackathonAssetInput): HackathonAsset {
    const value = HackathonAssetSchema.parse(input);
    this.requireEntry(value.entryId);
    const row = this.vault.one<AssetRow>('SELECT * FROM hackathon_assets WHERE id=?', [value.id]);
    const existing = row ? mapAsset(row) : null;
    if (existing && existing.founderReviewState !== 'pending') {
      if (stableJson(existing) === stableJson(value)) return existing;
      throw new Error('Reviewed hackathon assets are immutable');
    }

    this.vault.transaction(() => {
      if (!existing) {
        this.vault.run(
          `INSERT INTO hackathon_assets(
            id,entry_id,kind,required,status,reference,content_sha256,
            founder_review_state,reviewed_at,created_at,updated_at
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [
            value.id,
            value.entryId,
            value.kind,
            value.required ? 1 : 0,
            value.status === 'approved' ? 'ready' : value.status,
            value.reference,
            value.contentSha256,
            'pending',
            null,
            value.createdAt,
            value.updatedAt,
          ],
        );
      } else {
        this.vault.run(
          `UPDATE hackathon_assets SET entry_id=?,kind=?,required=?,status=?,reference=?,
           content_sha256=?,updated_at=? WHERE id=? AND founder_review_state='pending'`,
          [
            value.entryId,
            value.kind,
            value.required ? 1 : 0,
            value.status === 'approved' ? 'ready' : value.status,
            value.reference,
            value.contentSha256,
            value.updatedAt,
            value.id,
          ],
        );
      }
      if (value.founderReviewState !== 'pending') {
        this.vault.run(
          `UPDATE hackathon_assets SET status=?,founder_review_state=?,reviewed_at=?,updated_at=?
           WHERE id=? AND founder_review_state='pending'`,
          [value.status, value.founderReviewState, value.reviewedAt, value.updatedAt, value.id],
        );
      }
      this.audit(
        'hackathon.asset_saved',
        'hackathon_entry',
        value.entryId,
        {
          assetId: value.id,
          kind: value.kind,
          required: value.required,
          status: value.status,
          founderReviewState: value.founderReviewState,
        },
        value.reviewedAt ?? value.updatedAt,
      );
    });
    return this.requireAsset(value.id);
  }

  saveDistributionPlan(input: DistributionPlanInput): DistributionPlan {
    const value = DistributionPlanSchema.parse(input);
    this.requireEntry(value.entryId);
    const row = this.vault.one<DistributionPlanRow>(
      'SELECT * FROM hackathon_distribution_plans WHERE id=?',
      [value.id],
    );
    const existing = row ? mapDistributionPlan(row) : null;
    if (existing && existing.status !== 'draft') {
      if (stableJson(existing) === stableJson(value)) return existing;
      throw new Error('Approved hackathon distribution plans are immutable');
    }

    this.vault.transaction(() => {
      if (!existing) {
        this.vault.run(
          `INSERT INTO hackathon_distribution_plans(
            id,entry_id,summary,status,content_sha256,approved_by,approved_at,created_at,updated_at
          ) VALUES (?,?,?,?,?,?,?,?,?)`,
          [
            value.id,
            value.entryId,
            value.summary,
            'draft',
            value.contentSha256,
            null,
            null,
            value.createdAt,
            value.updatedAt,
          ],
        );
      } else {
        this.vault.run(
          `UPDATE hackathon_distribution_plans SET entry_id=?,summary=?,content_sha256=?,
           updated_at=? WHERE id=? AND status='draft'`,
          [value.entryId, value.summary, value.contentSha256, value.updatedAt, value.id],
        );
      }
      if (value.status !== 'draft') {
        this.vault.run(
          `UPDATE hackathon_distribution_plans SET status=?,approved_by=?,approved_at=?,updated_at=?
           WHERE id=? AND status='draft'`,
          [value.status, value.approvedBy, value.approvedAt, value.updatedAt, value.id],
        );
      }
      this.audit(
        'hackathon.distribution_plan_saved',
        'hackathon_entry',
        value.entryId,
        { planId: value.id, status: value.status, contentSha256: value.contentSha256 },
        value.approvedAt ?? value.updatedAt,
      );
    });
    return this.requireDistributionPlan(value.id);
  }

  saveDistributionItem(input: DistributionItemInput): DistributionItem {
    const value = DistributionItemSchema.parse(input);
    const plan = this.requireDistributionPlan(value.planId);
    this.vault.transaction(() => {
      this.vault.run(
        `INSERT INTO hackathon_distribution_items(
          id,plan_id,kind,phase,status,title,scheduled_at,completed_at,reference,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
          plan_id=excluded.plan_id,kind=excluded.kind,phase=excluded.phase,status=excluded.status,
          title=excluded.title,scheduled_at=excluded.scheduled_at,completed_at=excluded.completed_at,
          reference=excluded.reference,updated_at=excluded.updated_at`,
        [
          value.id,
          value.planId,
          value.kind,
          value.phase,
          value.status,
          value.title,
          value.scheduledAt,
          value.completedAt,
          value.reference,
          value.createdAt,
          value.updatedAt,
        ],
      );
      this.audit(
        'hackathon.distribution_item_saved',
        'hackathon_entry',
        plan.entryId,
        { itemId: value.id, phase: value.phase, status: value.status },
        value.updatedAt,
      );
    });
    const row = this.vault.one<DistributionItemRow>(
      'SELECT * FROM hackathon_distribution_items WHERE id=?',
      [value.id],
    );
    return mapDistributionItem(row!);
  }

  saveSubmission(input: HackathonSubmissionInput): HackathonSubmission {
    const value = HackathonSubmissionSchema.parse(input);
    const detail = this.getEntry(value.entryId);
    if (!detail) throw new Error(`Hackathon entry ${value.entryId} does not exist`);
    if (detail.state !== 'submission_ready') {
      throw new Error('A hackathon submission requires submission-ready state');
    }
    if (
      value.narrativeProfileId !== detail.narrativeProfileId ||
      value.canonicalDemoVersionId !== detail.canonicalDemoVersionId
    ) {
      throw new Error('Submission authority must match the approved entry authority');
    }
    if (!detail.build || detail.build.currentCommitSha !== value.repositoryCommitSha) {
      throw new Error('Submission commit must match the verified build commit');
    }
    const receipt = this.requireAsset(value.receiptAssetId);
    if (
      receipt.entryId !== detail.id ||
      receipt.kind !== 'receipt' ||
      receipt.status !== 'approved' ||
      receipt.founderReviewState !== 'accepted'
    ) {
      throw new Error('Submission requires an approved receipt asset for the entry');
    }

    this.vault.transaction(() => {
      this.vault.run(
        `INSERT INTO hackathon_submissions(
          id,entry_id,portal_url,submitted_at,narrative_profile_id,canonical_demo_version_id,
          repository_commit_sha,receipt_asset_id,content_sha256,status,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
          portal_url=excluded.portal_url,submitted_at=excluded.submitted_at,
          repository_commit_sha=excluded.repository_commit_sha,receipt_asset_id=excluded.receipt_asset_id,
          content_sha256=excluded.content_sha256,status=excluded.status,updated_at=excluded.updated_at`,
        [
          value.id,
          value.entryId,
          value.portalUrl,
          value.submittedAt,
          value.narrativeProfileId,
          value.canonicalDemoVersionId,
          value.repositoryCommitSha,
          value.receiptAssetId,
          value.contentSha256,
          value.status,
          value.createdAt,
          value.updatedAt,
        ],
      );
      this.audit(
        'hackathon.submission_saved',
        'hackathon_entry',
        value.entryId,
        {
          submissionId: value.id,
          repositoryCommitSha: value.repositoryCommitSha,
          receiptAssetId: value.receiptAssetId,
          status: value.status,
        },
        value.submittedAt,
      );
    });
    const row = this.vault.one<SubmissionRow>('SELECT * FROM hackathon_submissions WHERE id=?', [
      value.id,
    ]);
    return mapSubmission(row!);
  }

  saveResult(input: HackathonResultInput): HackathonResult {
    const value = HackathonResultSchema.parse(input);
    this.requireEntry(value.entryId);
    this.vault.transaction(() => {
      this.vault.run(
        `INSERT INTO hackathon_results(
          id,entry_id,outcome,placement,prize_value,prize_asset,credits_json,invitations_json,
          recorded_at,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
          outcome=excluded.outcome,placement=excluded.placement,prize_value=excluded.prize_value,
          prize_asset=excluded.prize_asset,credits_json=excluded.credits_json,
          invitations_json=excluded.invitations_json,recorded_at=excluded.recorded_at,
          updated_at=excluded.updated_at`,
        [
          value.id,
          value.entryId,
          value.outcome,
          value.placement,
          value.prizeValue,
          value.prizeAsset,
          stableJson(value.credits),
          stableJson(value.invitations),
          value.recordedAt,
          value.createdAt,
          value.updatedAt,
        ],
      );
      this.audit(
        'hackathon.result_saved',
        'hackathon_entry',
        value.entryId,
        { resultId: value.id, outcome: value.outcome, prizeValue: value.prizeValue },
        value.recordedAt,
      );
    });
    const row = this.vault.one<ResultRow>('SELECT * FROM hackathon_results WHERE id=?', [value.id]);
    return mapResult(row!);
  }

  saveConversion(input: HackathonConversionInput): HackathonConversion {
    const value = HackathonConversionSchema.parse(input);
    this.requireEntry(value.entryId);
    this.vault.transaction(() => {
      this.vault.run(
        `INSERT INTO hackathon_conversions(
          id,entry_id,kind,organization_id,title,detail,value_usd,status,reference_url,
          occurred_at,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
          kind=excluded.kind,organization_id=excluded.organization_id,title=excluded.title,
          detail=excluded.detail,value_usd=excluded.value_usd,status=excluded.status,
          reference_url=excluded.reference_url,occurred_at=excluded.occurred_at,
          updated_at=excluded.updated_at`,
        [
          value.id,
          value.entryId,
          value.kind,
          value.organizationId,
          value.title,
          value.detail,
          value.valueUsd,
          value.status,
          value.referenceUrl,
          value.occurredAt,
          value.createdAt,
          value.updatedAt,
        ],
      );
      this.audit(
        'hackathon.conversion_saved',
        'hackathon_entry',
        value.entryId,
        {
          conversionId: value.id,
          kind: value.kind,
          status: value.status,
          valueUsd: value.valueUsd,
        },
        value.occurredAt ?? value.updatedAt,
      );
    });
    const row = this.vault.one<ConversionRow>(
      'SELECT * FROM hackathon_conversions WHERE id=?',
      [value.id],
    );
    return mapConversion(row!);
  }

  getEntry(idInput: string): HackathonEntryDetail | null {
    const id = IdSchema.parse(idInput);
    const row = this.vault.one<EntryRow>('SELECT * FROM hackathon_entries WHERE id=?', [id]);
    if (!row) return null;
    const entry = mapEntry(row);
    const ventures = this.vault
      .all<EntryVentureRow>(
        'SELECT * FROM hackathon_entry_ventures WHERE entry_id=? ORDER BY role,venture_id',
        [id],
      )
      .map(mapEntryVenture);
    const trackIds = this.vault
      .all<{ track_id: string }>(
        'SELECT track_id FROM hackathon_entry_tracks WHERE entry_id=? ORDER BY track_id',
        [id],
      )
      .map((item) => item.track_id);
    const bountyIds = this.vault
      .all<{ bounty_id: string }>(
        'SELECT bounty_id FROM hackathon_entry_bounties WHERE entry_id=? ORDER BY bounty_id',
        [id],
      )
      .map((item) => item.bounty_id);
    const eligibilityEvaluations = this.vault
      .all<EvaluationRow>(
        `SELECT * FROM hackathon_eligibility_evaluations WHERE entry_id=?
         ORDER BY evaluated_at DESC,id DESC`,
        [id],
      )
      .map(mapEvaluation);
    const buildRow = this.vault.one<BuildRow>('SELECT * FROM hackathon_builds WHERE entry_id=?', [id]);
    const assets = this.vault
      .all<AssetRow>('SELECT * FROM hackathon_assets WHERE entry_id=? ORDER BY required DESC,kind,id', [id])
      .map(mapAsset);
    const planRow = this.vault.one<DistributionPlanRow>(
      'SELECT * FROM hackathon_distribution_plans WHERE entry_id=?',
      [id],
    );
    const distributionPlan = planRow ? mapDistributionPlan(planRow) : null;
    const distributionItems = distributionPlan
      ? this.vault
          .all<DistributionItemRow>(
            `SELECT * FROM hackathon_distribution_items WHERE plan_id=?
             ORDER BY phase,scheduled_at IS NULL,scheduled_at,id`,
            [distributionPlan.id],
          )
          .map(mapDistributionItem)
      : [];
    const submissionRow = this.vault.one<SubmissionRow>(
      'SELECT * FROM hackathon_submissions WHERE entry_id=?',
      [id],
    );
    const resultRow = this.vault.one<ResultRow>('SELECT * FROM hackathon_results WHERE entry_id=?', [id]);
    const conversions = this.vault
      .all<ConversionRow>(
        'SELECT * FROM hackathon_conversions WHERE entry_id=? ORDER BY occurred_at DESC,created_at DESC,id',
        [id],
      )
      .map(mapConversion);
    const cycle = this.requireCycle(entry.cycleId);
    const currentEvaluation = cycle.rulesSha256
      ? eligibilityEvaluations.find(
          (evaluation) => evaluation.rulesSnapshotSha256 === cycle.rulesSha256,
        ) ?? null
      : null;

    return {
      ...entry,
      leadVentureId: ventures.find((venture) => venture.role === 'lead')?.ventureId ?? null,
      eligibilityStatus: currentEvaluation?.status ?? null,
      nextDeadlineAt: cycle.submissionDeadlineAt,
      ventures,
      trackIds,
      bountyIds,
      eligibilityEvaluations,
      build: buildRow ? mapBuild(buildRow) : null,
      assets,
      distributionPlan,
      distributionItems,
      submission: submissionRow ? mapSubmission(submissionRow) : null,
      result: resultRow ? mapResult(resultRow) : null,
      conversions,
    };
  }

  listEntries(filter: HackathonEntryFilter = {}): HackathonEntrySummary[] {
    const clauses: string[] = [];
    const params: SqlValue[] = [];
    if (filter.cycleId) {
      clauses.push('e.cycle_id=?');
      params.push(IdSchema.parse(filter.cycleId));
    }
    if (filter.legalEntityId) {
      clauses.push('e.legal_entity_id=?');
      params.push(IdSchema.parse(filter.legalEntityId));
    }
    if (filter.canonicalDemoVersionId) {
      clauses.push('e.canonical_demo_version_id=?');
      params.push(IdSchema.parse(filter.canonicalDemoVersionId));
    }
    if (filter.state) {
      clauses.push('e.state=?');
      params.push(filter.state);
    }
    if (filter.founderDecision) {
      clauses.push('e.founder_decision=?');
      params.push(filter.founderDecision);
    }
    if (filter.ventureId) {
      clauses.push(
        'EXISTS(SELECT 1 FROM hackathon_entry_ventures ev WHERE ev.entry_id=e.id AND ev.venture_id=?)',
      );
      params.push(IdSchema.parse(filter.ventureId));
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = this.vault.all<EntryRow>(
      `SELECT e.* FROM hackathon_entries e ${where}
       ORDER BY e.weighted_score DESC,e.updated_at DESC,e.id`,
      params,
    );
    return rows.map((row) => {
      const detail = this.getEntry(row.id)!;
      const { ventures: _ventures, trackIds: _tracks, bountyIds: _bounties,
        eligibilityEvaluations: _evaluations, build: _build, assets: _assets,
        distributionPlan: _plan, distributionItems: _items, submission: _submission,
        result: _result, conversions: _conversions, ...summary } = detail;
      return summary;
    });
  }
}
