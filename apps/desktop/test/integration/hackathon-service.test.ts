import { afterEach, describe, expect, it } from 'vitest';

import { HackathonService } from '../../src/main/hackathon-service';
import type { VaultService } from '../../src/main/vault-service';
import {
  FIXED_NOW,
  initializedVault,
  removeTemporaryDirectory,
  temporaryDirectory,
} from '../helpers/vault';

const NOW = FIXED_NOW.toISOString();
const COMMIT_SHA = 'b'.repeat(40);
const SHA256 = 'a'.repeat(64);

function seedAuthority(vault: VaultService): void {
  vault.vault.run(
    `INSERT INTO legal_entities(
      id,legal_name,display_name,jurisdiction,entity_type,status,incorporation_reference,
      cap_table_reference,founder_authority,public_website,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      'legal-entity:test',
      'Local Labs, Inc.',
      'Local Labs',
      'Delaware',
      'corporation',
      'active',
      null,
      null,
      'The founder controls external commitments.',
      null,
      NOW,
      NOW,
    ],
  );
  for (const [ventureId, name] of [
    ['venture:sw4p', 'SW4P'],
    ['venture:alice', 'Alice'],
  ] as const) {
    vault.vault.run(
      `INSERT INTO ventures(
        id,legal_entity_id,name,category,utility,stage,status,public_url,
        default_narrative_profile_id,current_demo_version_id,created_at,updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        ventureId,
        'legal-entity:test',
        name,
        `${name} category`,
        `${name} delivers one bounded user outcome.`,
        'pre_production',
        'active',
        null,
        null,
        null,
        NOW,
        NOW,
      ],
    );
    const narrativeId = `narrative:${name.toLowerCase()}:hackathon:1`;
    vault.vault.run(
      `INSERT INTO narrative_profiles(
        id,legal_entity_id,venture_id,purpose,version,description_50,description_100,
        description_250,problem,product_wedge,why_now,technical_differentiation,
        evidence_framing,business_model,use_of_funds,claims_boundary,deck_reference,
        demo_reference,content_sha256,approval_state,approved_by,approved_at,created_at,updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        narrativeId,
        'legal-entity:test',
        ventureId,
        'hackathon',
        1,
        `${name} hackathon narrative.`,
        `${name} proves a focused product result.`,
        `${name} reuses approved infrastructure and produces reproducible evidence.`,
        'Teams repeatedly rebuild this workflow.',
        'A bounded adapter completes the workflow.',
        'The ecosystem needs reusable infrastructure.',
        'Authority, execution and evidence remain connected.',
        'Use dated commits, tests and artifacts.',
        'Usage and application fees.',
        'Harden the reusable product and distribution assets.',
        'Do not present planned integrations as current production evidence.',
        null,
        null,
        SHA256,
        'approved',
        'founder',
        NOW,
        NOW,
        NOW,
      ],
    );
    const demoId = `demo:${name.toLowerCase()}`;
    const versionId = `demo-version:${name.toLowerCase()}:1`;
    vault.vault.run(
      `INSERT INTO canonical_demos(id,name,category,status,created_at,updated_at)
       VALUES (?,?,?,?,?,?)`,
      [demoId, `${name} demo`, 'Hackathon', 'active', NOW, NOW],
    );
    vault.vault.run(
      `INSERT INTO canonical_demo_versions(
        id,demo_id,version,baseline_repository,baseline_commit_sha,branch_convention,
        expected_baseline_hours,core_assets_json,evidence_requirements_json,approved_claims_json,
        content_sha256,approval_state,approved_by,approved_at,created_at,updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        versionId,
        demoId,
        1,
        'rndrntwrk/outreachr',
        COMMIT_SHA,
        'hackathon/{event}/{entry}',
        24,
        JSON.stringify(['bounded adapter']),
        JSON.stringify(['tests', 'commit evidence']),
        JSON.stringify(['A bounded component produces a reproducible outcome.']),
        SHA256,
        'approved',
        'founder',
        NOW,
        NOW,
        NOW,
      ],
    );
  }
}

