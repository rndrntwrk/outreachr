import { createRequire } from 'node:module';

import initSqlJs, { type SqlJsStatic } from 'sql.js';
import { beforeAll, describe, expect, it } from 'vitest';

import { CoreVault } from '../src/index.js';

const NOW = '2026-08-15T10:00:00.000Z';
let SQL: SqlJsStatic;

beforeAll(async () => {
  const require = createRequire(import.meta.url);
  const wasm = require.resolve('sql.js/dist/sql-wasm.wasm');
  SQL = await initSqlJs({ locateFile: () => wasm });
});

describe('opportunity evidence review hardening', () => {
  it('requires evidence to start pending and freezes a completed review', () => {
    const core = new CoreVault(SQL, { appliedAt: NOW });
    core.run(`
      INSERT INTO organizations(
        id,name,normalized_name,kind,website,description,linked_firm_id,is_public,
        contribution_eligible,origin,created_at,updated_at
      ) VALUES (
        'organization:test','Example Foundation','example foundation','foundation',
        'https://example.test',NULL,NULL,1,0,'local','${NOW}','${NOW}'
      );
      INSERT INTO opportunities(
        id,organizer_organization_id,name,opportunity_type,status,public_url,application_url,
        open_date,deadline,start_date,end_date,format,location,eligibility_summary,terms_summary,
        capital_prize_summary,freshness_state,review_state,imported_package_id,
        imported_package_digest,created_at,updated_at
      ) VALUES (
        'opportunity:test','organization:test','Example Hackathon','hackathon','open',
        'https://example.test/hackathon',NULL,NULL,NULL,NULL,NULL,'online',NULL,NULL,NULL,NULL,
        'current','reviewed',NULL,NULL,'${NOW}','${NOW}'
      );
      INSERT INTO sources(
        id,canonical_url,title,publisher,source_type,retrieved_at,published_on,
        rights_class,redistribution_status,attribution,excerpt,created_at,updated_at
      ) VALUES (
        'source:rules','https://example.test/rules','Official rules','Example Foundation',
        'official_rules','${NOW}',NULL,'public_web','attribution_required',
        'Example Foundation',NULL,'${NOW}','${NOW}'
      );
    `);

    expect(() =>
      core.run(
        `INSERT INTO opportunity_sources(
          opportunity_id,source_id,source_role,observed_at,confidence,
          review_state,reviewed_at,created_at
        ) VALUES (?,?,?,?,?,?,?,?)`,
        [
          'opportunity:test',
          'source:rules',
          'official rules',
          NOW,
          'verified',
          'accepted',
          NOW,
          NOW,
        ],
      ),
    ).toThrow('new opportunity sources must start pending');

    core.run(
      `INSERT INTO opportunity_sources(
        opportunity_id,source_id,source_role,observed_at,confidence,
        review_state,reviewed_at,created_at
      ) VALUES (?,?,?,?,?,?,?,?)`,
      [
        'opportunity:test',
        'source:rules',
        'official rules',
        NOW,
        'verified',
        'pending',
        null,
        NOW,
      ],
    );
    core.run(
      `UPDATE opportunity_sources SET review_state='accepted',reviewed_at=?
       WHERE opportunity_id=? AND source_id=? AND source_role=?`,
      [NOW, 'opportunity:test', 'source:rules', 'official rules'],
    );
    expect(() =>
      core.run(
        `UPDATE opportunity_sources SET confidence='unknown'
         WHERE opportunity_id=? AND source_id=? AND source_role=?`,
        ['opportunity:test', 'source:rules', 'official rules'],
      ),
    ).toThrow('reviewed opportunity sources are immutable');
    core.close();
  });
});
