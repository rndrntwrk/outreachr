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
    const detail = await this.getEntry(input.entryId);
    return super.saveBuild({ ...input, id: detail.build?.id });
  }

  override async saveDistribution(
    input: HackathonDistributionSaveInput,
  ): Promise<HackathonDistributionSummary> {
    if (input.id) return super.saveDistribution(input);
    const detail = await this.getEntry(input.entryId);
    return super.saveDistribution({ ...input, id: detail.distributionPlan?.id });
  }
}
