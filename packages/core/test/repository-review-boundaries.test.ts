import { createRequire } from 'node:module';

import initSqlJs, { type SqlJsStatic } from 'sql.js';
import { beforeAll, describe, expect, it } from 'vitest';

import { CoreVault, HackathonRepository, OpportunityRepository } from '../src/index.js';
import { NOW, addSource } from './phase3-repository-fixture.js';

let SQL: SqlJsStatic;

beforeAll(async () => {
  const require = createRequire(import.meta.url);
  const wasm = require.resolve('sql.js/dist/sql-wasm.wasm');
  SQL = await initSqlJs({ locateFile: () => wasm });
});

function seedOpportunity(core: CoreVault): void {
  addSource(core);
  const opportunities = new OpportunityRepository(core);
  opportunities.upsertOrganization({
    id: 'organization:hackathon',
    name: 'Example Foundation',
    kind: 'foundation',
    website: 'https://example.test',
    description: 'Runs a public technical competition.',
    linkedFirmId: null,
    isPublic: true,
    contributionEligible: false,
    origin: 'local',
    createdAt: NOW,
    updatedAt: NOW,
  });
  opportunities.upsertOpportunity({
    id: 'opportunity:hackathon',
    organizerOrganizationId: 'organization:hackathon',
    name: 'Example Build Program',
    opportunityType: 'hackathon',
    status: 'open',
    publicUrl: 'https://example.test/hackathon',
    applicationUrl: 'https://example.test/hackathon/apply',
    openDate: '2026-08-01',
    deadline: '2026-09-01',
    startDate: '2026-08-15',
    endDate: '2026-09-15',
    format: 'online',
    location: null,
    eligibilitySummary: 'Public builder program.',
    termsSummary: 'Founder review required before entry.',
    capitalPrizeSummary: 'Sponsor bounties.',
    freshnessState: 'current',
    reviewState: 'reviewed',
    importedPackageId: null,
    importedPackageDigest: null,
    createdAt: NOW,
    updatedAt: NOW,
  });
}

describe('founder review boundaries', () => {
  it('preserves canonical organization normalization behind the guarded repository', () => {
    const core = new CoreVault(SQL, { appliedAt: NOW });
    const repository = new OpportunityRepository(core);
    const organization = repository.upsertOrganization({
      id: 'organization:normalized',
      name: '  Example   Protocol  ',
      normalizedName: 'caller supplied value is ignored',
      kind: 'protocol',
      website: null,
      description: null,
      linkedFirmId: null,
      isPublic: true,
      contributionEligible: false,
      origin: 'local',
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(organization.name).toBe('Example   Protocol');
    expect(organization.normalizedName).toBe('example protocol');
    core.close();
  });

  it('requires reviewSource before opportunity evidence can be accepted', () => {
    const core = new CoreVault(SQL, { appliedAt: NOW });
    seedOpportunity(core);
    const repository = new OpportunityRepository(core);

    expect(() =>
      repository.attachSource({
        opportunityId: 'opportunity:hackathon',
        sourceId: 'source:rules',
        sourceRole: 'official_rules',
        observedAt: NOW,
        confidence: 'verified',
        reviewState: 'accepted',
        reviewedAt: NOW,
        createdAt: NOW,
      }),
    ).toThrow('Use reviewSource to accept or reject opportunity evidence');

    repository.attachSource({
      opportunityId: 'opportunity:hackathon',
      sourceId: 'source:rules',
      sourceRole: 'official_rules',
      observedAt: NOW,
      confidence: 'verified',
      reviewState: 'pending',
      reviewedAt: null,
      createdAt: NOW,
    });
    expect(
      repository.reviewSource(
        'opportunity:hackathon',
        'source:rules',
        'official_rules',
        'accepted',
        NOW,
      ),
    ).toMatchObject({ reviewState: 'accepted', reviewedAt: NOW });
    core.close();
  });

  it('derives cycle rule digests only through reviewRule', () => {
    const core = new CoreVault(SQL, { appliedAt: NOW });
    seedOpportunity(core);
    const repository = new HackathonRepository(core);

    const cycle = {
      id: 'cycle:example',
      opportunityId: 'opportunity:hackathon',
      cycleName: '2026 Online',
      registrationOpenAt: NOW,
      registrationCloseAt: '2026-09-01T00:00:00.000Z',
      buildStartAt: NOW,
      buildEndAt: '2026-09-01T00:00:00.000Z',
      submissionDeadlineAt: '2026-09-01T00:00:00.000Z',
      judgingStartAt: '2026-09-02T00:00:00.000Z',
      judgingEndAt: '2026-09-10T00:00:00.000Z',
      demoDayAt: null,
      resultAt: '2026-09-10T00:00:00.000Z',
      format: 'online' as const,
      location: null,
      state: 'registration' as const,
      rulesSourceId: 'source:rules',
      rulesRetrievedAt: NOW,
      rulesSha256: null,
      createdAt: NOW,
      updatedAt: NOW,
    };

    expect(() =>
      repository.upsertCycle({ ...cycle, rulesSha256: 'a'.repeat(64) }),
    ).toThrow('New hackathon cycles cannot supply a reviewed rules digest');
    repository.upsertCycle(cycle);

    const rule = {
      id: 'rule:team-size',
      cycleId: cycle.id,
      ruleType: 'team_size' as const,
      value: { minimum: 1, maximum: 4 },
      blocking: true,
      sourceId: 'source:rules',
      observedAt: NOW,
      confidence: 'verified' as const,
      reviewState: 'pending' as const,
      reviewedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    };
    expect(() =>
      repository.upsertRule({ ...rule, reviewState: 'accepted', reviewedAt: NOW }),
    ).toThrow('Use reviewRule to accept or reject hackathon rules');
    repository.upsertRule(rule);
    expect(repository.reviewRule(rule.id, 'accepted', NOW)).toMatchObject({
      reviewState: 'accepted',
      reviewedAt: NOW,
    });
    expect(repository.listCycles()[0]?.rulesSha256).toMatch(/^[a-f0-9]{64}$/u);
    core.close();
  });
});
