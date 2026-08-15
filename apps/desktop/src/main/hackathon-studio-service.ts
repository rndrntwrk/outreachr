import type { OpportunityEvidenceSummary } from '../shared/hackathon-contracts';
import { HackathonService } from './hackathon-service';
import { OpportunityService } from './opportunity-service';
import type { VaultService } from './vault-service';

interface HackathonStudioServiceOptions {
  vault: VaultService;
  now?: () => Date;
}

export class HackathonStudioService extends HackathonService {
  readonly #opportunityReview: OpportunityService;

  constructor(options: HackathonStudioServiceOptions) {
    super(options);
    this.#opportunityReview = new OpportunityService(options);
  }

  reviewOpportunitySource(input: {
    opportunityId: string;
    sourceId: string;
    sourceRole: string;
    decision: 'accepted' | 'rejected';
  }): Promise<OpportunityEvidenceSummary> {
    return this.#opportunityReview.reviewSource(input);
  }
}
