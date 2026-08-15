export const HACKATHON_INVARIANT_SQL = `
CREATE TRIGGER opportunity_dates_insert
BEFORE INSERT ON opportunities
BEGIN
  SELECT CASE WHEN NEW.open_date IS NOT NULL AND NEW.deadline IS NOT NULL
    AND julianday(NEW.open_date)>julianday(NEW.deadline)
    THEN RAISE(ABORT,'opportunity open date must not follow its deadline') END;
  SELECT CASE WHEN NEW.deadline IS NOT NULL AND NEW.end_date IS NOT NULL
    AND julianday(NEW.deadline)>julianday(NEW.end_date)
    THEN RAISE(ABORT,'opportunity deadline must not follow its end date') END;
  SELECT CASE WHEN NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL
    AND julianday(NEW.start_date)>julianday(NEW.end_date)
    THEN RAISE(ABORT,'opportunity start date must not follow its end date') END;
END;

CREATE TRIGGER opportunity_dates_update
BEFORE UPDATE OF open_date,deadline,start_date,end_date ON opportunities
BEGIN
  SELECT CASE WHEN NEW.open_date IS NOT NULL AND NEW.deadline IS NOT NULL
    AND julianday(NEW.open_date)>julianday(NEW.deadline)
    THEN RAISE(ABORT,'opportunity open date must not follow its deadline') END;
  SELECT CASE WHEN NEW.deadline IS NOT NULL AND NEW.end_date IS NOT NULL
    AND julianday(NEW.deadline)>julianday(NEW.end_date)
    THEN RAISE(ABORT,'opportunity deadline must not follow its end date') END;
  SELECT CASE WHEN NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL
    AND julianday(NEW.start_date)>julianday(NEW.end_date)
    THEN RAISE(ABORT,'opportunity start date must not follow its end date') END;
END;

CREATE TRIGGER opportunity_hackathon_type_is_stable
BEFORE UPDATE OF opportunity_type ON opportunities
WHEN OLD.opportunity_type='hackathon' AND NEW.opportunity_type!='hackathon'
  AND EXISTS(SELECT 1 FROM hackathon_cycles WHERE opportunity_id=OLD.id)
BEGIN
  SELECT RAISE(ABORT,'an opportunity with hackathon cycles must remain a hackathon');
END;

CREATE TRIGGER hackathon_cycle_requires_hackathon_opportunity_insert
BEFORE INSERT ON hackathon_cycles
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM opportunities o
    WHERE o.id=NEW.opportunity_id AND o.opportunity_type='hackathon'
  ) THEN RAISE(ABORT,'hackathon cycle requires a hackathon opportunity') END;
END;

CREATE TRIGGER hackathon_cycle_requires_hackathon_opportunity_update
BEFORE UPDATE OF opportunity_id ON hackathon_cycles
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM opportunities o
    WHERE o.id=NEW.opportunity_id AND o.opportunity_type='hackathon'
  ) THEN RAISE(ABORT,'hackathon cycle requires a hackathon opportunity') END;
END;

CREATE TRIGGER hackathon_cycle_dates_insert
BEFORE INSERT ON hackathon_cycles
BEGIN
  SELECT CASE WHEN NEW.registration_open_at IS NOT NULL AND NEW.registration_close_at IS NOT NULL
    AND julianday(NEW.registration_open_at)>julianday(NEW.registration_close_at)
    THEN RAISE(ABORT,'hackathon registration opening must not follow registration close') END;
  SELECT CASE WHEN NEW.build_start_at IS NOT NULL AND NEW.build_end_at IS NOT NULL
    AND julianday(NEW.build_start_at)>julianday(NEW.build_end_at)
    THEN RAISE(ABORT,'hackathon build start must not follow build end') END;
  SELECT CASE WHEN NEW.build_end_at IS NOT NULL AND NEW.submission_deadline_at IS NOT NULL
    AND julianday(NEW.build_end_at)>julianday(NEW.submission_deadline_at)
    THEN RAISE(ABORT,'hackathon build end must not follow submission deadline') END;
  SELECT CASE WHEN NEW.judging_start_at IS NOT NULL AND NEW.judging_end_at IS NOT NULL
    AND julianday(NEW.judging_start_at)>julianday(NEW.judging_end_at)
    THEN RAISE(ABORT,'hackathon judging start must not follow judging end') END;
END;

CREATE TRIGGER hackathon_cycle_dates_update
BEFORE UPDATE OF registration_open_at,registration_close_at,build_start_at,build_end_at,
  submission_deadline_at,judging_start_at,judging_end_at ON hackathon_cycles
BEGIN
  SELECT CASE WHEN NEW.registration_open_at IS NOT NULL AND NEW.registration_close_at IS NOT NULL
    AND julianday(NEW.registration_open_at)>julianday(NEW.registration_close_at)
    THEN RAISE(ABORT,'hackathon registration opening must not follow registration close') END;
  SELECT CASE WHEN NEW.build_start_at IS NOT NULL AND NEW.build_end_at IS NOT NULL
    AND julianday(NEW.build_start_at)>julianday(NEW.build_end_at)
    THEN RAISE(ABORT,'hackathon build start must not follow build end') END;
  SELECT CASE WHEN NEW.build_end_at IS NOT NULL AND NEW.submission_deadline_at IS NOT NULL
    AND julianday(NEW.build_end_at)>julianday(NEW.submission_deadline_at)
    THEN RAISE(ABORT,'hackathon build end must not follow submission deadline') END;
  SELECT CASE WHEN NEW.judging_start_at IS NOT NULL AND NEW.judging_end_at IS NOT NULL
    AND julianday(NEW.judging_start_at)>julianday(NEW.judging_end_at)
    THEN RAISE(ABORT,'hackathon judging start must not follow judging end') END;
END;

CREATE TRIGGER hackathon_bounty_track_cycle_insert
BEFORE INSERT ON hackathon_bounties
WHEN NEW.track_id IS NOT NULL
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM hackathon_tracks t WHERE t.id=NEW.track_id AND t.cycle_id=NEW.cycle_id
  ) THEN RAISE(ABORT,'hackathon bounty track must belong to its cycle') END;
END;

CREATE TRIGGER hackathon_bounty_track_cycle_update
BEFORE UPDATE OF cycle_id,track_id ON hackathon_bounties
WHEN NEW.track_id IS NOT NULL
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM hackathon_tracks t WHERE t.id=NEW.track_id AND t.cycle_id=NEW.cycle_id
  ) THEN RAISE(ABORT,'hackathon bounty track must belong to its cycle') END;
END;

CREATE TRIGGER hackathon_entry_requires_approved_authority_insert
BEFORE INSERT ON hackathon_entries
BEGIN
  SELECT CASE WHEN NEW.state!='candidate' OR NEW.founder_decision!='pending'
    THEN RAISE(ABORT,'new hackathon entries must start as pending candidates') END;
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM hackathon_cycles c
    JOIN opportunities o ON o.id=c.opportunity_id
    JOIN narrative_profiles n ON n.id=NEW.narrative_profile_id
    JOIN canonical_demo_versions d ON d.id=NEW.canonical_demo_version_id
    WHERE c.id=NEW.cycle_id
      AND o.opportunity_type='hackathon'
      AND n.legal_entity_id=NEW.legal_entity_id
      AND n.purpose='hackathon'
      AND n.approval_state='approved'
      AND d.approval_state='approved'
  ) THEN RAISE(ABORT,'hackathon entry authority mismatch') END;
END;

CREATE TRIGGER hackathon_entry_requires_approved_authority_update
BEFORE UPDATE OF cycle_id,legal_entity_id,narrative_profile_id,canonical_demo_version_id
ON hackathon_entries
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM hackathon_cycles c
    JOIN opportunities o ON o.id=c.opportunity_id
    JOIN narrative_profiles n ON n.id=NEW.narrative_profile_id
    JOIN canonical_demo_versions d ON d.id=NEW.canonical_demo_version_id
    WHERE c.id=NEW.cycle_id
      AND o.opportunity_type='hackathon'
      AND n.legal_entity_id=NEW.legal_entity_id
      AND n.purpose='hackathon'
      AND n.approval_state='approved'
      AND d.approval_state='approved'
  ) THEN RAISE(ABORT,'hackathon entry authority mismatch') END;
END;

CREATE TRIGGER hackathon_entry_authority_is_immutable_after_approval
BEFORE UPDATE OF cycle_id,legal_entity_id,narrative_profile_id,canonical_demo_version_id,
  submission_concept,user_outcome,ecosystem_adapter
ON hackathon_entries
WHEN OLD.state!='candidate'
BEGIN
  SELECT RAISE(ABORT,'approved hackathon entry authority and concept are immutable');
END;

CREATE TRIGGER hackathon_entry_lead_venture_insert
BEFORE INSERT ON hackathon_entry_ventures
WHEN NEW.role='lead'
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM hackathon_entries e JOIN ventures v ON v.id=NEW.venture_id
    WHERE e.id=NEW.entry_id AND v.legal_entity_id=e.legal_entity_id
  ) THEN RAISE(ABORT,'hackathon lead venture must belong to the entry legal entity') END;
END;

CREATE TRIGGER hackathon_entry_lead_venture_update
BEFORE UPDATE OF entry_id,venture_id,role ON hackathon_entry_ventures
WHEN NEW.role='lead'
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM hackathon_entries e JOIN ventures v ON v.id=NEW.venture_id
    WHERE e.id=NEW.entry_id AND v.legal_entity_id=e.legal_entity_id
  ) THEN RAISE(ABORT,'hackathon lead venture must belong to the entry legal entity') END;
END;

CREATE TRIGGER hackathon_entry_lead_is_immutable_after_approval_delete
BEFORE DELETE ON hackathon_entry_ventures
WHEN OLD.role='lead' AND EXISTS(
  SELECT 1 FROM hackathon_entries e WHERE e.id=OLD.entry_id AND e.state!='candidate'
)
BEGIN
  SELECT RAISE(ABORT,'approved hackathon entry lead venture is immutable');
END;

CREATE TRIGGER hackathon_entry_lead_is_immutable_after_approval_update
BEFORE UPDATE OF venture_id,role ON hackathon_entry_ventures
WHEN OLD.role='lead' AND EXISTS(
  SELECT 1 FROM hackathon_entries e WHERE e.id=OLD.entry_id AND e.state!='candidate'
)
BEGIN
  SELECT RAISE(ABORT,'approved hackathon entry lead venture is immutable');
END;

CREATE TRIGGER hackathon_entry_track_cycle_insert
BEFORE INSERT ON hackathon_entry_tracks
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM hackathon_entries e JOIN hackathon_tracks t ON t.id=NEW.track_id
    WHERE e.id=NEW.entry_id AND e.cycle_id=t.cycle_id
  ) THEN RAISE(ABORT,'hackathon entry track must belong to its cycle') END;
END;

CREATE TRIGGER hackathon_entry_bounty_cycle_insert
BEFORE INSERT ON hackathon_entry_bounties
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM hackathon_entries e JOIN hackathon_bounties b ON b.id=NEW.bounty_id
    WHERE e.id=NEW.entry_id AND e.cycle_id=b.cycle_id
  ) THEN RAISE(ABORT,'hackathon entry bounty must belong to its cycle') END;
END;

CREATE TRIGGER hackathon_entry_transition_is_allowed
BEFORE UPDATE OF state ON hackathon_entries
WHEN OLD.state!=NEW.state AND NOT (
  (OLD.state='candidate' AND NEW.state IN ('approved','withdrawn','archived'))
  OR (OLD.state='approved' AND NEW.state IN ('scoped','withdrawn','archived'))
  OR (OLD.state='scoped' AND NEW.state IN ('building','withdrawn','archived'))
  OR (OLD.state='building' AND NEW.state IN ('verification','withdrawn'))
  OR (OLD.state='verification' AND NEW.state IN ('building','submission_ready','withdrawn'))
  OR (OLD.state='submission_ready' AND NEW.state IN ('verification','submitted','withdrawn'))
  OR (OLD.state='submitted' AND NEW.state IN ('judging','withdrawn'))
  OR (OLD.state='judging' AND NEW.state IN ('finalist','won','not_selected'))
  OR (OLD.state='finalist' AND NEW.state IN ('won','not_selected','converted'))
  OR (OLD.state='won' AND NEW.state IN ('converted','archived'))
  OR (OLD.state='not_selected' AND NEW.state IN ('converted','archived'))
  OR (OLD.state='withdrawn' AND NEW.state='archived')
  OR (OLD.state='converted' AND NEW.state='archived')
)
BEGIN
  SELECT RAISE(ABORT,'invalid hackathon entry state transition');
END;

CREATE TRIGGER hackathon_entry_requires_decision_and_lead
BEFORE UPDATE OF state ON hackathon_entries
WHEN NEW.state IN ('approved','scoped','building','verification','submission_ready','submitted','judging','finalist','won','not_selected','converted')
BEGIN
  SELECT CASE WHEN NEW.founder_decision NOT IN ('go','conditional_go')
    THEN RAISE(ABORT,'hackathon entry requires a founder go decision') END;
  SELECT CASE WHEN (
    SELECT COUNT(*) FROM hackathon_entry_ventures v
    WHERE v.entry_id=NEW.id AND v.role='lead'
  )!=1 THEN RAISE(ABORT,'hackathon entry requires exactly one lead venture') END;
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM hackathon_entry_ventures ev
    JOIN ventures v ON v.id=ev.venture_id
    WHERE ev.entry_id=NEW.id AND ev.role='lead' AND v.legal_entity_id=NEW.legal_entity_id
  ) THEN RAISE(ABORT,'hackathon lead venture must belong to the entry legal entity') END;
END;

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
    SELECT 1 FROM hackathon_eligibility_evaluations e
    WHERE e.entry_id=NEW.id AND e.status='eligible' AND e.founder_review_state='accepted'
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
      AND EXISTS(SELECT 1 FROM hackathon_distribution_items i WHERE i.plan_id=p.id AND i.phase='pre_event' AND i.status!='cancelled')
      AND EXISTS(SELECT 1 FROM hackathon_distribution_items i WHERE i.plan_id=p.id AND i.phase='submission_day' AND i.status!='cancelled')
      AND EXISTS(SELECT 1 FROM hackathon_distribution_items i WHERE i.plan_id=p.id AND i.phase='post_result' AND i.status!='cancelled')
  ) THEN RAISE(ABORT,'hackathon entry is not submission ready') END;
END;

CREATE TRIGGER hackathon_submission_requires_ready_entry
BEFORE INSERT ON hackathon_submissions
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM hackathon_entries e
    JOIN hackathon_builds b ON b.entry_id=e.id
    JOIN hackathon_assets a ON a.id=NEW.receipt_asset_id
    WHERE e.id=NEW.entry_id AND e.state='submission_ready'
      AND e.narrative_profile_id=NEW.narrative_profile_id
      AND e.canonical_demo_version_id=NEW.canonical_demo_version_id
      AND b.current_commit_sha=NEW.repository_commit_sha
      AND a.entry_id=NEW.entry_id AND a.kind='receipt'
      AND a.status='approved' AND a.founder_review_state='accepted'
  ) THEN RAISE(ABORT,'hackathon submission does not match the approved entry evidence') END;
END;

CREATE TRIGGER hackathon_entry_submitted_requires_receipt
BEFORE UPDATE OF state ON hackathon_entries
WHEN NEW.state='submitted'
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM hackathon_submissions s WHERE s.entry_id=NEW.id AND s.status='submitted'
  ) THEN RAISE(ABORT,'submitted hackathon entry requires a recorded submission receipt') END;
END;

CREATE TRIGGER submitted_hackathon_entry_is_immutable
BEFORE UPDATE OF cycle_id,legal_entity_id,narrative_profile_id,canonical_demo_version_id,
  submission_concept,user_outcome,ecosystem_adapter,estimated_hours,reuse_percentage,
  strategic_fit,acceptance_probability,capital_upside,distribution_upside,
  technical_leverage,credibility,urgency,effort_efficiency,lock_in_safety,
  weighted_score,founder_decision,founder_rationale
ON hackathon_entries
WHEN OLD.state IN ('submitted','judging','finalist','won','not_selected','converted','archived')
BEGIN
  SELECT RAISE(ABORT,'submitted hackathon entry authority and decision are immutable');
END;

CREATE TRIGGER submitted_hackathon_build_is_immutable_update
BEFORE UPDATE ON hackathon_builds
WHEN EXISTS(
  SELECT 1 FROM hackathon_entries e WHERE e.id=OLD.entry_id
    AND e.state IN ('submitted','judging','finalist','won','not_selected','converted','archived')
)
BEGIN
  SELECT RAISE(ABORT,'submitted hackathon build evidence is immutable');
END;

CREATE TRIGGER submitted_hackathon_build_is_immutable_delete
BEFORE DELETE ON hackathon_builds
WHEN EXISTS(
  SELECT 1 FROM hackathon_entries e WHERE e.id=OLD.entry_id
    AND e.state IN ('submitted','judging','finalist','won','not_selected','converted','archived')
)
BEGIN
  SELECT RAISE(ABORT,'submitted hackathon build evidence is immutable');
END;

CREATE TRIGGER submitted_hackathon_asset_is_immutable_insert
BEFORE INSERT ON hackathon_assets
WHEN EXISTS(
  SELECT 1 FROM hackathon_entries e WHERE e.id=NEW.entry_id
    AND e.state IN ('submitted','judging','finalist','won','not_selected','converted','archived')
)
BEGIN
  SELECT RAISE(ABORT,'submitted hackathon assets are immutable');
END;

CREATE TRIGGER submitted_hackathon_asset_is_immutable_update
BEFORE UPDATE ON hackathon_assets
WHEN EXISTS(
  SELECT 1 FROM hackathon_entries e WHERE e.id=OLD.entry_id
    AND e.state IN ('submitted','judging','finalist','won','not_selected','converted','archived')
)
BEGIN
  SELECT RAISE(ABORT,'submitted hackathon assets are immutable');
END;

CREATE TRIGGER submitted_hackathon_asset_is_immutable_delete
BEFORE DELETE ON hackathon_assets
WHEN EXISTS(
  SELECT 1 FROM hackathon_entries e WHERE e.id=OLD.entry_id
    AND e.state IN ('submitted','judging','finalist','won','not_selected','converted','archived')
)
BEGIN
  SELECT RAISE(ABORT,'submitted hackathon assets are immutable');
END;

CREATE TRIGGER approved_distribution_plan_content_is_immutable
BEFORE UPDATE OF entry_id,summary,content_sha256,approved_by,approved_at
ON hackathon_distribution_plans
WHEN OLD.status IN ('approved','active','completed')
BEGIN
  SELECT RAISE(ABORT,'approved hackathon distribution plan is immutable');
END;

CREATE TRIGGER approved_distribution_plan_cannot_be_deleted
BEFORE DELETE ON hackathon_distribution_plans
WHEN OLD.status IN ('approved','active','completed')
BEGIN
  SELECT RAISE(ABORT,'approved hackathon distribution plan cannot be deleted');
END;

CREATE TRIGGER approved_distribution_item_content_is_immutable
BEFORE UPDATE OF plan_id,kind,phase,title,scheduled_at
ON hackathon_distribution_items
WHEN EXISTS(
  SELECT 1 FROM hackathon_distribution_plans p
  WHERE p.id=OLD.plan_id AND p.status IN ('approved','active','completed')
)
BEGIN
  SELECT RAISE(ABORT,'approved hackathon distribution items are immutable');
END;

CREATE TRIGGER approved_distribution_item_cannot_be_deleted
BEFORE DELETE ON hackathon_distribution_items
WHEN EXISTS(
  SELECT 1 FROM hackathon_distribution_plans p
  WHERE p.id=OLD.plan_id AND p.status IN ('approved','active','completed')
)
BEGIN
  SELECT RAISE(ABORT,'approved hackathon distribution items cannot be deleted');
END;
`;
