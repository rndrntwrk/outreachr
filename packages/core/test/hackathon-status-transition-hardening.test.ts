import { createRequire } from 'node:module';

import initSqlJs, { type SqlJsStatic } from 'sql.js';
import { beforeAll, describe, expect, it } from 'vitest';

import { CoreVault } from '../src/index.js';

const NOW = '2026-08-15T10:00:00.000Z';
const SHA256 = 'a'.repeat(64);
const COMMIT_SHA = 'b'.repeat(40);
let SQL: SqlJsStatic;

beforeAll(async () => {
  const require = createRequire(import.meta.url);
  const wasm = require.resolve('sql.js/dist/sql-wasm.wasm');
  SQL = await initSqlJs({ locateFile: () => wasm });
});

describe('Hackathon Studio status transition hardening', () => {
  it('requires draft to approved to active and locks approved distribution items', () => {
    const core = new CoreVault(SQL, { appliedAt: NOW });
    core.run('PRAGMA foreign_keys=OFF');
    core.run(
      `INSERT INTO hackathon_builds(
        id,entry_id,status,repository,base_commit_sha,branch_name,worktree_reference,
        adapter_path,owner_agent,tool_policy_json,budget_usd,budget_hours,start_conditions,
        stop_conditions,current_commit_sha,ci_state,security_review_state,
        evidence_manifest_sha256,merge_decision,approved_by,approved_at,started_at,
        completed_at,created_at,updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        'build:test',
        'entry:test',
        'draft',
        'rndrntwrk/Sw4p',
        COMMIT_SHA,
        'hackathon/example/test',
        null,
        null,
        'codex',
        '{}',
        0,
        48,
        'Founder approves the scoped entry.',
        'Stop on policy violation.',
        null,
        'not_run',
        'pending',
        null,
        'pending',
        null,
        null,
        null,
        null,
        NOW,
        NOW,
      ],
    );
    expect(() =>
      core.run(
        `UPDATE hackathon_builds
         SET status='active',approved_by='founder',approved_at=?,current_commit_sha=?
         WHERE id='build:test'`,
        [NOW, COMMIT_SHA],
      ),
    ).toThrow('invalid hackathon build status transition');
    core.run(
      `UPDATE hackathon_builds SET status='approved',approved_by='founder',approved_at=?
       WHERE id='build:test'`,
      [NOW],
    );
    core.run(
      `UPDATE hackathon_builds SET status='active',current_commit_sha=?
       WHERE id='build:test'`,
      [COMMIT_SHA],
    );

    core.run(
      `INSERT INTO hackathon_distribution_plans(
        id,entry_id,summary,status,content_sha256,approved_by,approved_at,created_at,updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?)`,
      ['plan:test', 'entry:test', 'Distribution plan.', 'draft', SHA256, null, null, NOW, NOW],
    );
    expect(() =>
      core.run(
        `UPDATE hackathon_distribution_plans
         SET status='active',approved_by='founder',approved_at=? WHERE id='plan:test'`,
        [NOW],
      ),
    ).toThrow('invalid hackathon distribution plan status transition');
    core.run(
      `UPDATE hackathon_distribution_plans
       SET status='approved',approved_by='founder',approved_at=? WHERE id='plan:test'`,
      [NOW],
    );
    expect(() =>
      core.run(
        `INSERT INTO hackathon_distribution_items(
          id,plan_id,kind,phase,status,title,scheduled_at,completed_at,reference,
          created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [
          'item:late',
          'plan:test',
          'launch_post',
          'submission_day',
          'planned',
          'Late item',
          null,
          null,
          null,
          NOW,
          NOW,
        ],
      ),
    ).toThrow('approved hackathon distribution plan cannot accept new items');

    expect(() =>
      core.run(
        `INSERT INTO hackathon_assets(
          id,entry_id,kind,required,status,reference,content_sha256,
          founder_review_state,reviewed_at,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [
          'asset:direct',
          'entry:test',
          'readme',
          1,
          'approved',
          'local://readme',
          SHA256,
          'accepted',
          NOW,
          NOW,
          NOW,
        ],
      ),
    ).toThrow('new hackathon assets must start pending');
    core.close();
  });
});
