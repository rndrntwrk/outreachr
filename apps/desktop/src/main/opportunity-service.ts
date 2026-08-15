import { randomUUID } from 'node:crypto';

import { OpportunityRepository } from '@outreachr/core';
import type {
  OpportunitySaveInput,
  OpportunitySourceAttachInput,
  OpportunitySourceReviewInput,
  OpportunitySourceSummary,
  OpportunitySummary,
  OrganizationSaveInput,
  OrganizationSummary,
} from '../shared/hackathon-contracts';
import type { VaultService } from './vault-service';

interface OpportunityServiceOptions {
  vault: VaultService;
  now?: () => Date;
}

export interface OpportunityBootstrap {
  organizations: OrganizationSummary[];
  opportunities: OpportunitySummary[];
}

export class OpportunityService {
  readonly #vault: VaultService;
  readonly #now: () => Date;

  constructor(options: OpportunityServiceOptions) {
    this.#vault = options.vault;
    this.#now = options.now ?? (() => new Date());
  }

  #repository(): OpportunityRepository {
    return new OpportunityRepository(this.#vault.vault);
  }

  bootstrap(): OpportunityBootstrap {
    const repository = this.#repository();
    return {
      organizations: repository.listOrganizations(),
      opportunities: repository.listOpportunities(),
    };
  }

  async saveOrganization(input: OrganizationSaveInput): Promise<OrganizationSummary> {
    const now = this.#now().toISOString();
    const id = input.id ?? `organization:${randomUUID()}`;
    const existing = this.#vault.vault.one<{ created_at: string }>(
      'SELECT created_at FROM organizations WHERE id=?',
      [id],
    );
    const saved = this.#repository().upsertOrganization({
      ...input,
      id,
      createdAt: existing?.created_at ?? now,
      updatedAt: now,
    });
    await this.#vault.persist();
    return saved;
  }

  async saveOpportunity(input: OpportunitySaveInput): Promise<OpportunitySummary> {
    const now = this.#now().toISOString();
    const id = input.id ?? `opportunity:${randomUUID()}`;
    const existing = this.#vault.vault.one<{ created_at: string }>(
      'SELECT created_at FROM opportunities WHERE id=?',
      [id],
    );
    const saved = this.#repository().upsertOpportunity({
      ...input,
      id,
      createdAt: existing?.created_at ?? now,
      updatedAt: now,
    });
    await this.#vault.persist();
    return saved;
  }

  async attachSource(input: OpportunitySourceAttachInput): Promise<OpportunitySourceSummary> {
    const now = this.#now().toISOString();
    const saved = this.#repository().attachSource({
      ...input,
      reviewState: 'pending',
      reviewedAt: null,
      createdAt: now,
    });
    await this.#vault.persist();
    return saved;
  }

  async reviewSource(input: OpportunitySourceReviewInput): Promise<OpportunitySourceSummary> {
    const saved = this.#repository().reviewSource(
      input.opportunityId,
      input.sourceId,
      input.sourceRole,
      input.decision === 'accept' ? 'accepted' : 'rejected',
      this.#now().toISOString(),
    );
    await this.#vault.persist();
    return saved;
  }
}
