import { createRequire } from 'node:module';

import initSqlJs, { type SqlJsStatic } from 'sql.js';
import { beforeAll, describe, expect, it } from 'vitest';

import { CoreVault } from '../src/index.js';

const NOW = '2026-08-15T10:00:00.000Z';
const LATER = '2026-08-15T10:05:00.000Z';
const SHA256 = 'a'.repeat(64);
const CURRENT_RULES_SHA256 = 'c'.repeat(64);
const STALE_RULES_SHA256 = 'd'.repeat(64);
const COMMIT_SHA = 'b'.repeat(40);
let SQL: SqlJsStatic;

beforeAll(async () => {
  const require = createRequire(import.meta.url);
  const wasm = require.resolve('sql.js/dist/sql-wasm.wasm');
  SQL = await initSqlJs({ locateFile: () => wasm });
});

function fixture(): CoreVault {
  const core = new CoreVault(SQL, { appliedAt: NOW });
  core.run(`
    INSERT INTO legal_entities(
      id,legal_name,display_name,jurisdiction,entity_type,status,incorporation_reference,
      cap_table_reference,founder_authority,public_website,created_at,updated_at
    ) VALUES (
      'legal-entity:test','Local Labs, Inc.','Local Labs','Delaware','corporation','active',
      NULL,NULL,'The founder controls external commitments.',NULL,'${NOW}','${NOW}'
    );
    INSERT INTO ventures(
      id,legal_entity_id,name,category,utility,stage,status,public_url,
      default_narrative_profile_id,current_demo_version_id,created_at,updated_at
    ) VALUES (
      'venture:sw4p','legal-entity:test','SW4P','Settlement infrastructure',
      'One application instruction becomes a finished settlement result.',
      'pre_production','active',NULL,NULL,NULL,'${NOW}','${NOW}'
    );
    INSERT INTO narrative_profiles(
      id,legal_entity_id,venture_id,purpose,version,description_50,description_100,
      description_250,problem,product_wedge,why_now,technical_differentiation,
      evidence_framing,business_model,use_of_funds,claims_boundary,deck_reference,
      demo_reference,content_sha256,approval_state,approved_by,approved_at,created_at,updated_at
    ) VALUES (
      'narrative:hackathon:1','legal-entity:test','venture:sw4p','hackathon',1,
      'SW4P settles application instructions.',
      'SW4P exposes one application settlement interface.',
      'A bounded settlement instruction becomes a provable and reconcilable outcome.',
      'Applications rebuild settlement operations for each rail.',
      'One instruction returns one finished result.',
      'Stablecoin applications need reliable settlement infrastructure.',
      'Execution, proof and reconciliation share one lifecycle.',
      'Use reproducible routes, tests and dated evidence.','Usage and application fees.',
      'Production hardening and design-partner delivery.',
      'Do not present planned routes or partners as current.',NULL,NULL,'${SHA256}',
      'approved','founder','${NOW}','${NOW}','${NOW}'
    );
    INSERT INTO canonical_demos(id,name,category,status,created_at,updated_at)
    VALUES ('demo:sw4p','SW4P Programmable Settlement','Settlement','active','${NOW}','${NOW}');
    INSERT INTO canonical_demo_versions(
      id,demo_id,version,baseline_repository,baseline_commit_sha,branch_convention,
      expected_baseline_hours,core_assets_json,evidence_requirements_json,approved_claims_json,
      content_sha256,approval_state,approved_by,approved_at,created_at,updated_at
    ) VALUES (
      'demo-version:sw4p:1','demo:sw4p',1,'rndrntwrk/Sw4p','${COMMIT_SHA}',
      'hackathon/{event}/{entry}',24,'["settlement API"]','["route proof"]',
      '["One instruction returns a reconciled result."]','${SHA256}',
      'approved','founder','${NOW}','${NOW}','${NOW}'
    );
    INSERT INTO organizations(
      id,name,normalized_name,kind,website,description,linked_firm_id,is_public,
      contribution_eligible,origin,created_at,updated_at
    ) VALUES (
      'organization:host','Example Foundation','example foundation','foundation',
      'https://example.test',NULL,NULL,1,0,'local','${NOW}','${NOW}'
    );
    INSERT INTO opportunities(
      id,organizer_organization_id,name,opportunity_type,status,public_url,application_url,
      open_date,deadline,start_date,end_date,format,location,eligibility_summary,terms_summary,
      capital_prize_summary,freshness_state,review_state,imported_package_id,
      imported_package_digest,created_at,updated_at
    ) VALUES (
      'opportunity:hackathon','organization:host','Example Hackathon','hackathon','open',
      'https://example.test/hackathon',NULL,'2026-08-01','2026-09-01','2026-08-15',
      '2026-09-05','online',NULL,NULL,NULL,'$100,000 prize pool','current','reviewed',
      NULL,NULL,'${NOW}','${NOW}'
    );
    INSERT INTO hackathon_cycles(
      id,opportunity_id,cycle_name,registration_open_at,registration_close_at,
      build_start_at,build_end_at,submission_deadline_at,judging_start_at,judging_end_at,
      demo_day_at,result_at,format,location,state,rules_source_id,rules_retrieved_at,
      rules_sha256,created_at,updated_at
    ) VALUES (
      'cycle:2026','opportunity:hackathon','2026 main cycle',
      '2026-08-01T00:00:00.000Z','2026-08-14T23:59:59.000Z',
      '2026-08-15T00:00:00.000Z','2026-08-31T23:59:59.000Z',
      '2026-09-01T23:59:59.000Z',NULL,NULL,NULL,NULL,'online',NULL,'building',
      NULL,NULL,NULL,'${NOW}','${NOW}'
    );
  `);
  return core;
}

