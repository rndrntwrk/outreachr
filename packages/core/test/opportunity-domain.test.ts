import { createRequire } from 'node:module';

import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import { beforeAll, describe, expect, it } from 'vitest';

import { CoreVault, MIGRATIONS, currentSchemaVersion } from '../src/index.js';

const NOW = '2026-08-15T10:00:00.000Z';
const LATER = '2026-08-15T10:05:00.000Z';
let SQL: SqlJsStatic;

beforeAll(async () => {
  const require = createRequire(import.meta.url);
  const wasm = require.resolve('sql.js/dist/sql-wasm.wasm');
  SQL = await initSqlJs({ locateFile: () => wasm });
});

function applyThrough(db: Database, version: number): void {
  db.run('PRAGMA foreign_keys = ON');
  for (const migration of MIGRATIONS) {
    if (migration.version > version) break;
    db.run(migration.sql);
    db.run('INSERT INTO schema_migrations(version,name,applied_at) VALUES (?,?,?)', [
      migration.version,
      migration.name,
      NOW,
    ]);
    db.run(`PRAGMA user_version = ${migration.version}`);
  }
}

function v10FixtureBytes(): Uint8Array {
  const db = new SQL.Database();
  applyThrough(db, 10);
  db.run(
    `INSERT INTO founder_profiles(
      id,full_name,preferred_name,work_email,company_name,company_url,location,bio,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    ['founder', 'Ada Founder', null, 'ada@local.test', 'Local Labs', null, null, null, NOW, NOW],
  );
  db.run(
    `INSERT INTO rounds(
      id,founder_profile_id,name,stage,target_amount_usd,minimum_check_usd,maximum_check_usd,
      status,thesis,opened_on,closed_on,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      'round:test',
      'founder',
      'Local Labs seed',
      'seed',
      3_000_000,
      250_000,
      1_000_000,
      'active',
      'Local-first infrastructure.',
      '2026-08-01',
      null,
      NOW,
      NOW,
    ],
  );
  expect(currentSchemaVersion(db)).toBe(10);
  const bytes = db.export();
  db.close();
  return bytes;
}

describe('generic opportunity migration v11', () => {
  it('migrates a v10 vault and preserves existing founder and round state', () => {
    const core = new CoreVault(SQL, { bytes: v10FixtureBytes(), appliedAt: LATER });

    expect(currentSchemaVersion(core.db)).toBe(11);
    for (const table of ['organizations', 'opportunities', 'opportunity_sources']) {
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
    expect(core.scalar('SELECT name FROM rounds WHERE id=?', ['round:test'])).toBe(
      'Local Labs seed',
    );
    expect(core.integrityCheck()).toEqual({ ok: true, messages: ['ok'] });
    core.close();
  });

  it('rejects inconsistent opportunity dates without guessing unknown dates', () => {
    const core = new CoreVault(SQL, { appliedAt: NOW });
    core.run(
      `INSERT INTO organizations(
        id,name,normalized_name,kind,website,description,linked_firm_id,is_public,
        contribution_eligible,origin,created_at,updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        'organization:test',
        'Example Foundation',
        'example foundation',
        'foundation',
        'https://example.test',
        null,
        null,
        1,
        0,
        'local',
        NOW,
        NOW,
      ],
    );

    const insert = (
      id: string,
      openDate: string | null,
      deadline: string | null,
      startDate: string | null,
      endDate: string | null,
    ): void =>
      core.run(
        `INSERT INTO opportunities(
          id,organizer_organization_id,name,opportunity_type,status,public_url,application_url,
          open_date,deadline,start_date,end_date,format,location,eligibility_summary,terms_summary,
          capital_prize_summary,freshness_state,review_state,imported_package_id,
          imported_package_digest,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          id,
          'organization:test',
          `Opportunity ${id}`,
          'hackathon',
          'open',
          null,
          null,
          openDate,
          deadline,
          startDate,
          endDate,
          'online',
          null,
          null,
          null,
          null,
          'current',
          'reviewed',
          null,
          null,
          NOW,
          NOW,
        ],
      );

    expect(() => insert('opportunity:bad-open', '2026-09-10', '2026-09-01', null, null)).toThrow(
      'opportunity open date must not follow its deadline',
    );
    expect(() =>
      insert('opportunity:bad-event', null, '2026-09-10', null, '2026-09-09'),
    ).toThrow('opportunity deadline must not follow its end date');
    expect(() =>
      insert('opportunity:bad-range', null, null, '2026-09-10', '2026-09-09'),
    ).toThrow('opportunity start date must not follow its end date');
    expect(() => insert('opportunity:unknown-dates', null, null, null, null)).not.toThrow();
    core.close();
  });
});
