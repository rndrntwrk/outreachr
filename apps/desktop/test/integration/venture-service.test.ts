import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { canonicalDemoSeedDigest } from '@outreachr/core';
import { afterEach, describe, expect, it } from 'vitest';

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

const LATER = new Date('2026-07-31T20:00:00.000Z');
const LATEST = new Date('2026-07-31T21:00:00.000Z');

function nextClock(...values: Date[]): () => Date {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)] ?? values[values.length - 1]!;
}

describe('VentureService', () => {
  const directories: string[] = [];
  const services: VaultService[] = [];

  const create = async (): Promise<{
    vault: VaultService;
    ventures: VentureService;
  }> => {
    const directory = await temporaryDirectory('venture-service');
    directories.push(directory);
    const vault = await initializedVault(directory, () => FIXED_NOW);
    services.push(vault);
    return {
      vault,
      ventures: new VentureService({
        vault,
        resourceDirectory: RESOURCE_ROOT,
        now: nextClock(FIXED_NOW, LATER, LATEST),
      }),
    };
  };

  afterEach(async () => {
    for (const service of services.splice(0)) {
      try {
        service.vault.close();
      } catch {
        // A restore path may already have replaced or closed the original database.
      }
    }
    await Promise.all(directories.splice(0).map(removeTemporaryDirectory));
  });

  it('backfills the active round and returns a stable founder authority snapshot', async () => {
    const { vault, ventures } = await create();
    expect(await ventures.bootstrap()).toEqual({
      legalEntities: [],
      ventures: [],
      narrativeProfiles: [],
      canonicalDemos: [],
      capitalMandates: [],
      activeCapitalMandateId: null,
    });

    await onboard(vault);
    const first = await ventures.bootstrap();
    expect(first).toMatchObject({
      legalEntities: [{ id: 'legal-entity:founder', displayName: 'Local Labs' }],
      ventures: [{ id: 'venture:legacy-default', legalEntityId: 'legal-entity:founder' }],
      narrativeProfiles: [
        {
          id: 'narrative:legacy:round:active',
          ventureId: 'venture:legacy-default',
          purpose: 'investor',
          approvalState: 'approved',
        },
      ],
      capitalMandates: [
        {
          id: 'capital-mandate:round:active',
          roundId: 'round:active',
          stage: 'seed',
        },
      ],
      activeCapitalMandateId: 'capital-mandate:round:active',
    });

    const second = await ventures.bootstrap();
    expect(second).toEqual(first);
    expect(
      Number(vault.vault.scalar('SELECT COUNT(*) FROM capital_mandates WHERE round_id=?', [
        'round:active',
      ])),
    ).toBe(1);
  });

  it('creates and approves a digest-bound narrative while preserving version history', async () => {
    const { vault, ventures } = await create();
    await onboard(vault);
    const authority = await ventures.bootstrap();
    const legalEntity = authority.legalEntities[0];
    const venture = authority.ventures[0];
    if (!legalEntity || !venture) throw new Error('Legacy authority backfill did not resolve');

    const draft = await ventures.createNarrativeVersion({
      legalEntityId: legalEntity.id,
      ventureId: venture.id,
      purpose: 'investor',
      descriptions: {
        words50: 'SW4P provides programmable internet-native settlement for applications.',
        words100:
          'SW4P gives applications one interface for gas-aware, fee-correct and provable settlement.',
        words250:
          'SW4P coordinates route choice, gas policy, fees, execution state, finality, failure recovery, proof and reconciliation across EVM and Solana.',
      },
      problem: 'Applications repeatedly rebuild settlement operations for every supported rail.',
      productWedge: 'One bounded instruction returns one completed settlement result.',
      whyNow: 'Stablecoins and agent-operated applications require reliable settlement infrastructure.',
      technicalDifferentiation:
        'Execution state, finality, proof and reconciliation share one lifecycle.',
      evidenceFraming: 'Use dated route proofs, tests and reproducible implementation evidence.',
      businessModel: 'Usage and application fees for completed settlement operations.',
      useOfFunds: 'Production hardening, design-partner integrations and verified routes.',
      claimsBoundary: 'Do not present planned routes, partners or volume as current evidence.',
      deckReference: null,
      demoReference: null,
    });
    expect(draft).toMatchObject({ version: 2, approvalState: 'draft' });

    await expect(ventures.approveNarrative(draft.id, 'f'.repeat(64))).rejects.toThrow(
      'Narrative content changed after founder review',
    );
    const approved = await ventures.approveNarrative(draft.id, draft.contentSha256);
    expect(approved).toMatchObject({ approvalState: 'approved', approvedAt: expect.any(String) });

    const snapshot = await ventures.bootstrap();
    expect(
      snapshot.narrativeProfiles.find((item) => item.id === 'narrative:legacy:round:active')
        ?.approvalState,
    ).toBe('superseded');
    expect(
      snapshot.narrativeProfiles.find((item) => item.id === approved.id)?.approvalState,
    ).toBe('approved');
  });

  it('imports the reviewed eleven-demo package and requires an exact package digest', async () => {
    const { ventures } = await create();
    const input = JSON.parse(
      await readFile(join(RESOURCE_ROOT, 'rndrntwrk', 'canonical-demos.json'), 'utf8'),
    ) as unknown;
    const digest = canonicalDemoSeedDigest(input);

    await expect(ventures.importCanonicalDefaults('0'.repeat(64))).rejects.toThrow(
      'Canonical demo package digest does not match founder review',
    );
    const imported = await ventures.importCanonicalDefaults(digest);
    expect(imported).toHaveLength(11);
    expect(imported.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        'd1-sw4p-programmable-settlement',
        'd7-555-arcade-agent-native-play',
        'd11-rndrntwrk-ads-programmable-sponsor-experiences',
      ]),
    );
    expect(imported.every((item) => item.versions[0]?.approvalState === 'draft')).toBe(true);

    const second = await ventures.importCanonicalDefaults(digest);
    expect(second).toEqual(imported);
  });

  it('blocks an unbound demo approval and approves a real baseline version', async () => {
    const { ventures } = await create();
    const input = JSON.parse(
      await readFile(join(RESOURCE_ROOT, 'rndrntwrk', 'canonical-demos.json'), 'utf8'),
    ) as unknown;
    await ventures.importCanonicalDefaults(canonicalDemoSeedDigest(input));

    const unbound = await ventures.createCanonicalDemoVersion({
      demoId: 'd1-sw4p-programmable-settlement',
      baselineRepository: 'unbound',
      baselineCommitSha: '0'.repeat(40),
      branchConvention: 'hackathon/{event}/sw4p-settlement',
      expectedBaselineHours: 20,
      coreAssets: ['settlement API'],
      evidenceRequirements: ['route proof'],
      approvedClaims: ['One instruction returns a reconciled result.'],
    });
    await expect(
      ventures.approveCanonicalDemo(unbound.id, unbound.contentSha256),
    ).rejects.toThrow('A canonical demo requires a real baseline commit before approval');

    const bound = await ventures.createCanonicalDemoVersion({
      demoId: 'd1-sw4p-programmable-settlement',
      baselineRepository: 'rndrntwrk/sw4p',
      baselineCommitSha: 'a'.repeat(40),
      branchConvention: 'hackathon/{event}/sw4p-settlement',
      expectedBaselineHours: 20,
      coreAssets: ['settlement API'],
      evidenceRequirements: ['route proof'],
      approvedClaims: ['One instruction returns a reconciled result.'],
    });
    await expect(ventures.approveCanonicalDemo(bound.id, 'b'.repeat(64))).rejects.toThrow(
      'Canonical demo content changed after founder review',
    );
    const approved = await ventures.approveCanonicalDemo(bound.id, bound.contentSha256);
    expect(approved.approvalState).toBe('approved');
  });

  it('requires the mandate stage and approved narrative to match the active round authority', async () => {
    const { vault, ventures } = await create();
    await onboard(vault);
    const authority = await ventures.bootstrap();
    const legalEntity = authority.legalEntities[0];
    const venture = authority.ventures[0];
    const approvedNarrative = authority.narrativeProfiles.find(
      (item) => item.approvalState === 'approved',
    );
    if (!legalEntity || !venture || !approvedNarrative) {
      throw new Error('Legacy mandate authority did not resolve');
    }

    const base = {
      id: 'capital-mandate:round:active',
      roundId: 'round:active',
      legalEntityId: legalEntity.id,
      ventureId: venture.id,
      narrativeProfileId: approvedNarrative.id,
      targetAmountUsd: 3_000_000,
      minimumCheckUsd: 250_000,
      maximumCheckUsd: 1_000_000,
      instrument: 'SAFE',
      tokenSideLetterPolicy: 'No token side letter is offered by default.',
      geographies: ['United States'],
      targetCloseDate: null,
      status: 'active' as const,
      approvedUseOfFunds: 'Production hardening and design-partner delivery.',
    };
    await expect(ventures.saveCapitalMandate({ ...base, stage: 'pre_seed' })).rejects.toThrow(
      'Capital mandate stage must match its fundraising round',
    );
    const saved = await ventures.saveCapitalMandate({ ...base, stage: 'seed' });
    expect(saved).toMatchObject({ id: base.id, stage: 'seed', ventureId: venture.id });
  });
});
