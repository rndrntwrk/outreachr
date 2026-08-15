import { HackathonRepository as ReviewedHackathonRepository } from './hackathon-repository-reviewed.js';
import {
  EntryTransitionSchema,
  HackathonCycleSchema,
  HackathonRuleSchema,
  type EntryTransitionInput,
  type HackathonCycle,
  type HackathonCycleInput,
  type HackathonEntrySummary,
  type HackathonRule,
  type HackathonRuleInput,
} from './hackathon-validation-v11.js';

interface CycleDigestRow {
  rules_sha256: string | null;
}

/**
 * Public repository surface with founder-review boundaries enforced before the
 * lower persistence layers execute. Reviewed rule digests are derived state;
 * callers cannot write them directly or bypass reviewRule.
 */
export class HackathonRepository extends ReviewedHackathonRepository {
  override upsertCycle(input: HackathonCycleInput): HackathonCycle {
    const value = HackathonCycleSchema.parse(input);
    const existing = this.vault.one<CycleDigestRow>(
      'SELECT rules_sha256 FROM hackathon_cycles WHERE id=?',
      [value.id],
    );
    if (!existing && value.rulesSha256 !== null) {
      throw new Error('New hackathon cycles cannot supply a reviewed rules digest');
    }
    if (
      existing &&
      value.rulesSha256 !== null &&
      value.rulesSha256 !== existing.rules_sha256
    ) {
      throw new Error('Hackathon rule digests are calculated from founder-reviewed rules');
    }
    return super.upsertCycle({
      ...value,
      rulesSha256: existing?.rules_sha256 ?? null,
    });
  }

  override upsertRule(input: HackathonRuleInput): HackathonRule {
    const value = HackathonRuleSchema.parse(input);
    if (value.reviewState !== 'pending' || value.reviewedAt !== null) {
      throw new Error('Use reviewRule to accept or reject hackathon rules');
    }
    return super.upsertRule(value);
  }

  override transitionEntry(input: EntryTransitionInput): HackathonEntrySummary {
    const value = EntryTransitionSchema.parse(input);
    if (value.toState === 'submission_ready') {
      const unresolved = Number(
        this.vault.scalar(
          `SELECT COUNT(*) FROM hackathon_rules r
           JOIN hackathon_entries e ON e.cycle_id=r.cycle_id
           WHERE e.id=? AND r.blocking=1
             AND (r.review_state!='accepted' OR r.confidence IN ('unknown','stale'))`,
          [value.id],
        ) ?? 0,
      );
      if (unresolved > 0) {
        throw new Error(
          'Hackathon entry is not submission ready: blocking rules require accepted, current evidence.',
        );
      }
    }
    return super.transitionEntry(value);
  }
}
