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

function setup(): { core: CoreVault; hackathons: HackathonRepository } {
  const core = new CoreVault(SQL, { appliedAt: NOW });
  insertAuthorityFixture(core);
  addSource(core);
  const opportunities = new OpportunityRepository(core);
  opportunities.upsertOrganization({
    id: 'organization:guard',
    name: 'Guard Foundation',
    kind: 'foundation',
    website: 'https://guard.example',
    description: null,
    linkedFirmId: null,
    isPublic: true,
    contributionEligible: false,
    origin: 'local',
    createdAt: NOW,
    updatedAt: NOW,
  });
  opportunities.upsertOpportunity({
    id: 'opportunity:guard',
    organizerOrganizationId: 'organization:guard',
    name: 'Guard Hackathon',
    opportunityType: 'hackathon',
    status: 'open',
    publicUrl: 'https://guard.example/hackathon',
    applicationUrl: null,
    openDate: '2026-08-01',
    deadline: '2026-09-01',
    startDate: '2026-08-15',
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
    createdAt: NOW,
    updatedAt: NOW,
  });
  const hackathons = new HackathonRepository(core);
  hackathons.upsertCycle({
    id: 'cycle:guard',
    opportunityId: 'opportunity:guard',
    cycleName: 'Guard cycle',
    registrationOpenAt: NOW,
    registrationCloseAt: '2026-08-31T23:59:59.000Z',
    buildStartAt: NOW,
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
    id: 'entry:guard',
    cycleId: 'cycle:guard',
    legalEntityId: 'legal-entity:test',
    narrativeProfileId: 'narrative:sw4p:hackathon:1',
    canonicalDemoVersionId: 'demo-version:sw4p:1',
    submissionConcept: 'A guarded component submission.',
    userOutcome: 'A reproducible user outcome.',
    ecosystemAdapter: 'A minimal ecosystem adapter.',
    estimatedHours: 32,
    reusePercentage: 85,
    strategicFit: 9,
    acceptanceProbability: 8,
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
  hackathons.replaceEntryVentures('entry:guard', [
    { entryId: 'entry:guard', ventureId: 'venture:sw4p', role: 'lead', createdAt: NOW },
  ]);
  return { core, hackathons };
}

function build(status: 'draft' | 'approved' | 'active' | 'completed' | 'cancelled') {
  const approved = status === 'approved' || status === 'active' || status === 'completed';
  const active = status === 'active' || status === 'completed';
  return {
    id: 'build:guard',
    entryId: 'entry:guard',
    status,
    repository: 'rndrntwrk/outreachr',
    baseCommitSha: COMMIT_SHA,
    branchName: 'hackathon/guard/entry',
    worktreeReference: active ? 'worktree://guard' : null,
    adapterPath: 'adapters/guard',
    ownerAgent: 'codex',
    toolPolicy: { externalActions: 'proposal_only' },
    budgetUsd: 0,
    budgetHours: 32,
    startConditions: 'Founder approves the scope.',
    stopConditions: 'Stop on policy violation.',
    currentCommitSha: active ? COMMIT_SHA : null,
    ciState: active ? ('passed' as const) : ('not_run' as const),
    securityReviewState: active ? ('passed' as const) : ('pending' as const),
    evidenceManifestSha256: active ? SHA256 : null,
    mergeDecision: 'pending' as const,
    approvedBy: approved ? 'founder' : null,
    approvedAt: approved ? NOW : null,
    startedAt: active ? NOW : null,
    completedAt: status === 'completed' ? LATER : null,
    createdAt: NOW,
    updatedAt: active ? LATER : NOW,
  };
}

describe('HackathonRepository lifecycle guards', () => {
  it('does not allow a go decision while a blocking rule has stale evidence', () => {
    const { core, hackathons } = setup();
    hackathons.upsertRule({
      id: 'rule:stale',
      cycleId: 'cycle:guard',
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
    const digest = hackathons.listCycles()[0]!.rulesSha256!;
    hackathons.saveEligibilityEvaluation({
      id: 'eligibility:stale',
      entryId: 'entry:guard',
      status: 'eligible',
      evaluatedAt: NOW,
      rulesSnapshotSha256: digest,
      detail: [{ ruleId: 'rule:stale', status: 'eligible' }],
      founderReviewState: 'accepted',
      reviewedAt: NOW,
    });

    expect(() =>
      hackathons.decideEntry({
        id: 'entry:guard',
        decision: 'go',
        rationale: 'The caller supplied an optimistic eligibility result.',
        decidedAt: NOW,
      }),
    ).toThrow('every blocking rule requires accepted, current evidence');
    core.close();
  });

  it('freezes approved distribution scope while allowing publication progress', () => {
    const { core, hackathons } = setup();
    hackathons.saveDistributionPlan({
      id: 'distribution:guard',
      entryId: 'entry:guard',
      summary: 'Approved launch and follow-up program.',
      status: 'draft',
      contentSha256: SHA256,
      approvedBy: null,
      approvedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    hackathons.saveDistributionItem({
      id: 'item:guard',
      planId: 'distribution:guard',
      kind: 'launch_post',
      phase: 'submission_day',
      status: 'planned',
      title: 'Submission launch',
      scheduledAt: null,
      completedAt: null,
      reference: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    hackathons.saveDistributionPlan({
      id: 'distribution:guard',
      entryId: 'entry:guard',
      summary: 'Approved launch and follow-up program.',
      status: 'approved',
      contentSha256: SHA256,
      approvedBy: 'founder',
      approvedAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
    });

    expect(() =>
      hackathons.saveDistributionPlan({
        id: 'distribution:guard',
        entryId: 'entry:guard',
        summary: 'Changed after approval.',
        status: 'approved',
        contentSha256: SHA256,
        approvedBy: 'founder',
        approvedAt: NOW,
        createdAt: NOW,
        updatedAt: LATER,
      }),
    ).toThrow('Approved hackathon distribution plan content is immutable');
    expect(() =>
      hackathons.saveDistributionItem({
        id: 'item:new',
        planId: 'distribution:guard',
        kind: 'thread',
        phase: 'submission_day',
        status: 'planned',
        title: 'Late-added thread',
        scheduledAt: null,
        completedAt: null,
        reference: null,
        createdAt: LATER,
        updatedAt: LATER,
      }),
    ).toThrow('cannot accept new items');
    expect(
      hackathons.saveDistributionItem({
        id: 'item:guard',
        planId: 'distribution:guard',
        kind: 'launch_post',
        phase: 'submission_day',
        status: 'published',
        title: 'Submission launch',
        scheduledAt: null,
        completedAt: LATER,
        reference: 'https://example.test/launch',
        createdAt: NOW,
        updatedAt: LATER,
      }),
    ).toMatchObject({ status: 'published', reference: 'https://example.test/launch' });
    core.close();
  });

  it('rejects backward build-state requests instead of silently ignoring them', () => {
    const { core, hackathons } = setup();
    hackathons.saveBuild(build('draft'));
    hackathons.saveBuild(build('active'));
    expect(() => hackathons.saveBuild({ ...build('approved'), updatedAt: LATER })).toThrow(
      'Invalid hackathon build transition from active to approved',
    );
    core.close();
  });
});
