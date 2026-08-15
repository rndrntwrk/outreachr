import { randomUUID } from 'node:crypto';

import { HackathonRepository } from '@outreachr/core';
import type { OpportunityEvidenceSummary } from '../shared/hackathon-contracts';
import type {
  DistributionItemSaveInput,
  DistributionPlanSaveInput,
  HackathonAssetSaveInput,
  HackathonBuildSaveInput,
  HackathonConversionRecordInput,
  HackathonResultRecordInput,
  HackathonSubmissionRecordInput,
} from '../shared/hackathon-execution-contracts';
import { HackathonService } from './hackathon-service';
import { OpportunityService } from './opportunity-service';
import type { VaultService } from './vault-service';

interface HackathonStudioServiceOptions {
  vault: VaultService;
  now?: () => Date;
}

export class HackathonStudioService extends HackathonService {
  readonly #vault: VaultService;
  readonly #now: () => Date;
  readonly #opportunityReview: OpportunityService;

  constructor(options: HackathonStudioServiceOptions) {
    super(options);
    this.#vault = options.vault;
    this.#now = options.now ?? (() => new Date());
    this.#opportunityReview = new OpportunityService(options);
  }

  #repository(): HackathonRepository {
    return new HackathonRepository(this.#vault.vault);
  }

  reviewOpportunitySource(input: {
    opportunityId: string;
    sourceId: string;
    sourceRole: string;
    decision: 'accepted' | 'rejected';
  }): Promise<OpportunityEvidenceSummary> {
    return this.#opportunityReview.reviewSource(input);
  }

