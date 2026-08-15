import { createRequire } from 'node:module';

import initSqlJs, { type SqlJsStatic } from 'sql.js';
import { beforeAll, describe, expect, it } from 'vitest';

import { CoreVault, HackathonRepository, OpportunityRepository } from '../src/index.js';
import {
  COMMIT_SHA,
  LATER,
  NOW,
  SHA256,
  addSource,
  insertAuthorityFixture,
} from './phase3-repository-fixture.js';

let SQL: SqlJsStatic;

beforeAll(async () => {
  const require = createRequire(import.meta.url);
  const wasm = require.resolve('sql.js/dist/sql-wasm.wasm');
  SQL = await initSqlJs({ locateFile: () => wasm });
});

function repository(entryId: string): { core: CoreVault; hackathons: HackathonRepository } {
  const core = new CoreVault(SQL, { appliedAt: NOW });
  insertAuthorityFixture(core);
  addSource(core);
  const opportunities = new OpportunityRepository(core);
  const hackathons = new HackathonRepository(core);

  opportunities.upsertOrganization({
    id: 'organization:host',
    name: 'Example Foundation',
    kind: 'foundation',
    website: 'https://example.test',
    description: null,
    linkedFirmId: null,
    isPublic: true,
    contributionEligible: false,
    origin: 'local',
    createdAt: NOW,
    updatedAt: NOW,
  });
  opportunities.upsertOpportunity({
    id: 'opportunity:hackathon',
    organizerOrganizationId: 'organization:host',
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
    eligibilitySummary: null,
    termsSummary: null,
    capitalPrizeSummary: '$100,000 prize pool',
    freshnessState: 'current',
    reviewState: 'reviewed',
    importedPackageId: null,
    importedPackageDigest: null,
    createdAt: NOW,
    updatedAt: NOW,
  });
  hackathons.upsertCycle({
    id: 'cycle:2026',
    opportunityId: 'opportunity:hackathon',
    cycleName: '2026 main cycle',
    registrationOpenAt: '2026-08-01T00:00:00.000Z',
    registrationCloseAt: '2026-08-14T23:59:59.000Z',
    buildStartAt: '2026-08-15T00:00:00.000Z',
    buildEndAt: '2026-08-31T23:59:59.000Z',
    submissionDeadlineAt: '2026-09-01T23:59:59.000Z',
    judgingStartAt: null,
    judgingEndAt: null,
    demoDayAt: null,
    resultAt: null,
    format: 'online',
    location: null,
    state: 'building',
    rulesSourceId: 'source:rules',
    rulesRetrievedAt: NOW,
    rulesSha256: null,
    createdAt: NOW,
    updatedAt: NOW,
  });
  hackathons.createEntry({
    id: entryId,
    cycleId: 'cycle:2026',
    legalEntityId: 'legal-entity:test',
    narrativeProfileId: 'narrative:sw4p:hackathon:1',
    canonicalDemoVersionId: 'demo-version:sw4p:1',
    submissionConcept: 'A bounded SW4P settlement adapter.',
    userOutcome: 'A creator receives a correct, reconciled settlement.',
    ecosystemAdapter: 'One sponsor-specific settlement adapter.',
    estimatedHours: 48,
    reusePercentage: 80,
    strategicFit: 9,
    acceptanceProbability: 7,
    capitalUpside: 8,
    distributionUpside: 9,
    technicalLeverage: 9,
    credibility: 8,
    urgency: 8,
    effortEfficiency: 8,
    lockInSafety: 8,
    createdAt: NOW,
    updatedAt: NOW,
  });
  hackathons.replaceEntryVentures(entryId, [
    { entryId, ventureId: 'venture:sw4p', role: 'lead', createdAt: NOW },
  ]);

  return { core, hackathons };
}

