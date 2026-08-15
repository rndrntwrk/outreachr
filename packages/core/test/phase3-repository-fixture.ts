import type { CoreVault } from '../src/index.js';

export const NOW = '2026-08-15T12:00:00.000Z';
export const LATER = '2026-08-15T12:05:00.000Z';
export const SHA256 = 'a'.repeat(64);
export const RULES_SHA256 = 'c'.repeat(64);
export const COMMIT_SHA = 'b'.repeat(40);

export function insertAuthorityFixture(core: CoreVault): void {
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
  for (const [id, name, category] of [
    ['venture:sw4p', 'SW4P', 'Settlement infrastructure'],
    ['venture:alice', 'Alice', 'Governed agent operator'],
  ] as const) {
    core.run(
      `INSERT INTO ventures(
        id,legal_entity_id,name,category,utility,stage,status,public_url,
        default_narrative_profile_id,current_demo_version_id,created_at,updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        'legal-entity:test',
        name,
        category,
        `${name} produces a bounded, founder-reviewed user outcome.`,
        'pre_production',
        'active',
        null,
        null,
        null,
        NOW,
        NOW,
      ],
    );
  }

  for (const [id, ventureId, label] of [
    ['narrative:sw4p:hackathon:1', 'venture:sw4p', 'SW4P'],
    ['narrative:alice:hackathon:1', 'venture:alice', 'Alice'],
  ] as const) {
    core.run(
      `INSERT INTO narrative_profiles(
        id,legal_entity_id,venture_id,purpose,version,description_50,description_100,
        description_250,problem,product_wedge,why_now,technical_differentiation,
        evidence_framing,business_model,use_of_funds,claims_boundary,deck_reference,
        demo_reference,content_sha256,approval_state,approved_by,approved_at,created_at,updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        'legal-entity:test',
        ventureId,
        'hackathon',
        1,
        `${label} is a bounded hackathon component.`,
        `${label} demonstrates one focused product outcome.`,
        `${label} reuses approved infrastructure and records reproducible evidence.`,
        'Application teams repeatedly rebuild this workflow.',
        'One bounded adapter produces a finished result.',
        'The ecosystem needs composable, evidence-backed infrastructure.',
        'The approved implementation keeps authority, execution and evidence together.',
        'Use tests, commit identity and dated artifacts.',
        'Usage and application fees.',
        'Harden the reusable implementation and distribution assets.',
        'Do not present planned integrations as current production evidence.',
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
  }

  for (const [demoId, versionId, name] of [
    ['demo:sw4p', 'demo-version:sw4p:1', 'SW4P Programmable Settlement'],
    ['demo:alice', 'demo-version:alice:1', 'Alice Governed Operator'],
  ] as const) {
    core.run(
      `INSERT INTO canonical_demos(id,name,category,status,created_at,updated_at)
       VALUES (?,?,?,?,?,?)`,
      [demoId, name, 'Hackathon', 'active', NOW, NOW],
    );
    core.run(
      `INSERT INTO canonical_demo_versions(
        id,demo_id,version,baseline_repository,baseline_commit_sha,branch_convention,
        expected_baseline_hours,core_assets_json,evidence_requirements_json,approved_claims_json,
        content_sha256,approval_state,approved_by,approved_at,created_at,updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        versionId,
        demoId,
        1,
        'rndrntwrk/outreachr',
        COMMIT_SHA,
        'hackathon/{event}/{entry}',
        24,
        JSON.stringify(['bounded adapter']),
        JSON.stringify(['tests', 'commit evidence']),
        JSON.stringify(['A bounded component produces a reproducible outcome.']),
        SHA256,
        'approved',
        'founder',
        NOW,
        NOW,
        NOW,
      ],
    );
  }
}

export function addSource(core: CoreVault): void {
  core.run(
    `INSERT INTO sources(
      id,canonical_url,title,publisher,source_type,retrieved_at,published_on,
      rights_class,redistribution_status,attribution,excerpt,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      'source:rules',
      'https://example.test/rules',
      'Official rules',
      'Example Foundation',
      'official_rules',
      NOW,
      null,
      'public_web',
      'attribution_required',
      'Example Foundation',
      null,
      NOW,
      NOW,
    ],
  );
}
