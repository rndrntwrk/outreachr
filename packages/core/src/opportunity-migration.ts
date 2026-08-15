export const OPPORTUNITY_SCHEMA_SQL = `
CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('company','foundation','protocol','community','university','government','investor','other')),
  website TEXT,
  description TEXT,
  linked_firm_id TEXT REFERENCES firms(id) ON DELETE SET NULL,
  is_public INTEGER NOT NULL DEFAULT 1 CHECK(is_public IN (0,1)),
  contribution_eligible INTEGER NOT NULL DEFAULT 0 CHECK(contribution_eligible IN (0,1)),
  origin TEXT NOT NULL CHECK(origin IN ('local','atlas','import','contribution')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(normalized_name,website),
  CHECK(contribution_eligible=0 OR is_public=1)
);

CREATE TABLE opportunities (
  id TEXT PRIMARY KEY,
  organizer_organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  opportunity_type TEXT NOT NULL CHECK(opportunity_type IN ('investor','accelerator','grant','hackathon','startup_program','cloud_credits','strategic_partner','sponsor','design_partner')),
  status TEXT NOT NULL CHECK(status IN ('open','upcoming','rolling','closed_recurring','watchlist','cancelled')),
  public_url TEXT,
  application_url TEXT,
  open_date TEXT,
  deadline TEXT,
  start_date TEXT,
  end_date TEXT,
  format TEXT CHECK(format IS NULL OR format IN ('online','in_person','hybrid','unknown')),
  location TEXT,
  eligibility_summary TEXT,
  terms_summary TEXT,
  capital_prize_summary TEXT,
  freshness_state TEXT NOT NULL CHECK(freshness_state IN ('current','aging','stale','unknown')),
  review_state TEXT NOT NULL CHECK(review_state IN ('unreviewed','reviewed','conflicted','rejected')),
  imported_package_id TEXT,
  imported_package_digest TEXT CHECK(imported_package_digest IS NULL OR (length(imported_package_digest)=64 AND imported_package_digest NOT GLOB '*[^0-9a-f]*')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE opportunity_sources (
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  source_role TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  confidence TEXT NOT NULL CHECK(confidence IN ('verified','supported','inferred','unknown','stale')),
  review_state TEXT NOT NULL CHECK(review_state IN ('pending','accepted','rejected')),
  reviewed_at TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY(opportunity_id,source_id,source_role),
  CHECK(
    (review_state='pending' AND reviewed_at IS NULL)
    OR (review_state!='pending' AND reviewed_at IS NOT NULL)
  )
);
`;
