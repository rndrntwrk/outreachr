import {
  DistributionPlanSchema,
  EntryDecisionSchema,
  HackathonRuleSchema,
  HackathonSubmissionSchema,
  hackathonRulesDigest,
  type DistributionPlan,
  type DistributionPlanInput,
  type EntryDecisionInput,
  type HackathonEntrySummary,
  type HackathonRule,
  type HackathonSubmission,
  type HackathonSubmissionInput,
} from './hackathon-validation-v11.js';
import { HackathonRepository as StagedHackathonRepository } from './hackathon-repository-final.js';
import { appendAuditEntry } from './repository.js';
import { stableJson } from './validation.js';

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
  if (row[key] === null || row[key] === undefined) return null;
  return text(row, key);
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

function immutablePlan(value: DistributionPlan): unknown {
  return {
    entryId: value.entryId,
    summary: value.summary,
    contentSha256: value.contentSha256,
    approvedBy: value.approvedBy,
    approvedAt: value.approvedAt,
  };
}

export class HackathonRepository extends StagedHackathonRepository {
  override reviewRule(
    idInput: string,
    decisionInput: 'accepted' | 'rejected',
    reviewedAtInput: string,
  ): HackathonRule {
    const reviewed = HackathonRuleSchema.parse(
      super.reviewRule(idInput, decisionInput, reviewedAtInput),
    );
    const rules = this.listRules(reviewed.cycleId);
    const digest = hackathonRulesDigest(rules);
    this.vault.transaction(() => {
      this.vault.run(
        'UPDATE hackathon_cycles SET rules_sha256=?,updated_at=? WHERE id=?',
        [digest, reviewedAtInput, reviewed.cycleId],
      );
      appendAuditEntry(this.vault, {
        occurredAt: reviewedAtInput,
        actorType: 'founder',
        actorId: 'founder',
        action: 'hackathon.rules_digest_recomputed',
        entityType: 'hackathon_cycle',
        entityId: reviewed.cycleId,
        detail: {
          reviewedRuleId: reviewed.id,
          reviewedRuleState: reviewed.reviewState,
          rulesSnapshotSha256: digest,
          ruleCount: rules.length,
        },
      });
    });
    return reviewed;
  }

