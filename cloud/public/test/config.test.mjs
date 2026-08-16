import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const config = JSON.parse(
  await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'),
);

test('public Worker uses bounded CPU and subrequest ceilings', () => {
  assert.equal(Number.isInteger(config.limits?.cpu_ms), true);
  assert.equal(config.limits.cpu_ms > 0, true);
  assert.equal(config.limits.cpu_ms <= 50, true);
  assert.equal(Number.isInteger(config.limits?.subrequests), true);
  assert.equal(config.limits.subrequests > 0, true);
  assert.equal(config.limits.subrequests <= 8, true);
});

test('public Worker binds immutable version metadata and isolated cost datasets', () => {
  assert.equal(config.version_metadata?.binding, 'CF_VERSION_METADATA');
  assert.deepEqual(config.analytics_engine_datasets, [
    { binding: 'COST_METRICS', dataset: 'outreachr_public_cost_dev' },
  ]);
  assert.deepEqual(config.env?.staging?.analytics_engine_datasets, [
    { binding: 'COST_METRICS', dataset: 'outreachr_public_cost_staging' },
  ]);
  assert.deepEqual(config.env?.production?.analytics_engine_datasets, [
    { binding: 'COST_METRICS', dataset: 'outreachr_public_cost_prod' },
  ]);
});

test('private bindings and secret-like variables are absent from the public Worker', () => {
  const serialized = JSON.stringify(config).toLowerCase();
  for (const prohibited of [
    'private_backups',
    'device_registry',
    'oauth_secret',
    'api_token',
    'signing_private_key',
    'founder_vault',
  ]) {
    assert.equal(serialized.includes(prohibited), false, prohibited);
  }
});
