import { OpportunityRepository as PersistedOpportunityRepository } from './opportunity-repository.js';
import {
  OpportunitySourceSchema,
  type OpportunitySource,
  type OpportunitySourceInput,
} from './opportunity-validation.js';

export type { OrganizationUpsertInput } from './opportunity-repository.js';

/**
 * Public opportunity repository surface. Evidence enters as pending and can
 * become accepted or rejected only through reviewSource, which records the
 * founder decision in the audit chain.
 */
export class OpportunityRepository extends PersistedOpportunityRepository {
  override attachSource(input: OpportunitySourceInput): OpportunitySource {
    const value = OpportunitySourceSchema.parse(input);
    if (value.reviewState !== 'pending' || value.reviewedAt !== null) {
      throw new Error('Use reviewSource to accept or reject opportunity evidence');
    }
    return super.attachSource(value);
  }
}
