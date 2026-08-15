import { OutreachrRepository, VentureRepository } from '@outreachr/core';
import { OpportunityService } from '../../src/main/opportunity-service';
import { HackathonService } from '../../src/main/hackathon-service';
import { VentureService } from '../../src/main/venture-service';
import type { VaultService } from '../../src/main/vault-service';

export const HACKATHON_COMMIT_SHA = 'b'.repeat(40);

export async function prepareHackathonAuthority(
  vault: VaultService,
  resourceDirectory: string,
  now: Date,
): Promise<void> {
  const timestamp = now.toISOString();
  const ventures = new VentureService({ vault, resourceDirectory, now: () => now });
  await ventures.bootstrap();
  const narrative = await ventures.createNarrativeVersion({
    id: 'narrative:hackathon:identity',
    legalEntityId: 'legal-entity:founder',
    ventureId: 'venture:legacy-default',
    purpose: 'hackathon',
    descriptions: {
      words50: 'SW4P gives applications one settlement instruction.',
      words100: 'SW4P produces a bounded, provable settlement outcome.',
      words250: 'SW4P connects execution, proof and reconciliation for a hackathon demo.',
    },
    problem: 'Applications rebuild settlement operations.',
    productWedge: 'One instruction produces one finished outcome.',
    whyNow: 'Stablecoin applications need interoperable settlement.',
    technicalDifferentiation: 'Execution and reconciliation stay connected.',
    evidenceFraming: 'Use reproducible tests and commits.',
    businessModel: 'Usage fees.',
    useOfFunds: 'Harden adapters.',
    claimsBoundary: 'Separate tested evidence from planned work.',
    deckReference: null,
    demoReference: null,
  });
  await ventures.approveNarrative(narrative.id, narrative.contentSha256);
  const repository = new VentureRepository(vault.vault);
  repository.upsertCanonicalDemo({
    id: 'demo:identity',
    name: 'SW4P Settlement',
    category: 'Settlement',
    status: 'active',
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  repository.linkVentureDemo('venture:legacy-default', 'demo:identity', true, timestamp);
  const version = repository.createCanonicalDemoVersion({
    id: 'demo-version:identity',
    demoId: 'demo:identity',
    baselineRepository: 'rndrntwrk/outreachr',
    baselineCommitSha: HACKATHON_COMMIT_SHA,
    branchConvention: 'hackathon/{event}/{entry}',
    expectedBaselineHours: 24,
    coreAssets: ['adapter'],
    evidenceRequirements: ['tests'],
    approvedClaims: ['A bounded settlement path can be demonstrated reproducibly.'],
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  repository.approveCanonicalDemoVersion(version.id, 'founder', timestamp);
  new OutreachrRepository(vault.vault).upsertSource({
    id: 'source:identity-rules',
    canonicalUrl: 'https://example.test/rules',
    title: 'Official rules',
    publisher: 'Example Foundation',
    sourceType: 'official_rules',
    retrievedAt: timestamp,
    publishedOn: null,
    rightsClass: 'public_web',
    redistributionStatus: 'attribution_required',
    attribution: 'Example Foundation',
    excerpt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  await vault.persist();
}

export async function createHackathonEntry(
  opportunities: OpportunityService,
  hackathons: HackathonService,
): Promise<string> {
  const organization = await opportunities.saveOrganization({
    id: 'organization:identity',
    name: 'Example Foundation',
    kind: 'foundation',
    website: 'https://example.test',
    description: null,
    linkedFirmId: null,
    isPublic: true,
    contributionEligible: false,
    origin: 'local',
  });
  const opportunity = await opportunities.saveOpportunity({
    id: 'opportunity:identity',
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
    eligibilitySummary: null,
    termsSummary: null,
    capitalPrizeSummary: null,
    freshnessState: 'current',
    reviewState: 'reviewed',
    importedPackageId: null,
    importedPackageDigest: null,
  });
  const cycle = await hackathons.saveCycle({
    id: 'cycle:identity',
    opportunityId: opportunity.id,
    cycleName: '2026 cycle',
    registrationOpenAt: null,
    registrationCloseAt: null,
    buildStartAt: null,
    buildEndAt: null,
    submissionDeadlineAt: '2026-08-31T23:59:59.000Z',
    judgingStartAt: null,
    judgingEndAt: null,
    demoDayAt: null,
    resultAt: null,
    format: 'online',
    location: null,
    state: 'building',
    rulesSourceId: 'source:identity-rules',
    rulesRetrievedAt: '2026-07-31T19:00:00.000Z',
  });
  const entry = await hackathons.createEntry({
    id: 'entry:identity',
    cycleId: cycle.id,
    legalEntityId: 'legal-entity:founder',
    leadVentureId: 'venture:legacy-default',
    supportingVentureIds: [],
    narrativeProfileId: 'narrative:hackathon:identity',
    canonicalDemoVersionId: 'demo-version:identity',
    trackIds: [],
    bountyIds: [],
    submissionConcept: 'A bounded settlement adapter.',
    userOutcome: 'A creator receives a correct settlement.',
    ecosystemAdapter: 'One adapter.',
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
  return entry.id;
}
