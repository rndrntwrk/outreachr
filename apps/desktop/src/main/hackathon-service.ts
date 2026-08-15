import type {
  HackathonBuildSaveInput,
  HackathonBuildSummary,
  HackathonDistributionSaveInput,
  HackathonDistributionSummary,
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
    if (input.id) return super.saveDistribution(input);
    const existingId = (await this.getEntry(input.entryId)).distributionPlan?.id;
    return super.saveDistribution(existingId ? { ...input, id: existingId } : input);
  }
}
