import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluatePublicVersionMetrics,
  parsePublicVersionComparison,
} from '../compare-public-version-metrics.mjs';

const NOW = '2026-08-16T12:00:00.000Z';

function comparison(overrides = {}) {
  return {
    schemaVersion: 1,
    baseline: {
      version: 'version-baseline',
      route: 'atlas_index',
      requests: 1_000,
      errors: 0,
      p95WallMs: 12,
      r2Reads: 1_000,
    },
    candidate: {
      version: 'version-candidate',
      route: 'atlas_index',
      requests: 1_000,
      errors: 0,
      p95WallMs: 13,
      r2Reads: 1_000,
    },
    ...overrides,
  };
}

test('equivalent operation counts and bounded latency pass without an override', () => {
  const result = evaluatePublicVersionMetrics(comparison(), { now: NOW });

  assert.equal(result.passed, true);
  assert.equal(result.overrideApplied, false);
  assert.deepEqual(result.regressions, []);
  assert.deepEqual(result.units, {
    baseline: {
      errorRate: 0,
      r2ReadsPerRequest: 1,
    },
    candidate: {
      errorRate: 0,
      r2ReadsPerRequest: 1,
    },
  });
});

test('missing or zero candidate evidence fails closed', () => {
  assert.throws(
    () =>
      parsePublicVersionComparison({
        ...comparison(),
        candidate: { ...comparison().candidate, requests: 0 },
      }),
    /candidate requests must be greater than zero/u,
  );
  assert.throws(
    () => parsePublicVersionComparison({ ...comparison(), candidate: null }),
    /candidate evidence is required/u,
  );
});

test('R2 operation amplification fails the gate even when function and latency pass', () => {
  const result = evaluatePublicVersionMetrics(
    comparison({
      candidate: { ...comparison().candidate, r2Reads: 1_100 },
    }),
    { now: NOW },
  );

  assert.equal(result.passed, false);
  assert.deepEqual(result.regressions, [
    {
      metric: 'r2_reads_per_request',
      baseline: 1,
      candidate: 1.1,
      allowed: 1,
      ratio: 1.1,
    },
  ]);
});

test('material p95 latency or error-rate regression fails the gate', () => {
  const result = evaluatePublicVersionMetrics(
    comparison({
      candidate: {
        ...comparison().candidate,
        errors: 20,
        p95WallMs: 15,
      },
    }),
    { now: NOW },
  );

  assert.equal(result.passed, false);
  assert.deepEqual(
    result.regressions.map((item) => item.metric),
    ['error_rate', 'p95_wall_ms'],
  );
});

test('a complete unexpired override may accept only the regression it bounds', () => {
  const result = evaluatePublicVersionMetrics(
    comparison({
      candidate: { ...comparison().candidate, p95WallMs: 15 },
      override: {
        reason: 'Additional signature verification is required for release safety.',
        benefitClass: 'security',
        owner: 'founder',
        approvedAt: '2026-08-16T10:00:00.000Z',
        expiresAt: '2026-08-23T10:00:00.000Z',
        followUpIssue: 'https://github.com/rndrntwrk/outreachr/issues/101',
        maximumRegression: {
          metric: 'p95_wall_ms',
          ratio: 1.3,
        },
      },
    }),
    { now: NOW },
  );

  assert.equal(result.passed, true);
  assert.equal(result.overrideApplied, true);
  assert.equal(result.regressions.length, 1);
});

test('an expired, incomplete, mismatched or insufficient override does not bypass the gate', () => {
  const candidate = { ...comparison().candidate, r2Reads: 1_200 };
  const baseOverride = {
    reason: 'Measured temporary routing exception.',
    benefitClass: 'reliability',
    owner: 'founder',
    approvedAt: '2026-08-15T10:00:00.000Z',
    expiresAt: '2026-08-15T11:00:00.000Z',
    followUpIssue: 'https://github.com/rndrntwrk/outreachr/issues/102',
    maximumRegression: {
      metric: 'r2_reads_per_request',
      ratio: 1.1,
    },
  };

  for (const override of [
    baseOverride,
    { ...baseOverride, expiresAt: '2026-08-23T10:00:00.000Z', owner: '' },
    {
      ...baseOverride,
      expiresAt: '2026-08-23T10:00:00.000Z',
      maximumRegression: { metric: 'p95_wall_ms', ratio: 2 },
    },
    {
      ...baseOverride,
      expiresAt: '2026-08-23T10:00:00.000Z',
      maximumRegression: { metric: 'r2_reads_per_request', ratio: 1.1 },
    },
  ]) {
    const result = evaluatePublicVersionMetrics(
      comparison({ candidate, override }),
      { now: NOW },
    );
    assert.equal(result.passed, false);
    assert.equal(result.overrideApplied, false);
  }
});

test('route and version identity mismatches are rejected before comparison', () => {
  assert.throws(
    () =>
      parsePublicVersionComparison(
        comparison({
          candidate: { ...comparison().candidate, route: 'release_artifact' },
        }),
      ),
    /baseline and candidate route must match/u,
  );
  assert.throws(
    () =>
      parsePublicVersionComparison(
        comparison({
          candidate: { ...comparison().candidate, version: 'version-baseline' },
        }),
      ),
    /candidate version must differ from baseline version/u,
  );
});