describe('HackathonRepository lifecycle hardening', () => {
  it('stages a directly requested active distribution plan before activation', () => {
    const { core, hackathons } = repository('entry:distribution');
    const active = hackathons.saveDistributionPlan({
      id: 'distribution:active',
      entryId: 'entry:distribution',
      summary: 'Pre-event, submission-day and post-result distribution.',
      status: 'active',
      contentSha256: SHA256,
      approvedBy: 'founder',
      approvedAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(active.status).toBe('active');

    const completed = hackathons.saveDistributionPlan({
      ...active,
      status: 'completed',
      updatedAt: LATER,
    });
    expect(completed.status).toBe('completed');
    core.close();
  });

  it('blocks a go decision when accepted blocking evidence is stale', () => {
    const { core, hackathons } = repository('entry:stale');
    hackathons.upsertRule({
      id: 'rule:stale',
      cycleId: 'cycle:2026',
      ruleType: 'existing_code',
      value: { allowed: true },
      blocking: true,
      sourceId: 'source:rules',
      observedAt: NOW,
      confidence: 'stale',
      reviewState: 'pending',
      reviewedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    hackathons.reviewRule('rule:stale', 'accepted', NOW);
    const rulesSha256 = hackathons.listCycles()[0]?.rulesSha256;
    expect(rulesSha256).toMatch(/^[a-f0-9]{64}$/u);
    hackathons.saveEligibilityEvaluation({
      id: 'eligibility:stale',
      entryId: 'entry:stale',
      status: 'eligible',
      evaluatedAt: NOW,
      rulesSnapshotSha256: rulesSha256!,
      detail: [{ ruleId: 'rule:stale', status: 'eligible' }],
      founderReviewState: 'accepted',
      reviewedAt: NOW,
    });

    expect(() =>
      hackathons.decideEntry({
        id: 'entry:stale',
        decision: 'go',
        rationale: 'The founder has not refreshed the stale evidence yet.',
        decidedAt: NOW,
      }),
    ).toThrow('Blocking rule evidence must be current and founder-accepted');
    core.close();
  });

  it('cancels a draft build without inventing an approval transition', () => {
    const { core, hackathons } = repository('entry:cancelled-build');
    hackathons.saveBuild({
      id: 'build:cancelled',
      entryId: 'entry:cancelled-build',
      status: 'draft',
      repository: 'rndrntwrk/outreachr',
      baseCommitSha: COMMIT_SHA,
      branchName: 'hackathon/example/cancelled',
      worktreeReference: null,
      adapterPath: null,
      ownerAgent: null,
      toolPolicy: {},
      budgetUsd: 0,
      budgetHours: 12,
      startConditions: 'Founder approves the build.',
      stopConditions: 'Stop when the opportunity is no longer worth pursuing.',
      currentCommitSha: null,
      ciState: 'not_run',
      securityReviewState: 'pending',
      evidenceManifestSha256: null,
      mergeDecision: 'pending',
      approvedBy: null,
      approvedAt: null,
      startedAt: null,
      completedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    const cancelled = hackathons.saveBuild({
      id: 'build:cancelled',
      entryId: 'entry:cancelled-build',
      status: 'cancelled',
      repository: 'rndrntwrk/outreachr',
      baseCommitSha: COMMIT_SHA,
      branchName: 'hackathon/example/cancelled',
      worktreeReference: null,
      adapterPath: null,
      ownerAgent: null,
      toolPolicy: {},
      budgetUsd: 0,
      budgetHours: 12,
      startConditions: 'Founder approves the build.',
      stopConditions: 'Stop when the opportunity is no longer worth pursuing.',
      currentCommitSha: null,
      ciState: 'not_run',
      securityReviewState: 'pending',
      evidenceManifestSha256: null,
      mergeDecision: 'rejected',
      approvedBy: null,
      approvedAt: null,
      startedAt: null,
      completedAt: LATER,
      createdAt: NOW,
      updatedAt: LATER,
    });
    expect(cancelled).toMatchObject({
      status: 'cancelled',
      approvedBy: null,
      approvedAt: null,
      completedAt: LATER,
    });
    core.close();
  });
});
