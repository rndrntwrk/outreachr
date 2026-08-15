import {
  type HackathonEntry,
  type HackathonEntryDetail,
  type HackathonEntryFilter,
  type HackathonEntrySummary,
} from './hackathon-validation-v11.js';
import { IdSchema } from './validation.js';
import { HackathonEntryDecisionRepository } from './hackathon-repository-entry-decision.js';
import {
  type AssetRow,
  type BuildRow,
  type ConversionRow,
  type DistributionItemRow,
  type DistributionPlanRow,
  type EligibilityRow,
  type EntryRow,
  type EntryVentureRow,
  type ResultRow,
  type SubmissionRow,
  mapAsset,
  mapBuild,
  mapConversion,
  mapDistributionItem,
  mapDistributionPlan,
  mapEligibility,
  mapEntry,
  mapEntryVenture,
  mapResult,
  mapSubmission,
} from './hackathon-repository-internal.js';

export class HackathonQueryRepository extends HackathonEntryDecisionRepository {
  protected entrySummary(entry: HackathonEntry): HackathonEntrySummary {
    const cycle = this.requireCycle(entry.cycleId);
    const leadVentureId = this.vault.scalar(
      `SELECT venture_id FROM hackathon_entry_ventures
       WHERE entry_id=? AND role='lead' LIMIT 1`,
      [entry.id],
    );
    const eligibility = cycle.rulesSha256
      ? this.vault.one<EligibilityRow>(
          `SELECT * FROM hackathon_eligibility_evaluations
           WHERE entry_id=? AND rules_snapshot_sha256=?
           ORDER BY evaluated_at DESC,id DESC LIMIT 1`,
          [entry.id, cycle.rulesSha256],
        )
      : null;
    return {
      ...entry,
      leadVentureId: typeof leadVentureId === 'string' ? leadVentureId : null,
      eligibilityStatus: eligibility ? mapEligibility(eligibility).status : null,
      nextDeadlineAt: cycle.submissionDeadlineAt,
    };
  }

  listEntries(filter: HackathonEntryFilter = {}): HackathonEntrySummary[] {
    const clauses: string[] = [];
    const params: string[] = [];
    if (filter.cycleId !== undefined) {
      clauses.push('e.cycle_id=?');
      params.push(IdSchema.parse(filter.cycleId));
    }
    if (filter.legalEntityId !== undefined) {
      clauses.push('e.legal_entity_id=?');
      params.push(IdSchema.parse(filter.legalEntityId));
    }
    if (filter.canonicalDemoVersionId !== undefined) {
      clauses.push('e.canonical_demo_version_id=?');
      params.push(IdSchema.parse(filter.canonicalDemoVersionId));
    }
    if (filter.state !== undefined) {
      clauses.push('e.state=?');
      params.push(filter.state);
    }
    if (filter.founderDecision !== undefined) {
      clauses.push('e.founder_decision=?');
      params.push(filter.founderDecision);
    }
    if (filter.ventureId !== undefined) {
      clauses.push(
        'EXISTS(SELECT 1 FROM hackathon_entry_ventures ev WHERE ev.entry_id=e.id AND ev.venture_id=?)',
      );
      params.push(IdSchema.parse(filter.ventureId));
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    return this.vault
      .all<EntryRow>(
        `SELECT e.* FROM hackathon_entries e ${where}
         ORDER BY e.weighted_score DESC,e.updated_at DESC,e.id`,
        params,
      )
      .map(mapEntry)
      .map((entry) => this.entrySummary(entry));
  }

  getEntry(idInput: string): HackathonEntryDetail | null {
    const id = IdSchema.parse(idInput);
    const row = this.vault.one<EntryRow>('SELECT * FROM hackathon_entries WHERE id=?', [id]);
    if (!row) return null;
    const entry = mapEntry(row);
    const summary = this.entrySummary(entry);
    const ventures = this.vault
      .all<EntryVentureRow>(
        `SELECT * FROM hackathon_entry_ventures
         WHERE entry_id=? ORDER BY CASE role WHEN 'lead' THEN 0 ELSE 1 END,venture_id`,
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
      .all<EligibilityRow>(
        `SELECT * FROM hackathon_eligibility_evaluations
         WHERE entry_id=? ORDER BY evaluated_at DESC,id DESC`,
        [id],
      )
      .map(mapEligibility);
    const buildRow = this.vault.one<BuildRow>(
      'SELECT * FROM hackathon_builds WHERE entry_id=?',
      [id],
    );
    const assets = this.vault
      .all<AssetRow>(
        'SELECT * FROM hackathon_assets WHERE entry_id=? ORDER BY required DESC,kind,id',
        [id],
      )
      .map(mapAsset);
    const distributionPlanRow = this.vault.one<DistributionPlanRow>(
      'SELECT * FROM hackathon_distribution_plans WHERE entry_id=?',
      [id],
    );
    const distributionItems = distributionPlanRow
      ? this.vault
          .all<DistributionItemRow>(
            `SELECT * FROM hackathon_distribution_items
             WHERE plan_id=? ORDER BY phase,scheduled_at,id`,
            [distributionPlanRow.id],
          )
          .map(mapDistributionItem)
      : [];
    const submissionRow = this.vault.one<SubmissionRow>(
      'SELECT * FROM hackathon_submissions WHERE entry_id=?',
      [id],
    );
    const resultRow = this.vault.one<ResultRow>(
      'SELECT * FROM hackathon_results WHERE entry_id=?',
      [id],
    );
    const conversions = this.vault
      .all<ConversionRow>(
        'SELECT * FROM hackathon_conversions WHERE entry_id=? ORDER BY created_at,id',
        [id],
      )
      .map(mapConversion);
    return {
      ...summary,
      ventures,
      trackIds,
      bountyIds,
      eligibilityEvaluations,
      build: buildRow ? mapBuild(buildRow) : null,
      assets,
      distributionPlan: distributionPlanRow ? mapDistributionPlan(distributionPlanRow) : null,
      distributionItems,
      submission: submissionRow ? mapSubmission(submissionRow) : null,
      result: resultRow ? mapResult(resultRow) : null,
      conversions,
    };
  }
}
