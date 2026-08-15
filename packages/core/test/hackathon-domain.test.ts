import { createRequire } from 'node:module';

import initSqlJs, { type SqlJsStatic } from 'sql.js';
import { beforeAll, describe, expect, it } from 'vitest';

import { CoreVault, currentSchemaVersion } from '../src/index.js';

const NOW = '2026-08-15T10:00:00.000Z';
const SHA256 = 'a'.repeat(64);
const COMMIT_SHA = 'b'.repeat(40);
let SQL: SqlJsStatic;

beforeAll(async () => {
  const require = createRequire(import.meta.url);
  const wasm = require.resolve('sql.js/dist/sql-wasm.wasm');
  SQL = await initSqlJs({ locateFile: () => wasm });
});

function insertAuthorityFixture(core: CoreVault): void {
  core.run(
    `INSERT INTO legal_entities(
      id,legal_name,display_name,jurisdiction,entity_type,status,incorporation_reference,
      cap_table_reference,founder_authority,public_website,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      'legal-entity:test',
      'Local Labs, Inc.',
      'Local Labs',
      'Delaware',
      'corporation',
      'active',
      null,
      null,
      'The founder controls external commitments.',
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
      'legal-entity:test',
      'SW4P',
      'Settlement infrastructure',
      'One application instruction becomes a finished settlement result.',
      'pre_production',
      'active',
      null,
      null,
      null,
      NOW,
      NOW,
    ],
  );
  core.run(
    `INSERT INTO narrative_profiles(
      id,legal_entity_id,venture_id,purpose,version,description_50,description_100,
      description_250,problem,product_wedge,why_now,technical_differentiation,
      evidence_framing,business_model,use_of_funds,claims_boundary,deck_reference,
      demo_reference,content_sha256,approval_state,approved_by,approved_at,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      'narrative:hackathon:1',
      'legal-entity:test',
      'venture:sw4p',
      'hackathon',
      1,
      'SW4P settles application instructions.',
      'SW4P exposes one application settlement interface.',
      'A bounded settlement instruction becomes a provable and reconcilable outcome.',
      'Applications rebuild settlement operations for each rail.',
      'One instruction returns one finished result.',
      'Stablecoin applications need reliable settlement infrastructure.',
      'Execution, proof and reconciliation share one lifecycle.',
      'Use reproducible routes, tests and dated evidence.',
      'Usage and application fees.',
      'Production hardening and design-partner delivery.',
      'Do not present planned routes or partners as current.',
      null,
      null,
      SHA256,
      'approved',
      'founder',
      NOW,
      NOW,
      NOW,
    ],
  );
  core.run(
    `INSERT INTO canonical_demos(id,name,category,status,created_at,updated_at)
     VALUES (?,?,?,?,?,?)`,
    ['demo:sw4p', 'SW4P Programmable Settlement', 'Settlement', 'active', NOW, NOW],
  );
  core.run(
    `INSERT INTO canonical_demo_versions(
      id,demo_id,version,baseline_repository,baseline_commit_sha,branch_convention,
      expected_baseline_hours,core_assets_json,evidence_requirements_json,approved_claims_json,
      content_sha256,approval_state,approved_by,approved_at,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      'demo-version:sw4p:1',
      'demo:sw4p',
      1,
      'rndrntwrk/Sw4p',
      COMMIT_SHA,
      'hackathon/{event}/{entry}',
      24,
      JSON.stringify(['settlement API']),
      JSON.stringify(['route proof']),
      JSON.stringify(['One instruction returns a reconciled result.']),
      SHA256,
      'approved',
      'founder',
      NOW,
      NOW,
      NOW,
    ],
  );
}

function insertHackathonFixture(core: CoreVault): void {
  core.run(
    `INSERT INTO organizations(
      id,name,normalized_name,kind,website,description,linked_firm_id,is_public,
      contribution_eligible,origin,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      'organization:host',
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
  core.run(
    `INSERT INTO opportunities(
      id,organizer_organization_id,name,opportunity_type,status,public_url,application_url,
      open_date,deadline,start_date,end_date,format,location,eligibility_summary,terms_summary,
      capital_prize_summary,freshness_state,review_state,imported_package_id,
      imported_package_digest,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      'opportunity:hackathon',
      'organization:host',
      'Example Hackathon',
      'hackathon',
      'open',
      'https://example.test/hackathon',
      null,
      '2026-08-01',
      '2026-09-01',
      '2026-08-15',
      '2026-09-05',
      'online',
      null,
      null,
      null,
      '$100,000 prize pool',
      'current',
      'reviewed',
      null,
      null,
      NOW,
      NOW,
    ],
  );
  core.run(
    `INSERT INTO hackathon_cycles(
      id,opportunity_id,cycle_name,registration_open_at,registration_close_at,
      build_start_at,build_end_at,submission_deadline_at,judging_start_at,judging_end_at,
      demo_day_at,result_at,format,location,state,rules_source_id,rules_retrieved_at,
      created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      'cycle:2026',
      'opportunity:hackathon',
      '2026 main cycle',
      '2026-08-01T00:00:00.000Z',
      '2026-08-14T23:59:59.000Z',
      '2026-08-15T00:00:00.000Z',
      '2026-08-31T23:59:59.000Z',
      '2026-09-01T23:59:59.000Z',
      null,
      null,
      null,
      null,
      'online',
      null,
      'building',
      null,
      null,
      NOW,
      NOW,
    ],
  );
}

function insertCandidate(core: CoreVault, id: string): void {
  core.run(
    `INSERT INTO hackathon_entries(
      id,cycle_id,legal_entity_id,narrative_profile_id,canonical_demo_version_id,
      submission_concept,user_outcome,ecosystem_adapter,estimated_hours,reuse_percentage,
      strategic_fit,acceptance_probability,capital_upside,distribution_upside,
      technical_leverage,credibility,urgency,effort_efficiency,lock_in_safety,
      weighted_score,founder_decision,founder_rationale,state,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      'cycle:2026',
      'legal-entity:test',
      'narrative:hackathon:1',
      'demo-version:sw4p:1',
      'Programmable settlement for agent-operated applications.',
      'A user sees a completed, provable settlement.',
      'Example ecosystem adapter',
      48,
      80,
      9,
      7,
      7,
      9,
      9,
      8,
      8,
      8,
      8,
      82,
      'pending',
      null,
      'candidate',
      NOW,
      NOW,
    ],
  );
}

describe('Hackathon Studio migration v11', () => {
  it('creates the complete Hackathon Studio schema', () => {
    const core = new CoreVault(SQL, { appliedAt: NOW });
    expect(currentSchemaVersion(core.db)).toBe(11);
    for (const table of [
      'hackathon_cycles',
      'hackathon_tracks',
      'hackathon_sponsors',
      'hackathon_bounties',
      'hackathon_rules',
      'hackathon_entries',
      'hackathon_entry_ventures',
      'hackathon_entry_tracks',
      'hackathon_entry_bounties',
      'hackathon_eligibility_evaluations',
      'hackathon_builds',
      'hackathon_assets',
      'hackathon_distribution_plans',
      'hackathon_distribution_items',
      'hackathon_submissions',
      'hackathon_results',
      'hackathon_conversions',
    ]) {
      expect(
        Number(
          core.scalar("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?", [
            table,
          ]),
        ),
      ).toBe(1);
    }
    expect(core.integrityCheck()).toEqual({ ok: true, messages: ['ok'] });
    core.close();
  });

  it('requires approved hackathon authority and one matching lead venture before approval', () => {
    const core = new CoreVault(SQL, { appliedAt: NOW });
    insertAuthorityFixture(core);
    insertHackathonFixture(core);
    insertCandidate(core, 'entry:sw4p');

    expect(() =>
      core.run(
        "UPDATE hackathon_entries SET founder_decision='go',state='approved',updated_at=? WHERE id=?",
        [NOW, 'entry:sw4p'],
      ),
    ).toThrow('hackathon entry requires exactly one lead venture');

    core.run(
      `INSERT INTO hackathon_entry_ventures(entry_id,venture_id,role,created_at)
       VALUES (?,?,?,?)`,
      ['entry:sw4p', 'venture:sw4p', 'lead', NOW],
    );
    expect(() =>
      core.run(
        "UPDATE hackathon_entries SET founder_decision='go',state='approved',updated_at=? WHERE id=?",
        [NOW, 'entry:sw4p'],
      ),
    ).not.toThrow();
    expect(core.scalar('SELECT state FROM hackathon_entries WHERE id=?', ['entry:sw4p'])).toBe(
      'approved',
    );
    core.close();
  });

  it('blocks submission readiness until eligibility, build evidence, assets and distribution are approved', () => {
    const core = new CoreVault(SQL, { appliedAt: NOW });
    insertAuthorityFixture(core);
    insertHackathonFixture(core);
    insertCandidate(core, 'entry:ready');
    core.run(
      `INSERT INTO hackathon_entry_ventures(entry_id,venture_id,role,created_at)
       VALUES (?,?,?,?)`,
      ['entry:ready', 'venture:sw4p', 'lead', NOW],
    );
    core.run(
      "UPDATE hackathon_entries SET founder_decision='go',state='approved',updated_at=? WHERE id=?",
      [NOW, 'entry:ready'],
    );
    core.run("UPDATE hackathon_entries SET state='scoped',updated_at=? WHERE id=?", [
      NOW,
      'entry:ready',
    ]);
    core.run("UPDATE hackathon_entries SET state='building',updated_at=? WHERE id=?", [
      NOW,
      'entry:ready',
    ]);
    core.run("UPDATE hackathon_entries SET state='verification',updated_at=? WHERE id=?", [
      NOW,
      'entry:ready',
    ]);

    expect(() =>
      core.run("UPDATE hackathon_entries SET state='submission_ready',updated_at=? WHERE id=?", [
        NOW,
        'entry:ready',
      ]),
    ).toThrow('hackathon entry is not submission ready');
    core.close();
  });
});