function insertCandidate(core: CoreVault, id: string): void {
  core.run(`
    INSERT INTO hackathon_entries(
      id,cycle_id,legal_entity_id,narrative_profile_id,canonical_demo_version_id,
      submission_concept,user_outcome,ecosystem_adapter,estimated_hours,reuse_percentage,
      strategic_fit,acceptance_probability,capital_upside,distribution_upside,
      technical_leverage,credibility,urgency,effort_efficiency,lock_in_safety,
      weighted_score,founder_decision,founder_rationale,state,created_at,updated_at
    ) VALUES (
      '${id}','cycle:2026','legal-entity:test','narrative:hackathon:1',
      'demo-version:sw4p:1','Programmable settlement for agent-operated applications.',
      'A user sees a completed, provable settlement.','Example ecosystem adapter',48,80,
      9,7,7,9,9,8,8,8,8,82,'pending',NULL,'candidate','${NOW}','${NOW}'
    );
  `);
}

function addLeadAndAdvance(core: CoreVault, entryId: string): void {
  core.run(
    `INSERT INTO hackathon_entry_ventures(entry_id,venture_id,role,created_at)
     VALUES (?,?,?,?)`,
    [entryId, 'venture:sw4p', 'lead', NOW],
  );
  core.run(
    "UPDATE hackathon_entries SET founder_decision='go',state='approved',updated_at=? WHERE id=?",
    [NOW, entryId],
  );
  for (const state of ['scoped', 'building', 'verification']) {
    core.run('UPDATE hackathon_entries SET state=?,updated_at=? WHERE id=?', [state, NOW, entryId]);
  }
}

