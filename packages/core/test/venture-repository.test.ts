import { createRequire } from 'node:module';

import initSqlJs, { type SqlJsStatic } from 'sql.js';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  CoreVault,
  OutreachrRepository,
  VentureRepository,
  verifyAuditChain,
} from '../src/index.js';

const NOW = '2026-08-15T08:00:00.000Z';
const LATER = '2026-08-15T09:00:00.000Z';
const LATEST = '2026-08-15T10:00:00.000Z';
let SQL: SqlJsStatic;

beforeAll(async () => {
  const require = createRequire(import.meta.url);
  const wasm = require.resolve('sql.js/dist/sql-wasm.wasm');
  SQL = await initSqlJs({ locateFile: () => wasm });
});

function founderVault(): {
  core: CoreVault;
  outreach: OutreachrRepository;
  ventures: VentureRepository;
} {
  const core = new CoreVault(SQL, { appliedAt: NOW });
  const outreach = new OutreachrRepository(core);
  outreach.upsertFounderProfile({
    id: 'founder',
    fullName: 'Ada Founder',
    workEmail: 'ada@local.test',
    companyName: 'SW4P',
    companyUrl: 'https://sw4p.example',
    createdAt: NOW,
    updatedAt: NOW,
  });
  outreach.upsertRound({
    id: 'round-1',
    founderProfileId: 'founder',
    name: 'SW4P pre-seed',
    stage: 'pre_seed',
    targetAmountUsd: 1_500_000,
    minimumCheckUsd: 50_000,
    maximumCheckUsd: 250_000,
    status: 'active',
    thesis: 'Programmable internet-native settlement for applications.',
    createdAt: NOW,
    updatedAt: NOW,
  });
  return { core, outreach, ventures: new VentureRepository(core) };
}

function narrativeInput(id: string, createdAt: string) {
  return {
    id,
    legalEntityId: 'legal-entity:founder',
    ventureId: 'venture:legacy-default',
    purpose: 'investor' as const,
    description50: 'SW4P provides programmable settlement for applications.',
    description100:
      'SW4P gives applications one interface for gas-aware, fee-correct settlement.',
    description250:
      'SW4P coordinates route choice, gas policy, fees, execution state, finality, proof and reconciliation across EVM and Solana.',
    problem: 'Applications repeatedly rebuild settlement operations for every supported rail.',
    productWedge: 'One bounded instruction returns one completed settlement result.',
    whyNow: 'Stablecoins and agent-operated applications require reliable settlement infrastructure.',
    technicalDifferentiation:
      'Execution state, finality, failure recovery, proof and reconciliation share one lifecycle.',
    evidenceFraming: 'Use dated route proofs, tests and reproducible implementation evidence.',
    businessModel: 'Usage and application fees for completed settlement operations.',
    useOfFunds: 'Production hardening, design-partner integrations and verified routes.',
    claimsBoundary: 'Do not present planned routes, partners or volume as current evidence.',
    deckReference: null,
    demoReference: null,
    createdAt,
    updatedAt: createdAt,
  };
}

