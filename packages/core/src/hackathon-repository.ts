import type { CoreVault } from './database.js';
import { evaluateHackathonGoNoGo, calculateHackathonScore } from './hackathon-scoring.js';
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

interface DbRow {
  [key: string]: unknown;
}

function text(row: DbRow, key: string): string {
  const value = row[key];
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  throw new Error(`Database column ${key} is missing`);
}

function nullableText(row: DbRow, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  return text(row, key);
}

function numberValue(row: DbRow, key: string): number {
  const value = Number(row[key]);
  if (!Number.isFinite(value)) throw new Error(`Database column ${key} is not numeric`);
  return value;
}

function nullableNumber(row: DbRow, key: string): number | null {
  if (row[key] === null || row[key] === undefined) return null;
  return numberValue(row, key);
}

function booleanValue(row: DbRow, key: string): boolean {
  return numberValue(row, key) === 1;
}

function jsonValue(row: DbRow, key: string): unknown {
  const source = text(row, key);
  try {
    return JSON.parse(source) as unknown;
  } catch {
    throw new Error(`Database column ${key} contains invalid JSON`);
  }
}

function mapCycle(row: DbRow): HackathonCycle {
  return HackathonCycleSchema.parse({
    id: text(row, 'id'),
    opportunityId: text(row, 'opportunity_id'),
    cycleName: text(row, 'cycle_name'),
    registrationOpenAt: nullableText(row, 'registration_open_at'),
    registrationCloseAt: nullableText(row, 'registration_close_at'),
    buildStartAt: nullableText(row, 'build_start_at'),
    buildEndAt: nullableText(row, 'build_end_at'),
    submissionDeadlineAt: nullableText(row, 'submission_deadline_at'),
    judgingStartAt: nullableText(row, 'judging_start_at'),
    judgingEndAt: nullableText(row, 'judging_end_at'),
    demoDayAt: nullableText(row, 'demo_day_at'),
    resultAt: nullableText(row, 'result_at'),
    format: text(row, 'format'),
    location: nullableText(row, 'location'),
    state: text(row, 'state'),
    rulesSourceId: nullableText(row, 'rules_source_id'),
    rulesRetrievedAt: nullableText(row, 'rules_retrieved_at'),
    rulesSha256: nullableText(row, 'rules_sha256'),
    createdAt: text(row, 'created_at'),
    updatedAt: text(row, 'updated_at'),
  });
}

function mapTrack(row: DbRow): HackathonTrack {
  return HackathonTrackSchema.parse({
    id: text(row, 'id'),
    cycleId: text(row, 'cycle_id'),
    name: text(row, 'name'),
    goals: nullableText(row, 'goals'),
    judgingCriteria: jsonValue(row, 'judging_criteria_json'),
    createdAt: text(row, 'created_at'),
    updatedAt: text(row, 'updated_at'),
  });
}

function mapSponsor(row: DbRow): HackathonSponsor {
  return HackathonSponsorSchema.parse({
    cycleId: text(row, 'cycle_id'),
    organizationId: text(row, 'organization_id'),
    contactPersonId: nullableText(row, 'contact_person_id'),
    relationshipState: text(row, 'relationship_state'),
    createdAt: text(row, 'created_at'),
    updatedAt: text(row, 'updated_at'),
  });
}

function mapBounty(row: DbRow): HackathonBounty {
  return HackathonBountySchema.parse({
    id: text(row, 'id'),
    cycleId: text(row, 'cycle_id'),
    sponsorOrganizationId: nullableText(row, 'sponsor_organization_id'),
    trackId: nullableText(row, 'track_id'),
    title: text(row, 'title'),
    amountValue: nullableNumber(row, 'amount_value'),
    amountAsset: nullableText(row, 'amount_asset'),
    requiredTechnology: nullableText(row, 'required_technology'),
    eligibility: nullableText(row, 'eligibility'),
    judgingCriteria: nullableText(row, 'judging_criteria'),
    submissionRequirements: nullableText(row, 'submission_requirements'),
    sourceId: nullableText(row, 'source_id'),
    freshnessState: text(row, 'freshness_state'),
    conflictLockInNotes: nullableText(row, 'conflict_lock_in_notes'),
    createdAt: text(row, 'created_at'),
    updatedAt: text(row, 'updated_at'),
  });
}

function mapRule(row: DbRow): HackathonRule {
  return HackathonRuleSchema.parse({
    id: text(row, 'id'),
    cycleId: text(row, 'cycle_id'),
    ruleType: text(row, 'rule_type'),
    value: jsonValue(row, 'value_json'),
    blocking: booleanValue(row, 'blocking'),
    sourceId: nullableText(row, 'source_id'),
    observedAt: nullableText(row, 'observed_at'),
    confidence: text(row, 'confidence'),
    reviewState: text(row, 'review_state'),
    reviewedAt: nullableText(row, 'reviewed_at'),
    createdAt: text(row, 'created_at'),
    updatedAt: text(row, 'updated_at'),
  });
}

