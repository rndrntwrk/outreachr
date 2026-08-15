import {
  EntryVentureSchema,
  HackathonEligibilityEvaluationSchema,
  HackathonEntryCreateSchema,
  type EligibilityEvaluation,
  type EligibilityEvaluationInput,
  type EntryVentureInput,
  type HackathonEntry,
  type HackathonEntryCreateInput,
} from './hackathon-validation-v11.js';
import { calculateHackathonScore } from './hackathon-scoring.js';
import { IdSchema, IsoDateTimeSchema, stableJson } from './validation.js';
import { HackathonCatalogRepository } from './hackathon-repository-catalog.js';
import {
  type EligibilityRow,
  mapEligibility,
  sameJson,
} from './hackathon-repository-internal.js';

export class HackathonEntrySetupRepository extends HackathonCatalogRepository {
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
        {
          cycleId: value.cycleId,
          narrativeProfileId: value.narrativeProfileId,
          canonicalDemoVersionId: value.canonicalDemoVersionId,
          weightedScore,
        },
        value.updatedAt,
      );
    });
    return this.requireEntry(value.id);
  }

  replaceEntryVentures(entryIdInput: string, venturesInput: EntryVentureInput[]): void {
    const entry = this.requireEntry(entryIdInput);
    if (entry.state !== 'candidate') {
      throw new Error('Only candidate entries can change venture assignments');
    }
    const ventures = venturesInput.map((item) => EntryVentureSchema.parse(item));
    if (ventures.some((item) => item.entryId !== entry.id)) {
      throw new Error('Every venture assignment must belong to the selected entry');
    }
    if (ventures.filter((item) => item.role === 'lead').length !== 1) {
      throw new Error('A hackathon entry requires exactly one lead venture');
    }
    if (new Set(ventures.map((item) => item.ventureId)).size !== ventures.length) {
      throw new Error('A venture can be assigned to an entry only once');
    }
    const occurredAt = ventures[0]?.createdAt ?? entry.updatedAt;
    this.vault.transaction(() => {
      this.vault.run('DELETE FROM hackathon_entry_ventures WHERE entry_id=?', [entry.id]);
      for (const venture of ventures) {
        this.vault.run(
          `INSERT INTO hackathon_entry_ventures(entry_id,venture_id,role,created_at)
           VALUES (?,?,?,?)`,
          [venture.entryId, venture.ventureId, venture.role, venture.createdAt],
        );
      }
      this.audit(
        'hackathon.entry_ventures_replaced',
        'hackathon_entry',
        entry.id,
        { ventures: ventures.map(({ ventureId, role }) => ({ ventureId, role })) },
        occurredAt,
      );
    });
  }

  replaceEntryTracks(entryIdInput: string, trackIdsInput: string[], createdAtInput: string): void {
    const entry = this.requireEntry(entryIdInput);
    if (entry.state !== 'candidate') {
      throw new Error('Only candidate entries can change track assignments');
    }
    const createdAt = IsoDateTimeSchema.parse(createdAtInput);
    const trackIds = [...new Set(trackIdsInput.map((id) => IdSchema.parse(id)))];
    this.vault.transaction(() => {
      this.vault.run('DELETE FROM hackathon_entry_tracks WHERE entry_id=?', [entry.id]);
      for (const trackId of trackIds) {
        this.vault.run(
          `INSERT INTO hackathon_entry_tracks(entry_id,track_id,created_at) VALUES (?,?,?)`,
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

  replaceEntryBounties(
    entryIdInput: string,
    bountyIdsInput: string[],
    createdAtInput: string,
  ): void {
    const entry = this.requireEntry(entryIdInput);
    if (entry.state !== 'candidate') {
      throw new Error('Only candidate entries can change bounty assignments');
    }
    const createdAt = IsoDateTimeSchema.parse(createdAtInput);
    const bountyIds = [...new Set(bountyIdsInput.map((id) => IdSchema.parse(id)))];
    this.vault.transaction(() => {
      this.vault.run('DELETE FROM hackathon_entry_bounties WHERE entry_id=?', [entry.id]);
      for (const bountyId of bountyIds) {
        this.vault.run(
          `INSERT INTO hackathon_entry_bounties(entry_id,bounty_id,created_at) VALUES (?,?,?)`,
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
    const cycle = this.requireCycle(entry.cycleId);
    if (cycle.rulesSha256 !== value.rulesSnapshotSha256) {
      throw new Error('Eligibility evaluation must use the current rules digest');
    }
    const existingRow = this.vault.one<EligibilityRow>(
      'SELECT * FROM hackathon_eligibility_evaluations WHERE id=?',
      [value.id],
    );
    if (existingRow) {
      const existing = mapEligibility(existingRow);
      if (existing.founderReviewState !== 'pending') {
        if (sameJson(existing, value)) return existing;
        throw new Error('Reviewed eligibility evaluations are immutable');
      }
    }

    this.vault.transaction(() => {
      if (!existingRow) {
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
          founderReviewState: value.founderReviewState,
          rulesSnapshotSha256: value.rulesSnapshotSha256,
        },
        value.reviewedAt ?? value.evaluatedAt,
      );
    });
    return mapEligibility(
      this.vault.one<EligibilityRow>(
        'SELECT * FROM hackathon_eligibility_evaluations WHERE id=?',
        [value.id],
      )!,
    );
  }
}
