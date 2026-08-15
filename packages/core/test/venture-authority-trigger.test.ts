import { createRequire } from 'node:module';

import initSqlJs, { type SqlJsStatic } from 'sql.js';
import { beforeAll, describe, expect, it } from 'vitest';

import { CoreVault } from '../src/index.js';

const NOW = '2026-08-15T08:00:00.000Z';
let SQL: SqlJsStatic;

beforeAll(async () => {
  const require = createRequire(import.meta.url);
  const wasm = require.resolve('sql.js/dist/sql-wasm.wasm');
  SQL = await initSqlJs({ locateFile: () => wasm });
});

describe('venture authority database triggers', () => {
  it('rejects a narrative whose legal entity does not own the selected venture', () => {
    const core = new CoreVault(SQL, { appliedAt: NOW });
    core.run(
      `INSERT INTO legal_entities(
        id,legal_name,display_name,jurisdiction,entity_type,status,incorporation_reference,
        cap_table_reference,founder_authority,public_website,created_at,updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        'legal-entity:one',
        'SW4P Labs',
        'SW4P',
        null,
        'corporation',
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
        'Programmable settlement',
        'One settlement instruction becomes a completed result.',
        'pre_production',
        'active',
        null,
        null,
        null,
        NOW,
        NOW,
      ],
    );

    expect(() =>
      core.run(
        `INSERT INTO narrative_profiles(
          id,legal_entity_id,venture_id,purpose,version,description_50,description_100,
          description_250,problem,product_wedge,why_now,technical_differentiation,
          evidence_framing,business_model,use_of_funds,claims_boundary,deck_reference,
          demo_reference,content_sha256,approval_state,approved_by,approved_at,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          'narrative:bad-authority',
          'legal-entity:two',
          'venture:sw4p',
          'investor',
          1,
          'Bad authority.',
          'Bad authority.',
          'Bad authority.',
          'Mismatch.',
          'Mismatch.',
          'Mismatch.',
          'Mismatch.',
          'Mismatch.',
          'Mismatch.',
          'Mismatch.',
          'Mismatch.',
          null,
          null,
          'e'.repeat(64),
          'draft',
          null,
          null,
          NOW,
          NOW,
        ],
      ),
    ).toThrow('narrative profile authority mismatch');

    expect(core.integrityCheck()).toEqual({ ok: true, messages: ['ok'] });
    core.close();
  });
});
