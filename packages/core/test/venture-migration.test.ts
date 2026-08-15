import { createRequire } from 'node:module';

import initSqlJs, { type SqlJsStatic } from 'sql.js';
import { beforeAll, describe, expect, it } from 'vitest';

import { CoreVault, currentSchemaVersion } from '../src/index.js';
import {
  currentSchemaVersion as currentLegacySchemaVersion,
  migrate as migrateV1ToV9,
} from '../src/migrations-v1-v9.js';

const NOW = '2026-08-15T08:00:00.000Z';
const LATER = '2026-08-15T08:05:00.000Z';
let SQL: SqlJsStatic;

beforeAll(async () => {
  const require = createRequire(import.meta.url);
  const wasm = require.resolve('sql.js/dist/sql-wasm.wasm');
  SQL = await initSqlJs({ locateFile: () => wasm });
});

function v9FixtureBytes(): Uint8Array {
  const db = new SQL.Database();
  migrateV1ToV9(db, NOW);
  db.run(
    `INSERT INTO founder_profiles(
      id,full_name,preferred_name,work_email,company_name,company_url,location,bio,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      'founder',
      'Ada Founder',
      null,
      'ada@local.test',
      'Local Labs',
      'https://local.test',
      null,
      null,
      NOW,
      NOW,
    ],
  );
  db.run(
    `INSERT INTO rounds(
      id,founder_profile_id,name,stage,target_amount_usd,minimum_check_usd,maximum_check_usd,
      status,thesis,opened_on,closed_on,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      'round-legacy',
      'founder',
      'Pre-seed 2026',
      'pre_seed',
      1_500_000,
      50_000,
      250_000,
      'active',
      'Programmable settlement for applications.',
      '2026-08-15',
      null,
      NOW,
      NOW,
    ],
  );
  expect(currentLegacySchemaVersion(db)).toBe(9);
  const bytes = db.export();
  db.close();
  return bytes;
}

