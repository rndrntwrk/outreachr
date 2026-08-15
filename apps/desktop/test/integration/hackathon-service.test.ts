import { afterEach, describe, expect, it } from 'vitest';

import {
  OutreachrRepository,
  VentureRepository,
  type EligibilityProfile,
} from '@outreachr/core';
import { HackathonCommandService } from '../../src/main/hackathon-command-service';
import {
  HackathonService,
  type EligibilityProfileProvider,
} from '../../src/main/hackathon-service';
import { OpportunityService } from '../../src/main/opportunity-service';
import { VentureService } from '../../src/main/venture-service';
import type { VaultService } from '../../src/main/vault-service';
import {
  FIXED_NOW,
  RESOURCE_ROOT,
  initializedVault,
  onboard,
  removeTemporaryDirectory,
  temporaryDirectory,
} from '../helpers/vault';

const NOW = FIXED_NOW.toISOString();
const COMMIT_SHA = 'b'.repeat(40);
const SHA256 = 'a'.repeat(64);

const eligibleProfile: EligibilityProfile = {
  evaluatedAt: NOW,
  country: 'US',
  founderAge: 35,
  isStudent: false,
  companyFoundedOn: '2026-01-01',
  teamSize: 1,
  usesExistingCode: true,
  willOpenSource: true,
  technologies: ['typescript', 'solana'],
  attendanceMode: 'online',
  canAttendInPerson: false,
  priorFundingUsd: 0,
  participantIds: ['founder'],
  submissionLanguage: 'en',
  availableArtifacts: ['readme', 'demo_video'],
};

interface TestServices {
  vault: VaultService;
  opportunities: OpportunityService;
  hackathons: HackathonService;
}

