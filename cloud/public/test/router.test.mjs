import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

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

function assetsBinding() {
  return {
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname === '/missing') {
        return new Response('not found', {
          status: 404,
          headers: { 'content-type': 'text/plain; charset=utf-8' },
        });
      }
      return new Response('<!doctype html><title>Outreachr</title>', {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    },
  };
}

function completeBucket() {
  return new MemoryBucket({
    'atlas/index.json': {
      body: JSON.stringify({ schemaVersion: 1, packages: [] }),
      contentType: 'application/json',
    },
    'releases/index.json': {
      body: JSON.stringify({ schemaVersion: 1, channels: ['stable'] }),
      contentType: 'application/json',
    },
    'releases/manifests/stable/linux/x64.json': {
      body: JSON.stringify({ schemaVersion: 1, channel: 'stable', version: '0.1.2' }),
      contentType: 'application/json',
    },
    'releases/artifacts/outreachr/v0.1.2/linux-x64.zip': {
      body: 'synthetic-release-bytes',
      contentType: 'application/zip',
    },
  });
}

function environment(overrides = {}) {
  return {
    ASSETS: assetsBinding(),
    PUBLIC_ARTIFACTS: completeBucket(),
    ENVIRONMENT: 'test',
    SERVICE_VERSION: 'test-version',
    ...overrides,
  };
}

function request(path, init = {}) {
  return new Request(`https://public.outreachr.test${path}`, init);
}

async function json(response) {
  return JSON.parse(await response.text());
}

function assertSecurityHeaders(response) {
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.match(response.headers.get('permissions-policy') ?? '', /camera=\(\)/u);
  assert.match(response.headers.get('content-security-policy') ?? '', /default-src 'self'/u);
  assert.match(response.headers.get('x-request-id') ?? '', /^[a-f0-9-]{36}$/u);
}

test('GET /health/live returns bounded service identity without caching', async () => {
  const response = await routePublicRequest(request('/health/live'), environment());

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await json(response), {
    status: 'ok',
    service: 'outreachr-public',
    environment: 'test',
    version: 'test-version',
  });
  assertSecurityHeaders(response);
});

test('GET /health/ready fails closed when bindings or sentinel objects are missing', async () => {
  const noBinding = await routePublicRequest(
    request('/health/ready'),
    environment({ PUBLIC_ARTIFACTS: undefined }),
  );
  assert.equal(noBinding.status, 503);
  assert.deepEqual(await json(noBinding), {
    status: 'degraded',
    service: 'outreachr-public',
    checks: {
      assets: 'ok',
      publicArtifacts: 'missing_binding',
      atlasIndex: 'not_checked',
      releaseIndex: 'not_checked',
    },
  });

  const missingAtlas = await routePublicRequest(
    request('/health/ready'),
    environment({
      PUBLIC_ARTIFACTS: new MemoryBucket({
        'releases/index.json': {
          body: '{}',
          contentType: 'application/json',
        },
      }),
    }),
  );
  assert.equal(missingAtlas.status, 503);
  assert.equal((await json(missingAtlas)).checks.atlasIndex, 'missing');
});

test('GET /health/ready succeeds only when assets and required R2 indexes are available', async () => {
  const response = await routePublicRequest(request('/health/ready'), environment());

  assert.equal(response.status, 200);
  assert.deepEqual(await json(response), {
    status: 'ready',
    service: 'outreachr-public',
    checks: {
      assets: 'ok',
      publicArtifacts: 'ok',
      atlasIndex: 'ok',
      releaseIndex: 'ok',
    },
  });
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('Atlas index is served from R2 with ETag and bounded public caching', async () => {
  const response = await routePublicRequest(request('/api/v1/atlas/index'), environment());

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/json');
  assert.equal(
    response.headers.get('cache-control'),
    'public, max-age=300, stale-while-revalidate=3600',
  );
  assert.match(response.headers.get('etag') ?? '', /^"[a-f0-9]{64}"$/u);
  assert.deepEqual(await json(response), { schemaVersion: 1, packages: [] });
});

test('release manifests use allowlisted channel, platform and architecture coordinates', async () => {
  const response = await routePublicRequest(
    request('/api/v1/releases/stable/linux/x64'),
    environment(),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await json(response), {
    schemaVersion: 1,
    channel: 'stable',
    version: '0.1.2',
  });
  assert.equal(response.headers.get('cache-control'), 'public, max-age=60');

  for (const path of [
    '/api/v1/releases/nightly/linux/x64',
    '/api/v1/releases/stable/freebsd/x64',
    '/api/v1/releases/stable/linux/mips',
    '/api/v1/releases/stable/linux/x64/extra',
  ]) {
    const invalid = await routePublicRequest(request(path), environment());
    assert.equal(invalid.status, 400, path);
    assert.equal((await json(invalid)).error, 'invalid_release_coordinate');
  }
});

test('release artifacts are streamed from R2 with immutable caching', async () => {
  const response = await routePublicRequest(
    request('/downloads/outreachr/v0.1.2/linux-x64.zip'),
    environment(),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/zip');
  assert.equal(response.headers.get('content-length'), String('synthetic-release-bytes'.length));
  assert.equal(response.headers.get('cache-control'), 'public, max-age=31536000, immutable');
  assert.equal(await response.text(), 'synthetic-release-bytes');
});

test('download paths reject traversal, encoded separators, backslashes and empty keys', async () => {
  for (const path of [
    '/downloads/',
    '/downloads/../private',
    '/downloads/%2e%2e/private',
    '/downloads/folder%2Fsecret',
    '/downloads/folder%5Csecret',
    '/downloads/folder\\secret',
    '/downloads//double',
  ]) {
    const response = await routePublicRequest(request(path), environment());
    assert.equal(response.status, 400, path);
    assert.equal((await json(response)).error, 'invalid_artifact_key');
  }
});

test('HEAD returns headers without a response body for generated and R2 routes', async () => {
  for (const path of [
    '/health/live',
    '/api/v1/atlas/index',
    '/api/v1/releases/stable/linux/x64',
    '/downloads/outreachr/v0.1.2/linux-x64.zip',
  ]) {
    const response = await routePublicRequest(
      request(path, { method: 'HEAD' }),
      environment(),
    );
    assert.equal(response.status, 200, path);
    assert.equal(await response.text(), '', path);
  }
});

test('static assets are the fallback and receive the same security headers', async () => {
  const response = await routePublicRequest(request('/'), environment());

  assert.equal(response.status, 200);
  assert.match(await response.text(), /Outreachr/u);
  assertSecurityHeaders(response);
});

test('unsupported methods fail with 405 and an explicit Allow header', async () => {
  const response = await routePublicRequest(
    request('/api/v1/atlas/index', { method: 'POST', body: '{}' }),
    environment(),
  );

  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET, HEAD');
  assert.equal((await json(response)).error, 'method_not_allowed');
  assertSecurityHeaders(response);
});