function mapEntry(row: DbRow): HackathonEntry {
  return HackathonEntrySchema.parse({
    id: text(row, 'id'),
    cycleId: text(row, 'cycle_id'),
    legalEntityId: text(row, 'legal_entity_id'),
    narrativeProfileId: text(row, 'narrative_profile_id'),
    canonicalDemoVersionId: text(row, 'canonical_demo_version_id'),
    submissionConcept: text(row, 'submission_concept'),
    userOutcome: text(row, 'user_outcome'),
    ecosystemAdapter: text(row, 'ecosystem_adapter'),
    estimatedHours: numberValue(row, 'estimated_hours'),
    reusePercentage: numberValue(row, 'reuse_percentage'),
    strategicFit: numberValue(row, 'strategic_fit'),
    acceptanceProbability: numberValue(row, 'acceptance_probability'),
    capitalUpside: numberValue(row, 'capital_upside'),
    distributionUpside: numberValue(row, 'distribution_upside'),
    technicalLeverage: numberValue(row, 'technical_leverage'),
    credibility: numberValue(row, 'credibility'),
    urgency: numberValue(row, 'urgency'),
    effortEfficiency: numberValue(row, 'effort_efficiency'),
    lockInSafety: numberValue(row, 'lock_in_safety'),
    weightedScore: numberValue(row, 'weighted_score'),
    founderDecision: text(row, 'founder_decision'),
    founderRationale: nullableText(row, 'founder_rationale'),
    state: text(row, 'state'),
    createdAt: text(row, 'created_at'),
    updatedAt: text(row, 'updated_at'),
  });
}

function mapEntryVenture(row: DbRow): EntryVenture {
  return EntryVentureSchema.parse({
    entryId: text(row, 'entry_id'),
    ventureId: text(row, 'venture_id'),
    role: text(row, 'role'),
    createdAt: text(row, 'created_at'),
  });
}

function mapEligibility(row: DbRow): EligibilityEvaluation {
  return HackathonEligibilityEvaluationSchema.parse({
    id: text(row, 'id'),
    entryId: text(row, 'entry_id'),
    status: text(row, 'status'),
    evaluatedAt: text(row, 'evaluated_at'),
    rulesSnapshotSha256: text(row, 'rules_snapshot_sha256'),
    detail: jsonValue(row, 'detail_json'),
    founderReviewState: text(row, 'founder_review_state'),
    reviewedAt: nullableText(row, 'reviewed_at'),
  });
}

function mapBuild(row: DbRow): HackathonBuild {
  return HackathonBuildSchema.parse({
    id: text(row, 'id'),
    entryId: text(row, 'entry_id'),
    status: text(row, 'status'),
    repository: text(row, 'repository'),
    baseCommitSha: text(row, 'base_commit_sha'),
    branchName: text(row, 'branch_name'),
    worktreeReference: nullableText(row, 'worktree_reference'),
    adapterPath: nullableText(row, 'adapter_path'),
    ownerAgent: nullableText(row, 'owner_agent'),
    toolPolicy: jsonValue(row, 'tool_policy_json'),
    budgetUsd: nullableNumber(row, 'budget_usd'),
    budgetHours: nullableNumber(row, 'budget_hours'),
    startConditions: text(row, 'start_conditions'),
    stopConditions: text(row, 'stop_conditions'),
    currentCommitSha: nullableText(row, 'current_commit_sha'),
    ciState: text(row, 'ci_state'),
    securityReviewState: text(row, 'security_review_state'),
    evidenceManifestSha256: nullableText(row, 'evidence_manifest_sha256'),
    mergeDecision: text(row, 'merge_decision'),
    approvedBy: nullableText(row, 'approved_by'),
    approvedAt: nullableText(row, 'approved_at'),
    startedAt: nullableText(row, 'started_at'),
    completedAt: nullableText(row, 'completed_at'),
    createdAt: text(row, 'created_at'),
    updatedAt: text(row, 'updated_at'),
  });
}

function mapAsset(row: DbRow): HackathonAsset {
  return HackathonAssetSchema.parse({
    id: text(row, 'id'),
    entryId: text(row, 'entry_id'),
    kind: text(row, 'kind'),
    required: booleanValue(row, 'required'),
    status: text(row, 'status'),
    reference: nullableText(row, 'reference'),
    contentSha256: nullableText(row, 'content_sha256'),
    founderReviewState: text(row, 'founder_review_state'),
    reviewedAt: nullableText(row, 'reviewed_at'),
    createdAt: text(row, 'created_at'),
    updatedAt: text(row, 'updated_at'),
  });
}

function mapDistributionPlan(row: DbRow): DistributionPlan {
  return DistributionPlanSchema.parse({
    id: text(row, 'id'),
    entryId: text(row, 'entry_id'),
    summary: text(row, 'summary'),
    status: text(row, 'status'),
    contentSha256: text(row, 'content_sha256'),
    approvedBy: nullableText(row, 'approved_by'),
    approvedAt: nullableText(row, 'approved_at'),
    createdAt: text(row, 'created_at'),
    updatedAt: text(row, 'updated_at'),
  });
}

function mapDistributionItem(row: DbRow): DistributionItem {
  return DistributionItemSchema.parse({
    id: text(row, 'id'),
    planId: text(row, 'plan_id'),
    kind: text(row, 'kind'),
    phase: text(row, 'phase'),
    status: text(row, 'status'),
    title: text(row, 'title'),
    scheduledAt: nullableText(row, 'scheduled_at'),
    completedAt: nullableText(row, 'completed_at'),
    reference: nullableText(row, 'reference'),
    createdAt: text(row, 'created_at'),
    updatedAt: text(row, 'updated_at'),
  });
}

