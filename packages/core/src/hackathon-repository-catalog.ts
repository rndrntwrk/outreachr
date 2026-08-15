import {
  HackathonBountySchema,
  HackathonCycleSchema,
  HackathonRuleSchema,
  HackathonSponsorSchema,
  HackathonTrackSchema,
  type HackathonBounty,
  type HackathonBountyInput,
  type HackathonCycle,
  type HackathonCycleInput,
  type HackathonRule,
  type HackathonRuleInput,
  type HackathonSponsor,
  type HackathonSponsorInput,
  type HackathonTrack,
  type HackathonTrackInput,
} from './hackathon-validation-v11.js';
import { IdSchema, IsoDateTimeSchema, stableJson } from './validation.js';
import { HackathonRepositoryBase } from './hackathon-repository-base.js';
import {
  type BountyRow,
  type CycleRow,
  type RuleRow,
  type SponsorRow,
  type TrackRow,
  bool,
  mapBounty,
  mapCycle,
  mapRule,
  mapSponsor,
  mapTrack,
  sameJson,
} from './hackathon-repository-internal.js';

export class HackathonCatalogRepository extends HackathonRepositoryBase {
  upsertCycle(input: HackathonCycleInput): HackathonCycle {
    const existing = this.vault.one<CycleRow>('SELECT * FROM hackathon_cycles WHERE id=?', [
      input.id,
    ]);
    const includesDigest = Object.prototype.hasOwnProperty.call(input, 'rulesSha256');
    const value = HackathonCycleSchema.parse({
      ...input,
      rulesSha256: includesDigest ? input.rulesSha256 : (existing?.rules_sha256 ?? null),
    });
    this.vault.transaction(() => {
      this.vault.run(
        `INSERT INTO hackathon_cycles(
          id,opportunity_id,cycle_name,registration_open_at,registration_close_at,
          build_start_at,build_end_at,submission_deadline_at,judging_start_at,judging_end_at,
          demo_day_at,result_at,format,location,state,rules_source_id,rules_retrieved_at,
          rules_sha256,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
          opportunity_id=excluded.opportunity_id,cycle_name=excluded.cycle_name,
          registration_open_at=excluded.registration_open_at,
          registration_close_at=excluded.registration_close_at,
          build_start_at=excluded.build_start_at,build_end_at=excluded.build_end_at,
          submission_deadline_at=excluded.submission_deadline_at,
          judging_start_at=excluded.judging_start_at,judging_end_at=excluded.judging_end_at,
          demo_day_at=excluded.demo_day_at,result_at=excluded.result_at,format=excluded.format,
          location=excluded.location,state=excluded.state,rules_source_id=excluded.rules_source_id,
          rules_retrieved_at=excluded.rules_retrieved_at,rules_sha256=excluded.rules_sha256,
          updated_at=excluded.updated_at`,
        [
          value.id,
          value.opportunityId,
          value.cycleName,
          value.registrationOpenAt,
          value.registrationCloseAt,
          value.buildStartAt,
          value.buildEndAt,
          value.submissionDeadlineAt,
          value.judgingStartAt,
          value.judgingEndAt,
          value.demoDayAt,
          value.resultAt,
          value.format,
          value.location,
          value.state,
          value.rulesSourceId,
          value.rulesRetrievedAt,
          value.rulesSha256,
          value.createdAt,
          value.updatedAt,
        ],
      );
      this.audit(
        'hackathon.cycle_upserted',
        'hackathon_cycle',
        value.id,
        { opportunityId: value.opportunityId, state: value.state },
        value.updatedAt,
      );
    });
    return this.requireCycle(value.id);
  }

  listCycles(): HackathonCycle[] {
    return this.vault
      .all<CycleRow>(
        `SELECT * FROM hackathon_cycles
         ORDER BY CASE WHEN submission_deadline_at IS NULL THEN 1 ELSE 0 END,
           submission_deadline_at,cycle_name,id`,
      )
      .map(mapCycle);
  }

  getCycle(idInput: string): HackathonCycle | null {
    const id = IdSchema.parse(idInput);
    const row = this.vault.one<CycleRow>('SELECT * FROM hackathon_cycles WHERE id=?', [id]);
    return row ? mapCycle(row) : null;
  }

