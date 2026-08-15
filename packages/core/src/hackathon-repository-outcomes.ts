import {
  HackathonConversionSchema,
  HackathonResultSchema,
  HackathonSubmissionSchema,
  type HackathonConversion,
  type HackathonConversionInput,
  type HackathonResult,
  type HackathonResultInput,
  type HackathonSubmission,
  type HackathonSubmissionInput,
} from './hackathon-validation-v11.js';
import { HackathonAssetRepository } from './hackathon-repository-assets.js';
import {
  type ConversionRow,
  type ResultRow,
  type SubmissionRow,
  mapConversion,
  mapResult,
  mapSubmission,
  sameJson,
} from './hackathon-repository-internal.js';

export class HackathonOutcomeRepository extends HackathonAssetRepository {
  saveSubmission(input: HackathonSubmissionInput): HackathonSubmission {
    const value = HackathonSubmissionSchema.parse(input);
    this.requireEntry(value.entryId);
    const existingRow = this.vault.one<SubmissionRow>(
      'SELECT * FROM hackathon_submissions WHERE id=?',
      [value.id],
    );
    if (existingRow) {
      const existing = mapSubmission(existingRow);
      if (sameJson(existing, value)) return existing;
      throw new Error('Recorded hackathon submissions are immutable');
    }
    this.vault.transaction(() => {
      this.vault.run(
        `INSERT INTO hackathon_submissions(
          id,entry_id,portal_url,submitted_at,narrative_profile_id,canonical_demo_version_id,
          repository_commit_sha,receipt_asset_id,content_sha256,status,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          value.id,
          value.entryId,
          value.portalUrl,
          value.submittedAt,
          value.narrativeProfileId,
          value.canonicalDemoVersionId,
          value.repositoryCommitSha,
          value.receiptAssetId,
          value.contentSha256,
          value.status,
          value.createdAt,
          value.updatedAt,
        ],
      );
      this.audit(
        'hackathon.submission_recorded',
        'hackathon_entry',
        value.entryId,
        {
          submissionId: value.id,
          repositoryCommitSha: value.repositoryCommitSha,
          narrativeProfileId: value.narrativeProfileId,
          canonicalDemoVersionId: value.canonicalDemoVersionId,
          receiptAssetId: value.receiptAssetId,
        },
        value.submittedAt,
      );
    });
    return mapSubmission(
      this.vault.one<SubmissionRow>('SELECT * FROM hackathon_submissions WHERE id=?', [value.id])!,
    );
  }

  saveResult(input: HackathonResultInput): HackathonResult {
    const value = HackathonResultSchema.parse(input);
    this.requireEntry(value.entryId);
    this.vault.transaction(() => {
      this.vault.run(
        `INSERT INTO hackathon_results(
          id,entry_id,outcome,placement,prize_value,prize_asset,credits_json,invitations_json,
          recorded_at,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
          outcome=excluded.outcome,placement=excluded.placement,prize_value=excluded.prize_value,
          prize_asset=excluded.prize_asset,credits_json=excluded.credits_json,
          invitations_json=excluded.invitations_json,recorded_at=excluded.recorded_at,
          updated_at=excluded.updated_at`,
        [
          value.id,
          value.entryId,
          value.outcome,
          value.placement,
          value.prizeValue,
          value.prizeAsset,
          JSON.stringify(value.credits),
          JSON.stringify(value.invitations),
          value.recordedAt,
          value.createdAt,
          value.updatedAt,
        ],
      );
      this.audit(
        'hackathon.result_recorded',
        'hackathon_entry',
        value.entryId,
        { resultId: value.id, outcome: value.outcome, placement: value.placement },
        value.recordedAt,
      );
    });
    return mapResult(
      this.vault.one<ResultRow>('SELECT * FROM hackathon_results WHERE id=?', [value.id])!,
    );
  }

  saveConversion(input: HackathonConversionInput): HackathonConversion {
    const value = HackathonConversionSchema.parse(input);
    this.requireEntry(value.entryId);
    this.vault.transaction(() => {
      this.vault.run(
        `INSERT INTO hackathon_conversions(
          id,entry_id,kind,organization_id,title,detail,value_usd,status,reference_url,
          occurred_at,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
          kind=excluded.kind,organization_id=excluded.organization_id,title=excluded.title,
          detail=excluded.detail,value_usd=excluded.value_usd,status=excluded.status,
          reference_url=excluded.reference_url,occurred_at=excluded.occurred_at,
          updated_at=excluded.updated_at`,
        [
          value.id,
          value.entryId,
          value.kind,
          value.organizationId,
          value.title,
          value.detail,
          value.valueUsd,
          value.status,
          value.referenceUrl,
          value.occurredAt,
          value.createdAt,
          value.updatedAt,
        ],
      );
      this.audit(
        'hackathon.conversion_saved',
        'hackathon_entry',
        value.entryId,
        { conversionId: value.id, kind: value.kind, status: value.status },
        value.occurredAt ?? value.updatedAt,
      );
    });
    return mapConversion(
      this.vault.one<ConversionRow>('SELECT * FROM hackathon_conversions WHERE id=?', [value.id])!,
    );
  }
}