function mapSubmission(row: DbRow): HackathonSubmission {
  return HackathonSubmissionSchema.parse({
    id: text(row, 'id'),
    entryId: text(row, 'entry_id'),
    portalUrl: text(row, 'portal_url'),
    submittedAt: text(row, 'submitted_at'),
    narrativeProfileId: text(row, 'narrative_profile_id'),
    canonicalDemoVersionId: text(row, 'canonical_demo_version_id'),
    repositoryCommitSha: text(row, 'repository_commit_sha'),
    receiptAssetId: text(row, 'receipt_asset_id'),
    contentSha256: text(row, 'content_sha256'),
    status: text(row, 'status'),
    createdAt: text(row, 'created_at'),
    updatedAt: text(row, 'updated_at'),
  });
}

function mapResult(row: DbRow): HackathonResult {
  return HackathonResultSchema.parse({
    id: text(row, 'id'),
    entryId: text(row, 'entry_id'),
    outcome: text(row, 'outcome'),
    placement: nullableText(row, 'placement'),
    prizeValue: nullableNumber(row, 'prize_value'),
    prizeAsset: nullableText(row, 'prize_asset'),
    credits: jsonValue(row, 'credits_json'),
    invitations: jsonValue(row, 'invitations_json'),
    recordedAt: text(row, 'recorded_at'),
    createdAt: text(row, 'created_at'),
    updatedAt: text(row, 'updated_at'),
  });
}

function mapConversion(row: DbRow): HackathonConversion {
  return HackathonConversionSchema.parse({
    id: text(row, 'id'),
    entryId: text(row, 'entry_id'),
    kind: text(row, 'kind'),
    organizationId: nullableText(row, 'organization_id'),
    title: text(row, 'title'),
    detail: nullableText(row, 'detail'),
    valueUsd: nullableNumber(row, 'value_usd'),
    status: text(row, 'status'),
    referenceUrl: nullableText(row, 'reference_url'),
    occurredAt: nullableText(row, 'occurred_at'),
    createdAt: text(row, 'created_at'),
    updatedAt: text(row, 'updated_at'),
  });
}