describe('VentureRepository', () => {
  it('backfills one legal entity, venture, narrative and mandate per legacy round idempotently', () => {
    const { core, ventures } = founderVault();

    const first = ventures.backfillLegacyAuthority(LATER);
    expect(first.createdLegalEntityId).toBe('legal-entity:founder');
    expect(first.createdVentureId).toBe('venture:legacy-default');
    expect(first.createdNarrativeIds).toEqual(['narrative:legacy:round-1']);
    expect(first.createdMandateIds).toEqual(['capital-mandate:round-1']);
    expect(ventures.getMandateForRound('round-1')).toMatchObject({
      legalEntityId: 'legal-entity:founder',
      ventureId: 'venture:legacy-default',
      narrativeProfileId: 'narrative:legacy:round-1',
      stage: 'pre_seed',
    });

    const second = ventures.backfillLegacyAuthority(LATEST);
    expect(second).toEqual({
      createdLegalEntityId: null,
      createdVentureId: null,
      createdNarrativeIds: [],
      createdMandateIds: [],
    });
    expect(ventures.listCapitalMandates()).toHaveLength(1);
    expect(ventures.listNarrativeProfiles('venture:legacy-default')).toHaveLength(1);
    expect(verifyAuditChain(core).ok).toBe(true);
    core.close();
  });

  it('creates immutable narrative versions and supersedes the previous approved version', () => {
    const { core, ventures } = founderVault();
    ventures.backfillLegacyAuthority(NOW);

    const draft = ventures.createNarrativeVersion(narrativeInput('narrative:sw4p:2', LATER));
    expect(draft.version).toBe(2);
    expect(draft.approvalState).toBe('draft');

    const approved = ventures.approveNarrativeVersion(draft.id, 'founder', LATEST);
    expect(approved.approvalState).toBe('approved');
    expect(approved.approvedBy).toBe('founder');
    const versions = ventures.listNarrativeProfiles('venture:legacy-default');
    expect(versions.find((item) => item.id === 'narrative:legacy:round-1')?.approvalState).toBe(
      'superseded',
    );
    expect(versions.find((item) => item.id === approved.id)?.approvalState).toBe('approved');

    const tampered = ventures.createNarrativeVersion(narrativeInput('narrative:sw4p:3', LATEST));
    core.run('UPDATE narrative_profiles SET problem=? WHERE id=?', [
      'Changed without refreshing the digest.',
      tampered.id,
    ]);
    expect(() => ventures.approveNarrativeVersion(tampered.id, 'founder', LATEST)).toThrow(
      'Narrative content changed after its digest was recorded',
    );
    expect(verifyAuditChain(core).ok).toBe(true);
    core.close();
  });

  it('approves only real demo baselines and updates a primary venture demo version', () => {
    const { core, ventures } = founderVault();
    ventures.backfillLegacyAuthority(NOW);
    ventures.upsertCanonicalDemo({
      id: 'd1-sw4p-programmable-settlement',
      name: 'SW4P Programmable Settlement',
      category: 'Settlement',
      status: 'active',
      createdAt: NOW,
      updatedAt: NOW,
    });
    ventures.linkVentureDemo(
      'venture:legacy-default',
      'd1-sw4p-programmable-settlement',
      true,
      NOW,
    );

    const unbound = ventures.createCanonicalDemoVersion({
      id: 'demo-version:d1:unbound',
      demoId: 'd1-sw4p-programmable-settlement',
      baselineRepository: 'unbound',
      baselineCommitSha: '0'.repeat(40),
      branchConvention: 'hackathon/{event}/{entry}',
      expectedBaselineHours: 24,
      coreAssets: ['settlement API'],
      evidenceRequirements: ['route proof'],
      approvedClaims: ['One instruction returns a reconciled result.'],
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(() => ventures.approveCanonicalDemoVersion(unbound.id, 'founder', LATER)).toThrow(
      'A canonical demo requires a real baseline commit before approval',
    );

    const bound = ventures.createCanonicalDemoVersion({
      id: 'demo-version:d1:bound',
      demoId: 'd1-sw4p-programmable-settlement',
      baselineRepository: 'rndrntwrk/sw4p',
      baselineCommitSha: 'b'.repeat(40),
      branchConvention: 'hackathon/{event}/{entry}',
      expectedBaselineHours: 24,
      coreAssets: ['settlement API'],
      evidenceRequirements: ['route proof'],
      approvedClaims: ['One instruction returns a reconciled result.'],
      createdAt: LATER,
      updatedAt: LATER,
    });
    const approved = ventures.approveCanonicalDemoVersion(bound.id, 'founder', LATEST);
    expect(approved.approvalState).toBe('approved');
    expect(ventures.listVentures()[0]?.currentDemoVersionId).toBe(approved.id);
    expect(ventures.listCanonicalDemos()[0]?.versions).toHaveLength(2);
    expect(verifyAuditChain(core).ok).toBe(true);
    core.close();
  });

  it('prevalidates capital mandate authority before database triggers repeat the check', () => {
    const { core, outreach, ventures } = founderVault();
    ventures.backfillLegacyAuthority(NOW);
    outreach.upsertRound({
      id: 'round-2',
      founderProfileId: 'founder',
      name: 'SW4P seed',
      stage: 'seed',
      targetAmountUsd: 3_000_000,
      status: 'planning',
      thesis: 'Scale settlement infrastructure.',
      createdAt: LATER,
      updatedAt: LATER,
    });
    const approvedNarrative = ventures.approveNarrativeVersion(
      ventures.createNarrativeVersion(narrativeInput('narrative:round-2', LATER)).id,
      'founder',
      LATEST,
    );

    expect(() =>
      ventures.upsertCapitalMandate({
        id: 'capital-mandate:round-2',
        roundId: 'round-2',
        legalEntityId: 'legal-entity:founder',
        ventureId: 'venture:legacy-default',
        narrativeProfileId: approvedNarrative.id,
        stage: 'pre_seed',
        targetAmountUsd: 3_000_000,
        minimumCheckUsd: null,
        maximumCheckUsd: null,
        instrument: 'SAFE',
        tokenSideLetterPolicy: 'No token side letter by default.',
        geographies: ['Global'],
        targetCloseDate: null,
        status: 'planning',
        approvedUseOfFunds: 'Production and design-partner integrations.',
        createdAt: LATEST,
        updatedAt: LATEST,
      }),
    ).toThrow('Capital mandate stage must match its fundraising round');

    const mandate = ventures.upsertCapitalMandate({
      id: 'capital-mandate:round-2',
      roundId: 'round-2',
      legalEntityId: 'legal-entity:founder',
      ventureId: 'venture:legacy-default',
      narrativeProfileId: approvedNarrative.id,
      stage: 'seed',
      targetAmountUsd: 3_000_000,
      minimumCheckUsd: 100_000,
      maximumCheckUsd: 500_000,
      instrument: 'SAFE',
      tokenSideLetterPolicy: 'No token side letter by default.',
      geographies: ['Global'],
      targetCloseDate: null,
      status: 'planning',
      approvedUseOfFunds: 'Production and design-partner integrations.',
      createdAt: LATEST,
      updatedAt: LATEST,
    });
    expect(mandate).toMatchObject({ roundId: 'round-2', stage: 'seed' });
    expect(ventures.listCapitalMandates()).toHaveLength(2);
    expect(verifyAuditChain(core).ok).toBe(true);
    core.close();
  });
});
