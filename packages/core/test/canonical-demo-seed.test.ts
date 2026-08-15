import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import initSqlJs, { type SqlJsStatic } from 'sql.js';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  CanonicalDemoSeedPackageSchema,
  CoreVault,
  RNDRNTWRK_CANONICAL_DEMO_IDS,
  VentureRepository,
  canonicalDemoSeedDigest,
  importCanonicalDemoSeed,
  verifyAuditChain,
} from '../src/index.js';

const NOW = '2026-08-15T08:00:00.000Z';
let SQL: SqlJsStatic;
let seedInput: unknown;

beforeAll(async () => {
  const require = createRequire(import.meta.url);
  const wasm = require.resolve('sql.js/dist/sql-wasm.wasm');
  SQL = await initSqlJs({ locateFile: () => wasm });
  seedInput = JSON.parse(
    readFileSync(
      new URL('../../../resources/rndrntwrk/canonical-demos.json', import.meta.url),
      'utf8',
    ),
  ) as unknown;
});

function cloneSeed(): ReturnType<typeof CanonicalDemoSeedPackageSchema.parse> {
  return CanonicalDemoSeedPackageSchema.parse(
    JSON.parse(JSON.stringify(seedInput)) as unknown,
  );
}

describe('RNDRNTWRK canonical demo seed', () => {
  it('contains the exact eleven unique public demo families', () => {
    const seed = CanonicalDemoSeedPackageSchema.parse(seedInput);
    expect(seed.demos).toHaveLength(11);
    expect(new Set(seed.demos.map((item) => item.id)).size).toBe(11);
    expect(seed.demos.map((item) => item.id)).toEqual(RNDRNTWRK_CANONICAL_DEMO_IDS);
    expect(seed.demos.every((item) => item.approvedClaims.length > 0)).toBe(true);
    expect(
      seed.demos
        .filter((item) => item.status === 'approved')
        .every((item) => !/^0{40}$/u.test(item.baselineCommitSha)),
    ).toBe(true);
    expect(seed.demos.find((item) => item.id === 'd7-555-arcade-agent-native-play')).toMatchObject({
      baselineRepository: 'rndrntwrk/555-arcade-plugin',
      baselineCommitSha: '23d1bc3a8e03f57130af997fd0ba36f1d7f4fb7b',
    });
  });

  it('imports once, records a deterministic digest and returns idempotently', () => {
    const core = new CoreVault(SQL, { appliedAt: NOW });
    const repository = new VentureRepository(core);

    const first = importCanonicalDemoSeed(repository, seedInput, { importedAt: NOW });
    expect(first).toMatchObject({
      packageId: 'rndrntwrk-canonical-demos',
      packageVersion: '1.0.0',
      demoCount: 11,
      alreadyImported: false,
    });
    expect(first.logicalDigestSha256).toBe(canonicalDemoSeedDigest(seedInput));
    expect(repository.listCanonicalDemos()).toHaveLength(11);
    expect(repository.listCanonicalDemos().every((demo) => demo.versions.length === 1)).toBe(true);

    const second = importCanonicalDemoSeed(repository, seedInput, { importedAt: NOW });
    expect(second).toEqual({ ...first, alreadyImported: true });
    expect(repository.listCanonicalDemos()).toHaveLength(11);
    expect(verifyAuditChain(core).ok).toBe(true);
    core.close();
  });

  it('rejects a reused package ID with different canonical content', () => {
    const core = new CoreVault(SQL, { appliedAt: NOW });
    const repository = new VentureRepository(core);
    importCanonicalDemoSeed(repository, seedInput, { importedAt: NOW });

    const changed = cloneSeed();
    changed.demos[0] = {
      ...changed.demos[0],
      approvedClaims: ['Different public claim.'],
    };
    expect(() =>
      importCanonicalDemoSeed(repository, changed, { importedAt: NOW }),
    ).toThrow(
      'Canonical demo seed package rndrntwrk-canonical-demos was already imported with a different digest',
    );
    expect(verifyAuditChain(core).ok).toBe(true);
    core.close();
  });

  it('rejects approval of an unbound all-zero baseline', () => {
    const invalid = cloneSeed();
    invalid.demos[0] = { ...invalid.demos[0], status: 'approved' };
    expect(CanonicalDemoSeedPackageSchema.safeParse(invalid).success).toBe(false);
  });

  it('detects removal or mutation of an imported deterministic version', () => {
    const missingCore = new CoreVault(SQL, { appliedAt: NOW });
    const missingRepository = new VentureRepository(missingCore);
    importCanonicalDemoSeed(missingRepository, seedInput, { importedAt: NOW });
    missingCore.run('DELETE FROM canonical_demo_versions WHERE id=?', [
      'demo-version:seed:d1-sw4p-programmable-settlement',
    ]);
    expect(() =>
      importCanonicalDemoSeed(missingRepository, seedInput, { importedAt: NOW }),
    ).toThrow(
      'Imported canonical demo version demo-version:seed:d1-sw4p-programmable-settlement is missing',
    );
    missingCore.close();

    const changedCore = new CoreVault(SQL, { appliedAt: NOW });
    const changedRepository = new VentureRepository(changedCore);
    importCanonicalDemoSeed(changedRepository, seedInput, { importedAt: NOW });
    changedCore.run('UPDATE canonical_demo_versions SET content_sha256=? WHERE id=?', [
      'f'.repeat(64),
      'demo-version:seed:d1-sw4p-programmable-settlement',
    ]);
    expect(() =>
      importCanonicalDemoSeed(changedRepository, seedInput, { importedAt: NOW }),
    ).toThrow(
      'Imported canonical demo version demo-version:seed:d1-sw4p-programmable-settlement changed after import',
    );
    changedCore.close();
  });
});
