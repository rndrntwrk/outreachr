import {
  HackathonBuildSchema,
  type HackathonBuild,
  type HackathonBuildInput,
} from './hackathon-validation-v11.js';
import { stableJson } from './validation.js';
import { HackathonQueryRepository } from './hackathon-repository-query.js';
import {
  type BuildRow,
  mapBuild,
  sameJson,
} from './hackathon-repository-internal.js';

export class HackathonBuildRepository extends HackathonQueryRepository {
  saveBuild(input: HackathonBuildInput): HackathonBuild {
    const value = HackathonBuildSchema.parse(input);
    this.requireEntry(value.entryId);
    const existingRow = this.vault.one<BuildRow>('SELECT * FROM hackathon_builds WHERE id=?', [
      value.id,
    ]);
    if (existingRow && existingRow.entry_id !== value.entryId) {
      throw new Error('A build cannot be moved to another hackathon entry');
    }

    this.vault.transaction(() => {
      if (!existingRow) {
        const initialStatus = 'draft';
        this.vault.run(
          `INSERT INTO hackathon_builds(
            id,entry_id,status,repository,base_commit_sha,branch_name,worktree_reference,
            adapter_path,owner_agent,tool_policy_json,budget_usd,budget_hours,start_conditions,
            stop_conditions,current_commit_sha,ci_state,security_review_state,
            evidence_manifest_sha256,merge_decision,approved_by,approved_at,started_at,
            completed_at,created_at,updated_at
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            value.id,
            value.entryId,
            initialStatus,
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
            null,
            null,
            value.startedAt,
            value.completedAt,
            value.createdAt,
            value.updatedAt,
          ],
        );
      } else if (existingRow.status === 'draft') {
        this.vault.run(
          `UPDATE hackathon_builds SET repository=?,base_commit_sha=?,branch_name=?,
            worktree_reference=?,adapter_path=?,owner_agent=?,tool_policy_json=?,budget_usd=?,
            budget_hours=?,start_conditions=?,stop_conditions=?,current_commit_sha=?,ci_state=?,
            security_review_state=?,evidence_manifest_sha256=?,merge_decision=?,started_at=?,
            completed_at=?,updated_at=? WHERE id=?`,
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
      } else {
        const current = mapBuild(existingRow);
        const planChanged =
          current.repository !== value.repository ||
          current.baseCommitSha !== value.baseCommitSha ||
          current.branchName !== value.branchName ||
          current.adapterPath !== value.adapterPath ||
          current.ownerAgent !== value.ownerAgent ||
          !sameJson(current.toolPolicy, value.toolPolicy) ||
          current.budgetUsd !== value.budgetUsd ||
          current.budgetHours !== value.budgetHours ||
          current.startConditions !== value.startConditions ||
          current.stopConditions !== value.stopConditions;
        if (planChanged) throw new Error('Approved hackathon build plans are immutable');
      }

      const currentRow = this.vault.one<BuildRow>('SELECT * FROM hackathon_builds WHERE id=?', [
        value.id,
      ])!;
      if (currentRow.status === 'draft' && value.status !== 'draft') {
        this.vault.run(
          `UPDATE hackathon_builds SET status='approved',approved_by=?,approved_at=?,updated_at=?
           WHERE id=? AND status='draft'`,
          [value.approvedBy, value.approvedAt, value.updatedAt, value.id],
        );
      }
      if (value.status === 'active') {
        this.vault.run(
          `UPDATE hackathon_builds SET status='active',worktree_reference=?,current_commit_sha=?,
            ci_state=?,security_review_state=?,evidence_manifest_sha256=?,merge_decision=?,
            started_at=?,completed_at=?,updated_at=? WHERE id=? AND status IN ('approved','active')`,
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
      } else if (value.status === 'completed') {
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
        this.vault.run(
          `UPDATE hackathon_builds SET status='completed',worktree_reference=?,current_commit_sha=?,
            ci_state=?,security_review_state=?,evidence_manifest_sha256=?,merge_decision=?,
            started_at=?,completed_at=?,updated_at=? WHERE id=? AND status='active'`,
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
      } else if (value.status === 'cancelled') {
        this.vault.run(
          `UPDATE hackathon_builds SET status='cancelled',worktree_reference=?,current_commit_sha=?,
            ci_state=?,security_review_state=?,evidence_manifest_sha256=?,merge_decision=?,
            started_at=?,completed_at=?,updated_at=? WHERE id=? AND status IN ('draft','approved','active')`,
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
      } else if (value.status === 'approved') {
        this.vault.run(
          `UPDATE hackathon_builds SET worktree_reference=?,current_commit_sha=?,ci_state=?,
            security_review_state=?,evidence_manifest_sha256=?,merge_decision=?,started_at=?,
            completed_at=?,updated_at=? WHERE id=? AND status='approved'`,
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
      this.audit(
        'hackathon.build_saved',
        'hackathon_entry',
        value.entryId,
        { buildId: value.id, status: value.status, ciState: value.ciState },
        value.updatedAt,
      );
    });
    return mapBuild(
      this.vault.one<BuildRow>('SELECT * FROM hackathon_builds WHERE id=?', [value.id])!,
    );
  }
}
