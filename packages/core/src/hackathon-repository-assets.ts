import {
  DistributionItemSchema,
  DistributionPlanSchema,
  HackathonAssetSchema,
  type DistributionItem,
  type DistributionItemInput,
  type DistributionPlan,
  type DistributionPlanInput,
  type HackathonAsset,
  type HackathonAssetInput,
} from './hackathon-validation-v11.js';
import { HackathonBuildRepository } from './hackathon-repository-build.js';
import {
  type AssetRow,
  type DistributionItemRow,
  type DistributionPlanRow,
  bool,
  mapAsset,
  mapDistributionItem,
  mapDistributionPlan,
  sameJson,
} from './hackathon-repository-internal.js';

export class HackathonAssetRepository extends HackathonBuildRepository {
  saveAsset(input: HackathonAssetInput): HackathonAsset {
    const value = HackathonAssetSchema.parse(input);
    this.requireEntry(value.entryId);
    const existingRow = this.vault.one<AssetRow>('SELECT * FROM hackathon_assets WHERE id=?', [
      value.id,
    ]);
    if (existingRow) {
      const existing = mapAsset(existingRow);
      if (existing.founderReviewState !== 'pending') {
        if (sameJson(existing, value)) return existing;
        throw new Error('Reviewed hackathon assets are immutable');
      }
    }
    this.vault.transaction(() => {
      if (!existingRow) {
        this.vault.run(
          `INSERT INTO hackathon_assets(
            id,entry_id,kind,required,status,reference,content_sha256,founder_review_state,
            reviewed_at,created_at,updated_at
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [
            value.id,
            value.entryId,
            value.kind,
            bool(value.required),
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
            bool(value.required),
            value.status === 'approved' ? 'ready' : value.status,
            value.reference,
            value.contentSha256,
            value.updatedAt,
            value.id,
          ],
        );
      }
      if (value.founderReviewState !== 'pending' || value.status === 'approved') {
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
        { assetId: value.id, kind: value.kind, status: value.status, required: value.required },
        value.reviewedAt ?? value.updatedAt,
      );
    });
    return mapAsset(
      this.vault.one<AssetRow>('SELECT * FROM hackathon_assets WHERE id=?', [value.id])!,
    );
  }

  saveDistributionPlan(input: DistributionPlanInput): DistributionPlan {
    const value = DistributionPlanSchema.parse(input);
    this.requireEntry(value.entryId);
    const existingRow = this.vault.one<DistributionPlanRow>(
      'SELECT * FROM hackathon_distribution_plans WHERE id=?',
      [value.id],
    );
    if (existingRow) {
      const existing = mapDistributionPlan(existingRow);
      if (existing.status !== 'draft') {
        const immutableChanged =
          existing.entryId !== value.entryId ||
          existing.summary !== value.summary ||
          existing.contentSha256 !== value.contentSha256 ||
          existing.approvedBy !== value.approvedBy ||
          existing.approvedAt !== value.approvedAt;
        if (immutableChanged) throw new Error('Approved distribution plans are immutable');
      }
    }
    this.vault.transaction(() => {
      if (!existingRow) {
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
      } else if (existingRow.status === 'draft') {
        this.vault.run(
          `UPDATE hackathon_distribution_plans SET entry_id=?,summary=?,content_sha256=?,
            updated_at=? WHERE id=? AND status='draft'`,
          [value.entryId, value.summary, value.contentSha256, value.updatedAt, value.id],
        );
      }
      const currentPlanRow = this.vault.one<DistributionPlanRow>(
        'SELECT * FROM hackathon_distribution_plans WHERE id=?',
        [value.id],
      )!;
      if (
        currentPlanRow.status === 'draft' &&
        ['approved', 'active', 'completed'].includes(value.status)
      ) {
        this.vault.run(
          `UPDATE hackathon_distribution_plans SET status='approved',approved_by=?,approved_at=?,
            updated_at=? WHERE id=? AND status='draft'`,
          [value.approvedBy, value.approvedAt, value.updatedAt, value.id],
        );
      }
      if (value.status === 'active') {
        this.vault.run(
          `UPDATE hackathon_distribution_plans SET status='active',updated_at=?
           WHERE id=? AND status='approved'`,
          [value.updatedAt, value.id],
        );
      } else if (value.status === 'completed') {
        this.vault.run(
          `UPDATE hackathon_distribution_plans SET status='completed',updated_at=?
           WHERE id=? AND status IN ('approved','active')`,
          [value.updatedAt, value.id],
        );
      } else if (value.status === 'cancelled') {
        this.vault.run(
          `UPDATE hackathon_distribution_plans SET status='cancelled',updated_at=?
           WHERE id=? AND status IN ('draft','approved','active')`,
          [value.updatedAt, value.id],
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
    return mapDistributionPlan(
      this.vault.one<DistributionPlanRow>(
        'SELECT * FROM hackathon_distribution_plans WHERE id=?',
        [value.id],
      )!,
    );
  }

  saveDistributionItem(input: DistributionItemInput): DistributionItem {
    const value = DistributionItemSchema.parse(input);
    const plan = this.vault.one<DistributionPlanRow>(
      'SELECT * FROM hackathon_distribution_plans WHERE id=?',
      [value.planId],
    );
    if (!plan) throw new Error(`Distribution plan ${value.planId} does not exist`);
    const existingRow = this.vault.one<DistributionItemRow>(
      'SELECT * FROM hackathon_distribution_items WHERE id=?',
      [value.id],
    );
    if (plan.status !== 'draft') {
      if (existingRow && sameJson(mapDistributionItem(existingRow), value)) {
        return mapDistributionItem(existingRow);
      }
      throw new Error('Approved hackathon distribution plans cannot change their items');
    }
    this.vault.transaction(() => {
      this.vault.run(
        `INSERT INTO hackathon_distribution_items(
          id,plan_id,kind,phase,status,title,scheduled_at,completed_at,reference,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
          plan_id=excluded.plan_id,kind=excluded.kind,phase=excluded.phase,status=excluded.status,
          title=excluded.title,scheduled_at=excluded.scheduled_at,
          completed_at=excluded.completed_at,reference=excluded.reference,updated_at=excluded.updated_at`,
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
        plan.entry_id,
        { itemId: value.id, planId: value.planId, phase: value.phase, status: value.status },
        value.updatedAt,
      );
    });
    return mapDistributionItem(
      this.vault.one<DistributionItemRow>(
        'SELECT * FROM hackathon_distribution_items WHERE id=?',
        [value.id],
      )!,
    );
  }
}
