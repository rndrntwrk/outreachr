const SERVICE_NAME = 'outreachr-public';
const ALLOWED_METHODS = new Set(['GET', 'HEAD']);
const RELEASE_CHANNELS = new Set(['dev', 'staging', 'stable']);
const RELEASE_PLATFORMS = new Set(['darwin', 'win32', 'linux']);
const RELEASE_ARCHITECTURES = new Set(['x64', 'arm64']);
const READY_OBJECTS = {
  atlasIndex: 'atlas/index.json',
  releaseIndex: 'releases/index.json',
};

const SECURITY_HEADERS = {
  'content-security-policy':
    "default-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; object-src 'none'",
  'permissions-policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
};

function requestId() {
  return globalThis.crypto?.randomUUID?.() ?? '00000000-0000-4000-8000-000000000000';
}

function jsonResponse(value, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  });
}

function finalize(response, id, headOnly) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }
  headers.set('x-request-id', id);
  return new Response(headOnly ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function serviceIdentity(env) {
  return {
    status: 'ok',
    service: SERVICE_NAME,
    environment: env.ENVIRONMENT ?? 'development',
    version: env.SERVICE_VERSION ?? 'development',
  };
}

function objectHeaders(object, cacheControl, contentDisposition = null) {
  const headers = new Headers();
  headers.set('cache-control', cacheControl);
  headers.set('content-type', object.httpMetadata?.contentType ?? 'application/octet-stream');
  headers.set('content-length', String(object.size));
  if (object.httpEtag) headers.set('etag', object.httpEtag);
  if (object.uploaded instanceof Date && !Number.isNaN(object.uploaded.valueOf())) {
    headers.set('last-modified', object.uploaded.toUTCString());
  }
  if (contentDisposition) headers.set('content-disposition', contentDisposition);
  return headers;
}

async function r2ObjectResponse(bucket, key, method, cacheControl, contentDisposition = null) {
  if (!bucket) {
    return jsonResponse({ error: 'public_artifacts_unavailable' }, 503, {
      'cache-control': 'no-store',
    });
  }
  const object = method === 'HEAD' ? await bucket.head(key) : await bucket.get(key);
  if (!object) {
    return jsonResponse({ error: 'not_found' }, 404, {
      'cache-control': 'no-store',
    });
  }
  return new Response(method === 'HEAD' ? null : object.body, {
    status: 200,
    headers: objectHeaders(object, cacheControl, contentDisposition),
  });
}

async function readinessResponse(env) {
  const checks = {
    assets: env.ASSETS && typeof env.ASSETS.fetch === 'function' ? 'ok' : 'missing_binding',
    publicArtifacts: env.PUBLIC_ARTIFACTS ? 'ok' : 'missing_binding',
    atlasIndex: 'not_checked',
    releaseIndex: 'not_checked',
  };

  if (env.PUBLIC_ARTIFACTS) {
    const [atlas, releases] = await Promise.all([
      env.PUBLIC_ARTIFACTS.head(READY_OBJECTS.atlasIndex),
      env.PUBLIC_ARTIFACTS.head(READY_OBJECTS.releaseIndex),
    ]);
    checks.atlasIndex = atlas ? 'ok' : 'missing';
    checks.releaseIndex = releases ? 'ok' : 'missing';
  }

  const ready = Object.values(checks).every((value) => value === 'ok');
  return jsonResponse(
    {
      status: ready ? 'ready' : 'degraded',
      service: SERVICE_NAME,
      checks,
    },
    ready ? 200 : 503,
    { 'cache-control': 'no-store' },
  );
}

function parseReleaseCoordinate(pathname) {
  if (!pathname.startsWith('/api/v1/releases/')) return null;
  const match = pathname.match(
    /^\/api\/v1\/releases\/([^/]+)\/([^/]+)\/([^/]+)$/u,
  );
  if (!match) return { valid: false };
  const [, channel, platform, architecture] = match;
  const valid =
    RELEASE_CHANNELS.has(channel) &&
    RELEASE_PLATFORMS.has(platform) &&
    RELEASE_ARCHITECTURES.has(architecture);
  return valid
    ? { valid: true, channel, platform, architecture }
    : { valid: false };
}

function parseArtifactKey(pathname) {
  if (!pathname.startsWith('/downloads/')) return null;
  const encoded = pathname.slice('/downloads/'.length);
  if (!encoded || /%2f|%5c/iu.test(encoded)) return { valid: false };

  let decoded;
  try {
    decoded = decodeURIComponent(encoded);
  } catch {
    return { valid: false };
  }

  const segments = decoded.split('/');
  if (
    decoded.includes('\\') ||
    segments.some((segment) => !segment || segment === '.' || segment === '..') ||
    !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,1023}$/u.test(decoded)
  ) {
    return { valid: false };
  }
  return { valid: true, key: decoded };
}

function attachmentName(key) {
  const value = key.split('/').at(-1) ?? 'download';
  return value.replace(/[^A-Za-z0-9._-]/gu, '_');
}

export async function routePublicRequest(request, env = {}, _context = undefined) {
  const id = requestId();
  const method = request.method?.toUpperCase?.() ?? 'GET';
  const headOnly = method === 'HEAD';

  if (!ALLOWED_METHODS.has(method)) {
    return finalize(
      jsonResponse({ error: 'method_not_allowed' }, 405, {
        allow: 'GET, HEAD',
        'cache-control': 'no-store',
      }),
      id,
      false,
    );
  }

  const url = new URL(request.url);
  const pathname = url.pathname;
  let response;

  if (pathname === '/health/live') {
    response = jsonResponse(serviceIdentity(env), 200, { 'cache-control': 'no-store' });
  } else if (pathname === '/health/ready') {
    response = await readinessResponse(env);
  } else if (pathname === '/api/v1/atlas/index') {
    response = await r2ObjectResponse(
      env.PUBLIC_ARTIFACTS,
      READY_OBJECTS.atlasIndex,
      method,
      'public, max-age=300, stale-while-revalidate=3600',
    );
  } else {
    const release = parseReleaseCoordinate(pathname);
    if (release) {
      response = release.valid
        ? await r2ObjectResponse(
            env.PUBLIC_ARTIFACTS,
            `releases/manifests/${release.channel}/${release.platform}/${release.architecture}.json`,
            method,
            'public, max-age=60',
          )
        : jsonResponse({ error: 'invalid_release_coordinate' }, 400, {
            'cache-control': 'no-store',
          });
    } else {
      const artifact = parseArtifactKey(pathname);
      if (artifact) {
        response = artifact.valid
          ? await r2ObjectResponse(
              env.PUBLIC_ARTIFACTS,
              `releases/artifacts/${artifact.key}`,
              method,
              'public, max-age=31536000, immutable',
              `attachment; filename="${attachmentName(artifact.key)}"`,
            )
          : jsonResponse({ error: 'invalid_artifact_key' }, 400, {
              'cache-control': 'no-store',
            });
      } else if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
        response = await env.ASSETS.fetch(request);
      } else {
        response = jsonResponse({ error: 'not_found' }, 404, {
          'cache-control': 'no-store',
        });
      }
    }
  }

  return finalize(response, id, headOnly);
}
