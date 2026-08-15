import {
  OpportunitySourceSchema,
  type OpportunitySource,
  type OpportunitySourceInput,
  type Organization,
} from './opportunity-validation.js';
import {
  OpportunityRepository as BaseOpportunityRepository,
  type OrganizationUpsertInput,
} from './opportunity-repository.js';

export class OpportunityRepository extends BaseOpportunityRepository {
  override upsertOrganization(input: OrganizationUpsertInput): Organization {
    return super.upsertOrganization({ ...input, normalizedName: input.name });
  }

  override attachSource(input: OpportunitySourceInput): OpportunitySource {
    const value = OpportunitySourceSchema.parse(input);
    const existing = this.vault.one<{ review_state: string }>(
      `SELECT review_state FROM opportunity_sources
       WHERE opportunity_id=? AND source_id=? AND source_role=?`,
      [value.opportunityId, value.sourceId, value.sourceRole],
    );
    if (value.reviewState !== 'pending' || value.reviewedAt !== null) {
      if (existing?.review_state !== 'pending') return super.attachSource(value);
      throw new Error(
        'Opportunity evidence must be attached pending and advanced through founder review.',
      );
    }
    return super.attachSource(value);
  }
}
