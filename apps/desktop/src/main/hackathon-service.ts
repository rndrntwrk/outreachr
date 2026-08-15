import type {
  HackathonBuildSaveInput,
  HackathonBuildSummary,
  HackathonDistributionSaveInput,
  HackathonDistributionSummary,
  HackathonSubmissionSaveInput,
  HackathonSubmissionSummary,
} from '../shared/hackathon-contracts';
import {
  HackathonService as HackathonServiceBase,
  type EligibilityProfileProvider,
} from './hackathon-service-base';

export type { EligibilityProfileProvider };

export class HackathonService extends HackathonServiceBase {
  override async saveBuild(input: HackathonBuildSaveInput): Promise<HackathonBuildSummary> {
    if (input.id) return super.saveBuild(input);
    const existingId = (await this.getEntry(input.entryId)).build?.id;
    return super.saveBuild(existingId ? { ...input, id: existingId } : input);
  }

  override async saveDistribution(
    input: HackathonDistributionSaveInput,
  ): Promise<HackathonDistributionSummary> {
    const existing = (await this.getEntry(input.entryId)).distributionPlan;
    if (input.id && existing && input.id !== existing.id) {
      throw new Error('A hackathon entry already has a different distribution plan.');
    }

    const normalized = existing && !input.id ? { ...input, id: existing.id } : input;
    if (!existing) {
      const draft = await super.saveDistribution({ ...normalized, status: 'draft' });
      const identified = { ...normalized, id: draft.id };
      if (input.status === 'draft') return draft;
      if (input.status === 'cancelled') {
        return super.saveDistribution({ ...identified, status: 'cancelled' });
      }
      const approved = await super.saveDistribution({ ...identified, status: 'approved' });
      if (input.status === 'approved') return approved;
      return super.saveDistribution(identified);
    }

    if (existing.status === 'draft' && ['active', 'completed'].includes(input.status)) {
      await super.saveDistribution({ ...normalized, status: 'approved' });
    }
    return super.saveDistribution(normalized);
  }

  override async saveSubmission(
    input: HackathonSubmissionSaveInput,
  ): Promise<HackathonSubmissionSummary> {
    const detail = await this.getEntry(input.entryId);
    if (!detail.build?.currentCommitSha) {
      throw new Error('A submission requires a verified current build commit.');
    }
    if (detail.build.currentCommitSha !== input.repositoryCommitSha) {
      throw new Error('Submission commit must match the current verified build commit.');
    }
    return super.saveSubmission(input);
  }
}
