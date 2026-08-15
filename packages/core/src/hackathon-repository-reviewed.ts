import {
  DistributionItemSchema,
  DistributionPlanSchema,
  EntryDecisionSchema,
  HackathonBuildSchema,
  HackathonRuleSchema,
  type DistributionItem,
  type DistributionItemInput,
  type DistributionPlan,
  type DistributionPlanInput,
  type EntryDecisionInput,
  type HackathonBuild,
  type HackathonBuildInput,
  type HackathonEntrySummary,
  type HackathonRule,
  type HackathonRuleInput,
} from './hackathon-validation-v11.js';
import { HackathonRepository as PersistedHackathonRepository } from './hackathon-repository-final.js';

interface BuildStateRow {
  entry_id: string;
  status: HackathonBuild['status'];
}

interface DistributionPlanRow {
  id: string;
  entry_id: string;
  summary: string;
  status: DistributionPlan['status'];
  content_sha256: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DistributionItemRow {
  id: string;
  plan_id: string;
  kind: DistributionItem['kind'];
  phase: DistributionItem['phase'];
  status: DistributionItem['status'];
  title: string;
  scheduled_at: string | null;
  completed_at: string | null;
  reference: string | null;
  created_at: string;
  updated_at: string;
}

const BUILD_TRANSITIONS: Readonly<Record<HackathonBuild['status'], readonly HackathonBuild['status'][]>> = {
  draft: ['draft', 'approved', 'active', 'completed', 'cancelled'],
  approved: ['approved', 'active', 'completed', 'cancelled'],
  active: ['active', 'completed', 'cancelled'],
  completed: ['completed'],
  cancelled: ['cancelled'],
};

const PLAN_TRANSITIONS: Readonly<
  Record<DistributionPlan['status'], readonly DistributionPlan['status'][]>
> = {
  draft: ['draft', 'approved', 'cancelled'],
  approved: ['approved', 'active', 'completed', 'cancelled'],
  active: ['active', 'completed', 'cancelled'],
  completed: ['completed'],
  cancelled: ['cancelled'],
};

const ITEM_TRANSITIONS: Readonly<
  Record<DistributionItem['status'], readonly DistributionItem['status'][]>
> = {
  planned: ['planned', 'ready', 'published', 'cancelled'],
  ready: ['ready', 'published', 'cancelled'],
  published: ['published'],
  cancelled: ['cancelled'],
};

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

export class HackathonRepository extends PersistedHackathonRepository {
  override upsertRule(input: HackathonRuleInput): HackathonRule {
    const value = HackathonRuleSchema.parse(input);
    if (value.reviewState !== 'pending' || value.reviewedAt !== null) {
      throw new Error('Hackathon rules must be saved pending and advanced through founder review.');
    }
    return super.upsertRule(value);
  }

  override decideEntry(input: EntryDecisionInput): HackathonEntrySummary {
    const value = EntryDecisionSchema.parse(input);
    if (value.decision === 'go') {
      const row = this.vault.one<{ cycle_id: string }>(
        'SELECT cycle_id FROM hackathon_entries WHERE id=?',
        [value.id],
      );
      if (row) {
        const unresolved = Number(
          this.vault.scalar(
            `SELECT COUNT(*) FROM hackathon_rules
             WHERE cycle_id=? AND blocking=1
               AND (review_state!='accepted' OR confidence IN ('unknown','stale'))`,
            [row.cycle_id],
          ) ?? 0,
        );
        if (unresolved > 0) {
          throw new Error(
            'Entry is not ready for a go decision: every blocking rule requires accepted, current evidence.',
          );
        }
      }
    }
    return super.decideEntry(value);
  }

  override saveBuild(input: HackathonBuildInput): HackathonBuild {
    const value = HackathonBuildSchema.parse(input);
    const existing = this.vault.one<BuildStateRow>(
      'SELECT entry_id,status FROM hackathon_builds WHERE id=?',
      [value.id],
    );
    if (existing) {
      if (existing.entry_id !== value.entryId) {
        throw new Error('A hackathon build cannot be moved to another entry.');
      }
      if (!BUILD_TRANSITIONS[existing.status].includes(value.status)) {
        throw new Error(`Invalid hackathon build transition from ${existing.status} to ${value.status}.`);
      }
    }
    return super.saveBuild(value);
  }

  override saveDistributionPlan(input: DistributionPlanInput): DistributionPlan {
    const value = DistributionPlanSchema.parse(input);
    const existing = this.vault.one<DistributionPlanRow>(
      'SELECT * FROM hackathon_distribution_plans WHERE id=?',
      [value.id],
    );
    if (!existing && value.status !== 'draft') {
      throw new Error('A new hackathon distribution plan must start as a draft.');
    }
    if (existing) {
      if (!PLAN_TRANSITIONS[existing.status].includes(value.status)) {
        throw new Error(
          `Invalid distribution plan transition from ${existing.status} to ${value.status}.`,
        );
      }
      if (
        existing.status !== 'draft' &&
        (existing.entry_id !== value.entryId ||
          existing.summary !== value.summary ||
          existing.content_sha256 !== value.contentSha256 ||
          existing.approved_by !== value.approvedBy ||
          existing.approved_at !== value.approvedAt ||
          existing.created_at !== value.createdAt)
      ) {
        throw new Error('Approved hackathon distribution plan content is immutable.');
      }
    }
    return super.saveDistributionPlan(value);
  }

  override saveDistributionItem(input: DistributionItemInput): DistributionItem {
    const value = DistributionItemSchema.parse(input);
    const plan = this.vault.one<{ status: DistributionPlan['status'] }>(
      'SELECT status FROM hackathon_distribution_plans WHERE id=?',
      [value.planId],
    );
    if (!plan) throw new Error('Distribution plan does not exist.');
    const existingRow = this.vault.one<DistributionItemRow>(
      'SELECT * FROM hackathon_distribution_items WHERE id=?',
      [value.id],
    );
    if (plan.status !== 'draft') {
      if (!existingRow) {
        throw new Error('Approved hackathon distribution plans cannot accept new items.');
      }
      const existing = mapDistributionItem(existingRow);
      if (
        existing.planId !== value.planId ||
        existing.kind !== value.kind ||
        existing.phase !== value.phase ||
        existing.title !== value.title ||
        existing.scheduledAt !== value.scheduledAt ||
        existing.createdAt !== value.createdAt
      ) {
        throw new Error('Approved distribution item scope is immutable.');
      }
      if (!ITEM_TRANSITIONS[existing.status].includes(value.status)) {
        throw new Error(
          `Invalid distribution item transition from ${existing.status} to ${value.status}.`,
        );
      }
    }
    return super.saveDistributionItem(value);
  }
}
