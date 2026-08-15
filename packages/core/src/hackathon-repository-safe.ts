import {
  HackathonAssetSchema,
  HackathonBuildSchema,
  HackathonEligibilityEvaluationSchema,
  type EligibilityEvaluation,
  type EligibilityEvaluationInput,
  type HackathonAsset,
  type HackathonAssetInput,
  type HackathonBuild,
  type HackathonBuildInput,
} from './hackathon-validation-v11.js';
import { HackathonRepository as BaseHackathonRepository } from './hackathon-repository.js';
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

function nullableNumber(row: DbRow, key: string): number | null {
  if (row[key] === null || row[key] === undefined) return null;
  const value = Number(row[key]);
  if (!Number.isFinite(value)) throw new Error(`Database column ${key} is not numeric`);
  return value;
}

function parseJson(row: DbRow, key: string): unknown {
  try {
    return JSON.parse(text(row, key)) as unknown;
  } catch {
    throw new Error(`Database column ${key} contains invalid JSON`);
  }
}

function mapEligibility(row: DbRow): EligibilityEvaluation {
  return HackathonEligibilityEvaluationSchema.parse({
    id: text(row, 'id'),
    entryId: text(row, 'entry_id'),
    status: text(row, 'status'),
    evaluatedAt: text(row, 'evaluated_at'),
    rulesSnapshotSha256: text(row, 'rules_snapshot_sha256'),
    detail: parseJson(row, 'detail_json'),
    founderReviewState: text(row, 'founder_review_state'),
    reviewedAt: nullableText(row, 'reviewed_at'),
  });
}