function insertPendingRule(core: CoreVault, id: string): void {
  core.run(
    `INSERT INTO hackathon_rules(
      id,cycle_id,rule_type,value_json,blocking,source_id,observed_at,confidence,
      review_state,reviewed_at,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      'cycle:2026',
      'existing_code',
      JSON.stringify({ allowed: true }),
      1,
      null,
      NOW,
      'verified',
      'pending',
      null,
      NOW,
      NOW,
    ],
  );
}

function acceptRule(core: CoreVault, id: string): void {
  core.run(
    "UPDATE hackathon_rules SET review_state='accepted',reviewed_at=?,updated_at=? WHERE id=?",
    [NOW, NOW, id],
  );
}

function insertAcceptedEligibility(
  core: CoreVault,
  id: string,
  entryId: string,
  rulesSha256: string,
): void {
  core.run(
    `INSERT INTO hackathon_eligibility_evaluations(
      id,entry_id,status,evaluated_at,rules_snapshot_sha256,detail_json,
      founder_review_state,reviewed_at
    ) VALUES (?,?,?,?,?,?,?,?)`,
    [id, entryId, 'eligible', NOW, rulesSha256, '[]', 'pending', null],
  );
  core.run(
    `UPDATE hackathon_eligibility_evaluations
     SET founder_review_state='accepted',reviewed_at=? WHERE id=?`,
    [NOW, id],
  );
}

function prepareBuildAssetsAndDistribution(core: CoreVault, entryId: string): void {
  core.run(`
    INSERT INTO hackathon_builds(
      id,entry_id,status,repository,base_commit_sha,branch_name,worktree_reference,
      adapter_path,owner_agent,tool_policy_json,budget_usd,budget_hours,start_conditions,
      stop_conditions,current_commit_sha,ci_state,security_review_state,
      evidence_manifest_sha256,merge_decision,approved_by,approved_at,started_at,
      completed_at,created_at,updated_at
    ) VALUES (
      'build:${entryId}','${entryId}','draft','rndrntwrk/Sw4p','${COMMIT_SHA}',
      'hackathon/example/${entryId}',NULL,'adapters/example','codex','{}',0,48,
      'Founder approves the scoped entry.','Stop on policy violation or an expired deadline.',
      NULL,'not_run','pending',NULL,'pending',NULL,NULL,NULL,NULL,'${NOW}','${NOW}'
    );
    UPDATE hackathon_builds
      SET status='approved',approved_by='founder',approved_at='${NOW}',updated_at='${NOW}'
      WHERE entry_id='${entryId}';
    UPDATE hackathon_builds
      SET status='active',current_commit_sha='${COMMIT_SHA}',ci_state='passed',
        security_review_state='passed',evidence_manifest_sha256='${SHA256}',
        started_at='${NOW}',updated_at='${NOW}' WHERE entry_id='${entryId}';

    INSERT INTO hackathon_assets(
      id,entry_id,kind,required,status,reference,content_sha256,
      founder_review_state,reviewed_at,created_at,updated_at
    ) VALUES (
      'asset:readme','${entryId}','readme',1,'draft',NULL,NULL,'pending',NULL,'${NOW}','${NOW}'
    );
    UPDATE hackathon_assets SET status='approved',reference='local://readme',
      content_sha256='${SHA256}',founder_review_state='accepted',reviewed_at='${NOW}',
      updated_at='${NOW}' WHERE id='asset:readme';
    INSERT INTO hackathon_assets(
      id,entry_id,kind,required,status,reference,content_sha256,
      founder_review_state,reviewed_at,created_at,updated_at
    ) VALUES (
      'asset:receipt','${entryId}','receipt',1,'draft',NULL,NULL,'pending',NULL,'${NOW}','${NOW}'
    );
    UPDATE hackathon_assets SET status='approved',reference='local://receipt',
      content_sha256='${SHA256}',founder_review_state='accepted',reviewed_at='${NOW}',
      updated_at='${NOW}' WHERE id='asset:receipt';

    INSERT INTO hackathon_distribution_plans(
      id,entry_id,summary,status,content_sha256,approved_by,approved_at,created_at,updated_at
    ) VALUES (
      'distribution:${entryId}','${entryId}','Founder-reviewed distribution plan.',
      'draft','${SHA256}',NULL,NULL,'${NOW}','${NOW}'
    );
    INSERT INTO hackathon_distribution_items(
      id,plan_id,kind,phase,status,title,scheduled_at,completed_at,reference,created_at,updated_at
    ) VALUES
      ('item:pre','distribution:${entryId}','pre_build_announcement','pre_event','planned',
        'Pre-event announcement',NULL,NULL,NULL,'${NOW}','${NOW}'),
      ('item:submit','distribution:${entryId}','launch_post','submission_day','planned',
        'Submission launch',NULL,NULL,NULL,'${NOW}','${NOW}'),
      ('item:result','distribution:${entryId}','post_result_announcement','post_result','planned',
        'Result announcement',NULL,NULL,NULL,'${NOW}','${NOW}');
    UPDATE hackathon_distribution_plans
      SET status='approved',approved_by='founder',approved_at='${NOW}',updated_at='${NOW}'
      WHERE entry_id='${entryId}';
  `);
}

describe('Hackathon Studio lifecycle hardening', () => {
  it('freezes the exact candidate and requires explicit review transitions', () => {
    const core = fixture();
    insertCandidate(core, 'entry:review');

    expect(() =>
      core.run(
        `INSERT INTO hackathon_rules(
          id,cycle_id,rule_type,value_json,blocking,source_id,observed_at,confidence,
          review_state,reviewed_at,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          'rule:direct',
          'cycle:2026',
          'existing_code',
          '{}',
          1,
          null,
          NOW,
          'verified',
          'accepted',
          NOW,
          NOW,
          NOW,
        ],
      ),
    ).toThrow('new hackathon rules must start pending');

    insertPendingRule(core, 'rule:reviewed');
    acceptRule(core, 'rule:reviewed');
    core.run('UPDATE hackathon_cycles SET rules_sha256=? WHERE id=?', [
      CURRENT_RULES_SHA256,
      'cycle:2026',
    ]);
    expect(() =>
      core.run("UPDATE hackathon_rules SET value_json='{}' WHERE id='rule:reviewed'"),
    ).toThrow('reviewed hackathon rules are immutable');
    insertPendingRule(core, 'rule:new');
    expect(core.scalar('SELECT rules_sha256 FROM hackathon_cycles WHERE id=?', ['cycle:2026'])).toBeNull();

    expect(() =>
      core.run(
        `INSERT INTO hackathon_eligibility_evaluations(
          id,entry_id,status,evaluated_at,rules_snapshot_sha256,detail_json,
          founder_review_state,reviewed_at
        ) VALUES (?,?,?,?,?,?,?,?)`,
        ['eligibility:direct', 'entry:review', 'eligible', NOW, SHA256, '[]', 'accepted', NOW],
      ),
    ).toThrow('new eligibility evaluations must start pending');

    expect(() =>
      core.run(
        `INSERT INTO hackathon_builds(
          id,entry_id,status,repository,base_commit_sha,branch_name,worktree_reference,
          adapter_path,owner_agent,tool_policy_json,budget_usd,budget_hours,start_conditions,
          stop_conditions,current_commit_sha,ci_state,security_review_state,
          evidence_manifest_sha256,merge_decision,approved_by,approved_at,started_at,
          completed_at,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          'build:direct',
          'entry:review',
          'active',
          'rndrntwrk/Sw4p',
          COMMIT_SHA,
          'hackathon/example/direct',
          null,
          null,
          'codex',
          '{}',
          0,
          48,
          'Start.',
          'Stop.',
          COMMIT_SHA,
          'passed',
          'passed',
          SHA256,
          'pending',
          'founder',
          NOW,
          NOW,
          null,
          NOW,
          NOW,
        ],
      ),
    ).toThrow('new hackathon builds must start as drafts');

    expect(() =>
      core.run(
        `INSERT INTO hackathon_distribution_plans(
          id,entry_id,summary,status,content_sha256,approved_by,approved_at,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?)`,
        ['plan:direct', 'entry:review', 'Plan.', 'approved', SHA256, 'founder', NOW, NOW, NOW],
      ),
    ).toThrow('new hackathon distribution plans must start as drafts');

    core.run(
      `INSERT INTO hackathon_entry_ventures(entry_id,venture_id,role,created_at)
       VALUES (?,?,?,?)`,
      ['entry:review', 'venture:sw4p', 'lead', NOW],
    );
    expect(() =>
      core.run(
        `UPDATE hackathon_entries SET submission_concept='Changed while approving',
          founder_decision='go',state='approved',updated_at=? WHERE id=?`,
        [NOW, 'entry:review'],
      ),
    ).toThrow('approved hackathon entry authority and concept are immutable');
    core.run(
      "UPDATE hackathon_entries SET founder_decision='go',state='approved',updated_at=? WHERE id=?",
      [NOW, 'entry:review'],
    );
    expect(() =>
      core.run("UPDATE hackathon_entries SET founder_decision='no_go' WHERE id='entry:review'"),
    ).toThrow('approved hackathon entry decision is immutable');
    core.close();
  });

  it('requires the current rules digest and makes submitted evidence immutable', () => {
    const core = fixture();
    insertCandidate(core, 'entry:ready');
    addLeadAndAdvance(core, 'entry:ready');

    insertPendingRule(core, 'rule:current');
    acceptRule(core, 'rule:current');
    core.run('UPDATE hackathon_cycles SET rules_sha256=?,updated_at=? WHERE id=?', [
      CURRENT_RULES_SHA256,
      NOW,
      'cycle:2026',
    ]);
    insertAcceptedEligibility(core, 'eligibility:stale', 'entry:ready', STALE_RULES_SHA256);
    prepareBuildAssetsAndDistribution(core, 'entry:ready');

    expect(() =>
      core.run("UPDATE hackathon_entries SET state='submission_ready' WHERE id='entry:ready'"),
    ).toThrow('hackathon entry is not submission ready');

    insertAcceptedEligibility(core, 'eligibility:current', 'entry:ready', CURRENT_RULES_SHA256);
    core.run(
      "UPDATE hackathon_entries SET state='submission_ready',updated_at=? WHERE id='entry:ready'",
      [NOW],
    );
    core.run(
      `INSERT INTO hackathon_submissions(
        id,entry_id,portal_url,submitted_at,narrative_profile_id,canonical_demo_version_id,
        repository_commit_sha,receipt_asset_id,content_sha256,status,created_at,updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        'submission:ready',
        'entry:ready',
        'https://example.test/submissions/ready',
        NOW,
        'narrative:hackathon:1',
        'demo-version:sw4p:1',
        COMMIT_SHA,
        'asset:receipt',
        SHA256,
        'submitted',
        NOW,
        NOW,
      ],
    );
    core.run("UPDATE hackathon_entries SET state='submitted',updated_at=? WHERE id='entry:ready'", [
      LATER,
    ]);

    expect(() =>
      core.run(
        "UPDATE hackathon_submissions SET content_sha256=? WHERE id='submission:ready'",
        [STALE_RULES_SHA256],
      ),
    ).toThrow('submitted hackathon submissions are immutable');
    expect(() =>
      core.run("UPDATE hackathon_builds SET ci_state='failed' WHERE entry_id='entry:ready'"),
    ).toThrow('submitted hackathon build evidence is immutable');
    expect(() =>
      core.run("UPDATE hackathon_assets SET status='rejected' WHERE id='asset:readme'"),
    ).toThrow('submitted hackathon assets are immutable');
    expect(() =>
      core.run("UPDATE hackathon_entries SET submission_concept='Changed' WHERE id='entry:ready'"),
    ).toThrow('submitted hackathon entry authority and decision are immutable');
    core.close();
  });
});