function immutableAfterReview(existing: { reviewState: string }, label: string): void {
  if (existing.reviewState !== 'pending') throw new Error(`${label} cannot be changed after review`);
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
    const row = this.vault.one<DbRow>('SELECT * FROM hackathon_cycles WHERE id=?', [id]);
    if (!row) throw new Error(`Hackathon cycle ${id} does not exist`);
    return mapCycle(row);
  }

  private requireEntry(idInput: string): HackathonEntry {
    const id = IdSchema.parse(idInput);
    const row = this.vault.one<DbRow>('SELECT * FROM hackathon_entries WHERE id=?', [id]);
    if (!row) throw new Error(`Hackathon entry ${id} does not exist`);
    return mapEntry(row);
  }

  upsertCycle(input: HackathonCycleInput): HackathonCycle {
    const value = HackathonCycleSchema.parse(input);
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
          rules_retrieved_at=excluded.rules_retrieved_at,
          rules_sha256=COALESCE(excluded.rules_sha256,hackathon_cycles.rules_sha256),
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

  listCycles(opportunityIdInput?: string): HackathonCycle[] {
    const rows = opportunityIdInput
      ? this.vault.all<DbRow>(
          'SELECT * FROM hackathon_cycles WHERE opportunity_id=? ORDER BY submission_deadline_at,cycle_name,id',
          [IdSchema.parse(opportunityIdInput)],
        )
      : this.vault.all<DbRow>(
          'SELECT * FROM hackathon_cycles ORDER BY submission_deadline_at,cycle_name,id',
        );
    return rows.map(mapCycle);
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
    const row = this.vault.one<DbRow>('SELECT * FROM hackathon_tracks WHERE id=?', [value.id]);
    if (!row) throw new Error('Hackathon track was not persisted');
    return mapTrack(row);
  }

  listTracks(cycleIdInput: string): HackathonTrack[] {
    const cycleId = IdSchema.parse(cycleIdInput);
    return this.vault
      .all<DbRow>('SELECT * FROM hackathon_tracks WHERE cycle_id=? ORDER BY name,id', [cycleId])
      .map(mapTrack);
  }

  upsertSponsor(input: HackathonSponsorInput): HackathonSponsor {
    const value = HackathonSponsorSchema.parse(input);
    this.requireCycle(value.cycleId);
    this.vault.transaction(() => {
      this.vault.run(
        `INSERT INTO hackathon_sponsors(
          cycle_id,organization_id,contact_person_id,relationship_state,created_at,updated_at
        ) VALUES (?,?,?,?,?,?) ON CONFLICT(cycle_id,organization_id) DO UPDATE SET
          contact_person_id=excluded.contact_person_id,
          relationship_state=excluded.relationship_state,updated_at=excluded.updated_at`,
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
    const row = this.vault.one<DbRow>(
      'SELECT * FROM hackathon_sponsors WHERE cycle_id=? AND organization_id=?',
      [value.cycleId, value.organizationId],
    );
    if (!row) throw new Error('Hackathon sponsor was not persisted');
    return mapSponsor(row);
  }

  listSponsors(cycleIdInput: string): HackathonSponsor[] {
    const cycleId = IdSchema.parse(cycleIdInput);
    return this.vault
      .all<DbRow>(
        'SELECT * FROM hackathon_sponsors WHERE cycle_id=? ORDER BY organization_id',
        [cycleId],
      )
      .map(mapSponsor);
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
    const row = this.vault.one<DbRow>('SELECT * FROM hackathon_bounties WHERE id=?', [value.id]);
    if (!row) throw new Error('Hackathon bounty was not persisted');
    return mapBounty(row);
  }

  listBounties(cycleIdInput: string): HackathonBounty[] {
    const cycleId = IdSchema.parse(cycleIdInput);
    return this.vault
      .all<DbRow>('SELECT * FROM hackathon_bounties WHERE cycle_id=? ORDER BY title,id', [
        cycleId,
      ])
      .map(mapBounty);
  }

  upsertRule(input: HackathonRuleInput): HackathonRule {
    const value = HackathonRuleSchema.parse(input);
    this.requireCycle(value.cycleId);
    const existingRow = this.vault.one<DbRow>('SELECT * FROM hackathon_rules WHERE id=?', [value.id]);
    if (existingRow) immutableAfterReview(mapRule(existingRow), 'Reviewed hackathon rule');
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
        { cycleId: value.cycleId, ruleType: value.ruleType, blocking: value.blocking },
        value.updatedAt,
      );
    });
    return this.requireRule(value.id);
  }

  private requireRule(idInput: string): HackathonRule {
    const id = IdSchema.parse(idInput);
    const row = this.vault.one<DbRow>('SELECT * FROM hackathon_rules WHERE id=?', [id]);
    if (!row) throw new Error(`Hackathon rule ${id} does not exist`);
    return mapRule(row);
  }

  listRules(cycleIdInput: string): HackathonRule[] {
    const cycleId = IdSchema.parse(cycleIdInput);
    return this.vault
      .all<DbRow>('SELECT * FROM hackathon_rules WHERE cycle_id=? ORDER BY id', [cycleId])
      .map(mapRule);
  }

  reviewRule(
    idInput: string,
    decisionInput: 'accepted' | 'rejected',
    reviewedAtInput: string,
  ): HackathonRule {
    const id = IdSchema.parse(idInput);
    const reviewedAt = IsoDateTimeSchema.parse(reviewedAtInput);
    const current = this.requireRule(id);
    if (current.reviewState !== 'pending') {
      if (current.reviewState === decisionInput && current.reviewedAt === reviewedAt) return current;
      throw new Error('Reviewed hackathon rule cannot be changed after review');
    }
    this.vault.transaction(() => {
      this.vault.run(
        `UPDATE hackathon_rules SET review_state=?,reviewed_at=?,updated_at=?
         WHERE id=? AND review_state='pending'`,
        [decisionInput, reviewedAt, reviewedAt, id],
      );
      const accepted = this.listRules(current.cycleId).filter(
        (rule) => rule.id !== id && rule.reviewState === 'accepted',
      );
      const reviewed = { ...current, reviewState: decisionInput, reviewedAt, updatedAt: reviewedAt };
      if (decisionInput === 'accepted') accepted.push(HackathonRuleSchema.parse(reviewed));
      const digest = accepted.length ? hackathonRulesDigest(accepted) : null;
      this.vault.run(
        'UPDATE hackathon_cycles SET rules_sha256=?,updated_at=? WHERE id=?',
        [digest, reviewedAt, current.cycleId],
      );
      this.audit(
        'hackathon.rule_reviewed',
        'hackathon_rule',
        id,
        { cycleId: current.cycleId, reviewState: decisionInput, rulesSha256: digest },
        reviewedAt,
      );
    });
    return this.requireRule(id);
  }

  createEntry(input: HackathonEntryCreateInput): HackathonEntrySummary {
    const value = HackathonEntryCreateSchema.parse(input);
    const cycle = this.requireCycle(value.cycleId);
    const weightedScore = calculateHackathonScore({
      ...value,
      deadline: cycle.submissionDeadlineAt,
      evaluatedAt: value.updatedAt,
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
        value.updatedAt,
      );
    });
    return this.entrySummary(this.requireEntry(value.id));
  }

  private candidateEntry(idInput: string): HackathonEntry {
    const entry = this.requireEntry(idInput);
    if (entry.state !== 'candidate') {
      throw new Error('Only candidate entries can change venture assignments');
    }
    return entry;
  }

  replaceEntryVentures(entryIdInput: string, inputs: EntryVentureInput[]): EntryVenture[] {
    const entry = this.candidateEntry(entryIdInput);
    const values = inputs.map((input) => EntryVentureSchema.parse(input));
    if (values.some((value) => value.entryId !== entry.id)) {
      throw new Error('Entry venture assignment must target the selected entry');
    }
    if (values.filter((value) => value.role === 'lead').length !== 1) {
      throw new Error('A hackathon entry requires exactly one lead venture');
    }
    this.vault.transaction(() => {
      this.vault.run('DELETE FROM hackathon_entry_ventures WHERE entry_id=?', [entry.id]);
      for (const value of values) {
        this.vault.run(
          `INSERT INTO hackathon_entry_ventures(entry_id,venture_id,role,created_at)
           VALUES (?,?,?,?)`,
          [value.entryId, value.ventureId, value.role, value.createdAt],
        );
      }
      this.audit(
        'hackathon.entry_ventures_replaced',
        'hackathon_entry',
        entry.id,
        { ventures: values.map(({ ventureId, role }) => ({ ventureId, role })) },
        values[0]?.createdAt ?? entry.updatedAt,
      );
    });
    return this.entryVentures(entry.id);
  }

  private entryVentures(entryId: string): EntryVenture[] {
    return this.vault
      .all<DbRow>(
        'SELECT * FROM hackathon_entry_ventures WHERE entry_id=? ORDER BY role,venture_id',
        [entryId],
      )
      .map(mapEntryVenture);
  }

  replaceEntryTracks(entryIdInput: string, trackIdsInput: string[], createdAtInput: string): string[] {
    const entry = this.candidateEntry(entryIdInput);
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
    return this.entryTrackIds(entry.id);
  }

  private entryTrackIds(entryId: string): string[] {
    return this.vault
      .all<{ track_id: string }>(
        'SELECT track_id FROM hackathon_entry_tracks WHERE entry_id=? ORDER BY track_id',
        [entryId],
      )
      .map((row) => row.track_id);
  }

  replaceEntryBounties(
    entryIdInput: string,
    bountyIdsInput: string[],
    createdAtInput: string,
  ): string[] {
    const entry = this.candidateEntry(entryIdInput);
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
    return this.entryBountyIds(entry.id);
  }

  private entryBountyIds(entryId: string): string[] {
    return this.vault
      .all<{ bounty_id: string }>(
        'SELECT bounty_id FROM hackathon_entry_bounties WHERE entry_id=? ORDER BY bounty_id',
        [entryId],
      )
      .map((row) => row.bounty_id);
  }

  private latestEligibility(entryId: string, rulesSha256?: string | null): EligibilityEvaluation | null {
    const clauses = ['entry_id=?'];
    const params: string[] = [entryId];
    if (rulesSha256) {
      clauses.push('rules_snapshot_sha256=?');
      params.push(rulesSha256);
    }
    const row = this.vault.one<DbRow>(
      `SELECT * FROM hackathon_eligibility_evaluations WHERE ${clauses.join(' AND ')}
       ORDER BY evaluated_at DESC,id DESC LIMIT 1`,
      params,
    );
    return row ? mapEligibility(row) : null;
  }

  private entrySummary(entry: HackathonEntry): HackathonEntrySummary {
    const lead = this.entryVentures(entry.id).find((value) => value.role === 'lead') ?? null;
    const cycle = this.requireCycle(entry.cycleId);
    const eligibility = this.latestEligibility(entry.id, cycle.rulesSha256);
    return {
      ...entry,
      leadVentureId: lead?.ventureId ?? null,
      eligibilityStatus: eligibility?.status ?? null,
      nextDeadlineAt: cycle.submissionDeadlineAt,
    };
  }

  listEntries(filter: HackathonEntryFilter = {}): HackathonEntrySummary[] {
    const clauses: string[] = [];
    const params: string[] = [];
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
    return this.vault
      .all<DbRow>(
        `SELECT e.* FROM hackathon_entries e ${where}
         ORDER BY e.weighted_score DESC,e.updated_at DESC,e.id`,
        params,
      )
      .map(mapEntry)
      .map((entry) => this.entrySummary(entry));
  }

  getEntry(idInput: string): HackathonEntryDetail | null {
    const id = IdSchema.parse(idInput);
    const row = this.vault.one<DbRow>('SELECT * FROM hackathon_entries WHERE id=?', [id]);
    if (!row) return null;
    const entry = mapEntry(row);
    const buildRow = this.vault.one<DbRow>('SELECT * FROM hackathon_builds WHERE entry_id=?', [id]);
    const planRow = this.vault.one<DbRow>(
      'SELECT * FROM hackathon_distribution_plans WHERE entry_id=?',
      [id],
    );
    const submissionRow = this.vault.one<DbRow>(
      'SELECT * FROM hackathon_submissions WHERE entry_id=?',
      [id],
    );
    const resultRow = this.vault.one<DbRow>('SELECT * FROM hackathon_results WHERE entry_id=?', [id]);
    const plan = planRow ? mapDistributionPlan(planRow) : null;
    return {
      ...this.entrySummary(entry),
      ventures: this.entryVentures(id),
      trackIds: this.entryTrackIds(id),
      bountyIds: this.entryBountyIds(id),
      eligibilityEvaluations: this.vault
        .all<DbRow>(
          'SELECT * FROM hackathon_eligibility_evaluations WHERE entry_id=? ORDER BY evaluated_at DESC,id',
          [id],
        )
        .map(mapEligibility),
      build: buildRow ? mapBuild(buildRow) : null,
      assets: this.vault
        .all<DbRow>('SELECT * FROM hackathon_assets WHERE entry_id=? ORDER BY required DESC,kind,id', [
          id,
        ])
        .map(mapAsset),
      distributionPlan: plan,
      distributionItems: plan
        ? this.vault
            .all<DbRow>(
              'SELECT * FROM hackathon_distribution_items WHERE plan_id=? ORDER BY phase,kind,id',
              [plan.id],
            )
            .map(mapDistributionItem)
        : [],
      submission: submissionRow ? mapSubmission(submissionRow) : null,
      result: resultRow ? mapResult(resultRow) : null,
      conversions: this.vault
        .all<DbRow>(
          'SELECT * FROM hackathon_conversions WHERE entry_id=? ORDER BY occurred_at,created_at,id',
          [id],
        )
        .map(mapConversion),
    };
  }

  saveEligibilityEvaluation(input: EligibilityEvaluationInput): EligibilityEvaluation {
    const value = HackathonEligibilityEvaluationSchema.parse(input);
    const entry = this.requireEntry(value.entryId);
    const cycle = this.requireCycle(entry.cycleId);
    if (!cycle.rulesSha256 || cycle.rulesSha256 !== value.rulesSnapshotSha256) {
      throw new Error('Eligibility evaluation must use the current reviewed rules digest');
    }
    const existingRow = this.vault.one<DbRow>(
      'SELECT * FROM hackathon_eligibility_evaluations WHERE id=?',
      [value.id],
    );
    if (existingRow) {
      const existing = mapEligibility(existingRow);
      if (existing.founderReviewState !== 'pending' && stableJson(existing) !== stableJson(value)) {
        throw new Error('Reviewed eligibility evaluation cannot be changed');
      }
    }
    this.vault.transaction(() => {
      this.vault.run(
        `INSERT INTO hackathon_eligibility_evaluations(
          id,entry_id,status,evaluated_at,rules_snapshot_sha256,detail_json,
          founder_review_state,reviewed_at
        ) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
          status=excluded.status,evaluated_at=excluded.evaluated_at,
          rules_snapshot_sha256=excluded.rules_snapshot_sha256,detail_json=excluded.detail_json,
          founder_review_state=excluded.founder_review_state,reviewed_at=excluded.reviewed_at`,
        [
          value.id,
          value.entryId,
          value.status,
          value.evaluatedAt,
          value.rulesSnapshotSha256,
          stableJson(value.detail),
          value.founderReviewState,
          value.reviewedAt,
        ],
      );
      this.audit(
        'hackathon.eligibility_saved',
        'hackathon_entry',
        value.entryId,
        {
          evaluationId: value.id,
          status: value.status,
          founderReviewState: value.founderReviewState,
          rulesSnapshotSha256: value.rulesSnapshotSha256,
        },
        value.reviewedAt ?? value.evaluatedAt,
      );
    });
    return this.latestEligibility(value.entryId, value.rulesSnapshotSha256) as EligibilityEvaluation;
  }

  private authorityState(entry: HackathonEntry): {
    hasLeadVenture: boolean;
    hasApprovedNarrative: boolean;
    hasApprovedDemo: boolean;
  } {
    return {
      hasLeadVenture: this.entryVentures(entry.id).some((value) => value.role === 'lead'),
      hasApprovedNarrative: Boolean(
        this.vault.scalar(
          `SELECT 1 FROM narrative_profiles
           WHERE id=? AND legal_entity_id=? AND purpose='hackathon' AND approval_state='approved'`,
          [entry.narrativeProfileId, entry.legalEntityId],
        ),
      ),
      hasApprovedDemo: Boolean(
        this.vault.scalar(
          `SELECT 1 FROM canonical_demo_versions
           WHERE id=? AND approval_state='approved'`,
          [entry.canonicalDemoVersionId],
        ),
      ),
    };
  }

  private pendingBlockingRules(cycleId: string): number {
    return Number(
      this.vault.scalar(
        `SELECT COUNT(*) FROM hackathon_rules
         WHERE cycle_id=? AND blocking=1 AND review_state='pending'`,
        [cycleId],
      ) ?? 0,
    );
  }

  decideEntry(input: EntryDecisionInput): HackathonEntrySummary {
    const value = EntryDecisionSchema.parse(input);
    const entry = this.requireEntry(value.id);
    if (entry.state !== 'candidate') throw new Error('Only candidate entries can receive a decision');
    const cycle = this.requireCycle(entry.cycleId);
    const authority = this.authorityState(entry);
    const eligibility = this.latestEligibility(entry.id, cycle.rulesSha256);
    const scoreSnapshot = {
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
    };
    const result = evaluateHackathonGoNoGo({
      ...scoreSnapshot,
      deadline: cycle.submissionDeadlineAt,
      evaluatedAt: value.decidedAt,
      hasLegalEntity: true,
      hasLeadVenture: authority.hasLeadVenture,
      hasApprovedNarrative: authority.hasApprovedNarrative,
      hasApprovedDemo: authority.hasApprovedDemo,
      eligibilityStatus: eligibility?.status ?? null,
      pendingBlockingRules: this.pendingBlockingRules(entry.cycleId),
      founderConditions: value.decision === 'conditional_go' && value.rationale ? [value.rationale] : [],
    });
    if (value.decision === 'go' && result.recommendation !== 'go') {
      throw new Error(`Entry is not ready for a go decision: ${result.blockingReasons.join(' ')}`);
    }
    if (value.decision === 'conditional_go' && result.recommendation !== 'conditional_go') {
      throw new Error(`Entry is not ready for a conditional go: ${result.blockingReasons.join(' ')}`);
    }
    this.vault.transaction(() => {
      this.vault.run(
        `UPDATE hackathon_entries SET weighted_score=?,founder_decision=?,founder_rationale=?,updated_at=?
         WHERE id=? AND state='candidate'`,
        [result.weightedScore, value.decision, value.rationale, value.decidedAt, entry.id],
      );
      this.audit(
        'hackathon.entry_decided',
        'hackathon_entry',
        entry.id,
        {
          founderDecision: value.decision,
          founderRationale: value.rationale,
          weightedScore: result.weightedScore,
          scoreSnapshot,
          rulesSnapshotSha256: cycle.rulesSha256,
          recommendation: result.recommendation,
          blockingReasons: result.blockingReasons,
        },
        value.decidedAt,
      );
    });
    return this.entrySummary(this.requireEntry(entry.id));
  }

  private readiness(entry: HackathonEntry): HackathonReadiness {
    const detail = this.getEntry(entry.id) as HackathonEntryDetail;
    const cycle = this.requireCycle(entry.cycleId);
    const authority = this.authorityState(entry);
    const eligibility = this.latestEligibility(entry.id, cycle.rulesSha256);
    return calculateHackathonReadiness({
      founderDecision: entry.founderDecision,
      hasLeadVenture: authority.hasLeadVenture,
      narrativeApproved: authority.hasApprovedNarrative,
      demoApproved: authority.hasApprovedDemo,
      currentRulesSha256: cycle.rulesSha256,
      eligibility: eligibility
        ? {
            status: eligibility.status,
            rulesSnapshotSha256: eligibility.rulesSnapshotSha256,
            founderReviewState: eligibility.founderReviewState,
          }
        : null,
      pendingBlockingRules: this.pendingBlockingRules(entry.cycleId),
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
      distributionItemPhases: detail.distributionItems.map((item) => item.phase),
      receiptRecorded: detail.submission !== null,
    });
  }

  transitionEntry(input: EntryTransitionInput): HackathonEntrySummary {
    const value = EntryTransitionSchema.parse(input);
    const entry = this.requireEntry(value.id);
    const transition = canTransitionHackathonEntry(entry.state, value.toState, this.readiness(entry));
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
        { fromState: entry.state, toState: value.toState },
        value.transitionedAt,
      );
    });
    return this.entrySummary(this.requireEntry(entry.id));
  }

  saveBuild(input: HackathonBuildInput): HackathonBuild {
    const value = HackathonBuildSchema.parse(input);
    this.requireEntry(value.entryId);
    this.vault.transaction(() => {
      this.vault.run(
        `INSERT INTO hackathon_builds(
          id,entry_id,status,repository,base_commit_sha,branch_name,worktree_reference,adapter_path,
          owner_agent,tool_policy_json,budget_usd,budget_hours,start_conditions,stop_conditions,
          current_commit_sha,ci_state,security_review_state,evidence_manifest_sha256,merge_decision,
          approved_by,approved_at,started_at,completed_at,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
          status=excluded.status,repository=excluded.repository,base_commit_sha=excluded.base_commit_sha,
          branch_name=excluded.branch_name,worktree_reference=excluded.worktree_reference,
          adapter_path=excluded.adapter_path,owner_agent=excluded.owner_agent,
          tool_policy_json=excluded.tool_policy_json,budget_usd=excluded.budget_usd,
          budget_hours=excluded.budget_hours,start_conditions=excluded.start_conditions,
          stop_conditions=excluded.stop_conditions,current_commit_sha=excluded.current_commit_sha,
          ci_state=excluded.ci_state,security_review_state=excluded.security_review_state,
          evidence_manifest_sha256=excluded.evidence_manifest_sha256,
          merge_decision=excluded.merge_decision,approved_by=excluded.approved_by,
          approved_at=excluded.approved_at,started_at=excluded.started_at,
          completed_at=excluded.completed_at,updated_at=excluded.updated_at`,
        [
          value.id,
          value.entryId,
          value.status,
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
          value.approvedBy,
          value.approvedAt,
          value.startedAt,
          value.completedAt,
          value.createdAt,
          value.updatedAt,
        ],
      );
      this.audit(
        'hackathon.build_saved',
        'hackathon_entry',
        value.entryId,
        {
          buildId: value.id,
          status: value.status,
          currentCommitSha: value.currentCommitSha,
          ciState: value.ciState,
          securityReviewState: value.securityReviewState,
        },
        value.updatedAt,
      );
    });
    const row = this.vault.one<DbRow>('SELECT * FROM hackathon_builds WHERE id=?', [value.id]);
    if (!row) throw new Error('Hackathon build was not persisted');
    return mapBuild(row);
  }

  saveAsset(input: HackathonAssetInput): HackathonAsset {
    const value = HackathonAssetSchema.parse(input);
    this.requireEntry(value.entryId);
    this.vault.transaction(() => {
      this.vault.run(
        `INSERT INTO hackathon_assets(
          id,entry_id,kind,required,status,reference,content_sha256,founder_review_state,
          reviewed_at,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
          kind=excluded.kind,required=excluded.required,status=excluded.status,
          reference=excluded.reference,content_sha256=excluded.content_sha256,
          founder_review_state=excluded.founder_review_state,reviewed_at=excluded.reviewed_at,
          updated_at=excluded.updated_at`,
        [
          value.id,
          value.entryId,
          value.kind,
          value.required ? 1 : 0,
          value.status,
          value.reference,
          value.contentSha256,
          value.founderReviewState,
          value.reviewedAt,
          value.createdAt,
          value.updatedAt,
        ],
      );
      this.audit(
        'hackathon.asset_saved',
        'hackathon_entry',
        value.entryId,
        { assetId: value.id, kind: value.kind, required: value.required, status: value.status },
        value.updatedAt,
      );
    });
    const row = this.vault.one<DbRow>('SELECT * FROM hackathon_assets WHERE id=?', [value.id]);
    if (!row) throw new Error('Hackathon asset was not persisted');
    return mapAsset(row);
  }

  saveDistributionPlan(input: DistributionPlanInput): DistributionPlan {
    const value = DistributionPlanSchema.parse(input);
    this.requireEntry(value.entryId);
    this.vault.transaction(() => {
      this.vault.run(
        `INSERT INTO hackathon_distribution_plans(
          id,entry_id,summary,status,content_sha256,approved_by,approved_at,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
          summary=excluded.summary,status=excluded.status,content_sha256=excluded.content_sha256,
          approved_by=excluded.approved_by,approved_at=excluded.approved_at,
          updated_at=excluded.updated_at`,
        [
          value.id,
          value.entryId,
          value.summary,
          value.status,
          value.contentSha256,
          value.approvedBy,
          value.approvedAt,
          value.createdAt,
          value.updatedAt,
        ],
      );
      this.audit(
        'hackathon.distribution_plan_saved',
        'hackathon_entry',
        value.entryId,
        { planId: value.id, status: value.status, contentSha256: value.contentSha256 },
        value.updatedAt,
      );
    });
    const row = this.vault.one<DbRow>(
      'SELECT * FROM hackathon_distribution_plans WHERE id=?',
      [value.id],
    );
    if (!row) throw new Error('Distribution plan was not persisted');
    return mapDistributionPlan(row);
  }

  saveDistributionItem(input: DistributionItemInput): DistributionItem {
    const value = DistributionItemSchema.parse(input);
    this.vault.transaction(() => {
      this.vault.run(
        `INSERT INTO hackathon_distribution_items(
          id,plan_id,kind,phase,status,title,scheduled_at,completed_at,reference,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
          kind=excluded.kind,phase=excluded.phase,status=excluded.status,title=excluded.title,
          scheduled_at=excluded.scheduled_at,completed_at=excluded.completed_at,
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
      const entryId = this.vault.scalar(
        'SELECT entry_id FROM hackathon_distribution_plans WHERE id=?',
        [value.planId],
      );
      if (typeof entryId !== 'string') throw new Error('Distribution plan does not exist');
      this.audit(
        'hackathon.distribution_item_saved',
        'hackathon_entry',
        entryId,
        { itemId: value.id, kind: value.kind, phase: value.phase, status: value.status },
        value.updatedAt,
      );
    });
    const row = this.vault.one<DbRow>(
      'SELECT * FROM hackathon_distribution_items WHERE id=?',
      [value.id],
    );
    if (!row) throw new Error('Distribution item was not persisted');
    return mapDistributionItem(row);
  }

  saveSubmission(input: HackathonSubmissionInput): HackathonSubmission {
    const value = HackathonSubmissionSchema.parse(input);
    const entry = this.requireEntry(value.entryId);
    if (entry.state !== 'submission_ready') {
      throw new Error('Submission can only be recorded for a submission-ready entry');
    }
    if (
      entry.narrativeProfileId !== value.narrativeProfileId ||
      entry.canonicalDemoVersionId !== value.canonicalDemoVersionId
    ) {
      throw new Error('Submission authority must match the approved entry');
    }
    const receipt = this.vault.one<DbRow>('SELECT * FROM hackathon_assets WHERE id=?', [
      value.receiptAssetId,
    ]);
    if (!receipt) throw new Error('Submission receipt asset does not exist');
    const receiptAsset = mapAsset(receipt);
    if (
      receiptAsset.entryId !== entry.id ||
      receiptAsset.kind !== 'receipt' ||
      receiptAsset.status !== 'approved' ||
      receiptAsset.founderReviewState !== 'accepted'
    ) {
      throw new Error('Submission requires an approved durable receipt asset for the entry');
    }
    this.vault.transaction(() => {
      this.vault.run(
        `INSERT INTO hackathon_submissions(
          id,entry_id,portal_url,submitted_at,narrative_profile_id,canonical_demo_version_id,
          repository_commit_sha,receipt_asset_id,content_sha256,status,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
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
        'hackathon.submission_recorded',
        'hackathon_entry',
        entry.id,
        {
          submissionId: value.id,
          portalUrl: value.portalUrl,
          receiptAssetId: value.receiptAssetId,
          repositoryCommitSha: value.repositoryCommitSha,
        },
        value.submittedAt,
      );
    });
    const row = this.vault.one<DbRow>('SELECT * FROM hackathon_submissions WHERE id=?', [value.id]);
    if (!row) throw new Error('Hackathon submission was not persisted');
    return mapSubmission(row);
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
        {
          resultId: value.id,
          outcome: value.outcome,
          prizeValue: value.prizeValue,
          credits: value.credits,
          invitations: value.invitations,
        },
        value.recordedAt,
      );
    });
    const row = this.vault.one<DbRow>('SELECT * FROM hackathon_results WHERE id=?', [value.id]);
    if (!row) throw new Error('Hackathon result was not persisted');
    return mapResult(row);
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
          organizationId: value.organizationId,
          valueUsd: value.valueUsd,
        },
        value.occurredAt ?? value.updatedAt,
      );
    });
    const row = this.vault.one<DbRow>('SELECT * FROM hackathon_conversions WHERE id=?', [
      value.id,
    ]);
    if (!row) throw new Error('Hackathon conversion was not persisted');
    return mapConversion(row);
  }
}
