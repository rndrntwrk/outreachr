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

const REQUIRED_DISTRIBUTION_PHASES = [
  'pre_event',
  'submission_day',
  'post_result',
] as const;

export class HackathonService extends HackathonServiceBase {
  override async saveBuild(input: HackathonBuildSaveInput): Promise<HackathonBuildSummary> {
    if (input.id) return super.saveBuild(input);
    const existingId = (await this.getEntry(input.entryId)).build?.id;
    return super.saveBuild(existingId ? { ...input, id: existingId } : input);
  }

  override async saveDistribution(
    input: HackathonDistributionSaveInput,
  ): Promise<HackathonDistributionSummary> {
    const detail = await this.getEntry(input.entryId);
    const existing = detail.distributionPlan;
    if (input.id && existing && input.id !== existing.id) {
      throw new Error('A hackathon entry already has a different distribution plan.');
    }
    if (!existing) {
      if (input.status !== 'draft') {
        throw new Error(
          'A new distribution plan must start as a draft so its required items can be added.',
        );
      }
      return super.saveDistribution(input);
    }

    const normalized = input.id ? input : { ...input, id: existing.id };
    if (
      existing.status === 'draft' &&
      ['approved', 'active', 'completed'].includes(input.status)
    ) {
      const phases = new Set(
        detail.distributionItems
          .filter((item) => item.status !== 'cancelled')
          .map((item) => item.phase),
      );
      const missing = REQUIRED_DISTRIBUTION_PHASES.filter((phase) => !phases.has(phase));
      if (missing.length) {
        throw new Error(
          `Distribution approval requires pre-event, submission-day and post-result items. Missing: ${missing.join(', ')}.`,
        );
      }
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
