import { createRequire } from 'node:module';

import initSqlJs, { type SqlJsStatic } from 'sql.js';
import { beforeAll, describe, expect, it } from 'vitest';

import { CoreVault, VentureRepository } from '../src/index.js';

const NOW = '2026-08-15T08:00:00.000Z';
const LATER = '2026-08-15T09:00:00.000Z';
let SQL: SqlJsStatic;

beforeAll(async () => {
  const require = createRequire(import.meta.url);
  const wasm = require.resolve('sql.js/dist/sql-wasm.wasm');
  SQL = await initSqlJs({ locateFile: () => wasm });
});

describe('VentureRepository authority roots', () => {
  it('persists legal entities and ventures and blocks legal-entity reassignment after narrative history exists', () => {
    const core = new CoreVault(SQL, { appliedAt: NOW });
    const repository = new VentureRepository(core);
    repository.upsertLegalEntity({
      id: 'legal-entity:one',
      legalName: 'SW4P Labs',
      displayName: 'SW4P',
      jurisdiction: 'Delaware',
      entityType: 'corporation',
      status: 'active',
      incorporationReference: null,
      capTableReference: null,
      founderAuthority: 'Founder controls external commitments.',
      publicWebsite: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    repository.upsertLegalEntity({
      id: 'legal-entity:two',
      legalName: 'Other Labs',
      displayName: 'Other',
      jurisdiction: null,
      entityType: 'llc',
      status: 'active',
      incorporationReference: null,
      capTableReference: null,
      founderAuthority: 'Founder controls external commitments.',
      publicWebsite: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    repository.upsertVenture({
      id: 'venture:sw4p',
      legalEntityId: 'legal-entity:one',
      name: 'SW4P',
      category: 'Programmable settlement',
      utility: 'One instruction becomes a completed settlement result.',
      stage: 'pre_production',
      status: 'active',
      publicUrl: null,
      defaultNarrativeProfileId: null,
      currentDemoVersionId: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    const draft = repository.createNarrativeVersion({
      id: 'narrative:sw4p:investor:1',
      legalEntityId: 'legal-entity:one',
      ventureId: 'venture:sw4p',
      purpose: 'investor',
      description50: 'SW4P provides programmable settlement.',
      description100: 'SW4P provides programmable settlement for applications.',
      description250: 'SW4P coordinates settlement state, finality, proof and reconciliation.',
      problem: 'Applications repeatedly rebuild settlement operations.',
      productWedge: 'One instruction returns a completed settlement result.',
      whyNow: 'Stablecoins and agent commerce need reliable settlement.',
      technicalDifferentiation: 'Execution state and reconciliation share one lifecycle.',
      evidenceFraming: 'Use dated, reproducible implementation evidence.',
      businessModel: 'Usage and application fees.',
      useOfFunds: 'Production hardening and design-partner delivery.',
      claimsBoundary: 'Do not present planned routes as current.',
      deckReference: null,
      demoReference: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    repository.approveNarrativeVersion(draft.id, 'founder', LATER);

    expect(repository.listLegalEntities().map((item) => item.id)).toEqual([
      'legal-entity:two',
      'legal-entity:one',
    ]);
    expect(repository.listVentures()).toHaveLength(1);
    expect(() =>
      repository.upsertVenture({
        id: 'venture:sw4p',
        legalEntityId: 'legal-entity:two',
        name: 'SW4P',
        category: 'Programmable settlement',
        utility: 'One instruction becomes a completed settlement result.',
        stage: 'pre_production',
        status: 'active',
        publicUrl: null,
        defaultNarrativeProfileId: draft.id,
        currentDemoVersionId: null,
        createdAt: NOW,
        updatedAt: LATER,
      }),
    ).toThrow('A venture with narrative or mandate history cannot change legal entity');
    expect(core.integrityCheck()).toEqual({ ok: true, messages: ['ok'] });
    core.close();
  });
});