function insertAuthorityFixture(core: CoreVault): void {
  core.run(
    `INSERT INTO founder_profiles(
      id,full_name,preferred_name,work_email,company_name,company_url,location,bio,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    ['founder', 'Ada Founder', null, null, 'SW4P', null, null, null, NOW, NOW],
  );
  core.run(
    `INSERT INTO rounds(
      id,founder_profile_id,name,stage,target_amount_usd,minimum_check_usd,maximum_check_usd,
      status,thesis,opened_on,closed_on,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      'round-1',
      'founder',
      'SW4P pre-seed',
      'pre_seed',
      1_500_000,
      50_000,
      250_000,
      'active',
      'Programmable settlement for applications.',
      null,
      null,
      NOW,
      NOW,
    ],
  );
  core.run(
    `INSERT INTO legal_entities(
      id,legal_name,display_name,jurisdiction,entity_type,status,incorporation_reference,
      cap_table_reference,founder_authority,public_website,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      'legal-entity:one',
      'SW4P Labs',
      'SW4P',
      'Delaware',
      'corporation',
      'active',
      null,
      null,
      'Founder controls external commitments.',
      'https://sw4p.example',
      NOW,
      NOW,
    ],
  );
  core.run(
    `INSERT INTO legal_entities(
      id,legal_name,display_name,jurisdiction,entity_type,status,incorporation_reference,
      cap_table_reference,founder_authority,public_website,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      'legal-entity:two',
      'Other Labs',
      'Other',
      null,
      'llc',
      'active',
      null,
      null,
      'Founder controls external commitments.',
      null,
      NOW,
      NOW,
    ],
  );
  core.run(
    `INSERT INTO ventures(
      id,legal_entity_id,name,category,utility,stage,status,public_url,
      default_narrative_profile_id,current_demo_version_id,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      'venture:sw4p',
      'legal-entity:one',
      'SW4P',
      'Programmable internet-native settlement',
      'One settlement instruction becomes a finished, provable result.',
      'pre_production',
      'active',
      null,
      null,
      null,
      NOW,
      NOW,
    ],
  );
  core.run(
    `INSERT INTO narrative_profiles(
      id,legal_entity_id,venture_id,purpose,version,description_50,description_100,
      description_250,problem,product_wedge,why_now,technical_differentiation,
      evidence_framing,business_model,use_of_funds,claims_boundary,deck_reference,
      demo_reference,content_sha256,approval_state,approved_by,approved_at,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      'narrative:sw4p:investor:1',
      'legal-entity:one',
      'venture:sw4p',
      'investor',
      1,
      'SW4P settles application instructions.',
      'SW4P gives applications one settlement interface.',
      'SW4P coordinates route, gas, fees, finality, proof and reconciliation.',
      'Applications rebuild settlement operations for every rail.',
      'One instruction returns one finished settlement result.',
      'Stablecoins and agent commerce need reliable application settlement.',
      'Execution state and reconciliation share one lifecycle.',
      'Use reproducible routes, tests and dated evidence.',
      'Usage and application fees.',
      'Production hardening and design-partner delivery.',
      'Do not present planned routes or partners as current.',
      null,
      null,
      'a'.repeat(64),
      'approved',
      'founder',
      NOW,
      NOW,
      NOW,
    ],
  );
  core.run(
    `INSERT INTO canonical_demos(id,name,category,status,created_at,updated_at)
     VALUES (?,?,?,?,?,?)`,
    [
      'd1-sw4p-programmable-settlement',
      'SW4P Programmable Settlement',
      'Settlement',
      'active',
      NOW,
      NOW,
    ],
  );
  core.run(
    `INSERT INTO canonical_demo_versions(
      id,demo_id,version,baseline_repository,baseline_commit_sha,branch_convention,
      expected_baseline_hours,core_assets_json,evidence_requirements_json,approved_claims_json,
      content_sha256,approval_state,approved_by,approved_at,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      'demo-version:d1:1',
      'd1-sw4p-programmable-settlement',
      1,
      'rndrntwrk/sw4p',
      'b'.repeat(40),
      'hackathon/{event}/{entry}',
      24,
      JSON.stringify(['settlement API']),
      JSON.stringify(['route proof']),
      JSON.stringify(['One instruction returns a reconciled result.']),
      'c'.repeat(64),
      'approved',
      'founder',
      NOW,
      NOW,
      NOW,
    ],
  );
}

describe('venture authority migration v10', () => {
  it('migrates a v9 vault without losing existing founder or round state', () => {
    const core = new CoreVault(SQL, { bytes: v9FixtureBytes(), appliedAt: LATER });

    expect(currentSchemaVersion(core.db)).toBe(10);
    for (const table of [
      'legal_entities',
      'ventures',
      'narrative_profiles',
      'canonical_demos',
      'canonical_demo_versions',
      'venture_demos',
      'capital_mandates',
    ]) {
      expect(
        Number(
          core.scalar("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?", [
            table,
          ]),
        ),
      ).toBe(1);
    }
    expect(core.scalar('SELECT company_name FROM founder_profiles WHERE id=?', ['founder'])).toBe(
      'Local Labs',
    );
    expect(core.scalar('SELECT name FROM rounds WHERE id=?', ['round-legacy'])).toBe(
      'Pre-seed 2026',
    );
    expect(core.integrityCheck()).toEqual({ ok: true, messages: ['ok'] });
    core.close();
  });

  it('enforces immutable approved versions and cross-authority mandates', () => {
    const core = new CoreVault(SQL, { appliedAt: NOW });
    insertAuthorityFixture(core);

    expect(() =>
      core.run("UPDATE narrative_profiles SET description_50='changed' WHERE id=?", [
        'narrative:sw4p:investor:1',
      ]),
    ).toThrow('approved narrative versions are immutable');
    expect(() =>
      core.run('DELETE FROM narrative_profiles WHERE id=?', ['narrative:sw4p:investor:1']),
    ).toThrow('approved narrative versions cannot be deleted');
    expect(() =>
      core.run("UPDATE narrative_profiles SET approved_by='other' WHERE id=?", [
        'narrative:sw4p:investor:1',
      ]),
    ).toThrow('approved narrative metadata is immutable');
    expect(() =>
      core.run("UPDATE narrative_profiles SET approval_state='draft' WHERE id=?", [
        'narrative:sw4p:investor:1',
      ]),
    ).toThrow('narrative approval transitions are forward only');

    expect(() =>
      core.run("UPDATE canonical_demo_versions SET baseline_repository='other/repo' WHERE id=?", [
        'demo-version:d1:1',
      ]),
    ).toThrow('approved canonical demo versions are immutable');
    expect(() =>
      core.run('DELETE FROM canonical_demo_versions WHERE id=?', ['demo-version:d1:1']),
    ).toThrow('approved canonical demo versions cannot be deleted');

    core.run(
      `INSERT INTO canonical_demos(id,name,category,status,created_at,updated_at)
       VALUES (?,?,?,?,?,?)`,
      ['demo-zero', 'Unbound Demo', 'Draft', 'active', NOW, NOW],
    );
    expect(() =>
      core.run(
        `INSERT INTO canonical_demo_versions(
          id,demo_id,version,baseline_repository,baseline_commit_sha,branch_convention,
          expected_baseline_hours,core_assets_json,evidence_requirements_json,
          approved_claims_json,content_sha256,approval_state,approved_by,approved_at,
          created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          'demo-version:zero:1',
          'demo-zero',
          1,
          'unbound',
          '0'.repeat(40),
          'hackathon/{event}/{entry}',
          8,
          JSON.stringify(['prototype']),
          JSON.stringify(['demo video']),
          JSON.stringify(['Draft claim']),
          'd'.repeat(64),
          'approved',
          'founder',
          NOW,
          NOW,
          NOW,
        ],
      ),
    ).toThrow();

    expect(() =>
      core.run(
        `INSERT INTO capital_mandates(
          id,round_id,legal_entity_id,venture_id,narrative_profile_id,stage,target_amount_usd,
          minimum_check_usd,maximum_check_usd,instrument,token_side_letter_policy,
          geographies_json,target_close_date,status,approved_use_of_funds,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          'capital-mandate:bad-entity',
          'round-1',
          'legal-entity:two',
          'venture:sw4p',
          'narrative:sw4p:investor:1',
          'pre_seed',
          1_500_000,
          50_000,
          250_000,
          'SAFE',
          'No token side letter by default.',
          JSON.stringify(['United States']),
          null,
          'active',
          'Production hardening and design-partner delivery.',
          NOW,
          NOW,
        ],
      ),
    ).toThrow('capital mandate authority mismatch');

    expect(() =>
      core.run(
        `INSERT INTO capital_mandates(
          id,round_id,legal_entity_id,venture_id,narrative_profile_id,stage,target_amount_usd,
          minimum_check_usd,maximum_check_usd,instrument,token_side_letter_policy,
          geographies_json,target_close_date,status,approved_use_of_funds,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          'capital-mandate:bad-stage',
          'round-1',
          'legal-entity:one',
          'venture:sw4p',
          'narrative:sw4p:investor:1',
          'seed',
          1_500_000,
          50_000,
          250_000,
          'SAFE',
          'No token side letter by default.',
          JSON.stringify(['United States']),
          null,
          'active',
          'Production hardening and design-partner delivery.',
          NOW,
          NOW,
        ],
      ),
    ).toThrow('capital mandate authority mismatch');

    core.run(
      `INSERT INTO capital_mandates(
        id,round_id,legal_entity_id,venture_id,narrative_profile_id,stage,target_amount_usd,
        minimum_check_usd,maximum_check_usd,instrument,token_side_letter_policy,
        geographies_json,target_close_date,status,approved_use_of_funds,created_at,updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        'capital-mandate:round-1',
        'round-1',
        'legal-entity:one',
        'venture:sw4p',
        'narrative:sw4p:investor:1',
        'pre_seed',
        1_500_000,
        50_000,
        250_000,
        'SAFE',
        'No token side letter by default.',
        JSON.stringify(['United States']),
        '2026-12-31',
        'active',
        'Production hardening and design-partner delivery.',
        NOW,
        NOW,
      ],
    );
    expect(core.scalar('SELECT venture_id FROM capital_mandates WHERE round_id=?', ['round-1'])).toBe(
      'venture:sw4p',
    );
    expect(() =>
      core.run("UPDATE capital_mandates SET legal_entity_id='legal-entity:two' WHERE id=?", [
        'capital-mandate:round-1',
      ]),
    ).toThrow('capital mandate authority mismatch');

    expect(core.integrityCheck()).toEqual({ ok: true, messages: ['ok'] });
    core.close();
  });
});
