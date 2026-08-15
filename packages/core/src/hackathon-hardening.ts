export const HACKATHON_HARDENING_SQL = `
ALTER TABLE hackathon_cycles ADD COLUMN rules_sha256 TEXT
  CHECK(rules_sha256 IS NULL OR (
    length(rules_sha256)=64 AND rules_sha256 NOT GLOB '*[^0-9a-f]*'
  ));

DROP TRIGGER hackathon_entry_authority_is_immutable_after_approval;
CREATE TRIGGER hackathon_entry_authority_is_immutable_after_approval
BEFORE UPDATE OF cycle_id,legal_entity_id,narrative_profile_id,canonical_demo_version_id,
  submission_concept,user_outcome,ecosystem_adapter
ON hackathon_entries
WHEN (OLD.state!='candidate' OR NEW.state!='candidate')
  AND OLD.state NOT IN ('submitted','judging','finalist','won','not_selected','converted','archived')
BEGIN
  SELECT RAISE(ABORT,'approved hackathon entry authority and concept are immutable');
END;

DROP TRIGGER hackathon_entry_submission_ready_gate;
CREATE TRIGGER hackathon_entry_submission_ready_gate
BEFORE UPDATE OF state ON hackathon_entries
WHEN NEW.state='submission_ready'
BEGIN
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM hackathon_rules r
    WHERE r.cycle_id=NEW.cycle_id AND r.blocking=1
      AND (r.review_state!='accepted' OR r.confidence IN ('unknown','stale'))
  ) THEN RAISE(ABORT,'hackathon entry is not submission ready') END;
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM hackathon_cycles c
    JOIN hackathon_eligibility_evaluations e
      ON e.entry_id=NEW.id AND e.rules_snapshot_sha256=c.rules_sha256
    WHERE c.id=NEW.cycle_id AND c.rules_sha256 IS NOT NULL
      AND e.status='eligible' AND e.founder_review_state='accepted'
  ) THEN RAISE(ABORT,'hackathon entry is not submission ready') END;
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM hackathon_builds b
    WHERE b.entry_id=NEW.id AND b.status IN ('approved','active','completed')
      AND b.ci_state='passed' AND b.security_review_state IN ('passed','not_required')
      AND b.evidence_manifest_sha256 IS NOT NULL
      AND b.current_commit_sha IS NOT NULL
      AND b.current_commit_sha!='0000000000000000000000000000000000000000'
  ) THEN RAISE(ABORT,'hackathon entry is not submission ready') END;
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM hackathon_assets a
    WHERE a.entry_id=NEW.id AND a.required=1
      AND (a.status!='approved' OR a.founder_review_state!='accepted')
  ) THEN RAISE(ABORT,'hackathon entry is not submission ready') END;
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM hackathon_assets a WHERE a.entry_id=NEW.id AND a.required=1
  ) THEN RAISE(ABORT,'hackathon entry is not submission ready') END;
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM hackathon_distribution_plans p
    WHERE p.entry_id=NEW.id AND p.status IN ('approved','active','completed')
      AND EXISTS(
        SELECT 1 FROM hackathon_distribution_items i
        WHERE i.plan_id=p.id AND i.phase='pre_event' AND i.status!='cancelled'
      )
      AND EXISTS(
        SELECT 1 FROM hackathon_distribution_items i
        WHERE i.plan_id=p.id AND i.phase='submission_day' AND i.status!='cancelled'
      )
      AND EXISTS(
        SELECT 1 FROM hackathon_distribution_items i
        WHERE i.plan_id=p.id AND i.phase='post_result' AND i.status!='cancelled'
      )
  ) THEN RAISE(ABORT,'hackathon entry is not submission ready') END;
END;

CREATE TRIGGER opportunity_source_starts_pending
BEFORE INSERT ON opportunity_sources
WHEN NEW.review_state!='pending' OR NEW.reviewed_at IS NOT NULL
BEGIN
  SELECT RAISE(ABORT,'new opportunity sources must start pending');
END;

CREATE TRIGGER reviewed_opportunity_source_content_is_immutable
BEFORE UPDATE OF opportunity_id,source_id,source_role,observed_at,confidence
ON opportunity_sources
WHEN OLD.review_state!='pending'
BEGIN
  SELECT RAISE(ABORT,'reviewed opportunity sources are immutable');
END;

CREATE TRIGGER opportunity_source_review_is_forward_only
BEFORE UPDATE OF review_state,reviewed_at ON opportunity_sources
WHEN OLD.review_state!='pending'
  AND (
    NEW.review_state!=OLD.review_state
    OR COALESCE(NEW.reviewed_at,'')!=COALESCE(OLD.reviewed_at,'')
  )
BEGIN
  SELECT RAISE(ABORT,'reviewed opportunity sources are immutable');
END;

CREATE TRIGGER reviewed_opportunity_source_cannot_be_deleted
BEFORE DELETE ON opportunity_sources
WHEN OLD.review_state!='pending'
BEGIN
  SELECT RAISE(ABORT,'reviewed opportunity sources are immutable');
END;

CREATE TRIGGER hackathon_rule_starts_pending
BEFORE INSERT ON hackathon_rules
WHEN NEW.review_state!='pending' OR NEW.reviewed_at IS NOT NULL
BEGIN
  SELECT RAISE(ABORT,'new hackathon rules must start pending');
END;

CREATE TRIGGER reviewed_hackathon_rule_content_is_immutable
BEFORE UPDATE OF cycle_id,rule_type,value_json,blocking,source_id,observed_at,confidence
ON hackathon_rules
WHEN OLD.review_state!='pending'
BEGIN
  SELECT RAISE(ABORT,'reviewed hackathon rules are immutable');
END;

CREATE TRIGGER hackathon_rule_review_is_forward_only
BEFORE UPDATE OF review_state,reviewed_at ON hackathon_rules
WHEN OLD.review_state!='pending'
  AND (
    NEW.review_state!=OLD.review_state
    OR COALESCE(NEW.reviewed_at,'')!=COALESCE(OLD.reviewed_at,'')
  )
BEGIN
  SELECT RAISE(ABORT,'reviewed hackathon rules are immutable');
END;

CREATE TRIGGER reviewed_hackathon_rule_cannot_be_deleted
BEFORE DELETE ON hackathon_rules
WHEN OLD.review_state!='pending'
BEGIN
  SELECT RAISE(ABORT,'reviewed hackathon rules are immutable');
END;

CREATE TRIGGER hackathon_rule_invalidates_digest_insert
AFTER INSERT ON hackathon_rules
BEGIN
  UPDATE hackathon_cycles
    SET rules_sha256=NULL,updated_at=NEW.updated_at
    WHERE id=NEW.cycle_id;
END;

CREATE TRIGGER hackathon_rule_invalidates_digest_update
AFTER UPDATE OF cycle_id,rule_type,value_json,blocking,source_id,observed_at,confidence,
  review_state,reviewed_at ON hackathon_rules
BEGIN
  UPDATE hackathon_cycles
    SET rules_sha256=NULL,updated_at=NEW.updated_at
    WHERE id IN (OLD.cycle_id,NEW.cycle_id);
END;

CREATE TRIGGER hackathon_rule_invalidates_digest_delete
AFTER DELETE ON hackathon_rules
BEGIN
  UPDATE hackathon_cycles
    SET rules_sha256=NULL,updated_at=OLD.updated_at
    WHERE id=OLD.cycle_id;
END;

CREATE TRIGGER eligibility_evaluation_starts_pending
BEFORE INSERT ON hackathon_eligibility_evaluations
WHEN NEW.founder_review_state!='pending' OR NEW.reviewed_at IS NOT NULL
BEGIN
  SELECT RAISE(ABORT,'new eligibility evaluations must start pending');
END;

CREATE TRIGGER reviewed_eligibility_evaluation_is_immutable
BEFORE UPDATE OF entry_id,status,evaluated_at,rules_snapshot_sha256,detail_json
ON hackathon_eligibility_evaluations
WHEN OLD.founder_review_state!='pending'
BEGIN
  SELECT RAISE(ABORT,'reviewed eligibility evaluations are immutable');
END;

CREATE TRIGGER eligibility_review_is_forward_only
BEFORE UPDATE OF founder_review_state,reviewed_at ON hackathon_eligibility_evaluations
WHEN OLD.founder_review_state!='pending'
  AND (
    NEW.founder_review_state!=OLD.founder_review_state
    OR COALESCE(NEW.reviewed_at,'')!=COALESCE(OLD.reviewed_at,'')
  )
BEGIN
  SELECT RAISE(ABORT,'reviewed eligibility evaluations are immutable');
END;

CREATE TRIGGER reviewed_eligibility_evaluation_cannot_be_deleted
BEFORE DELETE ON hackathon_eligibility_evaluations
WHEN OLD.founder_review_state!='pending'
BEGIN
  SELECT RAISE(ABORT,'reviewed eligibility evaluations are immutable');
END;

CREATE TRIGGER hackathon_build_starts_draft
BEFORE INSERT ON hackathon_builds
WHEN NEW.status!='draft' OR NEW.approved_by IS NOT NULL OR NEW.approved_at IS NOT NULL
BEGIN
  SELECT RAISE(ABORT,'new hackathon builds must start as drafts');
END;

CREATE TRIGGER hackathon_build_status_is_forward_only
BEFORE UPDATE OF status ON hackathon_builds
WHEN OLD.status!=NEW.status AND NOT (
  (OLD.status='draft' AND NEW.status IN ('approved','cancelled'))
  OR (OLD.status='approved' AND NEW.status IN ('active','cancelled'))
  OR (OLD.status='active' AND NEW.status IN ('completed','cancelled'))
)
BEGIN
  SELECT RAISE(ABORT,'invalid hackathon build status transition');
END;

CREATE TRIGGER approved_hackathon_build_plan_is_immutable
BEFORE UPDATE OF entry_id,repository,base_commit_sha,branch_name,adapter_path,owner_agent,
  tool_policy_json,budget_usd,budget_hours,start_conditions,stop_conditions
ON hackathon_builds
WHEN OLD.status IN ('approved','active','completed')
BEGIN
  SELECT RAISE(ABORT,'approved hackathon build plan is immutable');
END;

CREATE TRIGGER approved_hackathon_build_metadata_is_immutable
BEFORE UPDATE OF approved_by,approved_at ON hackathon_builds
WHEN OLD.status IN ('approved','active','completed')
BEGIN
  SELECT RAISE(ABORT,'approved hackathon build metadata is immutable');
END;

CREATE TRIGGER approved_hackathon_build_cannot_be_deleted
BEFORE DELETE ON hackathon_builds
WHEN OLD.status IN ('approved','active','completed')
BEGIN
  SELECT RAISE(ABORT,'approved hackathon builds cannot be deleted');
END;

CREATE TRIGGER hackathon_asset_starts_pending
BEFORE INSERT ON hackathon_assets
WHEN NEW.founder_review_state!='pending' OR NEW.reviewed_at IS NOT NULL OR NEW.status='approved'
BEGIN
  SELECT RAISE(ABORT,'new hackathon assets must start pending');
END;

CREATE TRIGGER reviewed_hackathon_asset_content_is_immutable
BEFORE UPDATE OF entry_id,kind,required,reference,content_sha256
ON hackathon_assets
WHEN OLD.founder_review_state!='pending'
  AND NOT EXISTS(
    SELECT 1 FROM hackathon_entries e
    WHERE e.id=OLD.entry_id AND e.state IN ('submitted','judging','finalist','won','not_selected','converted','archived')
  )
BEGIN
  SELECT RAISE(ABORT,'reviewed hackathon assets are immutable');
END;

CREATE TRIGGER hackathon_asset_review_is_forward_only
BEFORE UPDATE OF founder_review_state,reviewed_at ON hackathon_assets
WHEN OLD.founder_review_state!='pending'
  AND NOT EXISTS(
    SELECT 1 FROM hackathon_entries e
    WHERE e.id=OLD.entry_id AND e.state IN ('submitted','judging','finalist','won','not_selected','converted','archived')
  )
  AND (
    NEW.founder_review_state!=OLD.founder_review_state
    OR COALESCE(NEW.reviewed_at,'')!=COALESCE(OLD.reviewed_at,'')
  )
BEGIN
  SELECT RAISE(ABORT,'reviewed hackathon assets are immutable');
END;

CREATE TRIGGER reviewed_hackathon_asset_status_is_immutable
BEFORE UPDATE OF status ON hackathon_assets
WHEN OLD.founder_review_state!='pending' AND NEW.status!=OLD.status
  AND NOT EXISTS(
    SELECT 1 FROM hackathon_entries e
    WHERE e.id=OLD.entry_id AND e.state IN ('submitted','judging','finalist','won','not_selected','converted','archived')
  )
BEGIN
  SELECT RAISE(ABORT,'reviewed hackathon assets are immutable');
END;

CREATE TRIGGER reviewed_hackathon_asset_cannot_be_deleted
BEFORE DELETE ON hackathon_assets
WHEN OLD.founder_review_state!='pending'
  AND NOT EXISTS(
    SELECT 1 FROM hackathon_entries e
    WHERE e.id=OLD.entry_id AND e.state IN ('submitted','judging','finalist','won','not_selected','converted','archived')
  )
BEGIN
  SELECT RAISE(ABORT,'reviewed hackathon assets are immutable');
END;

CREATE TRIGGER hackathon_distribution_plan_starts_draft
BEFORE INSERT ON hackathon_distribution_plans
WHEN NEW.status!='draft' OR NEW.approved_by IS NOT NULL OR NEW.approved_at IS NOT NULL
BEGIN
  SELECT RAISE(ABORT,'new hackathon distribution plans must start as drafts');
END;

CREATE TRIGGER hackathon_distribution_plan_status_is_forward_only
BEFORE UPDATE OF status ON hackathon_distribution_plans
WHEN OLD.status!=NEW.status AND NOT (
  (OLD.status='draft' AND NEW.status IN ('approved','cancelled'))
  OR (OLD.status='approved' AND NEW.status IN ('active','completed','cancelled'))
  OR (OLD.status='active' AND NEW.status IN ('completed','cancelled'))
)
BEGIN
  SELECT RAISE(ABORT,'invalid hackathon distribution plan status transition');
END;

CREATE TRIGGER approved_distribution_plan_blocks_new_items
BEFORE INSERT ON hackathon_distribution_items
WHEN EXISTS(
  SELECT 1 FROM hackathon_distribution_plans p
  WHERE p.id=NEW.plan_id AND p.status IN ('approved','active','completed')
)
BEGIN
  SELECT RAISE(ABORT,'approved hackathon distribution plan cannot accept new items');
END;

CREATE TRIGGER approved_hackathon_entry_decision_is_immutable
BEFORE UPDATE OF founder_decision,founder_rationale ON hackathon_entries
WHEN OLD.state!='candidate' AND OLD.state NOT IN ('submitted','judging','finalist','won','not_selected','converted','archived')
BEGIN
  SELECT RAISE(ABORT,'approved hackathon entry decision is immutable');
END;

CREATE TRIGGER approved_hackathon_entry_score_is_immutable
BEFORE UPDATE OF estimated_hours,reuse_percentage,strategic_fit,acceptance_probability,
  capital_upside,distribution_upside,technical_leverage,credibility,urgency,
  effort_efficiency,lock_in_safety,weighted_score
ON hackathon_entries
WHEN (OLD.state!='candidate' OR NEW.state!='candidate')
  AND OLD.state NOT IN ('submitted','judging','finalist','won','not_selected','converted','archived')
BEGIN
  SELECT RAISE(ABORT,'approved hackathon entry score is immutable');
END;

CREATE TRIGGER approved_hackathon_entry_venture_insert_guard
BEFORE INSERT ON hackathon_entry_ventures
WHEN EXISTS(
  SELECT 1 FROM hackathon_entries e WHERE e.id=NEW.entry_id AND e.state!='candidate'
)
BEGIN
  SELECT RAISE(ABORT,'approved hackathon entry ventures are immutable');
END;

CREATE TRIGGER approved_hackathon_entry_venture_update_guard
BEFORE UPDATE OF entry_id,venture_id,role ON hackathon_entry_ventures
WHEN EXISTS(
  SELECT 1 FROM hackathon_entries e WHERE e.id=OLD.entry_id AND e.state!='candidate'
)
BEGIN
  SELECT RAISE(ABORT,'approved hackathon entry ventures are immutable');
END;

CREATE TRIGGER approved_hackathon_entry_venture_delete_guard
BEFORE DELETE ON hackathon_entry_ventures
WHEN EXISTS(
  SELECT 1 FROM hackathon_entries e WHERE e.id=OLD.entry_id AND e.state!='candidate'
)
BEGIN
  SELECT RAISE(ABORT,'approved hackathon entry ventures are immutable');
END;

CREATE TRIGGER approved_hackathon_entry_track_insert_guard
BEFORE INSERT ON hackathon_entry_tracks
WHEN EXISTS(
  SELECT 1 FROM hackathon_entries e WHERE e.id=NEW.entry_id AND e.state!='candidate'
)
BEGIN
  SELECT RAISE(ABORT,'approved hackathon entry tracks are immutable');
END;

CREATE TRIGGER approved_hackathon_entry_track_update_guard
BEFORE UPDATE OF entry_id,track_id ON hackathon_entry_tracks
WHEN EXISTS(
  SELECT 1 FROM hackathon_entries e WHERE e.id=OLD.entry_id AND e.state!='candidate'
)
BEGIN
  SELECT RAISE(ABORT,'approved hackathon entry tracks are immutable');
END;

CREATE TRIGGER approved_hackathon_entry_track_delete_guard
BEFORE DELETE ON hackathon_entry_tracks
WHEN EXISTS(
  SELECT 1 FROM hackathon_entries e WHERE e.id=OLD.entry_id AND e.state!='candidate'
)
BEGIN
  SELECT RAISE(ABORT,'approved hackathon entry tracks are immutable');
END;

CREATE TRIGGER approved_hackathon_entry_bounty_insert_guard
BEFORE INSERT ON hackathon_entry_bounties
WHEN EXISTS(
  SELECT 1 FROM hackathon_entries e WHERE e.id=NEW.entry_id AND e.state!='candidate'
)
BEGIN
  SELECT RAISE(ABORT,'approved hackathon entry bounties are immutable');
END;

CREATE TRIGGER approved_hackathon_entry_bounty_update_guard
BEFORE UPDATE OF entry_id,bounty_id ON hackathon_entry_bounties
WHEN EXISTS(
  SELECT 1 FROM hackathon_entries e WHERE e.id=OLD.entry_id AND e.state!='candidate'
)
BEGIN
  SELECT RAISE(ABORT,'approved hackathon entry bounties are immutable');
END;

CREATE TRIGGER approved_hackathon_entry_bounty_delete_guard
BEFORE DELETE ON hackathon_entry_bounties
WHEN EXISTS(
  SELECT 1 FROM hackathon_entries e WHERE e.id=OLD.entry_id AND e.state!='candidate'
)
BEGIN
  SELECT RAISE(ABORT,'approved hackathon entry bounties are immutable');
END;

CREATE TRIGGER hackathon_submission_starts_submitted
BEFORE INSERT ON hackathon_submissions
WHEN NEW.status!='submitted'
BEGIN
  SELECT RAISE(ABORT,'new hackathon submissions must start submitted');
END;

CREATE TRIGGER submitted_hackathon_submission_content_is_immutable
BEFORE UPDATE OF entry_id,portal_url,submitted_at,narrative_profile_id,
  canonical_demo_version_id,repository_commit_sha,receipt_asset_id,content_sha256
ON hackathon_submissions
BEGIN
  SELECT RAISE(ABORT,'submitted hackathon submissions are immutable');
END;

CREATE TRIGGER hackathon_submission_status_is_forward_only
BEFORE UPDATE OF status ON hackathon_submissions
WHEN OLD.status!=NEW.status AND NOT (
  OLD.status='submitted' AND NEW.status IN ('accepted','rejected','withdrawn')
)
BEGIN
  SELECT RAISE(ABORT,'invalid hackathon submission status transition');
END;

CREATE TRIGGER submitted_hackathon_submission_cannot_be_deleted
BEFORE DELETE ON hackathon_submissions
BEGIN
  SELECT RAISE(ABORT,'submitted hackathon submissions are immutable');
END;
`;