function mapAsset(row: DbRow): HackathonAsset {
  return HackathonAssetSchema.parse({
    id: text(row, 'id'),
    entryId: text(row, 'entry_id'),
    kind: text(row, 'kind'),
    required: Number(row.required) === 1,
    status: text(row, 'status'),
    reference: nullableText(row, 'reference'),
    contentSha256: nullableText(row, 'content_sha256'),
    founderReviewState: text(row, 'founder_review_state'),
    reviewedAt: nullableText(row, 'reviewed_at'),
    createdAt: text(row, 'created_at'),
    updatedAt: text(row, 'updated_at'),
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
    toolPolicy: parseJson(row, 'tool_policy_json'),
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

function sameReviewRecord(left: unknown, right: unknown): boolean {
  return stableJson(left) === stableJson(right);
}

function audit(
  repository: HackathonRepository,
  action: string,
  entryId: string,
  detail: unknown,
  occurredAt: string,
): void {
  appendAuditEntry(repository.vault, {
    occurredAt,
    actorType: 'founder',
    actorId: 'founder',
    action,
    entityType: 'hackathon_entry',
    entityId: entryId,
    detail,
  });
}

function buildPlanSnapshot(value: HackathonBuild): unknown {
  return {
    entryId: value.entryId,
    repository: value.repository,
    baseCommitSha: value.baseCommitSha,
    branchName: value.branchName,
    adapterPath: value.adapterPath,
    ownerAgent: value.ownerAgent,
    toolPolicy: value.toolPolicy,
    budgetUsd: value.budgetUsd,
    budgetHours: value.budgetHours,
    startConditions: value.startConditions,
    stopConditions: value.stopConditions,
  };
}

export class HackathonRepository extends BaseHackathonRepository {
  override saveEligibilityEvaluation(input: EligibilityEvaluationInput): EligibilityEvaluation {
    const value = HackathonEligibilityEvaluationSchema.parse(input);
    const currentRules = this.vault.scalar(
      `SELECT c.rules_sha256 FROM hackathon_entries e
       JOIN hackathon_cycles c ON c.id=e.cycle_id WHERE e.id=?`,
      [value.entryId],
    );
    if (typeof currentRules !== 'string' || currentRules !== value.rulesSnapshotSha256) {
      throw new Error('Eligibility evaluation must use the current reviewed rules digest');
    }
    const existingRow = this.vault.one<DbRow>(
      'SELECT * FROM hackathon_eligibility_evaluations WHERE id=?',
      [value.id],
    );
    if (existingRow) {
      const existing = mapEligibility(existingRow);
      if (existing.founderReviewState !== 'pending') {
        if (sameReviewRecord(existing, value)) return existing;
        throw new Error('Reviewed eligibility evaluation cannot be changed');
      }
    }

    this.vault.transaction(() => {
      if (!existingRow) {
        this.vault.run(
          `INSERT INTO hackathon_eligibility_evaluations(
            id,entry_id,status,evaluated_at,rules_snapshot_sha256,detail_json,
            founder_review_state,reviewed_at
          ) VALUES (?,?,?,?,?,?,'pending',NULL)`,
          [
            value.id,
            value.entryId,
            value.status,
            value.evaluatedAt,
            value.rulesSnapshotSha256,
            stableJson(value.detail),
          ],
        );
      } else {
        this.vault.run(
          `UPDATE hackathon_eligibility_evaluations SET
            status=?,evaluated_at=?,rules_snapshot_sha256=?,detail_json=?
           WHERE id=? AND founder_review_state='pending'`,
          [
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
      audit(
        this,
        'hackathon.eligibility_saved',
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
    const row = this.vault.one<DbRow>(
      'SELECT * FROM hackathon_eligibility_evaluations WHERE id=?',
      [value.id],
    );
    if (!row) throw new Error('Eligibility evaluation was not persisted');
    return mapEligibility(row);
  }

  override saveAsset(input: HackathonAssetInput): HackathonAsset {
    const value = HackathonAssetSchema.parse(input);
    const existingRow = this.vault.one<DbRow>('SELECT * FROM hackathon_assets WHERE id=?', [
      value.id,
    ]);
    if (existingRow) {
      const existing = mapAsset(existingRow);
      if (existing.founderReviewState !== 'pending') {
        if (sameReviewRecord(existing, value)) return existing;
        throw new Error('Reviewed hackathon asset cannot be changed');
      }
    }

    this.vault.transaction(() => {
      const stagedStatus = value.status === 'approved' ? 'ready' : value.status;
      if (!existingRow) {
        this.vault.run(
          `INSERT INTO hackathon_assets(
            id,entry_id,kind,required,status,reference,content_sha256,
            founder_review_state,reviewed_at,created_at,updated_at
          ) VALUES (?,?,?,?,?,?,?,'pending',NULL,?,?)`,
          [
            value.id,
            value.entryId,
            value.kind,
            value.required ? 1 : 0,
            stagedStatus,
            value.reference,
            value.contentSha256,
            value.createdAt,
            value.updatedAt,
          ],
        );
      } else {
        this.vault.run(
          `UPDATE hackathon_assets SET kind=?,required=?,status=?,reference=?,content_sha256=?,
            updated_at=? WHERE id=? AND founder_review_state='pending'`,
          [
            value.kind,
            value.required ? 1 : 0,
            stagedStatus,
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
          [
            value.status,
            value.founderReviewState,
            value.reviewedAt,
            value.updatedAt,
            value.id,
          ],
        );
      }
      audit(
        this,
        'hackathon.asset_saved',
        value.entryId,
        {
          assetId: value.id,
          kind: value.kind,
          required: value.required,
          status: value.status,
          founderReviewState: value.founderReviewState,
        },
        value.reviewedAt ?? value.updatedAt,
      );
    });
    const row = this.vault.one<DbRow>('SELECT * FROM hackathon_assets WHERE id=?', [value.id]);
    if (!row) throw new Error('Hackathon asset was not persisted');
    return mapAsset(row);
  }

  override saveBuild(input: HackathonBuildInput): HackathonBuild {
    const value = HackathonBuildSchema.parse(input);
    const existingRow = this.vault.one<DbRow>('SELECT * FROM hackathon_builds WHERE id=?', [
      value.id,
    ]);
    const existing = existingRow ? mapBuild(existingRow) : null;
    if (existing && ['approved', 'active', 'completed'].includes(existing.status)) {
      if (stableJson(buildPlanSnapshot(existing)) !== stableJson(buildPlanSnapshot(value))) {
        throw new Error('Approved hackathon build plan is immutable');
      }
      if (
        existing.approvedBy !== value.approvedBy ||
        existing.approvedAt !== value.approvedAt
      ) {
        throw new Error('Approved hackathon build metadata is immutable');
      }
    }

    this.vault.transaction(() => {
      if (!existing) {
        this.vault.run(
          `INSERT INTO hackathon_builds(
            id,entry_id,status,repository,base_commit_sha,branch_name,worktree_reference,
            adapter_path,owner_agent,tool_policy_json,budget_usd,budget_hours,start_conditions,
            stop_conditions,current_commit_sha,ci_state,security_review_state,
            evidence_manifest_sha256,merge_decision,approved_by,approved_at,started_at,
            completed_at,created_at,updated_at
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',NULL,NULL,?,?,?)`,
          [
            value.id,
            value.entryId,
            'draft',
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
            value.completedAt,
            value.createdAt,
            value.updatedAt,
          ],
        );
      } else if (existing.status === 'draft') {
        this.vault.run(
          `UPDATE hackathon_builds SET repository=?,base_commit_sha=?,branch_name=?,
            worktree_reference=?,adapter_path=?,owner_agent=?,tool_policy_json=?,budget_usd=?,
            budget_hours=?,start_conditions=?,stop_conditions=?,current_commit_sha=?,ci_state=?,
            security_review_state=?,evidence_manifest_sha256=?,merge_decision=?,started_at=?,
            completed_at=?,updated_at=? WHERE id=? AND status='draft'`,
          [
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
            value.startedAt,
            value.completedAt,
            value.updatedAt,
            value.id,
          ],
        );
      }

      let currentStatus = existing?.status ?? 'draft';
      if (
        currentStatus === 'draft' &&
        ['approved', 'active', 'completed'].includes(value.status)
      ) {
        this.vault.run(
          `UPDATE hackathon_builds SET status='approved',approved_by=?,approved_at=?,updated_at=?
           WHERE id=? AND status='draft'`,
          [value.approvedBy, value.approvedAt, value.updatedAt, value.id],
        );
        currentStatus = 'approved';
      }
      if (currentStatus === 'approved' && ['active', 'completed'].includes(value.status)) {
        this.vault.run(
          `UPDATE hackathon_builds SET status='active',worktree_reference=?,current_commit_sha=?,
            ci_state=?,security_review_state=?,evidence_manifest_sha256=?,merge_decision=?,
            started_at=?,completed_at=?,updated_at=? WHERE id=? AND status='approved'`,
          [
            value.worktreeReference,
            value.currentCommitSha,
            value.ciState,
            value.securityReviewState,
            value.evidenceManifestSha256,
            value.mergeDecision,
            value.startedAt,
            value.completedAt,
            value.updatedAt,
            value.id,
          ],
        );
        currentStatus = 'active';
      } else if (currentStatus === 'active') {
        this.vault.run(
          `UPDATE hackathon_builds SET worktree_reference=?,current_commit_sha=?,ci_state=?,
            security_review_state=?,evidence_manifest_sha256=?,merge_decision=?,started_at=?,
            completed_at=?,updated_at=? WHERE id=? AND status='active'`,
          [
            value.worktreeReference,
            value.currentCommitSha,
            value.ciState,
            value.securityReviewState,
            value.evidenceManifestSha256,
            value.mergeDecision,
            value.startedAt,
            value.completedAt,
            value.updatedAt,
            value.id,
          ],
        );
      }
      if (currentStatus === 'active' && value.status === 'completed') {
        this.vault.run(
          `UPDATE hackathon_builds SET status='completed',completed_at=?,updated_at=?
           WHERE id=? AND status='active'`,
          [value.completedAt, value.updatedAt, value.id],
        );
      }
      if (value.status === 'cancelled' && currentStatus !== 'completed') {
        this.vault.run(
          `UPDATE hackathon_builds SET status='cancelled',completed_at=?,updated_at=? WHERE id=?`,
          [value.completedAt, value.updatedAt, value.id],
        );
      }
      audit(
        this,
        'hackathon.build_saved',
        value.entryId,
        {
          buildId: value.id,
          requestedStatus: value.status,
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
}
