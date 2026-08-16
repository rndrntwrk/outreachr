import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import {
  PUBLIC_ROUTE_COST_PROFILES,
  buildPublicCostPoint,
} from '../src/cost-metrics.mjs';
import { routePublicRequest } from '../src/router.mjs';

class MemoryR2Object {
  constructor(body, contentType = 'application/octet-stream') {
    this.bytes = new TextEncoder().encode(body);
    this.body = this.bytes;
    this.size = this.bytes.byteLength;
    this.httpEtag = `"${createHash('sha256').update(this.bytes).digest('hex')}"`;
    this.httpMetadata = { contentType };
    this.customMetadata = {};
    this.uploaded = new Date('2026-08-15T12:00:00.000Z');
  }
}

class MemoryBucket {
  constructor(entries = {}) {
    this.entries = new Map(
      Object.entries(entries).map(([key, value]) => [
        key,
        new MemoryR2Object(value.body, value.contentType),
      ]),
    );
  }

  async get(key) {
    return this.entries.get(key) ?? null;
  }

  async head(key) {
    const object = this.entries.get(key);
    if (!object) return null;
    return {
      size: object.size,
      httpEtag: object.httpEtag,
      httpMetadata: object.httpMetadata,
      customMetadata: object.customMetadata,
      uploaded: object.uploaded,
    };
  }
}

class MemoryDataset {
  points = [];

  writeDataPoint(point) {
    this.points.push(point);
  }
}

function bucket() {
  return new MemoryBucket({
    'atlas/index.json': {
      body: JSON.stringify({ schemaVersion: 1, packages: [] }),
      contentType: 'application/json',
    },
    'releases/index.json': {
      body: JSON.stringify({ schemaVersion: 1, channels: ['stable'] }),
      contentType: 'application/json',
    },
    'releases/artifacts/outreachr/v0.1.2/linux-x64.zip': {
      body: 'synthetic-release-bytes',
      contentType: 'application/zip',
    },
  });
}

test('public route profiles assign an explicit execution class, unit and storage-read budget', () => {
  assert.deepEqual(PUBLIC_ROUTE_COST_PROFILES.release_artifact, {
    executionClass: 'worker-isolate+r2',
    unit: 'release-artifact-delivery',
    cacheClass: 'immutable',
    storageReadOperations: 1,
  });
  assert.deepEqual(PUBLIC_ROUTE_COST_PROFILES.health_live, {
    executionClass: 'worker-isolate',
    unit: 'liveness-probe',
    cacheClass: 'no-store',
    storageReadOperations: 0,
  });
  assert.equal(Object.isFrozen(PUBLIC_ROUTE_COST_PROFILES), true);
});

test('cost points use one stable sampling index and ordered technical dimensions', () => {
  const point = buildPublicCostPoint({
    routeClass: 'atlas_index',
    method: 'GET',
    status: 200,
    responseBytes: 42,
    handlerWallMs: 1.25,
    environment: 'test',
    version: 'version-123',
  });

  assert.deepEqual(point, {
    indexes: ['outreachr-public:test'],
    blobs: [
      'atlas_index',
      'worker-isolate+r2',
      'atlas-index-delivery',
      'bounded',
      'GET',
      'success',
      'version-123',
    ],
    doubles: [1, 200, 42, 1, 1.25],
  });
});

test('artifact delivery emits one non-blocking unit-economics data point', async () => {
  const metrics = new MemoryDataset();
  const response = await routePublicRequest(
    new Request('https://public.outreachr.test/downloads/outreachr/v0.1.2/linux-x64.zip'),
    {
      PUBLIC_ARTIFACTS: bucket(),
      ENVIRONMENT: 'test',
      SERVICE_VERSION: 'test-version',
      COST_METRICS: metrics,
    },
  );

  assert.equal(response.status, 200);
  assert.equal(metrics.points.length, 1);
  const point = metrics.points[0];
  assert.deepEqual(point.indexes, ['outreachr-public:test']);
  assert.deepEqual(point.blobs, [
    'release_artifact',
    'worker-isolate+r2',
    'release-artifact-delivery',
    'immutable',
    'GET',
    'success',
    'test-version',
  ]);
  assert.deepEqual(point.doubles.slice(0, 4), [
    1,
    200,
    'synthetic-release-bytes'.length,
    1,
  ]);
  assert.equal(Number.isFinite(point.doubles[4]), true);
  assert.equal(point.doubles[4] >= 0, true);
});

test('liveness records zero storage reads and metric failure never changes the response', async () => {
  const response = await routePublicRequest(
    new Request('https://public.outreachr.test/health/live'),
    {
      ENVIRONMENT: 'test',
      SERVICE_VERSION: 'test-version',
      COST_METRICS: {
        writeDataPoint() {
          throw new Error('synthetic metrics outage');
        },
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: 'ok',
    service: 'outreachr-public',
    environment: 'test',
    version: 'test-version',
  });
});
