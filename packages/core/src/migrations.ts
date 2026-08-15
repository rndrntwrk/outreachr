import type { Database } from 'sql.js';

import { HACKATHON_HARDENING_SQL } from './hackathon-hardening.js';
import { HACKATHON_INVARIANT_SQL } from './hackathon-invariants.js';
import { HACKATHON_SCHEMA_SQL } from './hackathon-migration.js';
import { MIGRATIONS as LEGACY_MIGRATIONS } from './migrations-v1-v10.js';
import { OPPORTUNITY_SCHEMA_SQL } from './opportunity-migration.js';

export const SCHEMA_VERSION = 11;

export interface Migration {
  readonly version: number;
  readonly name: string;
  readonly sql: string;
}

const HACKATHON_STUDIO_MIGRATION: Migration = {
  version: 11,
  name: 'opportunities_and_hackathon_studio',
  sql: `${OPPORTUNITY_SCHEMA_SQL}\n${HACKATHON_SCHEMA_SQL}\n${HACKATHON_INVARIANT_SQL}\n${HACKATHON_HARDENING_SQL}`,
};

export const MIGRATIONS: readonly Migration[] = [
  ...LEGACY_MIGRATIONS,
  HACKATHON_STUDIO_MIGRATION,
];

function scalarNumber(db: Database, sql: string): number {
  const result = db.exec(sql)[0];
  if (!result || !result.values[0]) return 0;
  return Number(result.values[0][0]);
}

export function currentSchemaVersion(db: Database): number {
  return scalarNumber(db, 'PRAGMA user_version');
}

export function migrate(db: Database, appliedAt: string): number {
  db.run('PRAGMA foreign_keys = ON');
  const current = currentSchemaVersion(db);
  if (current > SCHEMA_VERSION)
    throw new Error(`Vault schema ${current} is newer than supported schema ${SCHEMA_VERSION}`);

  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    db.run('BEGIN IMMEDIATE');
    try {
      db.run(migration.sql);
      db.run('INSERT INTO schema_migrations(version, name, applied_at) VALUES (?, ?, ?)', [
        migration.version,
        migration.name,
        appliedAt,
      ]);
      db.run(`PRAGMA user_version = ${migration.version}`);
      db.run('COMMIT');
    } catch (error) {
      db.run('ROLLBACK');
      throw error;
    }
  }
  db.run('PRAGMA foreign_keys = ON');
  return currentSchemaVersion(db);
}
