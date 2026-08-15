import { calculateHackathonScore } from './hackathon-scoring.js';
import {
  calculateHackathonReadiness,
  canTransitionHackathonEntry,
  type HackathonReadiness,
} from './hackathon-state.js';
import {
  EntryDecisionSchema,
  EntryTransitionSchema,
  type EntryDecisionInput,
  type EntryTransitionInput,
  type HackathonEntry,
} from './hackathon-validation-v11.js';
import {
  type AssetRow,
  type BuildRow,
  type DistributionPlanRow,
  type EligibilityRow,
  mapAsset,
  mapBuild,
  mapDistributionPlan,
  mapEligibility,
} from './hackathon-repository-internal.js';
import { HackathonEntrySetupRepository } from './hackathon-repository-entry-setup.js';

export class HackathonEntryDecisionRepository extends HackathonEntrySetupRepository {
  protected scoreSnapshot(entry: HackathonEntry) {
    return {
      estimatedHours: entry.estimatedHours,
      reusePercentage: entry.reusePercentage,
      strategicFit: entry.strategicFit,
      acceptanceProbability: entry.acceptanceProbability,
      capitalUpside: entry.capitalUpside,
      distributionUpside: entry.distributionUpside,
      technicalLeverage: entry.technicalLeverage,
      credibility: entry.credibility,
      urgency: entry.urgency,
      effortEfficiency: entry.effortEfficiency,
      lockInSafety: entry.lockInSafety,
    };
  }

  protected currentScore(entry: HackathonEntry, evaluatedAt: string): number {
    const cycle = this.requireCycle(entry.cycleId);
    return calculateHackathonScore({
      ...this.scoreSnapshot(entry),
      deadline: cycle.submissionDeadlineAt,
      evaluatedAt,
    });
  }

  decideEntry(input: EntryDecisionInput): HackathonEntry {
    const value = EntryDecisionSchema.parse(input);
    const entry = this.requireEntry(value.id);
    if (entry.state !== 'candidate') {
      throw new Error('Only candidate entries can receive or change a founder decision');
    }
    if (value.decision === 'conditional_go' && value.rationale === null) {
      throw new Error('A conditional go decision requires explicit founder conditions');
    }
    const score = this.currentScore(entry, value.decidedAt);
    let rulesDigest = this.requireCycle(entry.cycleId).rulesSha256;
    this.vault.transaction(() => {
      rulesDigest ??= this.refreshRulesDigest(entry.cycleId, value.decidedAt);
      this.vault.run(
        `UPDATE hackathon_entries SET weighted_score=?,founder_decision=?,founder_rationale=?,
          updated_at=? WHERE id=? AND state='candidate'`,
        [score, value.decision, value.rationale, value.decidedAt, entry.id],
      );
      this.audit(
        'hackathon.entry_decided',
        'hackathon_entry',
        entry.id,
        {
          previousFounderDecision: entry.founderDecision,
          founderDecision: value.decision,
          founderRationale: value.rationale,
          weightedScore: score,
          scoreSnapshot: this.scoreSnapshot(entry),
          rulesSnapshotSha256: rulesDigest,
        },
        value.decidedAt,
      );
    });
    return this.requireEntry(entry.id);
  }