  upsertTrack(input: HackathonTrackInput): HackathonTrack {
    const value = HackathonTrackSchema.parse(input);
    this.requireCycle(value.cycleId);
    this.vault.transaction(() => {
      this.vault.run(
        `INSERT INTO hackathon_tracks(
          id,cycle_id,name,goals,judging_criteria_json,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
          cycle_id=excluded.cycle_id,name=excluded.name,goals=excluded.goals,
          judging_criteria_json=excluded.judging_criteria_json,updated_at=excluded.updated_at`,
        [
          value.id,
          value.cycleId,
          value.name,
          value.goals,
          JSON.stringify(value.judgingCriteria),
          value.createdAt,
          value.updatedAt,
        ],
      );
      this.audit(
        'hackathon.track_upserted',
        'hackathon_track',
        value.id,
        { cycleId: value.cycleId },
        value.updatedAt,
      );
    });
    return mapTrack(
      this.vault.one<TrackRow>('SELECT * FROM hackathon_tracks WHERE id=?', [value.id])!,
    );
  }

  listTracks(cycleIdInput?: string): HackathonTrack[] {
    const cycleId = cycleIdInput === undefined ? null : IdSchema.parse(cycleIdInput);
    return this.vault
      .all<TrackRow>(
        `SELECT * FROM hackathon_tracks ${cycleId ? 'WHERE cycle_id=?' : ''}
         ORDER BY cycle_id,name,id`,
        cycleId ? [cycleId] : [],
      )
      .map(mapTrack);
  }

  upsertSponsor(input: HackathonSponsorInput): HackathonSponsor {
    const value = HackathonSponsorSchema.parse(input);
    this.requireCycle(value.cycleId);
    this.vault.transaction(() => {
      this.vault.run(
        `INSERT INTO hackathon_sponsors(
          cycle_id,organization_id,contact_person_id,relationship_state,created_at,updated_at
        ) VALUES (?,?,?,?,?,?) ON CONFLICT(cycle_id,organization_id) DO UPDATE SET
          contact_person_id=excluded.contact_person_id,
          relationship_state=excluded.relationship_state,updated_at=excluded.updated_at`,
        [
          value.cycleId,
          value.organizationId,
          value.contactPersonId,
          value.relationshipState,
          value.createdAt,
          value.updatedAt,
        ],
      );
      this.audit(
        'hackathon.sponsor_upserted',
        'hackathon_cycle',
        value.cycleId,
        { organizationId: value.organizationId, relationshipState: value.relationshipState },
        value.updatedAt,
      );
    });
    const row = this.vault.one<SponsorRow>(
      'SELECT * FROM hackathon_sponsors WHERE cycle_id=? AND organization_id=?',
      [value.cycleId, value.organizationId],
    );
    return mapSponsor(row!);
  }

  listSponsors(cycleIdInput?: string): HackathonSponsor[] {
    const cycleId = cycleIdInput === undefined ? null : IdSchema.parse(cycleIdInput);
    return this.vault
      .all<SponsorRow>(
        `SELECT * FROM hackathon_sponsors ${cycleId ? 'WHERE cycle_id=?' : ''}
         ORDER BY cycle_id,organization_id`,
        cycleId ? [cycleId] : [],
      )
      .map(mapSponsor);
  }

  upsertBounty(input: HackathonBountyInput): HackathonBounty {
    const value = HackathonBountySchema.parse(input);
    this.requireCycle(value.cycleId);
    this.vault.transaction(() => {
      this.vault.run(
        `INSERT INTO hackathon_bounties(
          id,cycle_id,sponsor_organization_id,track_id,title,amount_value,amount_asset,
          required_technology,eligibility,judging_criteria,submission_requirements,source_id,
          freshness_state,conflict_lock_in_notes,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
          cycle_id=excluded.cycle_id,sponsor_organization_id=excluded.sponsor_organization_id,
          track_id=excluded.track_id,title=excluded.title,amount_value=excluded.amount_value,
          amount_asset=excluded.amount_asset,required_technology=excluded.required_technology,
          eligibility=excluded.eligibility,judging_criteria=excluded.judging_criteria,
          submission_requirements=excluded.submission_requirements,source_id=excluded.source_id,
          freshness_state=excluded.freshness_state,
          conflict_lock_in_notes=excluded.conflict_lock_in_notes,updated_at=excluded.updated_at`,
        [
          value.id,
          value.cycleId,
          value.sponsorOrganizationId,
          value.trackId,
          value.title,
          value.amountValue,
          value.amountAsset,
          value.requiredTechnology,
          value.eligibility,
          value.judgingCriteria,
          value.submissionRequirements,
          value.sourceId,
          value.freshnessState,
          value.conflictLockInNotes,
          value.createdAt,
          value.updatedAt,
        ],
      );
      this.audit(
        'hackathon.bounty_upserted',
        'hackathon_bounty',
        value.id,
        { cycleId: value.cycleId, trackId: value.trackId },
        value.updatedAt,
      );
    });
    return mapBounty(
      this.vault.one<BountyRow>('SELECT * FROM hackathon_bounties WHERE id=?', [value.id])!,
    );
  }

