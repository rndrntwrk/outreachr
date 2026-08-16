#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_POLICY = Object.freeze({
  maximumErrorRateDelta: 0.005,
  maximumP95WallMsRatio: 1.15,
  maximumR2ReadsPerRequestRatio: 1,
});

const OVERRIDABLE_METRICS = new Set([
  'error_rate',
  'p95_wall_ms',
  'r2_reads_per_request',
]);

function objectValue(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} evidence is required`);
  }
  return value;
}

function nonEmptyString(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required`);
  return value.trim();
}

function positiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${label} must be greater than zero`);
  return value;
}

function nonNegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return value;
}

function nonNegativeNumber(value, label) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative number`);
  }
  return value;
}

function parseEvidence(value, label) {
  const evidence = objectValue(value, label);
  const requests = positiveInteger(evidence.requests, `${label} requests`);
  const errors = nonNegativeInteger(evidence.errors, `${label} errors`);
  if (errors > requests) throw new Error(`${label} errors cannot exceed requests`);
  return {
    version: nonEmptyString(evidence.version, `${label} version`),
    route: nonEmptyString(evidence.route, `${label} route`),
    requests,
    errors,
    p95WallMs: nonNegativeNumber(evidence.p95WallMs, `${label} p95WallMs`),
    r2Reads: nonNegativeInteger(evidence.r2Reads, `${label} r2Reads`),
  };
}

export function parsePublicVersionComparison(input) {
  const value = objectValue(input, 'comparison');
  if (value.schemaVersion !== 1) throw new Error('schemaVersion must be 1');
  const baseline = parseEvidence(value.baseline, 'baseline');
  const candidate = parseEvidence(value.candidate, 'candidate');
  if (baseline.route !== candidate.route) {
    throw new Error('baseline and candidate route must match');
  }
  if (baseline.version === candidate.version) {
    throw new Error('candidate version must differ from baseline version');
  }
  return {
    schemaVersion: 1,
    baseline,
    candidate,
    override: value.override ?? null,
  };
}

function ratio(candidate, baseline) {
  if (baseline === 0) return candidate === 0 ? 1 : Number.POSITIVE_INFINITY;
  return candidate / baseline;
}

function units(evidence) {
  return {
    errorRate: evidence.errors / evidence.requests,
    r2ReadsPerRequest: evidence.r2Reads / evidence.requests,
  };
}

function parseOverride(value, now) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const maximum = value.maximumRegression;
  if (!maximum || typeof maximum !== 'object' || Array.isArray(maximum)) return null;
  const reason = typeof value.reason === 'string' ? value.reason.trim() : '';
  const owner = typeof value.owner === 'string' ? value.owner.trim() : '';
  const benefitClass = value.benefitClass;
  const followUpIssue = typeof value.followUpIssue === 'string' ? value.followUpIssue.trim() : '';
  const approvedAt = Date.parse(value.approvedAt);
  const expiresAt = Date.parse(value.expiresAt);
  const nowAt = Date.parse(now);
  const metric = maximum.metric;
  const maximumRatio = maximum.ratio;
  if (
    !reason ||
    !owner ||
    !['product', 'reliability', 'security'].includes(benefitClass) ||
    !Number.isFinite(approvedAt) ||
    !Number.isFinite(expiresAt) ||
    !Number.isFinite(nowAt) ||
    approvedAt > nowAt ||
    expiresAt <= nowAt ||
    expiresAt <= approvedAt ||
    !OVERRIDABLE_METRICS.has(metric) ||
    !Number.isFinite(maximumRatio) ||
    maximumRatio < 1
  ) {
    return null;
  }
  try {
    const url = new URL(followUpIssue);
    if (url.protocol !== 'https:') return null;
  } catch {
    return null;
  }
  return {
    reason,
    benefitClass,
    owner,
    approvedAt: new Date(approvedAt).toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
    followUpIssue,
    maximumRegression: { metric, ratio: maximumRatio },
  };
}

export function evaluatePublicVersionMetrics(input, options = {}) {
  const parsed = parsePublicVersionComparison(input);
  const policy = {
    ...DEFAULT_POLICY,
    ...(options.policy ?? {}),
  };
  const now = options.now ?? new Date().toISOString();
  const baselineUnits = units(parsed.baseline);
  const candidateUnits = units(parsed.candidate);
  const regressions = [];

  const errorAllowed = baselineUnits.errorRate + policy.maximumErrorRateDelta;
  if (candidateUnits.errorRate > errorAllowed) {
    regressions.push({
      metric: 'error_rate',
      baseline: baselineUnits.errorRate,
      candidate: candidateUnits.errorRate,
      allowed: errorAllowed,
      ratio: ratio(candidateUnits.errorRate, baselineUnits.errorRate),
    });
  }

  const p95Allowed = parsed.baseline.p95WallMs * policy.maximumP95WallMsRatio;
  if (parsed.candidate.p95WallMs > p95Allowed) {
    regressions.push({
      metric: 'p95_wall_ms',
      baseline: parsed.baseline.p95WallMs,
      candidate: parsed.candidate.p95WallMs,
      allowed: p95Allowed,
      ratio: ratio(parsed.candidate.p95WallMs, parsed.baseline.p95WallMs),
    });
  }

  const r2Allowed =
    baselineUnits.r2ReadsPerRequest * policy.maximumR2ReadsPerRequestRatio;
  if (candidateUnits.r2ReadsPerRequest > r2Allowed) {
    regressions.push({
      metric: 'r2_reads_per_request',
      baseline: baselineUnits.r2ReadsPerRequest,
      candidate: candidateUnits.r2ReadsPerRequest,
      allowed: r2Allowed,
      ratio: ratio(candidateUnits.r2ReadsPerRequest, baselineUnits.r2ReadsPerRequest),
    });
  }

  const override = parseOverride(parsed.override, now);
  const overrideApplied = Boolean(
    override &&
      regressions.length === 1 &&
      regressions[0].metric === override.maximumRegression.metric &&
      regressions[0].ratio <= override.maximumRegression.ratio,
  );

  return {
    schemaVersion: 1,
    route: parsed.baseline.route,
    baselineVersion: parsed.baseline.version,
    candidateVersion: parsed.candidate.version,
    passed: regressions.length === 0 || overrideApplied,
    overrideApplied,
    override: overrideApplied ? override : null,
    policy,
    units: {
      baseline: baselineUnits,
      candidate: candidateUnits,
    },
    regressions,
  };
}

async function main() {
  const path = process.argv[2];
  if (!path) throw new Error('Usage: compare-public-version-metrics.mjs <comparison.json>');
  const input = JSON.parse(await readFile(resolve(path), 'utf8'));
  const result = evaluatePublicVersionMetrics(input);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.passed) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
