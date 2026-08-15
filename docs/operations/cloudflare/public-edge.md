# Public edge operations

`cloud/public` is the first Cloudflare deployment slice. It is intentionally public-data-only.

## Responsibilities

- Serve the public Outreachr site through Worker Static Assets.
- Expose liveness and readiness endpoints.
- Serve the reviewed Opportunity Atlas index from R2.
- Serve per-channel, per-platform, per-architecture release manifests from R2.
- Stream immutable release artifacts from R2.
- Attach consistent security headers and a request ID.

It does not receive device identity, founder-private data, encrypted backups, provider credentials, OAuth codes, agent prompts, or application state.

## Routes

| Route | Cache | Ready dependency |
|---|---|---|
| `/health/live` | `no-store` | Worker runtime only |
| `/health/ready` | `no-store` | Static assets binding plus `atlas/index.json` and `releases/index.json` in R2 |
| `/api/v1/atlas/index` | five minutes with stale revalidation | `atlas/index.json` |
| `/api/v1/releases/:channel/:platform/:architecture` | one minute | matching release manifest |
| `/downloads/:key` | one year, immutable | matching R2 artifact |
| all other GET/HEAD routes | Static Assets policy | `ASSETS` binding |

Allowed release coordinates:

```text
channels: dev, staging, stable
platforms: darwin, win32, linux
architectures: x64, arm64
```

## Required R2 object layout

```text
atlas/index.json
releases/index.json
releases/manifests/<channel>/<platform>/<architecture>.json
releases/artifacts/<product>/<version>/<filename>
```

Published artifact keys are immutable. A corrected artifact uses a new version or filename and a newly signed manifest. Never overwrite a published object behind an immutable cache key.

## Local verification

```bash
cd cloud/public
npm test
npm run dry-run
npm run dev
```

The Node tests use an in-memory R2-compatible object and do not require a Cloudflare account.

## Workers Builds

Create one Workers Builds project with:

```text
root directory: cloud/public
build command: npm test
preview deploy command: npx --yes wrangler@4.79.0 versions upload --config wrangler.jsonc
production branch: main
```

A merge uploads a version but does not by itself prove that R2 sentinel objects, custom domains, or production update metadata are correct. Production promotion requires staging health checks and founder review.

## Staging qualification

Before production promotion:

1. Upload `atlas/index.json` and `releases/index.json` to the staging bucket.
2. Upload at least one synthetic release manifest and artifact.
3. Confirm `/health/live` returns 200.
4. Confirm `/health/ready` returns 200.
5. Confirm Atlas and release responses contain the expected ETag and cache policy.
6. Confirm artifact bytes and SHA-256 match the source file.
7. Confirm unsupported methods, invalid release coordinates, and unsafe artifact keys fail.
8. Confirm static assets carry the security headers.
9. Confirm no response contains a secret or private founder field.

## Alerts

Create production alerts for:

- 5xx error-rate SLO burn;
- readiness failure lasting more than five minutes;
- elevated latency;
- R2 errors;
- failed Workers Builds deployment;
- domain or certificate expiration;
- unexpected artifact 404 rate;
- billing threshold.

## Rollback

Worker rollback may use the prior compatible Cloudflare version. R2 and future D1 bindings do not roll back with code.

1. Identify the prior known-good Worker version.
2. Confirm it understands the current object layout.
3. Roll back the Worker version.
4. Run liveness, readiness, Atlas, release, artifact, and static-asset probes.
5. Preserve the failed deployment and request IDs for incident review.

Do not delete or overwrite public artifacts during a Worker rollback.
