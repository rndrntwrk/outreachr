import type { OpportunityEvidenceSummary } from '../shared/hackathon-contracts';

/**
 * The command surface receives the composed HackathonStudioService at runtime.
 * This declaration keeps the focused HackathonService API structurally compatible
 * without making the base service own generic opportunity-source review state.
 */
declare module './hackathon-service' {
  interface HackathonService {
    reviewOpportunitySource(input: {
      opportunityId: string;
      sourceId: string;
      sourceRole: string;
      decision: 'accepted' | 'rejected';
    }): Promise<OpportunityEvidenceSummary>;
  }
}

export {};
