import { randomUUID } from 'node:crypto';

import {
  OpportunityRepository,
  type Opportunity,
  type OpportunitySource,
  type Organization,
} from '@outreachr/core';
import type {
  OpportunityEvidenceSummary,
  OpportunitySaveInput,
  OpportunitySummary,
  OrganizationSaveInput,
  OrganizationSummary,
} from '../shared/hackathon-contracts';
import type { VaultService } from './vault-service';

interface OpportunityServiceOptions {
  vault: VaultService;
  now?: () => Date;
}

function organizationSummary(value: Organization): OrganizationSummary {
  return {
    id: value.id,
    name: value.name,
    normalizedName: value.normalizedName,
    kind: value.kind,
    website: value.website,
    description: value.description,
    linkedFirmId: value.linkedFirmId,
    isPublic: value.isPublic,
    contributionEligible: value.contributionEligible,
    origin: value.origin,
  };
}

function opportunitySummary(
  value: Opportunity,
  organizations: ReadonlyMap<string, Organization>,
): OpportunitySummary {
  return {
    id: value.id,
    organizerOrganizationId: value.organizerOrganizationId,
    organizerName: value.organizerOrganizationId
      ? (organizations.get(value.organizerOrganizationId)?.name ?? null)
      : null,
    name: value.name,
    opportunityType: value.opportunityType,
    status: value.status,
    publicUrl: value.publicUrl,
    applicationUrl: value.applicationUrl,
    openDate: value.openDate,
    deadline: value.deadline,
    startDate: value.startDate,
    endDate: value.endDate,
    format: value.format,
    location: value.location,
    eligibilitySummary: value.eligibilitySummary,
    termsSummary: value.termsSummary,
    capitalPrizeSummary: value.capitalPrizeSummary,
    freshnessState: value.freshnessState,
    reviewState: value.reviewState,
  };
}

function evidenceSummary(value: OpportunitySource): OpportunityEvidenceSummary {
  return {
    opportunityId: value.opportunityId,
    sourceId: value.sourceId,
    sourceRole: value.sourceRole,
    observedAt: value.observedAt,
    confidence: value.confidence,
    reviewState: value.reviewState,
    reviewedAt: value.reviewedAt,
  };
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

  summaries(): {
    organizations: OrganizationSummary[];
    opportunities: OpportunitySummary[];
  } {
    const repository = this.#repository();
    const organizations = repository.listOrganizations();
    const organizationById = new Map(organizations.map((value) => [value.id, value]));
    return {
      organizations: organizations.map(organizationSummary),
      opportunities: repository
        .listOpportunities()
        .map((value) => opportunitySummary(value, organizationById)),
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
      id,
      name: input.name,
      kind: input.kind,
      website: input.website,
      description: input.description,
      linkedFirmId: input.linkedFirmId,
      isPublic: input.isPublic,
      contributionEligible: input.contributionEligible,
      origin: 'local',
      createdAt: existing?.created_at ?? now,
      updatedAt: now,
    });
    await this.#vault.persist();
    return organizationSummary(saved);
  }

  async saveOpportunity(input: OpportunitySaveInput): Promise<OpportunitySummary> {
    const now = this.#now().toISOString();
    const id = input.id ?? `opportunity:${randomUUID()}`;
    const existing = this.#vault.vault.one<{ created_at: string }>(
      'SELECT created_at FROM opportunities WHERE id=?',
      [id],
    );
    const saved = this.#repository().upsertOpportunity({
      id,
      organizerOrganizationId: input.organizerOrganizationId,
      name: input.name,
      opportunityType: input.opportunityType,
      status: input.status,
      publicUrl: input.publicUrl,
      applicationUrl: input.applicationUrl,
      openDate: input.openDate,
      deadline: input.deadline,
      startDate: input.startDate,
      endDate: input.endDate,
      format: input.format,
      location: input.location,
      eligibilitySummary: input.eligibilitySummary,
      termsSummary: input.termsSummary,
      capitalPrizeSummary: input.capitalPrizeSummary,
      freshnessState: input.freshnessState,
      reviewState: input.reviewState,
      importedPackageId: null,
      importedPackageDigest: null,
      createdAt: existing?.created_at ?? now,
      updatedAt: now,
    });
    await this.#vault.persist();
    const organizations = new Map(
      this.#repository()
        .listOrganizations()
        .map((value) => [value.id, value]),
    );
    return opportunitySummary(saved, organizations);
  }

  async reviewSource(input: {
    opportunityId: string;
    sourceId: string;
    sourceRole: string;
    decision: 'accepted' | 'rejected';
  }): Promise<OpportunityEvidenceSummary> {
    const reviewed = this.#repository().reviewSource(
      input.opportunityId,
      input.sourceId,
      input.sourceRole,
      input.decision,
      this.#now().toISOString(),
    );
    await this.#vault.persist();
    return evidenceSummary(reviewed);
  }
}
