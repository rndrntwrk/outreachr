import { HackathonRepository as ReviewedHackathonRepository } from './hackathon-repository-reviewed.js';
import {
  HackathonCycleSchema,
  HackathonRuleSchema,
  type HackathonCycle,
  type HackathonCycleInput,
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
}