describe('HackathonService', () => {
  const directories: string[] = [];
  const services: VaultService[] = [];

  const create = async (): Promise<{ vault: VaultService; service: HackathonService }> => {
    const directory = await temporaryDirectory('hackathon-service');
    directories.push(directory);
    const vault = await initializedVault(directory, () => FIXED_NOW);
    services.push(vault);
    seedAuthority(vault);
    await vault.persist();
    return {
      vault,
      service: new HackathonService({ vault, now: () => FIXED_NOW }),
    };
  };

  afterEach(async () => {
    for (const service of services.splice(0)) {
      try {
        service.vault.close();
      } catch {
        // Restore paths may replace or close the original database.
      }
    }
    await Promise.all(directories.splice(0).map(removeTemporaryDirectory));
  });

  it('builds a founder portfolio from generic opportunities and hackathon cycles', async () => {
    const { service } = await create();
    expect((await service.bootstrap()).portfolio).toMatchObject({
      candidateEntries: 0,
      activeBuilds: 0,
      submissionReadyEntries: 0,
      submittedEntries: 0,
      blockedEntries: 0,
    });

    await service.saveOrganization({
      name: 'Example Foundation',
      kind: 'foundation',
      website: 'https://example.test',
      description: 'Ecosystem organizer.',
      linkedFirmId: null,
      isPublic: true,
      contributionEligible: false,
    });
    const opportunity = await service.saveOpportunity({
      organizerOrganizationId: null,
      name: 'Example Hackathon',
      opportunityType: 'hackathon',
      status: 'open',
      publicUrl: 'https://example.test/hackathon',
      applicationUrl: null,
      openDate: '2026-07-01',
      deadline: '2026-09-01',
      startDate: '2026-08-01',
      endDate: '2026-09-05',
      format: 'online',
      location: null,
      eligibilitySummary: 'Reviewed rules apply.',
      termsSummary: null,
      capitalPrizeSummary: '$100,000 prize pool',
      freshnessState: 'current',
      reviewState: 'reviewed',
    });
    await service.saveCycle({
      opportunityId: opportunity.id,
      cycleName: '2026 main cycle',
      registrationOpenAt: '2026-07-01T00:00:00.000Z',
      registrationCloseAt: '2026-07-31T23:59:59.000Z',
      buildStartAt: '2026-08-01T00:00:00.000Z',
      buildEndAt: '2026-08-31T23:59:59.000Z',
      submissionDeadlineAt: '2026-09-01T23:59:59.000Z',
      judgingStartAt: null,
      judgingEndAt: null,
      demoDayAt: null,
      resultAt: null,
      format: 'online',
      location: null,
      state: 'building',
      rulesSourceId: null,
      rulesRetrievedAt: null,
    });

    const bootstrap = await service.bootstrap();
    expect(bootstrap.organizations).toHaveLength(1);
    expect(bootstrap.opportunities).toEqual([
      expect.objectContaining({ name: 'Example Hackathon', organizerName: null }),
    ]);
    expect(bootstrap.cycles).toEqual([
      expect.objectContaining({ opportunityName: 'Example Hackathon', entryCount: 0 }),
    ]);
    expect(bootstrap.portfolio.nextDeadlineAt).toBe('2026-09-01T23:59:59.000Z');
  });

  it('creates independent component entries and never accepts a renderer weighted score', async () => {
    const { service } = await create();
    const setup = await service.createLocalHackathonFixture({
      organizerName: 'Example Foundation',
      opportunityName: 'Example Hackathon',
      cycleName: '2026 main cycle',
      submissionDeadlineAt: '2026-09-01T23:59:59.000Z',
    });

    const sw4p = await service.createEntry({
      cycleId: setup.cycleId,
      legalEntityId: 'legal-entity:test',
      leadVentureId: 'venture:sw4p',
      supportingVentureIds: [],
      narrativeProfileId: 'narrative:sw4p:hackathon:1',
      canonicalDemoVersionId: 'demo-version:sw4p:1',
      trackIds: [],
      bountyIds: [],
      submissionConcept: 'Programmable settlement for creator payouts.',
      userOutcome: 'A creator receives the intended value with a receipt.',
      ecosystemAdapter: 'One sponsor settlement adapter.',
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
      weightedScore: 0,
    } as never);
    const alice = await service.createEntry({
      cycleId: setup.cycleId,
      legalEntityId: 'legal-entity:test',
      leadVentureId: 'venture:alice',
      supportingVentureIds: ['venture:sw4p'],
      narrativeProfileId: 'narrative:alice:hackathon:1',
      canonicalDemoVersionId: 'demo-version:alice:1',
      trackIds: [],
      bountyIds: [],
      submissionConcept: 'Governed agent operations for ecosystem teams.',
      userOutcome: 'A founder delegates bounded work and receives a complete trace.',
      ecosystemAdapter: 'One sponsor MCP adapter.',
      estimatedHours: 40,
      reusePercentage: 85,
      strategicFit: 8,
      acceptanceProbability: 7,
      capitalUpside: 7,
      distributionUpside: 9,
      technicalLeverage: 9,
      credibility: 8,
      urgency: 8,
      effortEfficiency: 8,
      lockInSafety: 8,
    });

    expect(sw4p.weightedScore).toBeGreaterThan(70);
    expect(sw4p.weightedScore).not.toBe(0);
    expect(alice.leadVentureName).toBe('Alice');
    expect((await service.bootstrap()).entries).toHaveLength(2);
    expect((await service.bootstrap()).portfolio.candidateEntries).toBe(2);
  });

  it('computes eligibility from founder facts and stores the founder review separately', async () => {
    const { service } = await create();
    const setup = await service.createLocalHackathonFixture({
      organizerName: 'Example Foundation',
      opportunityName: 'Example Hackathon',
      cycleName: '2026 main cycle',
      submissionDeadlineAt: '2026-09-01T23:59:59.000Z',
    });
    const entry = await service.createEntry({
      cycleId: setup.cycleId,
      legalEntityId: 'legal-entity:test',
      leadVentureId: 'venture:sw4p',
      supportingVentureIds: [],
      narrativeProfileId: 'narrative:sw4p:hackathon:1',
      canonicalDemoVersionId: 'demo-version:sw4p:1',
      trackIds: [],
      bountyIds: [],
      submissionConcept: 'Programmable settlement.',
      userOutcome: 'A completed payout.',
      ecosystemAdapter: 'Sponsor adapter.',
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
    const rule = await service.saveRule({
      cycleId: setup.cycleId,
      ruleType: 'existing_code',
      value: { allowed: true },
      blocking: true,
      sourceId: null,
      observedAt: NOW,
      confidence: 'verified',
    });
    await service.reviewRule(rule.id, 'accepted');

    const evaluation = await service.evaluateEligibility(entry.id, {
      country: null,
      founderAge: null,
      isStudent: null,
      companyFoundedOn: null,
      teamSize: 1,
      usesExistingCode: true,
      willOpenSource: true,
      technologies: ['TypeScript'],
      attendanceMode: 'online',
      canAttendInPerson: false,
      priorFundingUsd: 0,
      participantIds: ['founder'],
      submissionLanguage: 'English',
      availableArtifacts: ['source', 'tests'],
    });
    expect(evaluation).toMatchObject({
      status: 'eligible',
      founderReviewState: 'pending',
    });
    const accepted = await service.reviewEligibility(evaluation.id, 'accepted');
    expect(accepted.founderReviewState).toBe('accepted');
    expect((await service.getEntry(entry.id)).eligibilityStatus).toBe('eligible');
  });
});
