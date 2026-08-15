import { createRequire } from 'node:module';

import initSqlJs, { type SqlJsStatic } from 'sql.js';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  CoreVault,
  HackathonRepository,
  OpportunityRepository,
  calculateHackathonScore,
  verifyAuditChain,
} from '../src/index.js';
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

function repositories(): {
  core: CoreVault;
  opportunities: OpportunityRepository;
  hackathons: HackathonRepository;
} {
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
  return { core, opportunities, hackathons };
}

function entryInput(
  id: string,
  narrativeProfileId: string,
  canonicalDemoVersionId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    cycleId: 'cycle:2026',
    legalEntityId: 'legal-entity:test',
    narrativeProfileId,
    canonicalDemoVersionId,
    submissionConcept: `${id} submission concept`,
    userOutcome: `${id} user outcome`,
    ecosystemAdapter: `${id} ecosystem adapter`,
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
    ...overrides,
  };
}

describe('HackathonRepository', () => {
  it('stores independent component entries and computes weighted scores server-side', () => {
    const { core, hackathons } = repositories();
    hackathons.upsertTrack({
      id: 'track:payments',
      cycleId: 'cycle:2026',
      name: 'Payments',
      goals: 'Build a useful payment application.',
      judgingCriteria: ['utility', 'technical quality'],
      createdAt: NOW,
      updatedAt: NOW,
    });
    hackathons.upsertBounty({
      id: 'bounty:payments',
      cycleId: 'cycle:2026',
      sponsorOrganizationId: 'organization:host',
      trackId: 'track:payments',
      title: 'Best programmable settlement',
      amountValue: 10_000,
      amountAsset: 'USD',
      requiredTechnology: 'Use the sponsor settlement API.',
      eligibility: null,
      judgingCriteria: 'Utility and technical quality.',
      submissionRequirements: null,
      sourceId: 'source:rules',
      freshnessState: 'current',
      conflictLockInNotes: null,
      createdAt: NOW,
      updatedAt: NOW,
    });

    const sw4p = hackathons.createEntry({
      ...entryInput(
        'entry:sw4p',
        'narrative:sw4p:hackathon:1',
        'demo-version:sw4p:1',
      ),
      weightedScore: 0,
    } as never);
    const alice = hackathons.createEntry(
      entryInput(
        'entry:alice',
        'narrative:alice:hackathon:1',
        'demo-version:alice:1',
        { strategicFit: 8, distributionUpside: 8 },
      ),
    );

    hackathons.replaceEntryVentures('entry:sw4p', [
      { entryId: 'entry:sw4p', ventureId: 'venture:sw4p', role: 'lead', createdAt: NOW },
    ]);
    hackathons.replaceEntryTracks('entry:sw4p', ['track:payments'], NOW);
    hackathons.replaceEntryBounties('entry:sw4p', ['bounty:payments'], NOW);
    hackathons.replaceEntryVentures('entry:alice', [
      { entryId: 'entry:alice', ventureId: 'venture:alice', role: 'lead', createdAt: NOW },
      { entryId: 'entry:alice', ventureId: 'venture:sw4p', role: 'supporting', createdAt: NOW },
    ]);

    expect(sw4p.weightedScore).toBe(
      calculateHackathonScore({
        ...entryInput(
          'entry:sw4p',
          'narrative:sw4p:hackathon:1',
          'demo-version:sw4p:1',
        ),
        deadline: '2026-09-01T23:59:59.000Z',
        evaluatedAt: NOW,
      }),
    );
    expect(sw4p.weightedScore).not.toBe(0);
    expect(alice.canonicalDemoVersionId).toBe('demo-version:alice:1');
    expect(hackathons.listEntries({ cycleId: 'cycle:2026' })).toHaveLength(2);
    expect(hackathons.listEntries({ ventureId: 'venture:sw4p' })).toHaveLength(2);
    expect(hackathons.getEntry('entry:sw4p')).toMatchObject({
      id: 'entry:sw4p',
      leadVentureId: 'venture:sw4p',
      trackIds: ['track:payments'],
      bountyIds: ['bounty:payments'],
    });
    expect(verifyAuditChain(core).ok).toBe(true);
    core.close();
  });

  it('recomputes current-digest readiness, audits decisions and records receipt-backed submission', () => {
    const { core, hackathons } = repositories();
    hackathons.createEntry(
      entryInput(
        'entry:ready',
        'narrative:sw4p:hackathon:1',
        'demo-version:sw4p:1',
      ),
    );
    hackathons.replaceEntryVentures('entry:ready', [
      { entryId: 'entry:ready', ventureId: 'venture:sw4p', role: 'lead', createdAt: NOW },
    ]);
    hackathons.upsertRule({
      id: 'rule:existing-code',
      cycleId: 'cycle:2026',
      ruleType: 'existing_code',
      value: { allowed: true },
      blocking: true,
      sourceId: 'source:rules',
      observedAt: NOW,
      confidence: 'verified',
      reviewState: 'pending',
      reviewedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    const reviewedRule = hackathons.reviewRule('rule:existing-code', 'accepted', NOW);
    expect(reviewedRule.reviewState).toBe('accepted');
    const rulesDigest = hackathons.listCycles()[0]?.rulesSha256;
    expect(rulesDigest).toMatch(/^[a-f0-9]{64}$/u);

    hackathons.saveEligibilityEvaluation({
      id: 'eligibility:ready',
      entryId: 'entry:ready',
      status: 'eligible',
      evaluatedAt: NOW,
      rulesSnapshotSha256: rulesDigest!,
      detail: [{ ruleId: 'rule:existing-code', status: 'eligible' }],
      founderReviewState: 'accepted',
      reviewedAt: NOW,
    });
    hackathons.decideEntry({
      id: 'entry:ready',
      decision: 'go',
      rationale: 'High reuse and distribution leverage.',
      decidedAt: NOW,
    });
    hackathons.transitionEntry({ id: 'entry:ready', toState: 'approved', transitionedAt: NOW });
    hackathons.transitionEntry({ id: 'entry:ready', toState: 'scoped', transitionedAt: NOW });

    hackathons.saveBuild({
      id: 'build:ready',
      entryId: 'entry:ready',
      status: 'draft',
      repository: 'rndrntwrk/outreachr',
      baseCommitSha: COMMIT_SHA,
      branchName: 'hackathon/example/ready',
      worktreeReference: null,
      adapterPath: 'adapters/example',
      ownerAgent: 'codex',
      toolPolicy: { network: 'proposal_only' },
      budgetUsd: 0,
      budgetHours: 48,
      startConditions: 'Founder approves the scoped entry.',
      stopConditions: 'Stop on policy violation or expired deadline.',
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
    hackathons.saveBuild({
      id: 'build:ready',
      entryId: 'entry:ready',
      status: 'active',
      repository: 'rndrntwrk/outreachr',
      baseCommitSha: COMMIT_SHA,
      branchName: 'hackathon/example/ready',
      worktreeReference: 'worktree://entry-ready',
      adapterPath: 'adapters/example',
      ownerAgent: 'codex',
      toolPolicy: { network: 'proposal_only' },
      budgetUsd: 0,
      budgetHours: 48,
      startConditions: 'Founder approves the scoped entry.',
      stopConditions: 'Stop on policy violation or expired deadline.',
      currentCommitSha: COMMIT_SHA,
      ciState: 'passed',
      securityReviewState: 'passed',
      evidenceManifestSha256: SHA256,
      mergeDecision: 'pending',
      approvedBy: 'founder',
      approvedAt: NOW,
      startedAt: NOW,
      completedAt: null,
      createdAt: NOW,
      updatedAt: LATER,
    });

    for (const [id, kind, reference] of [
      ['asset:readme', 'readme', 'local://readme'],
      ['asset:receipt', 'receipt', 'local://receipt'],
    ] as const) {
      hackathons.saveAsset({
        id,
        entryId: 'entry:ready',
        kind,
        required: true,
        status: 'approved',
        reference,
        contentSha256: SHA256,
        founderReviewState: 'accepted',
        reviewedAt: NOW,
        createdAt: NOW,
        updatedAt: NOW,
      });
    }

    hackathons.saveDistributionPlan({
      id: 'distribution:ready',
      entryId: 'entry:ready',
      summary: 'Founder-reviewed pre-event, launch and follow-up distribution.',
      status: 'draft',
      contentSha256: SHA256,
      approvedBy: null,
      approvedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    for (const [id, kind, phase, title] of [
      ['item:pre', 'pre_build_announcement', 'pre_event', 'Pre-event announcement'],
      ['item:launch', 'launch_post', 'submission_day', 'Submission launch'],
      ['item:result', 'post_result_announcement', 'post_result', 'Result announcement'],
    ] as const) {
      hackathons.saveDistributionItem({
        id,
        planId: 'distribution:ready',
        kind,
        phase,
        status: 'planned',
        title,
        scheduledAt: null,
        completedAt: null,
        reference: null,
        createdAt: NOW,
        updatedAt: NOW,
      });
    }
    hackathons.saveDistributionPlan({
      id: 'distribution:ready',
      entryId: 'entry:ready',
      summary: 'Founder-reviewed pre-event, launch and follow-up distribution.',
      status: 'approved',
      contentSha256: SHA256,
      approvedBy: 'founder',
      approvedAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
    });

    hackathons.transitionEntry({ id: 'entry:ready', toState: 'building', transitionedAt: NOW });
    hackathons.transitionEntry({
      id: 'entry:ready',
      toState: 'verification',
      transitionedAt: NOW,
    });
    hackathons.transitionEntry({
      id: 'entry:ready',
      toState: 'submission_ready',
      transitionedAt: NOW,
    });
    expect(() =>
      hackathons.transitionEntry({
        id: 'entry:ready',
        toState: 'submitted',
        transitionedAt: NOW,
      }),
    ).toThrow('A durable receipt is required before submitted state.');

    hackathons.saveSubmission({
      id: 'submission:ready',
      entryId: 'entry:ready',
      portalUrl: 'https://example.test/submissions/ready',
      submittedAt: NOW,
      narrativeProfileId: 'narrative:sw4p:hackathon:1',
      canonicalDemoVersionId: 'demo-version:sw4p:1',
      repositoryCommitSha: COMMIT_SHA,
      receiptAssetId: 'asset:receipt',
      contentSha256: SHA256,
      status: 'submitted',
      createdAt: NOW,
      updatedAt: NOW,
    });
    const submitted = hackathons.transitionEntry({
      id: 'entry:ready',
      toState: 'submitted',
      transitionedAt: LATER,
    });
    expect(submitted.state).toBe('submitted');

    hackathons.saveResult({
      id: 'result:ready',
      entryId: 'entry:ready',
      outcome: 'finalist',
      placement: 'Finalist',
      prizeValue: null,
      prizeAsset: null,
      credits: ['$5,000 cloud credits'],
      invitations: ['Sponsor office hours'],
      recordedAt: LATER,
      createdAt: LATER,
      updatedAt: LATER,
    });
    hackathons.saveConversion({
      id: 'conversion:pilot',
      entryId: 'entry:ready',
      kind: 'pilot',
      organizationId: 'organization:host',
      title: 'Sponsor design-partner pilot',
      detail: 'The sponsor invited a scoped pilot.',
      valueUsd: null,
      status: 'identified',
      referenceUrl: null,
      occurredAt: LATER,
      createdAt: LATER,
      updatedAt: LATER,
    });

    expect(() =>
      hackathons.replaceEntryVentures('entry:ready', [
        { entryId: 'entry:ready', ventureId: 'venture:alice', role: 'lead', createdAt: LATER },
      ]),
    ).toThrow('Only candidate entries can change venture assignments');
    expect(hackathons.getEntry('entry:ready')).toMatchObject({
      state: 'submitted',
      submission: { id: 'submission:ready' },
      result: { outcome: 'finalist' },
      conversions: [{ id: 'conversion:pilot' }],
    });

    const decisionAudit = core.one<{ detail_json: string }>(
      `SELECT detail_json FROM audit_log
       WHERE action='hackathon.entry_decided' AND entity_id='entry:ready'`,
    );
    expect(JSON.parse(decisionAudit!.detail_json)).toMatchObject({
      founderDecision: 'go',
      weightedScore: expect.any(Number),
      scoreSnapshot: { reusePercentage: 80 },
      rulesSnapshotSha256: rulesDigest,
    });
    expect(verifyAuditChain(core).ok).toBe(true);
    core.close();
  });
});