  protected readiness(entryIdInput: string): HackathonReadiness {
    const entry = this.requireEntry(entryIdInput);
    const cycle = this.requireCycle(entry.cycleId);
    const leadCount = Number(
      this.vault.scalar(
        `SELECT COUNT(*) FROM hackathon_entry_ventures
         WHERE entry_id=? AND role='lead'`,
        [entry.id],
      ) ?? 0,
    );
    const narrativeApproved = Boolean(
      this.vault.scalar(
        `SELECT 1 FROM narrative_profiles
         WHERE id=? AND legal_entity_id=? AND purpose='hackathon' AND approval_state='approved'`,
        [entry.narrativeProfileId, entry.legalEntityId],
      ),
    );
    const demoApproved = Boolean(
      this.vault.scalar(
        `SELECT 1 FROM canonical_demo_versions WHERE id=? AND approval_state='approved'`,
        [entry.canonicalDemoVersionId],
      ),
    );
    const eligibilityRow = cycle.rulesSha256
      ? this.vault.one<EligibilityRow>(
          `SELECT * FROM hackathon_eligibility_evaluations
           WHERE entry_id=? AND rules_snapshot_sha256=?
           ORDER BY evaluated_at DESC,id DESC LIMIT 1`,
          [entry.id, cycle.rulesSha256],
        )
      : null;
    const buildRow = this.vault.one<BuildRow>('SELECT * FROM hackathon_builds WHERE entry_id=?', [
      entry.id,
    ]);
    const requiredAssets = this.vault
      .all<AssetRow>('SELECT * FROM hackathon_assets WHERE entry_id=? AND required=1 ORDER BY id', [
        entry.id,
      ])
      .map(mapAsset);
    const planRow = this.vault.one<DistributionPlanRow>(
      'SELECT * FROM hackathon_distribution_plans WHERE entry_id=?',
      [entry.id],
    );
    const phases = planRow
      ? this.vault
          .all<{ phase: 'pre_event' | 'submission_day' | 'post_result' }>(
            `SELECT DISTINCT phase FROM hackathon_distribution_items
             WHERE plan_id=? AND status!='cancelled'`,
            [planRow.id],
          )
          .map((row) => row.phase)
      : [];
    const receiptRecorded = Boolean(
      this.vault.scalar(
        `SELECT 1 FROM hackathon_submissions WHERE entry_id=? AND status='submitted' LIMIT 1`,
        [entry.id],
      ),
    );
    const pendingBlockingRules = Number(
      this.vault.scalar(
        `SELECT COUNT(*) FROM hackathon_rules
         WHERE cycle_id=? AND blocking=1
           AND (review_state!='accepted' OR confidence IN ('unknown','stale'))`,
        [entry.cycleId],
      ) ?? 0,
    );

    return calculateHackathonReadiness({
      founderDecision: entry.founderDecision,
      hasLeadVenture: leadCount === 1,
      narrativeApproved,
      demoApproved,
      currentRulesSha256: cycle.rulesSha256,
      eligibility: eligibilityRow
        ? {
            status: mapEligibility(eligibilityRow).status,
            rulesSnapshotSha256: mapEligibility(eligibilityRow).rulesSnapshotSha256,
            founderReviewState: mapEligibility(eligibilityRow).founderReviewState,
          }
        : null,
      pendingBlockingRules,
      build: buildRow
        ? {
            status: mapBuild(buildRow).status,
            ciState: mapBuild(buildRow).ciState,
            securityReviewState: mapBuild(buildRow).securityReviewState,
            evidenceManifestSha256: mapBuild(buildRow).evidenceManifestSha256,
            currentCommitSha: mapBuild(buildRow).currentCommitSha,
          }
        : null,
      requiredAssets: requiredAssets.map((asset) => ({
        id: asset.id,
        status: asset.status,
        founderReviewState: asset.founderReviewState,
      })),
      distributionPlanStatus: planRow ? mapDistributionPlan(planRow).status : null,
      distributionItemPhases: phases,
      receiptRecorded,
    });
  }

  transitionEntry(input: EntryTransitionInput): HackathonEntry {
    const value = EntryTransitionSchema.parse(input);
    const entry = this.requireEntry(value.id);
    const readiness = this.readiness(entry.id);
    const transition = canTransitionHackathonEntry(entry.state, value.toState, readiness);
    if (!transition.allowed) {
      throw new Error(transition.reason ?? transition.blockingReasons.join(' '));
    }
    const cycle = this.requireCycle(entry.cycleId);
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
          rulesSnapshotSha256: cycle.rulesSha256,
          readiness,
        },
        value.transitionedAt,
      );
    });
    return this.requireEntry(entry.id);
  }
}
