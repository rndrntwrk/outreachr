import type { Database } from 'sql.js';

import { MIGRATIONS as LEGACY_MIGRATIONS } from './migrations-v1-v9.js';

export const SCHEMA_VERSION = 10;

export interface Migration {
  readonly version: number;
  readonly name: string;
  readonly sql: string;
}

const VENTURE_AUTHORITY_MIGRATION: Migration = {
  version: 10,
  name: 'venture_narrative_demo_and_capital_authority',
  sql: `
CREATE TABLE legal_entities (
  id TEXT PRIMARY KEY,
  legal_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  jurisdiction TEXT,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('corporation','llc','foundation','sole_proprietorship','partnership','other')),
  status TEXT NOT NULL CHECK(status IN ('planned','active','inactive','dissolved')),
  incorporation_reference TEXT,
  cap_table_reference TEXT,
  founder_authority TEXT NOT NULL,
  public_website TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE ventures (
  id TEXT PRIMARY KEY,
  legal_entity_id TEXT NOT NULL REFERENCES legal_entities(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  utility TEXT NOT NULL,
  stage TEXT NOT NULL CHECK(stage IN ('concept','prototype','pre_production','production','scaling')),
  status TEXT NOT NULL CHECK(status IN ('active','paused','archived')),
  public_url TEXT,
  default_narrative_profile_id TEXT,
  current_demo_version_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(legal_entity_id,name)
);

CREATE TABLE narrative_profiles (
  id TEXT PRIMARY KEY,
  legal_entity_id TEXT NOT NULL REFERENCES legal_entities(id) ON DELETE RESTRICT,
  venture_id TEXT NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK(purpose IN ('investor','accelerator','grant','hackathon','sponsor','partner','media')),
  version INTEGER NOT NULL CHECK(version >= 1),
  description_50 TEXT NOT NULL,
  description_100 TEXT NOT NULL,
  description_250 TEXT NOT NULL,
  problem TEXT NOT NULL,
  product_wedge TEXT NOT NULL,
  why_now TEXT NOT NULL,
  technical_differentiation TEXT NOT NULL,
  evidence_framing TEXT NOT NULL,
  business_model TEXT NOT NULL,
  use_of_funds TEXT NOT NULL,
  claims_boundary TEXT NOT NULL,
  deck_reference TEXT,
  demo_reference TEXT,
  content_sha256 TEXT NOT NULL CHECK(length(content_sha256)=64),
  approval_state TEXT NOT NULL CHECK(approval_state IN ('draft','approved','superseded')),
  approved_by TEXT,
  approved_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(venture_id,purpose,version),
  CHECK(
    (approval_state='draft' AND approved_at IS NULL AND approved_by IS NULL)
    OR (approval_state!='draft' AND approved_at IS NOT NULL AND approved_by IS NOT NULL)
  )
);

CREATE TABLE canonical_demos (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active','paused','archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE canonical_demo_versions (
  id TEXT PRIMARY KEY,
  demo_id TEXT NOT NULL REFERENCES canonical_demos(id) ON DELETE CASCADE,
  version INTEGER NOT NULL CHECK(version >= 1),
  baseline_repository TEXT NOT NULL,
  baseline_commit_sha TEXT NOT NULL CHECK(length(baseline_commit_sha)=40),
  branch_convention TEXT NOT NULL,
  expected_baseline_hours INTEGER NOT NULL CHECK(expected_baseline_hours BETWEEN 1 AND 1000),
  core_assets_json TEXT NOT NULL CHECK(json_valid(core_assets_json) AND json_type(core_assets_json)='array'),
  evidence_requirements_json TEXT NOT NULL CHECK(json_valid(evidence_requirements_json) AND json_type(evidence_requirements_json)='array'),
  approved_claims_json TEXT NOT NULL CHECK(json_valid(approved_claims_json) AND json_type(approved_claims_json)='array'),
  content_sha256 TEXT NOT NULL CHECK(length(content_sha256)=64),
  approval_state TEXT NOT NULL CHECK(approval_state IN ('draft','approved','superseded')),
  approved_by TEXT,
  approved_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(demo_id,version),
  CHECK(
    (approval_state='draft' AND approved_at IS NULL AND approved_by IS NULL)
    OR (approval_state!='draft' AND approved_at IS NOT NULL AND approved_by IS NOT NULL)
  ),
  CHECK(approval_state='draft' OR baseline_commit_sha!='0000000000000000000000000000000000000000')
);

CREATE TABLE venture_demos (
  venture_id TEXT NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  demo_id TEXT NOT NULL REFERENCES canonical_demos(id) ON DELETE CASCADE,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK(is_primary IN (0,1)),
  created_at TEXT NOT NULL,
  PRIMARY KEY(venture_id,demo_id)
);

CREATE TABLE capital_mandates (
  id TEXT PRIMARY KEY,
  round_id TEXT NOT NULL UNIQUE REFERENCES rounds(id) ON DELETE CASCADE,
  legal_entity_id TEXT NOT NULL REFERENCES legal_entities(id) ON DELETE RESTRICT,
  venture_id TEXT NOT NULL REFERENCES ventures(id) ON DELETE RESTRICT,
  narrative_profile_id TEXT NOT NULL REFERENCES narrative_profiles(id) ON DELETE RESTRICT,
  stage TEXT NOT NULL CHECK(stage IN ('pre_seed','seed','series_a')),
  target_amount_usd INTEGER NOT NULL CHECK(target_amount_usd >= 0),
  minimum_check_usd INTEGER CHECK(minimum_check_usd IS NULL OR minimum_check_usd >= 0),
  maximum_check_usd INTEGER CHECK(maximum_check_usd IS NULL OR maximum_check_usd >= 0),
  instrument TEXT NOT NULL,
  token_side_letter_policy TEXT NOT NULL,
  geographies_json TEXT NOT NULL CHECK(json_valid(geographies_json) AND json_type(geographies_json)='array'),
  target_close_date TEXT,
  status TEXT NOT NULL CHECK(status IN ('planning','active','paused','closed')),
  approved_use_of_funds TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK(minimum_check_usd IS NULL OR maximum_check_usd IS NULL OR minimum_check_usd <= maximum_check_usd)
);

CREATE INDEX ventures_legal_entity_status_idx ON ventures(legal_entity_id,status);
CREATE INDEX narrative_profiles_venture_purpose_state_idx
  ON narrative_profiles(venture_id,purpose,approval_state);
CREATE INDEX canonical_demo_versions_demo_state_idx
  ON canonical_demo_versions(demo_id,approval_state);
CREATE INDEX capital_mandates_status_close_idx ON capital_mandates(status,target_close_date);
CREATE UNIQUE INDEX venture_demos_one_primary_idx
  ON venture_demos(venture_id) WHERE is_primary=1;

CREATE TRIGGER narrative_profile_authority_insert
BEFORE INSERT ON narrative_profiles
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM ventures v
    WHERE v.id=NEW.venture_id AND v.legal_entity_id=NEW.legal_entity_id
  ) THEN RAISE(ABORT,'narrative profile authority mismatch') END;
END;

CREATE TRIGGER narrative_profile_authority_update
BEFORE UPDATE OF venture_id,legal_entity_id ON narrative_profiles
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM ventures v
    WHERE v.id=NEW.venture_id AND v.legal_entity_id=NEW.legal_entity_id
  ) THEN RAISE(ABORT,'narrative profile authority mismatch') END;
END;

CREATE TRIGGER approved_narrative_content_is_immutable
BEFORE UPDATE OF description_50,description_100,description_250,problem,product_wedge,why_now,
  technical_differentiation,evidence_framing,business_model,use_of_funds,claims_boundary,
  deck_reference,demo_reference,content_sha256,venture_id,legal_entity_id,purpose,version
ON narrative_profiles
WHEN OLD.approval_state IN ('approved','superseded')
BEGIN
  SELECT RAISE(ABORT,'approved narrative versions are immutable');
END;

CREATE TRIGGER approved_narrative_approval_metadata_is_immutable
BEFORE UPDATE OF approved_by,approved_at ON narrative_profiles
WHEN OLD.approval_state IN ('approved','superseded')
BEGIN
  SELECT RAISE(ABORT,'approved narrative metadata is immutable');
END;

CREATE TRIGGER narrative_approval_transition_is_forward_only
BEFORE UPDATE OF approval_state ON narrative_profiles
WHEN OLD.approval_state='superseded'
  OR (OLD.approval_state='approved' AND NEW.approval_state NOT IN ('approved','superseded'))
  OR (OLD.approval_state='draft' AND NEW.approval_state='superseded')
BEGIN
  SELECT RAISE(ABORT,'narrative approval transitions are forward only');
END;

CREATE TRIGGER approved_narrative_cannot_be_deleted
BEFORE DELETE ON narrative_profiles
WHEN OLD.approval_state IN ('approved','superseded')
BEGIN
  SELECT RAISE(ABORT,'approved narrative versions cannot be deleted');
END;

CREATE TRIGGER approved_demo_version_content_is_immutable
BEFORE UPDATE OF demo_id,version,baseline_repository,baseline_commit_sha,branch_convention,
  expected_baseline_hours,core_assets_json,evidence_requirements_json,approved_claims_json,
  content_sha256
ON canonical_demo_versions
WHEN OLD.approval_state IN ('approved','superseded')
BEGIN
  SELECT RAISE(ABORT,'approved canonical demo versions are immutable');
END;

CREATE TRIGGER approved_demo_version_metadata_is_immutable
BEFORE UPDATE OF approved_by,approved_at ON canonical_demo_versions
WHEN OLD.approval_state IN ('approved','superseded')
BEGIN
  SELECT RAISE(ABORT,'approved canonical demo metadata is immutable');
END;

CREATE TRIGGER canonical_demo_approval_transition_is_forward_only
BEFORE UPDATE OF approval_state ON canonical_demo_versions
WHEN OLD.approval_state='superseded'
  OR (OLD.approval_state='approved' AND NEW.approval_state NOT IN ('approved','superseded'))
  OR (OLD.approval_state='draft' AND NEW.approval_state='superseded')
BEGIN
  SELECT RAISE(ABORT,'canonical demo approval transitions are forward only');
END;

CREATE TRIGGER approved_demo_version_cannot_be_deleted
BEFORE DELETE ON canonical_demo_versions
WHEN OLD.approval_state IN ('approved','superseded')
BEGIN
  SELECT RAISE(ABORT,'approved canonical demo versions cannot be deleted');
END;

CREATE TRIGGER capital_mandate_authority_insert
BEFORE INSERT ON capital_mandates
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM ventures v
    JOIN narrative_profiles n ON n.id=NEW.narrative_profile_id
    JOIN rounds r ON r.id=NEW.round_id
    WHERE v.id=NEW.venture_id
      AND v.legal_entity_id=NEW.legal_entity_id
      AND n.venture_id=NEW.venture_id
      AND n.legal_entity_id=NEW.legal_entity_id
      AND n.purpose='investor'
      AND n.approval_state='approved'
      AND r.stage=NEW.stage
  ) THEN RAISE(ABORT,'capital mandate authority mismatch') END;
END;

CREATE TRIGGER capital_mandate_authority_update
BEFORE UPDATE OF round_id,legal_entity_id,venture_id,narrative_profile_id,stage
ON capital_mandates
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM ventures v
    JOIN narrative_profiles n ON n.id=NEW.narrative_profile_id
    JOIN rounds r ON r.id=NEW.round_id
    WHERE v.id=NEW.venture_id
      AND v.legal_entity_id=NEW.legal_entity_id
      AND n.venture_id=NEW.venture_id
      AND n.legal_entity_id=NEW.legal_entity_id
      AND n.purpose='investor'
      AND n.approval_state='approved'
      AND r.stage=NEW.stage
  ) THEN RAISE(ABORT,'capital mandate authority mismatch') END;
END;
`,
};

export const MIGRATIONS: readonly Migration[] = [
  ...LEGACY_MIGRATIONS,
  VENTURE_AUTHORITY_MIGRATION,
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
