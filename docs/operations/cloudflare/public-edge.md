# Public edge operations

`cloud/public` is the first Cloudflare deployment slice. It is intentionally public-data-only and request-scoped.

The Worker is a Class A execution path: a short isolate validates the route, reads at most the reviewed number of R2 objects, returns the response, emits one bounded technical metric, and retains no request-specific process.

The normative cost and placement controls are defined in [`cost-control.md`](cost-control.md) and [`platform-placement.md`](platform-placement.md).

## Responsibilities

- Serve the public Outreachr site through Worker Static Assets.
- Expose liveness and readiness endpoints.
- Serve the reviewed Opportunity Atlas index from R2.
- Serve per-channel, per-platform, per-architecture release manifests from R2.
- Stream immutable release artifacts from R2.
- Attach consistent security headers and a request ID.
- Attribute each request to one route class, execution class, product unit, cache class, immutable version, response size, R2-operation count, and handler wall time.

It does not receive device identity, founder-private data, encrypted backups, provider credentials, OAuth codes, agent prompts, or application state.

## Route execution profiles

| Route | Execution class | Product unit | R2 reads | Cache |
|---|---|---|---:|---|
| `/health/live` | Worker isolate | liveness probe | 0 | `no-store` |
| `/health/ready` | Worker isolate + R2 | readiness probe | 2 when R2 is bound | `no-store` |
| `/api/v1/atlas/index` | Worker isolate + R2 | Atlas-index delivery | 1 when R2 is bound | five minutes with stale revalidation |
| `/api/v1/releases/:channel/:platform/:architecture` | Worker isolate + R2 | release-manifest delivery | 1 when R2 is bound | one minute |
| `/downloads/:key` | Worker isolate + R2 | release-artifact delivery | 1 when R2 is bound | one year, immutable |
| all other GET/HEAD routes | Worker isolate + Static Assets | static-asset delivery | 0 R2 reads | Static Assets policy |
| rejected method or unsafe path | Worker isolate | rejected request | 0 | `no-store` |

The Worker configuration sets reviewed CPU and subrequest ceilings below platform maximums. Increasing either ceiling requires a measured route profile and review.

## Cost metric contract

When `COST_METRICS` is bound, the Worker emits one Analytics Engine point after finalizing each response. Metric failure is non-blocking and cannot alter the HTTP result.

```text
index1  outreachr-public:<environment>

blob1   route_class
blob2   execution_class
blob3   product_unit
blob4   cache_class
blob5   method
blob6   outcome
blob7   immutable_version

double1 request_count
double2 HTTP_status
double3 response_bytes, or -1 when unavailable
double4 actual_R2_read_operations
double5 handler_wall_ms
```

The metric contains no user, investor, opportunity, application, message, prompt, document, credential, URL query, artifact name, or request-body data.

The immutable deployment version comes from the Workers version-metadata binding when available. A local development version is used only when that binding is absent.

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
node --check cloud/public/src/cost-metrics.mjs
node --check cloud/public/src/router.mjs
node --test cloud/public/test/router.test.mjs
node --test cloud/public/test/cost-metrics.test.mjs
node scripts/verify-cloud-boundary.mjs
npm run dry-run --prefix cloud/public
```

The Node tests use in-memory R2-compatible objects and a local Analytics Engine-compatible recorder. They do not require a Cloudflare account.

## Workers Builds

Create one Workers Builds project with:

```text
root directory: cloud/public
build command: npm test
preview deploy command: npx --yes wrangler@4.79.0 versions upload --config wrangler.jsonc
production branch: main
```

A merge uploads a version but does not by itself prove that R2 sentinel objects, custom domains, cost datasets, or production update metadata are correct. Production promotion requires staging health checks and founder review.

Superseded pull-request builds must be cancelled. A build for code that cannot ship is an avoidable cost defect.

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
10. Confirm every route emits the expected route class, product unit, R2-operation count, and version.
11. Confirm metric-binding failure does not affect response status or body.
12. Compare candidate p95 latency, errors, response bytes, and R2 reads per completed unit with the current version.

## Alerts

Create production alerts for:

- 5xx error-rate SLO burn;
- readiness failure lasting more than five minutes;
- elevated latency;
- R2 errors;
- failed Workers Builds deployment;
- domain or certificate expiration;
- unexpected artifact 404 rate;
- route operation amplification;
- CPU or subrequest budget pressure;
- unit-cost regression;
- billing threshold.

## Promotion and rollback

Worker promotion uses a version-specific, measured path:

```text
version upload
  -> version-specific probes
  -> low-percentage traffic
  -> latency/error/operation comparison
  -> founder promotion or rollback
```

Worker rollback may use the prior compatible Cloudflare version. R2 and future D1 bindings do not roll back with code.

1. Identify the prior known-good Worker version.
2. Confirm it understands the current object layout.
3. Roll back the Worker version.
4. Run liveness, readiness, Atlas, release, artifact, static-asset, and cost-metric probes.
5. Preserve the failed deployment version, request IDs, route metrics, and evidence manifest for incident review.

Do not delete or overwrite public artifacts during a Worker rollback.
