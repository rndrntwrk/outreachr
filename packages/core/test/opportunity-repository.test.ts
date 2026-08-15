import { createRequire } from 'node:module';

import initSqlJs, { type SqlJsStatic } from 'sql.js';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  CoreVault,
  OpportunityRepository,
  verifyAuditChain,
} from '../src/index.js';
import { NOW, addSource } from './phase3-repository-fixture.js';

let SQL: SqlJsStatic;

beforeAll(async () => {
  const require = createRequire(import.meta.url);
  const wasm = require.resolve('sql.js/dist/sql-wasm.wasm');
  SQL = await initSqlJs({ locateFile: () => wasm });
});

describe('OpportunityRepository', () => {
  it('normalizes organizations, persists opportunities and freezes reviewed evidence', () => {
    const core = new CoreVault(SQL, { appliedAt: NOW });
    addSource(core);
    const repository = new OpportunityRepository(core);

    const organization = repository.upsertOrganization({
      id: 'organization:example',
      name: '  Example   Foundation ',
      kind: 'foundation',
      website: 'https://example.test',
      description: 'Program organizer.',
      linkedFirmId: null,
      isPublic: true,
      contributionEligible: false,
      origin: 'local',
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(organization.normalizedName).toBe('example foundation');

    repository.upsertOpportunity({
      id: 'opportunity:hackathon',
      organizerOrganizationId: organization.id,
      name: 'Example Hackathon',
      opportunityType: 'hackathon',
      status: 'open',
      publicUrl: 'https://example.test/hackathon',
      applicationUrl: null,
      openDate: '2026-08-01',
      deadline: '2026-09-01',
      startDate: '2026-08-15',
      endDate: '2026-09-05',
      format: 'online',
      location: null,
      eligibilitySummary: 'Reviewed structured rules apply.',
      termsSummary: null,
      capitalPrizeSummary: '$100,000 prize pool',
      freshnessState: 'current',
      reviewState: 'reviewed',
      importedPackageId: null,
      importedPackageDigest: null,
      createdAt: NOW,
      updatedAt: NOW,
    });

    repository.attachSource({
      opportunityId: 'opportunity:hackathon',
      sourceId: 'source:rules',
      sourceRole: 'official rules',
      observedAt: NOW,
      confidence: 'verified',
      reviewState: 'pending',
      reviewedAt: null,
      createdAt: NOW,
    });
    const reviewed = repository.reviewSource(
      'opportunity:hackathon',
      'source:rules',
      'official rules',
      'accepted',
      NOW,
    );
    expect(reviewed.reviewState).toBe('accepted');
    expect(
      repository.listOpportunities({ opportunityType: 'hackathon', status: 'open' }),
    ).toHaveLength(1);
    expect(repository.getOpportunity('opportunity:hackathon')?.name).toBe('Example Hackathon');
    expect(() =>
      repository.attachSource({
        ...reviewed,
        confidence: 'unknown',
      }),
    ).toThrow('Reviewed opportunity evidence cannot be changed');
    expect(verifyAuditChain(core).ok).toBe(true);
    core.close();
  });
});
