export const HACKATHON_SCHEMA_SQL = `
CREATE TABLE hackathon_cycles (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  cycle_name TEXT NOT NULL,
  registration_open_at TEXT,
  registration_close_at TEXT,
  build_start_at TEXT,
  build_end_at TEXT,
  submission_deadline_at TEXT,
  judging_start_at TEXT,
  judging_end_at TEXT,
  demo_day_at TEXT,
  result_at TEXT,
  format TEXT NOT NULL CHECK(format IN ('online','in_person','hybrid','unknown')),
  location TEXT,
  state TEXT NOT NULL CHECK(state IN ('announced','registration','building','submission','judging','completed','cancelled','watchlist')),
  rules_source_id TEXT REFERENCES sources(id) ON DELETE SET NULL,
  rules_retrieved_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(opportunity_id,cycle_name)
);

CREATE TABLE hackathon_tracks (
  id TEXT PRIMARY KEY,
  cycle_id TEXT NOT NULL REFERENCES hackathon_cycles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  goals TEXT,
  judging_criteria_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(judging_criteria_json) AND json_type(judging_criteria_json)='array'),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(cycle_id,name)
);

CREATE TABLE hackathon_sponsors (
  cycle_id TEXT NOT NULL REFERENCES hackathon_cycles(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  contact_person_id TEXT REFERENCES people(id) ON DELETE SET NULL,
  relationship_state TEXT NOT NULL CHECK(relationship_state IN ('unresearched','identified','contacted','meeting','partner','closed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(cycle_id,organization_id)
);

CREATE TABLE hackathon_bounties (
  id TEXT PRIMARY KEY,
  cycle_id TEXT NOT NULL REFERENCES hackathon_cycles(id) ON DELETE CASCADE,
  sponsor_organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  track_id TEXT REFERENCES hackathon_tracks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  amount_value REAL CHECK(amount_value IS NULL OR amount_value >= 0),
  amount_asset TEXT,
  required_technology TEXT,
  eligibility TEXT,
  judging_criteria TEXT,
  submission_requirements TEXT,
  source_id TEXT REFERENCES sources(id) ON DELETE SET NULL,
  freshness_state TEXT NOT NULL CHECK(freshness_state IN ('current','aging','stale','unknown')),
  conflict_lock_in_notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE hackathon_rules (
  id TEXT PRIMARY KEY,
  cycle_id TEXT NOT NULL REFERENCES hackathon_cycles(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK(rule_type IN ('geography','age','student_status','company_age','existing_code','team_size','intellectual_property','open_source','required_technology','attendance','prior_funding','prohibited_participant','submission_language','required_artifact','other')),
  value_json TEXT NOT NULL CHECK(json_valid(value_json)),
  blocking INTEGER NOT NULL DEFAULT 1 CHECK(blocking IN (0,1)),
  source_id TEXT REFERENCES sources(id) ON DELETE SET NULL,
  observed_at TEXT,
  confidence TEXT NOT NULL CHECK(confidence IN ('verified','supported','inferred','unknown','stale')),
  review_state TEXT NOT NULL CHECK(review_state IN ('pending','accepted','rejected')),
  reviewed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK(
    (review_state='pending' AND reviewed_at IS NULL)
    OR (review_state!='pending' AND reviewed_at IS NOT NULL)
  )
);

CREATE TABLE hackathon_entries (
  id TEXT PRIMARY KEY,
  cycle_id TEXT NOT NULL REFERENCES hackathon_cycles(id) ON DELETE CASCADE,
  legal_entity_id TEXT NOT NULL REFERENCES legal_entities(id) ON DELETE RESTRICT,
  narrative_profile_id TEXT NOT NULL REFERENCES narrative_profiles(id) ON DELETE RESTRICT,
  canonical_demo_version_id TEXT NOT NULL REFERENCES canonical_demo_versions(id) ON DELETE RESTRICT,
  submission_concept TEXT NOT NULL,
  user_outcome TEXT NOT NULL,
  ecosystem_adapter TEXT NOT NULL,
  estimated_hours INTEGER NOT NULL CHECK(estimated_hours BETWEEN 1 AND 1000),
  reuse_percentage INTEGER NOT NULL CHECK(reuse_percentage BETWEEN 0 AND 100),
  strategic_fit INTEGER NOT NULL CHECK(strategic_fit BETWEEN 1 AND 10),
  acceptance_probability INTEGER NOT NULL CHECK(acceptance_probability BETWEEN 1 AND 10),
  capital_upside INTEGER NOT NULL CHECK(capital_upside BETWEEN 1 AND 10),
  distribution_upside INTEGER NOT NULL CHECK(distribution_upside BETWEEN 1 AND 10),
  technical_leverage INTEGER NOT NULL CHECK(technical_leverage BETWEEN 1 AND 10),
  credibility INTEGER NOT NULL CHECK(credibility BETWEEN 1 AND 10),
  urgency INTEGER NOT NULL CHECK(urgency BETWEEN 1 AND 10),
  effort_efficiency INTEGER NOT NULL CHECK(effort_efficiency BETWEEN 1 AND 10),
  lock_in_safety INTEGER NOT NULL CHECK(lock_in_safety BETWEEN 1 AND 10),
  weighted_score REAL NOT NULL CHECK(weighted_score BETWEEN 0 AND 100),
  founder_decision TEXT NOT NULL CHECK(founder_decision IN ('pending','go','conditional_go','no_go')),
  founder_rationale TEXT,
  state TEXT NOT NULL CHECK(state IN ('candidate','approved','scoped','building','verification','submission_ready','submitted','judging','finalist','won','not_selected','withdrawn','converted','archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK(founder_decision!='conditional_go' OR length(trim(COALESCE(founder_rationale,'')))>0)
);

CREATE TABLE hackathon_entry_ventures (
  entry_id TEXT NOT NULL REFERENCES hackathon_entries(id) ON DELETE CASCADE,
  venture_id TEXT NOT NULL REFERENCES ventures(id) ON DELETE RESTRICT,
  role TEXT NOT NULL CHECK(role IN ('lead','supporting')),
  created_at TEXT NOT NULL,
  PRIMARY KEY(entry_id,venture_id)
);

CREATE TABLE hackathon_entry_tracks (
  entry_id TEXT NOT NULL REFERENCES hackathon_entries(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL REFERENCES hackathon_tracks(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY(entry_id,track_id)
);

CREATE TABLE hackathon_entry_bounties (
  entry_id TEXT NOT NULL REFERENCES hackathon_entries(id) ON DELETE CASCADE,
  bounty_id TEXT NOT NULL REFERENCES hackathon_bounties(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY(entry_id,bounty_id)
);

CREATE TABLE hackathon_eligibility_evaluations (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES hackathon_entries(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('eligible','ineligible','uncertain')),
  evaluated_at TEXT NOT NULL,
  rules_snapshot_sha256 TEXT NOT NULL CHECK(length(rules_snapshot_sha256)=64 AND rules_snapshot_sha256 NOT GLOB '*[^0-9a-f]*'),
  detail_json TEXT NOT NULL CHECK(json_valid(detail_json) AND json_type(detail_json)='array'),
  founder_review_state TEXT NOT NULL CHECK(founder_review_state IN ('pending','accepted','rejected')),
  reviewed_at TEXT,
  UNIQUE(entry_id,rules_snapshot_sha256),
  CHECK(
    (founder_review_state='pending' AND reviewed_at IS NULL)
    OR (founder_review_state!='pending' AND reviewed_at IS NOT NULL)
  )
);

CREATE TABLE hackathon_builds (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL UNIQUE REFERENCES hackathon_entries(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('draft','approved','active','completed','cancelled')),
  repository TEXT NOT NULL,
  base_commit_sha TEXT NOT NULL CHECK(length(base_commit_sha)=40 AND base_commit_sha NOT GLOB '*[^0-9a-f]*'),
  branch_name TEXT NOT NULL,
  worktree_reference TEXT,
  adapter_path TEXT,
  owner_agent TEXT,
  tool_policy_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(tool_policy_json) AND json_type(tool_policy_json)='object'),
  budget_usd REAL CHECK(budget_usd IS NULL OR budget_usd >= 0),
  budget_hours INTEGER CHECK(budget_hours IS NULL OR budget_hours BETWEEN 1 AND 1000),
  start_conditions TEXT NOT NULL,
  stop_conditions TEXT NOT NULL,
  current_commit_sha TEXT CHECK(current_commit_sha IS NULL OR (length(current_commit_sha)=40 AND current_commit_sha NOT GLOB '*[^0-9a-f]*')),
  ci_state TEXT NOT NULL CHECK(ci_state IN ('not_run','running','passed','failed','blocked')),
  security_review_state TEXT NOT NULL CHECK(security_review_state IN ('pending','passed','failed','not_required')),
  evidence_manifest_sha256 TEXT CHECK(evidence_manifest_sha256 IS NULL OR (length(evidence_manifest_sha256)=64 AND evidence_manifest_sha256 NOT GLOB '*[^0-9a-f]*')),
  merge_decision TEXT NOT NULL CHECK(merge_decision IN ('pending','merge','do_not_merge','superseded')),
  approved_by TEXT,
  approved_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK(
    (status='draft' AND approved_by IS NULL AND approved_at IS NULL)
    OR (status IN ('approved','active','completed') AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
    OR (status='cancelled' AND ((approved_by IS NULL AND approved_at IS NULL)
      OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)))
  ),
  CHECK(status IN ('draft','cancelled') OR base_commit_sha!='0000000000000000000000000000000000000000'),
  CHECK(status IN ('draft','approved','cancelled') OR (current_commit_sha IS NOT NULL AND current_commit_sha!='0000000000000000000000000000000000000000'))
);

CREATE TABLE hackathon_assets (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES hackathon_entries(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('readme','repository','architecture','screenshot','demo_video','pitch_deck','submission_text','license','open_source_notice','receipt','other')),
  required INTEGER NOT NULL DEFAULT 0 CHECK(required IN (0,1)),
  status TEXT NOT NULL CHECK(status IN ('missing','draft','ready','approved','rejected')),
  reference TEXT,
  content_sha256 TEXT CHECK(content_sha256 IS NULL OR (length(content_sha256)=64 AND content_sha256 NOT GLOB '*[^0-9a-f]*')),
  founder_review_state TEXT NOT NULL CHECK(founder_review_state IN ('pending','accepted','rejected')),
  reviewed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK(
    (founder_review_state='pending' AND reviewed_at IS NULL)
    OR (founder_review_state!='pending' AND reviewed_at IS NOT NULL)
  ),
  CHECK(status!='approved' OR (founder_review_state='accepted' AND reference IS NOT NULL))
);

CREATE TABLE hackathon_distribution_plans (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL UNIQUE REFERENCES hackathon_entries(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('draft','approved','active','completed','cancelled')),
  content_sha256 TEXT NOT NULL CHECK(length(content_sha256)=64 AND content_sha256 NOT GLOB '*[^0-9a-f]*'),
  approved_by TEXT,
  approved_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK(
    (status='draft' AND approved_by IS NULL AND approved_at IS NULL)
    OR (status IN ('approved','active','completed') AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
    OR (status='cancelled' AND ((approved_by IS NULL AND approved_at IS NULL)
      OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)))
  )
);

CREATE TABLE hackathon_distribution_items (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES hackathon_distribution_plans(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('pre_build_announcement','build_in_public_update','555stream_session','arcade_activation','technical_article','launch_post','thread','clip','sponsor_acknowledgement','judge_follow_up','investor_update','partner_follow_up','post_result_announcement','open_source_release','other')),
  phase TEXT NOT NULL CHECK(phase IN ('pre_event','submission_day','post_result')),
  status TEXT NOT NULL CHECK(status IN ('planned','ready','published','cancelled')),
  title TEXT NOT NULL,
  scheduled_at TEXT,
  completed_at TEXT,
  reference TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE hackathon_submissions (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL UNIQUE REFERENCES hackathon_entries(id) ON DELETE RESTRICT,
  portal_url TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  narrative_profile_id TEXT NOT NULL REFERENCES narrative_profiles(id) ON DELETE RESTRICT,
  canonical_demo_version_id TEXT NOT NULL REFERENCES canonical_demo_versions(id) ON DELETE RESTRICT,
  repository_commit_sha TEXT NOT NULL CHECK(length(repository_commit_sha)=40 AND repository_commit_sha NOT GLOB '*[^0-9a-f]*' AND repository_commit_sha!='0000000000000000000000000000000000000000'),
  receipt_asset_id TEXT NOT NULL REFERENCES hackathon_assets(id) ON DELETE RESTRICT,
  content_sha256 TEXT NOT NULL CHECK(length(content_sha256)=64 AND content_sha256 NOT GLOB '*[^0-9a-f]*'),
  status TEXT NOT NULL CHECK(status IN ('submitted','accepted','rejected','withdrawn')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE hackathon_results (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL UNIQUE REFERENCES hackathon_entries(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL CHECK(outcome IN ('finalist','won','not_selected','withdrawn','cancelled','other')),
  placement TEXT,
  prize_value REAL CHECK(prize_value IS NULL OR prize_value >= 0),
  prize_asset TEXT,
  credits_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(credits_json) AND json_type(credits_json)='array'),
  invitations_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(invitations_json) AND json_type(invitations_json)='array'),
  recorded_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE hackathon_conversions (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES hackathon_entries(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('grant','accelerator','pilot','investor_meeting','sponsor_relationship','partner_integration','user_growth','media_coverage','reusable_demo','other')),
  organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  detail TEXT,
  value_usd REAL CHECK(value_usd IS NULL OR value_usd >= 0),
  status TEXT NOT NULL CHECK(status IN ('identified','active','won','lost','completed')),
  reference_url TEXT,
  occurred_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX organizations_normalized_name_idx ON organizations(normalized_name);
CREATE INDEX opportunities_type_status_deadline_idx ON opportunities(opportunity_type,status,deadline);
CREATE INDEX opportunities_organizer_idx ON opportunities(organizer_organization_id);
CREATE INDEX opportunities_freshness_review_idx ON opportunities(freshness_state,review_state);
CREATE INDEX opportunity_sources_review_idx ON opportunity_sources(review_state,confidence,observed_at);
CREATE INDEX hackathon_cycles_opportunity_state_idx ON hackathon_cycles(opportunity_id,state,submission_deadline_at);
CREATE INDEX hackathon_tracks_cycle_idx ON hackathon_tracks(cycle_id);
CREATE INDEX hackathon_bounties_cycle_idx ON hackathon_bounties(cycle_id,freshness_state);
CREATE INDEX hackathon_rules_cycle_review_idx ON hackathon_rules(cycle_id,blocking,review_state,confidence);
CREATE INDEX hackathon_entries_cycle_state_idx ON hackathon_entries(cycle_id,state,weighted_score DESC);
CREATE INDEX hackathon_entries_decision_idx ON hackathon_entries(founder_decision,state);
CREATE UNIQUE INDEX hackathon_entry_one_lead_venture_idx
  ON hackathon_entry_ventures(entry_id) WHERE role='lead';
CREATE INDEX hackathon_builds_readiness_idx ON hackathon_builds(status,ci_state,security_review_state);
CREATE INDEX hackathon_assets_entry_required_idx ON hackathon_assets(entry_id,required,status,founder_review_state);
CREATE INDEX hackathon_distribution_items_plan_phase_idx ON hackathon_distribution_items(plan_id,phase,status);
CREATE INDEX hackathon_conversions_entry_kind_idx ON hackathon_conversions(entry_id,kind,status);
`;