async function prepareAuthority(vault: VaultService): Promise<void> {
  await onboard(vault);
  const ventures = new VentureService({
    vault,
    resourceDirectory: RESOURCE_ROOT,
    now: () => FIXED_NOW,
  });
  await ventures.bootstrap();
  const narrative = await ventures.createNarrativeVersion({
    id: 'narrative:hackathon:1',
    legalEntityId: 'legal-entity:founder',
    ventureId: 'venture:legacy-default',
    purpose: 'hackathon',
    descriptions: {
      words50: 'SW4P gives applications one programmable settlement instruction.',
      words100: 'SW4P turns an application instruction into a provable settlement outcome.',
      words250:
        'SW4P demonstrates a bounded settlement adapter with receipts, reconciliation and founder-reviewed evidence.',
    },
    problem: 'Applications repeatedly rebuild settlement operations.',
    productWedge: 'One instruction produces a finished settlement outcome.',
    whyNow: 'Stablecoin and agent workflows need interoperable settlement.',
    technicalDifferentiation: 'Execution, finality, proof and reconciliation stay connected.',
    evidenceFraming: 'Use tests, a real commit and dated artifacts.',
    businessModel: 'Usage and application fees.',
    useOfFunds: 'Harden adapters and distribution assets.',
    claimsBoundary: 'Do not describe planned integrations as production evidence.',
    deckReference: null,
    demoReference: null,
  });
  await ventures.approveNarrative(narrative.id, narrative.contentSha256);

  const repository = new VentureRepository(vault.vault);
  repository.upsertCanonicalDemo({
    id: 'demo:sw4p',
    name: 'SW4P Programmable Settlement',
    category: 'Settlement infrastructure',
    status: 'active',
    createdAt: NOW,
    updatedAt: NOW,
  });
  repository.linkVentureDemo('venture:legacy-default', 'demo:sw4p', true, NOW);
  const demoVersion = repository.createCanonicalDemoVersion({
    id: 'demo-version:sw4p:1',
    demoId: 'demo:sw4p',
    baselineRepository: 'rndrntwrk/outreachr',
    baselineCommitSha: COMMIT_SHA,
    branchConvention: 'hackathon/{event}/{entry}',
    expectedBaselineHours: 24,
    coreAssets: ['settlement adapter'],
    evidenceRequirements: ['tests', 'commit evidence'],
    approvedClaims: ['A bounded settlement adapter produces a reproducible outcome.'],
    createdAt: NOW,
    updatedAt: NOW,
  });
  repository.approveCanonicalDemoVersion(demoVersion.id, 'founder', NOW);

  new OutreachrRepository(vault.vault).upsertSource({
    id: 'source:hackathon-rules',
    canonicalUrl: 'https://example.test/rules',
    title: 'Official hackathon rules',
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
  await vault.persist();
}

async function populateOpportunity(services: TestServices): Promise<string> {
  const organization = await services.opportunities.saveOrganization({
    id: 'organization:example',
    name: 'Example Foundation',
    kind: 'foundation',
    website: 'https://example.test',
    description: 'Runs an ecosystem hackathon.',
    linkedFirmId: null,
    isPublic: true,
    contributionEligible: false,
    origin: 'local',
  });
  const opportunity = await services.opportunities.saveOpportunity({
    id: 'opportunity:example-hackathon',
    organizerOrganizationId: organization.id,
    name: 'Example Hackathon',
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
    eligibilitySummary: 'Existing code is permitted.',
    termsSummary: null,
    capitalPrizeSummary: '$100,000 prize pool',
    freshnessState: 'current',
    reviewState: 'reviewed',
    importedPackageId: null,
    importedPackageDigest: null,
  });
  const cycle = await services.hackathons.saveCycle({
    id: 'cycle:example-2026',
    opportunityId: opportunity.id,
    cycleName: '2026 main cycle',
    registrationOpenAt: '2026-07-01T00:00:00.000Z',
    registrationCloseAt: '2026-07-31T23:59:59.000Z',
    buildStartAt: '2026-08-01T00:00:00.000Z',
    buildEndAt: '2026-08-30T23:59:59.000Z',
    submissionDeadlineAt: '2026-08-31T23:59:59.000Z',
    judgingStartAt: null,
    judgingEndAt: null,
    demoDayAt: null,
    resultAt: null,
    format: 'online',
    location: null,
    state: 'building',
    rulesSourceId: 'source:hackathon-rules',
    rulesRetrievedAt: NOW,
  });
  await services.hackathons.saveRule({
    id: 'rule:existing-code',
    cycleId: cycle.id,
    ruleType: 'existing_code',
    value: { allowed: true },
    blocking: true,
    sourceId: 'source:hackathon-rules',
    observedAt: NOW,
    confidence: 'verified',
  });
  await services.hackathons.reviewRule('rule:existing-code', 'accept');
  return cycle.id;
}

async function createServices(): Promise<TestServices & { directory: string }> {
  const directory = await temporaryDirectory('hackathon-service');
  const vault = await initializedVault(directory, () => FIXED_NOW);
  await prepareAuthority(vault);
  const provider: EligibilityProfileProvider = async () => eligibleProfile;
  return {
    directory,
    vault,
    opportunities: new OpportunityService({ vault, now: () => FIXED_NOW }),
    hackathons: new HackathonService({
      vault,
      now: () => FIXED_NOW,
      eligibilityProfileProvider: provider,
    }),
  };
}

describe('Hackathon Studio desktop services', () => {
  const active: Array<TestServices & { directory: string }> = [];

  afterEach(async () => {
    for (const service of active.splice(0)) {
      service.vault.vault.close();
      await removeTemporaryDirectory(service.directory);
    }
  });

  it('builds a founder portfolio and calculates score and eligibility server-side', async () => {
    const services = await createServices();
    active.push(services);
    const cycleId = await populateOpportunity(services);

    const entry = await services.hackathons.createEntry({
      id: 'entry:sw4p',
      cycleId,
      legalEntityId: 'legal-entity:founder',
      leadVentureId: 'venture:legacy-default',
      supportingVentureIds: [],
      narrativeProfileId: 'narrative:hackathon:1',
      canonicalDemoVersionId: 'demo-version:sw4p:1',
      trackIds: [],
      bountyIds: [],
      submissionConcept: 'A bounded SW4P settlement adapter.',
      userOutcome: 'A creator receives a correct and reconciled settlement.',
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
    });
    expect(entry).toMatchObject({
      id: 'entry:sw4p',
      leadVentureId: 'venture:legacy-default',
      weightedScore: 85,
      founderDecision: 'pending',
      state: 'candidate',
    });

    const score = await services.hackathons.scoreEntry(entry.id);
    expect(score).toEqual({ id: entry.id, weightedScore: 85 });

    const pending = await services.hackathons.evaluateEligibility(entry.id);
    expect(pending).toMatchObject({
      entryId: entry.id,
      status: 'eligible',
      founderReviewState: 'pending',
    });
    const accepted = await services.hackathons.reviewEligibility(pending.id, 'accept');
    expect(accepted.founderReviewState).toBe('accepted');

    const decided = await services.hackathons.decideEntry({
      id: entry.id,
      decision: 'go',
      rationale: 'Strong reuse, distribution and ecosystem fit.',
    });
    expect(decided.founderDecision).toBe('go');

    const bootstrap = await services.hackathons.bootstrap();
    expect(bootstrap.hackathonCycles).toHaveLength(1);
    expect(bootstrap.hackathonEntries).toHaveLength(1);
    expect(bootstrap.hackathonPortfolio).toMatchObject({
      openUpcomingRollingCycles: 1,
      candidateEntries: 1,
      nextDeadlineAt: '2026-08-31T23:59:59.000Z',
      estimatedActiveHours: 0,
    });
  });

  it('validates commands strictly and never accepts renderer-owned score or eligibility', async () => {
    const services = await createServices();
    active.push(services);
    const cycleId = await populateOpportunity(services);
    const commands = new HackathonCommandService({
      opportunities: services.opportunities,
      hackathons: services.hackathons,
    });

    await expect(
      commands.execute('hackathon.entry.create', {
        id: 'entry:invalid',
        cycleId,
        legalEntityId: 'legal-entity:founder',
        leadVentureId: 'venture:legacy-default',
        supportingVentureIds: [],
        narrativeProfileId: 'narrative:hackathon:1',
        canonicalDemoVersionId: 'demo-version:sw4p:1',
        trackIds: [],
        bountyIds: [],
        submissionConcept: 'A bounded SW4P settlement adapter.',
        userOutcome: 'A creator receives a correct settlement.',
        ecosystemAdapter: 'One ecosystem adapter.',
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
        weightedScore: 100,
      }),
    ).rejects.toThrow();

    await expect(
      commands.execute('hackathon.entry.evaluateEligibility', {
        id: 'entry:missing',
        status: 'eligible',
      }),
    ).rejects.toThrow();
  });
});