  override decideEntry(input: EntryDecisionInput): HackathonEntrySummary {
    const value = EntryDecisionSchema.parse(input);
    if (value.decision === 'go' || value.decision === 'conditional_go') {
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
        throw new Error('Blocking rule evidence must be current and founder-accepted');
      }
    }
    return super.decideEntry(value);
  }

  override saveDistributionPlan(input: DistributionPlanInput): DistributionPlan {
    const value = DistributionPlanSchema.parse(input);
    const existingRow = this.vault.one<DbRow>(
      'SELECT * FROM hackathon_distribution_plans WHERE id=?',
      [value.id],
    );
    const existing = existingRow ? mapDistributionPlan(existingRow) : null;
    if (existing && ['approved', 'active', 'completed'].includes(existing.status)) {
      if (stableJson(immutablePlan(existing)) !== stableJson(immutablePlan(value))) {
        throw new Error('Approved hackathon distribution plan is immutable');
      }
    }
    if (existing?.status === 'cancelled') {
      if (stableJson(existing) === stableJson(value)) return existing;
      throw new Error('Cancelled hackathon distribution plan is immutable');
    }
    if (existing?.status === 'completed' && value.status !== 'completed') {
      throw new Error('Completed hackathon distribution plan cannot move backward');
    }
    if (
      existing?.status === 'active' &&
      value.status !== 'active' &&
      value.status !== 'completed' &&
      value.status !== 'cancelled'
    ) {
      throw new Error('Active hackathon distribution plan cannot move backward');
    }
    if (
      existing?.status === 'approved' &&
      !['approved', 'active', 'completed', 'cancelled'].includes(value.status)
    ) {
      throw new Error('Approved hackathon distribution plan cannot move backward');
    }
    if (!existing && value.status === 'cancelled' && (value.approvedBy || value.approvedAt)) {
      throw new Error('A draft distribution plan cannot invent approval metadata when cancelled');
    }

    this.vault.transaction(() => {
      if (!existing) {
        this.vault.run(
          `INSERT INTO hackathon_distribution_plans(
            id,entry_id,summary,status,content_sha256,approved_by,approved_at,created_at,updated_at
          ) VALUES (?,?,?,'draft',?,NULL,NULL,?,?)`,
          [
            value.id,
            value.entryId,
            value.summary,
            value.contentSha256,
            value.createdAt,
            value.updatedAt,
          ],
        );
      } else if (existing.status === 'draft') {
        this.vault.run(
          `UPDATE hackathon_distribution_plans SET entry_id=?,summary=?,content_sha256=?,
           updated_at=? WHERE id=? AND status='draft'`,
          [value.entryId, value.summary, value.contentSha256, value.updatedAt, value.id],
        );
      }

      let currentStatus = existing?.status ?? 'draft';
      if (value.status === 'cancelled') {
        if (currentStatus === 'completed') {
          throw new Error('Completed hackathon distribution plan cannot be cancelled');
        }
        this.vault.run(
          `UPDATE hackathon_distribution_plans SET status='cancelled',updated_at=?
           WHERE id=? AND status IN ('draft','approved','active')`,
          [value.updatedAt, value.id],
        );
        currentStatus = 'cancelled';
      } else {
        if (
          currentStatus === 'draft' &&
          ['approved', 'active', 'completed'].includes(value.status)
        ) {
          this.vault.run(
            `UPDATE hackathon_distribution_plans SET status='approved',approved_by=?,
             approved_at=?,updated_at=? WHERE id=? AND status='draft'`,
            [value.approvedBy, value.approvedAt, value.updatedAt, value.id],
          );
          currentStatus = 'approved';
        }
        if (currentStatus === 'approved' && ['active', 'completed'].includes(value.status)) {
          this.vault.run(
            `UPDATE hackathon_distribution_plans SET status='active',updated_at=?
             WHERE id=? AND status='approved'`,
            [value.updatedAt, value.id],
          );
          currentStatus = 'active';
        }
        if (currentStatus === 'active' && value.status === 'completed') {
          this.vault.run(
            `UPDATE hackathon_distribution_plans SET status='completed',updated_at=?
             WHERE id=? AND status='active'`,
            [value.updatedAt, value.id],
          );
          currentStatus = 'completed';
        }
      }

      appendAuditEntry(this.vault, {
        occurredAt: value.updatedAt,
        actorType: 'founder',
        actorId: 'founder',
        action: 'hackathon.distribution_plan_saved',
        entityType: 'hackathon_entry',
        entityId: value.entryId,
        detail: {
          planId: value.id,
          requestedStatus: value.status,
          persistedStatus: currentStatus,
          contentSha256: value.contentSha256,
        },
      });
    });
    const row = this.vault.one<DbRow>(
      'SELECT * FROM hackathon_distribution_plans WHERE id=?',
      [value.id],
    );
    if (!row) throw new Error('Hackathon distribution plan was not persisted');
    return mapDistributionPlan(row);
  }

  override saveSubmission(input: HackathonSubmissionInput): HackathonSubmission {
    const value = HackathonSubmissionSchema.parse(input);
    const buildCommit = this.vault.scalar(
      `SELECT b.current_commit_sha FROM hackathon_builds b
       WHERE b.entry_id=? AND b.status IN ('approved','active','completed')`,
      [value.entryId],
    );
    if (typeof buildCommit !== 'string' || buildCommit !== value.repositoryCommitSha) {
      throw new Error('Submission commit must match the verified Hackathon Studio build');
    }
    return super.saveSubmission(value);
  }
}
