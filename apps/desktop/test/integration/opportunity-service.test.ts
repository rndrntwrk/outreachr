import { afterEach, describe, expect, it } from 'vitest';

import { OutreachrRepository } from '@outreachr/core';
import { OpportunityService } from '../../src/main/opportunity-service';
import type { VaultService } from '../../src/main/vault-service';
import {
  FIXED_NOW,
  initializedVault,
  removeTemporaryDirectory,
  temporaryDirectory,
} from '../helpers/vault';

const NOW = FIXED_NOW.toISOString();

describe('OpportunityService source review', () => {
  let directory: string | null = null;
  let vault: VaultService | null = null;

  afterEach(async () => {
    vault?.vault.close();
    if (directory) await removeTemporaryDirectory(directory);
    directory = null;
    vault = null;
  });

  it('maps founder accept/reject commands to immutable core review states', async () => {
    directory = await temporaryDirectory('opportunity-service');
    vault = await initializedVault(directory, () => FIXED_NOW);
    new OutreachrRepository(vault.vault).upsertSource({
      id: 'source:official-rules',
      canonicalUrl: 'https://example.test/rules',
      title: 'Official rules',
      publisher: 'Example Foundation',
      sourceType: 'official_rules',
      retrievedAt: NOW,
      publishedOn: null,
      rightsClass: 'public_web',
      redistributionStatus: 'attribution_required',
      attribution: 'Example Foundation',
      excerpt: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    const service = new OpportunityService({ vault, now: () => FIXED_NOW });
    const opportunity = await service.saveOpportunity({
      id: 'opportunity:test',
      organizerOrganizationId: null,
      name: 'Test Hackathon',
      opportunityType: 'hackathon',
      status: 'open',
      publicUrl: 'https://example.test/hackathon',
      applicationUrl: null,
      openDate: '2026-07-01',
      deadline: '2026-08-31',
      startDate: '2026-08-01',
      endDate: '2026-09-05',
      format: 'online',
      location: null,
      eligibilitySummary: null,
      termsSummary: null,
      capitalPrizeSummary: null,
      freshnessState: 'current',
      reviewState: 'reviewed',
      importedPackageId: null,
      importedPackageDigest: null,
    });
    await service.attachSource({
      opportunityId: opportunity.id,
      sourceId: 'source:official-rules',
      sourceRole: 'official rules',
      observedAt: NOW,
      confidence: 'verified',
    });

    const reviewed = await service.reviewSource({
      opportunityId: opportunity.id,
      sourceId: 'source:official-rules',
      sourceRole: 'official rules',
      decision: 'accept',
    });
    expect(reviewed.reviewState).toBe('accepted');
    await expect(
      service.reviewSource({
        opportunityId: opportunity.id,
        sourceId: 'source:official-rules',
        sourceRole: 'official rules',
        decision: 'reject',
      }),
    ).rejects.toThrow('Reviewed opportunity evidence cannot be changed');
  });
});