  async saveBuild(input: HackathonBuildSaveInput) {
    if (['approved', 'active', 'completed'].includes(input.status) && !input.approved) {
      throw new Error('Approved, active and completed builds require explicit founder approval');
    }
    const now = this.#now().toISOString();
    const id = input.id ?? `hackathon-build:${randomUUID()}`;
    const existing = this.#vault.vault.one<{
      created_at: string;
      approved_by: string | null;
      approved_at: string | null;
    }>('SELECT created_at,approved_by,approved_at FROM hackathon_builds WHERE id=?', [id]);
    const saved = this.#repository().saveBuild({
      id,
      entryId: input.entryId,
      status: input.status,
      repository: input.repository,
      baseCommitSha: input.baseCommitSha,
      branchName: input.branchName,
      worktreeReference: input.worktreeReference,
      adapterPath: input.adapterPath,
      ownerAgent: input.ownerAgent,
      toolPolicy: input.toolPolicy,
      budgetUsd: input.budgetUsd,
      budgetHours: input.budgetHours,
      startConditions: input.startConditions,
      stopConditions: input.stopConditions,
      currentCommitSha: input.currentCommitSha,
      ciState: input.ciState,
      securityReviewState: input.securityReviewState,
      evidenceManifestSha256: input.evidenceManifestSha256,
      mergeDecision: input.mergeDecision,
      approvedBy: input.approved ? (existing?.approved_by ?? 'founder') : null,
      approvedAt: input.approved ? (existing?.approved_at ?? now) : null,
      startedAt: input.startedAt,
      completedAt: input.completedAt,
      createdAt: existing?.created_at ?? now,
      updatedAt: now,
    });
    await this.#vault.persist();
    const detail = await this.getEntry(input.entryId);
    if (!detail.build || detail.build.id !== saved.id) {
      throw new Error('Saved hackathon build could not be read back');
    }
    return detail.build;
  }

  async saveAsset(input: HackathonAssetSaveInput) {
    const now = this.#now().toISOString();
    const id = input.id ?? `hackathon-asset:${randomUUID()}`;
    const existing = this.#vault.vault.one<{ created_at: string }>(
      'SELECT created_at FROM hackathon_assets WHERE id=?',
      [id],
    );
    const saved = this.#repository().saveAsset({
      id,
      entryId: input.entryId,
      kind: input.kind as never,
      required: input.required,
      status: input.status,
      reference: input.reference,
      contentSha256: input.contentSha256,
      founderReviewState: input.founderReviewState,
      reviewedAt: input.founderReviewState === 'pending' ? null : now,
      createdAt: existing?.created_at ?? now,
      updatedAt: now,
    });
    await this.#vault.persist();
    const detail = await this.getEntry(input.entryId);
    const result = detail.assets.find((value) => value.id === saved.id);
    if (!result) throw new Error('Saved hackathon asset could not be read back');
    return result;
  }

  async saveDistributionPlan(input: DistributionPlanSaveInput) {
    if (['approved', 'active', 'completed'].includes(input.status) && !input.approved) {
      throw new Error('Approved distribution plans require explicit founder approval');
    }
    const now = this.#now().toISOString();
    const id = input.id ?? `hackathon-distribution-plan:${randomUUID()}`;
    const existing = this.#vault.vault.one<{
      created_at: string;
      approved_by: string | null;
      approved_at: string | null;
    }>(
      'SELECT created_at,approved_by,approved_at FROM hackathon_distribution_plans WHERE id=?',
      [id],
    );
    const saved = this.#repository().saveDistributionPlan({
      id,
      entryId: input.entryId,
      summary: input.summary,
      status: input.status,
      contentSha256: input.contentSha256,
      approvedBy: input.approved ? (existing?.approved_by ?? 'founder') : null,
      approvedAt: input.approved ? (existing?.approved_at ?? now) : null,
      createdAt: existing?.created_at ?? now,
      updatedAt: now,
    });
    await this.#vault.persist();
    const detail = await this.getEntry(input.entryId);
    if (!detail.distributionPlan || detail.distributionPlan.id !== saved.id) {
      throw new Error('Saved distribution plan could not be read back');
    }
    return detail.distributionPlan;
  }

  async saveDistributionItem(input: DistributionItemSaveInput) {
    const now = this.#now().toISOString();
    const id = input.id ?? `hackathon-distribution-item:${randomUUID()}`;
    const existing = this.#vault.vault.one<{ created_at: string }>(
      'SELECT created_at FROM hackathon_distribution_items WHERE id=?',
      [id],
    );
    const entryId = this.#vault.vault.scalar(
      'SELECT entry_id FROM hackathon_distribution_plans WHERE id=?',
      [input.planId],
    );
    if (typeof entryId !== 'string') throw new Error('Distribution plan does not exist');
    const saved = this.#repository().saveDistributionItem({
      id,
      planId: input.planId,
      kind: input.kind as never,
      phase: input.phase,
      status: input.status,
      title: input.title,
      scheduledAt: input.scheduledAt,
      completedAt: input.completedAt,
      reference: input.reference,
      createdAt: existing?.created_at ?? now,
      updatedAt: now,
    });
    await this.#vault.persist();
    const detail = await this.getEntry(entryId);
    const result = detail.distributionItems.find((value) => value.id === saved.id);
    if (!result) throw new Error('Saved distribution item could not be read back');
    return result;
  }

  async recordSubmission(input: HackathonSubmissionRecordInput) {
    const now = this.#now().toISOString();
    const id = input.id ?? `hackathon-submission:${randomUUID()}`;
    const saved = this.#repository().saveSubmission({
      id,
      entryId: input.entryId,
      portalUrl: input.portalUrl,
      submittedAt: input.submittedAt,
      narrativeProfileId: input.narrativeProfileId,
      canonicalDemoVersionId: input.canonicalDemoVersionId,
      repositoryCommitSha: input.repositoryCommitSha,
      receiptAssetId: input.receiptAssetId,
      contentSha256: input.contentSha256,
      status: input.status,
      createdAt: now,
      updatedAt: now,
    });
    await this.#vault.persist();
    const detail = await this.getEntry(input.entryId);
    if (!detail.submission || detail.submission.id !== saved.id) {
      throw new Error('Recorded submission could not be read back');
    }
    return detail.submission;
  }

  async recordResult(input: HackathonResultRecordInput) {
    const now = this.#now().toISOString();
    const id = input.id ?? `hackathon-result:${randomUUID()}`;
    const existing = this.#vault.vault.one<{ created_at: string }>(
      'SELECT created_at FROM hackathon_results WHERE id=?',
      [id],
    );
    const saved = this.#repository().saveResult({
      id,
      entryId: input.entryId,
      outcome: input.outcome,
      placement: input.placement,
      prizeValue: input.prizeValue,
      prizeAsset: input.prizeAsset,
      credits: input.credits,
      invitations: input.invitations,
      recordedAt: input.recordedAt,
      createdAt: existing?.created_at ?? now,
      updatedAt: now,
    });
    await this.#vault.persist();
    const detail = await this.getEntry(input.entryId);
    if (!detail.result || detail.result.id !== saved.id) {
      throw new Error('Recorded hackathon result could not be read back');
    }
    return detail.result;
  }

  async recordConversion(input: HackathonConversionRecordInput) {
    const now = this.#now().toISOString();
    const id = input.id ?? `hackathon-conversion:${randomUUID()}`;
    const existing = this.#vault.vault.one<{ created_at: string }>(
      'SELECT created_at FROM hackathon_conversions WHERE id=?',
      [id],
    );
    const saved = this.#repository().saveConversion({
      id,
      entryId: input.entryId,
      kind: input.kind,
      organizationId: input.organizationId,
      title: input.title,
      detail: input.detail,
      valueUsd: input.valueUsd,
      status: input.status,
      referenceUrl: input.referenceUrl,
      occurredAt: input.occurredAt,
      createdAt: existing?.created_at ?? now,
      updatedAt: now,
    });
    await this.#vault.persist();
    const detail = await this.getEntry(input.entryId);
    const result = detail.conversions.find((value) => value.id === saved.id);
    if (!result) throw new Error('Recorded hackathon conversion could not be read back');
    return result;
  }
}