  listBounties(cycleIdInput?: string): HackathonBounty[] {
    const cycleId = cycleIdInput === undefined ? null : IdSchema.parse(cycleIdInput);
    return this.vault
      .all<BountyRow>(
        `SELECT * FROM hackathon_bounties ${cycleId ? 'WHERE cycle_id=?' : ''}
         ORDER BY cycle_id,title,id`,
        cycleId ? [cycleId] : [],
      )
      .map(mapBounty);
  }

  upsertRule(input: HackathonRuleInput): HackathonRule {
    const value = HackathonRuleSchema.parse(input);
    this.requireCycle(value.cycleId);
    const existingRow = this.vault.one<RuleRow>(
      'SELECT * FROM hackathon_rules WHERE id=?',
      [value.id],
    );
    if (existingRow) {
      const existing = mapRule(existingRow);
      if (existing.reviewState !== 'pending') {
        if (sameJson(existing, value)) return existing;
        throw new Error('Reviewed hackathon rules are immutable');
      }
    } else if (value.reviewState !== 'pending') {
      throw new Error('New hackathon rules must start pending');
    }

    this.vault.transaction(() => {
      this.vault.run(
        `INSERT INTO hackathon_rules(
          id,cycle_id,rule_type,value_json,blocking,source_id,observed_at,confidence,
          review_state,reviewed_at,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
          cycle_id=excluded.cycle_id,rule_type=excluded.rule_type,value_json=excluded.value_json,
          blocking=excluded.blocking,source_id=excluded.source_id,observed_at=excluded.observed_at,
          confidence=excluded.confidence,review_state=excluded.review_state,
          reviewed_at=excluded.reviewed_at,updated_at=excluded.updated_at`,
        [
          value.id,
          value.cycleId,
          value.ruleType,
          stableJson(value.value),
          bool(value.blocking),
          value.sourceId,
          value.observedAt,
          value.confidence,
          value.reviewState,
          value.reviewedAt,
          value.createdAt,
          value.updatedAt,
        ],
      );
      const digest = this.refreshRulesDigest(value.cycleId, value.updatedAt);
      this.audit(
        'hackathon.rule_upserted',
        'hackathon_rule',
        value.id,
        { cycleId: value.cycleId, blocking: value.blocking, rulesSnapshotSha256: digest },
        value.updatedAt,
      );
    });
    return this.requireRule(value.id);
  }

  reviewRule(
    idInput: string,
    decisionInput: 'accept' | 'reject',
    reviewedAtInput: string,
  ): HackathonRule {
    const current = this.requireRule(idInput);
    const reviewedAt = IsoDateTimeSchema.parse(reviewedAtInput);
    const decision = decisionInput === 'accept' ? 'accepted' : 'rejected';
    if (current.reviewState !== 'pending') {
      if (current.reviewState === decision && current.reviewedAt === reviewedAt) return current;
      throw new Error('Reviewed hackathon rules are immutable');
    }
    this.vault.transaction(() => {
      this.vault.run(
        `UPDATE hackathon_rules SET review_state=?,reviewed_at=?,updated_at=?
         WHERE id=? AND review_state='pending'`,
        [decision, reviewedAt, reviewedAt, current.id],
      );
      const digest = this.refreshRulesDigest(current.cycleId, reviewedAt);
      this.audit(
        'hackathon.rule_reviewed',
        'hackathon_rule',
        current.id,
        { decision, cycleId: current.cycleId, rulesSnapshotSha256: digest },
        reviewedAt,
      );
    });
    return this.requireRule(current.id);
  }

  listRules(cycleIdInput?: string): HackathonRule[] {
    const cycleId = cycleIdInput === undefined ? null : IdSchema.parse(cycleIdInput);
    return this.vault
      .all<RuleRow>(
        `SELECT * FROM hackathon_rules ${cycleId ? 'WHERE cycle_id=?' : ''}
         ORDER BY cycle_id,id`,
        cycleId ? [cycleId] : [],
      )
      .map(mapRule);
  }
}
