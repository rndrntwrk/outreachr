# Cloudflare-First Deployment and SRE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Every production-code task begins with a failing test or policy assertion and ends with fresh verification evidence.

**Goal:** Add a Cloudflare-first shared infrastructure estate around Outreachr while preserving the Electron application and encrypted local SQLite vault as the sovereign founder-owned record.

**Architecture:** Outreachr remains single-user and local-first. Cloudflare hosts five bounded services: a public edge Worker, a signed device API, a callback/webhook Worker, an internal orchestrator, and an Access-protected operations Worker. D1 stores public and pseudonymous control metadata, R2 stores immutable public artifacts and client-side-encrypted private objects, SQLite-backed Durable Objects coordinate nonce/session/idempotency state, Queues carry at-least-once jobs, Workflows provide durable orchestration, and Sandbox/Containers execute isolated Linux tasks. Railway is introduced only after a written placement exception proves that Workers, Workflows, Queues, Durable Objects, R2, or Sandbox cannot satisfy a workload.

**Tech Stack:** Node.js 22.12+, pnpm 11.18, ECMAScript modules, TypeScript where shared contracts require it, Cloudflare Workers, Worker Static Assets, D1, R2, SQLite-backed Durable Objects, Queues, Workflows, AI Gateway, Sandbox SDK, Wrangler 4, Vitest or Node's built-in test runner, OpenTofu/Terraform, Cloudflare Workers Builds, Railway as an exception-only fallback.

## Global constraints

- The local encrypted SQLite vault remains canonical and is never uploaded in plaintext.
- The cloud estate must be optional for private founder workflows; a complete Cloudflare outage must not block local work.
- No hosted account, team workspace, multi-user collaboration, or arbitrary cloud synchronization is introduced.
- No cloud service may send email, submit a form, publish content, spend funds, sign or accept terms, upload founder documents to third parties, merge code, approve narratives or demos, verify evidence, or change legal-entity authority.
- Cloud agents remain proposal-only.
- Public intelligence, pseudonymous operational metadata, encrypted private objects, and transient agent context are separate data classes with separate bindings and retention.
- Private API mutations require a registered device key, timestamp, nonce, body digest, Ed25519 signature, and stable idempotency key.
- Queues are treated as at-least-once delivery. Consumers commit an idempotency record before applying durable effects.
- Preview deployments receive no production secrets, device registry, private-backup bucket, or production D1 binding.
- Production logging excludes credentials, authorization codes, vault contents, private messages, application answers, contact data, calendar descriptions, local document names, and private agent prompts or completions.
- Storage migrations use expand-and-contract. Worker rollback never assumes that bound storage rolls back with code.
- Native macOS and Windows signing remain separate founder-controlled/native-runner procedures; neither Cloudflare nor Railway is represented as a substitute.
- Railway remains absent unless a committed placement decision documents the Cloudflare limitation, data boundary, authentication model, observability, and exit plan.

## Environment model

```text
development
  local Wrangler/workerd, synthetic data, no production secrets

preview
  pull-request Worker version, isolated or mocked bindings, short retention

staging
  permanent Cloudflare resources, synthetic/sanitized data, founder-only access

production
  production custom domains and bindings, founder-approved promotion, SLO alerts
```

Production resource naming:

```text
Workers
  outreachr-public
  outreachr-device-api
  outreachr-callback
  outreachr-orchestrator
  outreachr-ops

D1
  outreachr-public-prod
  outreachr-control-prod

R2
  outreachr-public-artifacts-prod
  outreachr-private-backups-prod
  outreachr-workflow-artifacts-prod
  outreachr-ops-archive-prod

Queues
  outreachr-atlas-refresh-prod
  outreachr-webhook-events-prod
  outreachr-backup-maintenance-prod
  outreachr-agent-proposal-jobs-prod
  outreachr-release-events-prod
  outreachr-ops-notifications-prod
  outreachr-ops-dead-letter-prod
```

---

## Task 0: Commit the architecture decision and cloud repository boundary

**Files:**
- Create: `docs/superpowers/specs/2026-08-15-cloudflare-first-deployment-sre-design.md`
- Create: `docs/operations/cloudflare/data-classification.md`
- Create: `docs/operations/cloudflare/platform-placement.md`
- Create: `cloud/README.md`
- Create: `cloud/.dev.vars.example`
- Test: `scripts/verify-cloud-boundary.mjs`

**Interfaces:**
- Consumes the approved founder-local-authority product design.
- Produces the permanent placement, privacy, naming, environment, and fallback rules used by every later task.

- [ ] **Step 1: Write the architecture decision.**

Record the five-Worker topology, D1/R2/DO/Queue/Workflow/Sandbox placement, device-signing protocol, encrypted-backup boundary, local-only degraded mode, SLOs, recovery model, and Railway exception policy.

- [ ] **Step 2: Write the data-classification matrix.**

Classify every planned object as one of:

```text
public
pseudonymous-control
client-encrypted-private
transient-founder-authorized
secret
prohibited-cloud
```

List allowed stores, log policy, retention, and deletion authority for each class.

- [ ] **Step 3: Write the platform-placement gate.**

Require a written answer to these questions before Railway is introduced:

```text
Which Cloudflare primitive was evaluated?
Which documented limit blocks the workload?
Why can the workload not be split into Worker/Workflow/Queue/DO/R2/Sandbox steps?
What private data would Railway receive?
How is the Railway service authenticated and isolated?
What is the exit plan back to Cloudflare?
```

- [ ] **Step 4: Add an automated boundary assertion.**

`scripts/verify-cloud-boundary.mjs` must fail if:

- a cloud package imports `apps/desktop/src/main`, Electron, SQL.js vault code, connector credentials, or local agent credential stores;
- a production Wrangler configuration contains plaintext secret-like keys;
- a Railway service exists without a colocated placement decision;
- cloud documentation contains an unresolved placeholder.

- [ ] **Step 5: Run the boundary assertion.**

```bash
node scripts/verify-cloud-boundary.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add docs/superpowers/specs/2026-08-15-cloudflare-first-deployment-sre-design.md \
  docs/operations/cloudflare cloud scripts/verify-cloud-boundary.mjs
git commit -m "docs: define Cloudflare-first operating boundary"
```

---

## Task 1: Build the public edge Worker

**Files:**
- Create: `cloud/public/package.json`
- Create: `cloud/public/wrangler.jsonc`
- Create: `cloud/public/src/index.mjs`
- Create: `cloud/public/src/router.mjs`
- Create: `cloud/public/test/router.test.mjs`
- Create: `cloud/public/public/index.html`
- Create: `cloud/public/public/404.html`
- Create: `cloud/public/schemas/update-manifest.schema.json`
- Create: `docs/operations/cloudflare/public-edge.md`

**Interfaces:**

```js
routePublicRequest(request, env, context) -> Promise<Response>
```

Bindings:

```text
ASSETS: Worker Static Assets binding
PUBLIC_ARTIFACTS: R2 bucket
ENVIRONMENT: development | staging | production
SERVICE_VERSION: immutable deployment identifier
```

Routes:

```text
GET|HEAD /health/live
GET|HEAD /health/ready
GET|HEAD /api/v1/atlas/index
GET|HEAD /api/v1/releases/:channel/:platform/:architecture
GET|HEAD /downloads/:artifact-key
GET|HEAD /* -> static assets
```

- [ ] **Step 1: Write failing router tests.**

Cover:

- live health output and no-store caching;
- readiness failure when required bindings or sentinel objects are missing;
- readiness success when `atlas/index.json` and `releases/index.json` exist;
- Atlas index ETag and public caching;
- release channel/platform/architecture allowlists;
- R2 artifact retrieval and immutable caching;
- HEAD responses with no body;
- traversal, encoded slash, backslash, empty key, and unsupported-method rejection;
- static fallback and security headers;
- no private-data or secret headers in responses.

Run:

```bash
node --test cloud/public/test/router.test.mjs
```

Expected: FAIL because the router does not exist.

- [ ] **Step 2: Implement the smallest Worker router.**

Use no application framework. Keep routing, path validation, security headers, R2 response mapping, and readiness checks in `router.mjs`. `index.mjs` contains only the Worker module entrypoint.

- [ ] **Step 3: Add Worker Static Assets.**

The initial site states that Outreachr remains founder-operated and local-first. Do not claim cloud sync, hosted accounts, autonomous agents, or native-release trust that is not implemented.

- [ ] **Step 4: Add deterministic Wrangler configuration.**

Use `wrangler.jsonc`, explicit development/staging/production R2 bindings, `assets.run_worker_first`, and observability sampling. No production custom domain or account identifier is committed before the account is connected.

- [ ] **Step 5: Run focused verification.**

```bash
node --test cloud/public/test/router.test.mjs
node scripts/verify-cloud-boundary.mjs
npx --yes wrangler@4.79.0 deploy --dry-run --config cloud/public/wrangler.jsonc
```

Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add cloud/public docs/operations/cloudflare/public-edge.md
git commit -m "feat(cloud): add public edge Worker"
```

---

## Task 2: Add signed release and update metadata

**Files:**
- Create: `packages/cloud-contracts/package.json`
- Create: `packages/cloud-contracts/tsconfig.json`
- Create: `packages/cloud-contracts/src/release.ts`
- Create: `packages/cloud-contracts/test/release.test.ts`
- Create: `scripts/cloud/build-update-manifest.mjs`
- Create: `scripts/cloud/verify-update-manifest.mjs`
- Modify: `cloud/public/src/router.mjs`
- Modify: `docs/release.md`
- Test: `cloud/public/test/releases.test.mjs`

**Interfaces:**

```ts
interface SignedUpdateManifest {
  schemaVersion: 1;
  channel: 'dev' | 'staging' | 'stable';
  version: string;
  minimumSupportedVersion: string;
  publishedAt: string;
  artifacts: Array<{
    platform: 'darwin' | 'win32' | 'linux';
    architecture: 'x64' | 'arm64';
    key: string;
    sha256: string;
    bytes: number;
    signingStatus: 'signed' | 'adhoc' | 'unsigned';
    sbomKey: string;
    signingStatusKey: string;
  }>;
  revokedVersions: string[];
  signature: string;
  keyId: string;
}
```

- [ ] **Step 1: Write manifest validation and signature tests.**
- [ ] **Step 2: Implement canonical serialization and offline signing input.**
- [ ] **Step 3: Add R2 release-index and manifest routes.**
- [ ] **Step 4: Update the desktop release runbook to upload immutable R2 objects only after native trust checks.**
- [ ] **Step 5: Verify manifest tampering, wrong channel, wrong digest, revoked version, and unknown key all fail.**
- [ ] **Step 6: Commit.**

Verification:

```bash
pnpm --filter @outreachr/cloud-contracts test
node --test cloud/public/test/releases.test.mjs
node scripts/cloud/verify-update-manifest.mjs --fixture cloud/public/test/fixtures/stable.json
```

---

## Task 3: Define the signed device protocol and desktop key custody

**Files:**
- Create: `packages/cloud-contracts/src/device.ts`
- Create: `packages/cloud-contracts/test/device.test.ts`
- Create: `apps/desktop/src/main/cloud-device-identity.ts`
- Create: `apps/desktop/src/main/cloud-request-signer.ts`
- Create: `apps/desktop/test/unit/cloud-request-signer.test.ts`
- Modify: `apps/desktop/src/main/secure-store.ts`
- Modify: `docs/privacy-and-threat-model.md`

**Interfaces:**

```ts
interface DeviceSignedRequest {
  deviceId: string;
  timestamp: number;
  nonce: string;
  operationId: string;
  method: string;
  canonicalPath: string;
  bodySha256: string;
  signature: string;
}
```

- [ ] **Step 1: Write canonical request and signature tests.**
- [ ] **Step 2: Generate an Ed25519 key pair only after founder opt-in.**
- [ ] **Step 3: Store the private key with the OS credential facility; store only public metadata in SQLite.**
- [ ] **Step 4: Implement canonical path/body hashing and signatures.**
- [ ] **Step 5: Add revocation and key-rotation preparation without cloud synchronization.**
- [ ] **Step 6: Confirm the desktop works unchanged when cloud identity is absent.**

Verification:

```bash
pnpm --filter @outreachr/cloud-contracts test
pnpm --filter @outreachr/desktop test:unit -- cloud-request-signer.test.ts
pnpm --filter @outreachr/desktop typecheck
```

---

## Task 4: Build the signed device API and nonce Durable Object

**Files:**
- Create: `cloud/device-api/package.json`
- Create: `cloud/device-api/wrangler.jsonc`
- Create: `cloud/device-api/src/index.ts`
- Create: `cloud/device-api/src/auth.ts`
- Create: `cloud/device-api/src/device-session.ts`
- Create: `cloud/device-api/src/idempotency.ts`
- Create: `cloud/device-api/test/auth.test.ts`
- Create: `cloud/device-api/test/device-session.test.ts`
- Create: `infra/cloudflare/sql/control/0001-device-control.sql`
- Create: `docs/operations/cloudflare/device-auth.md`

**Routes:**

```text
POST /v1/devices/register
POST /v1/devices/revoke
POST /v1/backups/grants
GET  /v1/backups/:backupId
GET  /v1/jobs/:operationId
GET  /health/live
GET  /health/ready
```

- [ ] **Step 1: Write tests for valid signature, unknown device, revoked device, expired timestamp, replayed nonce, digest mismatch, and conflicting operation replay.**
- [ ] **Step 2: Implement D1 device registry.**
- [ ] **Step 3: Implement `DeviceSession` SQLite Durable Object for atomic nonce consumption and scoped rate counters.**
- [ ] **Step 4: Implement operation idempotency.**
- [ ] **Step 5: Add bounded structured logs with no signature or private payload.**
- [ ] **Step 6: Verify local and staging migrations.**

Verification:

```bash
pnpm --filter @outreachr/cloud-device-api test
pnpm --filter @outreachr/cloud-device-api typecheck
npx wrangler d1 migrations apply outreachr-control-staging --env staging --remote
```

---

## Task 5: Add client-side-encrypted R2 backup lifecycle

**Files:**
- Create: `packages/cloud-contracts/src/backup.ts`
- Create: `cloud/device-api/src/backups.ts`
- Create: `cloud/orchestrator/src/workflows/backup-lifecycle.ts`
- Create: `cloud/orchestrator/src/queues/backup-maintenance.ts`
- Create: `cloud/device-api/test/backups.test.ts`
- Create: `cloud/orchestrator/test/backup-lifecycle.test.ts`
- Create: `apps/desktop/src/main/cloud-backup-service.ts`
- Create: `apps/desktop/test/integration/cloud-backup-service.test.ts`
- Create: `docs/operations/cloudflare/runbooks/encrypted-backup-restore.md`

**Backup metadata allowed in Cloudflare:**

```text
pseudonymous device ID
backup ID
ciphertext bytes
ciphertext SHA-256
vault schema version
creation time
retention class
verification status
```

- [ ] **Step 1: Write tests proving plaintext never crosses the cloud client boundary.**
- [ ] **Step 2: Reuse or version the current authenticated encrypted backup format.**
- [ ] **Step 3: Issue short-lived direct R2 upload grants.**
- [ ] **Step 4: Verify object size and ciphertext digest asynchronously.**
- [ ] **Step 5: Implement 7 daily, 8 weekly, and 12 monthly retention with protected manual backups.**
- [ ] **Step 6: Restore on a clean synthetic device and verify SQLite and audit-chain integrity.**

Verification:

```bash
pnpm --filter @outreachr/desktop test:integration -- cloud-backup-service.test.ts
pnpm --filter @outreachr/cloud-device-api test
pnpm --filter @outreachr/cloud-orchestrator test -- backup-lifecycle.test.ts
```

---

## Task 6: Deploy Opportunity Atlas to D1, R2, Queues, and Workflows

**Files:**
- Create: `cloud/orchestrator/package.json`
- Create: `cloud/orchestrator/wrangler.jsonc`
- Create: `cloud/orchestrator/src/index.ts`
- Create: `cloud/orchestrator/src/workflows/atlas-refresh.ts`
- Create: `cloud/orchestrator/src/queues/atlas-refresh.ts`
- Create: `cloud/orchestrator/src/atlas/fetch-source.ts`
- Create: `cloud/orchestrator/src/atlas/publish-package.ts`
- Create: `infra/cloudflare/sql/public/0001-atlas-index.sql`
- Create: `cloud/orchestrator/test/atlas-refresh.test.ts`
- Modify: `cloud/public/src/router.mjs`
- Create: `docs/operations/cloudflare/runbooks/atlas-source-failure.md`

- [ ] **Step 1: Write source timeout, byte-limit, ETag, parser-version, rights-policy, and idempotent publication tests.**
- [ ] **Step 2: Add scheduled Queue production and a durable refresh Workflow.**
- [ ] **Step 3: Store normalized public package bodies in R2 and indexes in public D1.**
- [ ] **Step 4: Require founder review for new sources, rights changes, parser changes, conflicts, and large semantic changes.**
- [ ] **Step 5: Publish immutable signed packages and purge only mutable index routes.**
- [ ] **Step 6: Add source-freshness SLI emission.**

Verification:

```bash
pnpm --filter @outreachr/cloud-orchestrator test -- atlas-refresh.test.ts
pnpm --filter @outreachr/cloud-orchestrator typecheck
npx wrangler workflows list --env staging
```

---

## Task 7: Add callback and webhook ingress

**Files:**
- Create: `cloud/callback/package.json`
- Create: `cloud/callback/wrangler.jsonc`
- Create: `cloud/callback/src/index.ts`
- Create: `cloud/callback/src/oauth-relay.ts`
- Create: `cloud/callback/src/webhooks.ts`
- Create: `cloud/callback/src/callback-relay.ts`
- Create: `cloud/callback/test/oauth-relay.test.ts`
- Create: `cloud/callback/test/webhooks.test.ts`
- Create: `docs/operations/cloudflare/runbooks/oauth-relay-incident.md`
- Create: `docs/operations/cloudflare/runbooks/webhook-signature-failure.md`

- [ ] **Step 1: Preserve loopback PKCE as the default desktop flow.**
- [ ] **Step 2: Write tests for state mismatch, expiry, replay, cross-device claim, sensitive logging, and token-exchange absence.**
- [ ] **Step 3: Encrypt hosted-relay authorization codes to the device public key.**
- [ ] **Step 4: Verify provider webhook signatures, write a minimal receipt, enqueue normalized metadata, and return quickly.**
- [ ] **Step 5: Reject bodies, subjects, calendar descriptions, and attachments unless a separately approved design changes the privacy model.**
- [ ] **Step 6: Add Queue consumer idempotency.**

Verification:

```bash
pnpm --filter @outreachr/cloud-callback test
pnpm --filter @outreachr/cloud-callback typecheck
```

---

## Task 8: Add proposal-only cloud agent orchestration

**Files:**
- Create: `packages/cloud-contracts/src/context-grant.ts`
- Create: `cloud/orchestrator/src/workflows/agent-proposal.ts`
- Create: `cloud/orchestrator/src/agent/private-gateway.ts`
- Create: `cloud/orchestrator/src/agent/public-research-gateway.ts`
- Create: `cloud/orchestrator/src/agent/proposal-envelope.ts`
- Create: `cloud/orchestrator/src/sandbox/task-runner.ts`
- Create: `cloud/orchestrator/test/agent-proposal.test.ts`
- Create: `apps/desktop/src/main/cloud-proposal-service.ts`
- Create: `apps/desktop/test/integration/cloud-proposal-service.test.ts`
- Modify: `docs/agents.md`
- Create: `docs/operations/cloudflare/runbooks/agent-provider-outage.md`

- [ ] **Step 1: Write context-grant narrowing, expiry, budget, record-allowlist, and prohibited-tool tests.**
- [ ] **Step 2: Create separate public-research and private-proposal AI Gateway policies.**
- [ ] **Step 3: Disable payload logging and caching for private proposal requests.**
- [ ] **Step 4: Encrypt the final typed proposal to the founder device before persistent storage.**
- [ ] **Step 5: Run bounded Linux work in one Sandbox per task with no credentials, default-deny egress, time/CPU/storage limits, and durable result copy-out.**
- [ ] **Step 6: Prove no cloud tool can send, submit, publish, spend, sign, upload, merge, approve, verify, or decrypt a backup.**

Verification:

```bash
pnpm --filter @outreachr/cloud-orchestrator test -- agent-proposal.test.ts
pnpm --filter @outreachr/desktop test:integration -- cloud-proposal-service.test.ts
node scripts/verify-agent-negative-capabilities.mjs
```

---

## Task 9: Build the Access-protected operations Worker and SRE telemetry

**Files:**
- Create: `cloud/ops/package.json`
- Create: `cloud/ops/wrangler.jsonc`
- Create: `cloud/ops/src/index.ts`
- Create: `cloud/ops/src/status.ts`
- Create: `cloud/ops/src/dlq.ts`
- Create: `cloud/ops/src/workflows.ts`
- Create: `cloud/ops/src/releases.ts`
- Create: `packages/cloud-observability/package.json`
- Create: `packages/cloud-observability/src/logging.ts`
- Create: `packages/cloud-observability/src/metrics.ts`
- Create: `packages/cloud-observability/test/redaction.test.ts`
- Create: `docs/operations/cloudflare/slo.md`
- Create: `docs/operations/cloudflare/incident-template.md`

**SLOs:**

```text
public site/update manifest 99.95% monthly
artifact delivery 99.95% monthly
device API 99.90% monthly
backup grant/verification 99.90% monthly
valid webhook acknowledgement 99.95% monthly
queue terminal handling 99.90% monthly
Atlas due-source completion 99.0% monthly
agent accepted-job terminal completion 99.5% monthly
ordinary agent jobs within 15 minutes 95%
cloud-control RTO under 2 hours
local-work RTO during cloud outage immediate
```

- [ ] **Step 1: Write telemetry redaction and SLO math tests.**
- [ ] **Step 2: Emit structured bounded logs, sampled traces, and Analytics Engine metrics.**
- [ ] **Step 3: Protect every operations route with Cloudflare Access.**
- [ ] **Step 4: Add alerts for 5xx burn, latency, Queue/DLQ age, Workflow failures, backup gaps, signature/replay spikes, D1/R2 failures, AI budget, Logpush failure, token expiry, domain expiry, and billing thresholds.**
- [ ] **Step 5: Add SEV-1/2/3 criteria and error-budget release policy.**
- [ ] **Step 6: Add founder-only safe replay/cancel actions with explicit confirmation and audit evidence.**

Verification:

```bash
pnpm --filter @outreachr/cloud-observability test
pnpm --filter @outreachr/cloud-ops test
node scripts/verify-log-redaction.mjs
```

---

## Task 10: Add Cloudflare Workers Builds, environment promotion, migrations, and rollback

**Files:**
- Create: `docs/operations/cloudflare/workers-builds.md`
- Create: `scripts/cloud/verify-bindings.mjs`
- Create: `scripts/cloud/verify-storage-compatibility.mjs`
- Create: `scripts/cloud/smoke-public.mjs`
- Create: `scripts/cloud/smoke-private.mjs`
- Modify: every `cloud/*/wrangler.jsonc`
- Modify: `.github/RELEASE_CHECKLIST.md`

- [ ] **Step 1: Configure one Workers Builds project per service with explicit root directory and watch paths.**
- [ ] **Step 2: Use preview `versions upload`; do not automatically promote production from an unreviewed pull request.**
- [ ] **Step 3: Make staging deployment and synthetic checks mandatory before founder production promotion.**
- [ ] **Step 4: Verify every environment declares its bindings because Wrangler environment bindings are not inherited.**
- [ ] **Step 5: Require a storage-compatibility declaration for each release.**
- [ ] **Step 6: Document Worker rollback, D1 Time Travel, DO recovery, R2 index repair, and DLQ replay boundaries.**

Verification:

```bash
node scripts/cloud/verify-bindings.mjs
node scripts/cloud/verify-storage-compatibility.mjs
node scripts/cloud/smoke-public.mjs --base-url "$STAGING_PUBLIC_URL"
node scripts/cloud/smoke-private.mjs --base-url "$STAGING_DEVICE_URL" --synthetic-device
```

---

## Task 11: Add OpenTofu/Terraform infrastructure as code

**Files:**
- Create: `infra/cloudflare/versions.tf`
- Create: `infra/cloudflare/providers.tf`
- Create: `infra/cloudflare/modules/public-edge/`
- Create: `infra/cloudflare/modules/device-control/`
- Create: `infra/cloudflare/modules/orchestration/`
- Create: `infra/cloudflare/modules/operations/`
- Create: `infra/cloudflare/environments/staging/`
- Create: `infra/cloudflare/environments/production/`
- Create: `docs/operations/cloudflare/infrastructure.md`

- [ ] **Step 1: Define D1, R2, Queues, DNS, Access, rate limits, Logpush, notification policies, and least-privilege API tokens.**
- [ ] **Step 2: Keep Worker code versions under Wrangler rather than Terraform state.**
- [ ] **Step 3: Add remote encrypted state and state-locking appropriate to the founder-controlled environment.**
- [ ] **Step 4: Add policy assertions that previews cannot receive production bindings.**
- [ ] **Step 5: Produce reviewed staging and production plans.**
- [ ] **Step 6: Apply staging, run recovery/smoke tests, then apply production after founder approval.**

Verification:

```bash
tofu -chdir=infra/cloudflare/environments/staging fmt -check -recursive
tofu -chdir=infra/cloudflare/environments/staging validate
tofu -chdir=infra/cloudflare/environments/staging plan
```

---

## Task 12: Add the Railway exception gate and fallback template

**Files:**
- Create: `infra/railway/README.md`
- Create: `infra/railway/placement-decision.schema.json`
- Create: `infra/railway/Dockerfile.fallback`
- Create: `infra/railway/railway.toml`
- Create: `infra/railway/src/health.mjs`
- Create: `infra/railway/test/health.test.mjs`
- Create: `scripts/verify-railway-placement.mjs`
- Create: `docs/operations/cloudflare/runbooks/railway-fallback.md`

- [ ] **Step 1: Keep the fallback disabled and undeployed.**
- [ ] **Step 2: Require a placement decision matching the schema before a runtime service is enabled.**
- [ ] **Step 3: Provide only `/health/live`, `/health/ready`, authenticated Queue pull or signed internal API, and common structured logging.**
- [ ] **Step 4: Prohibit founder-vault access and account-wide Cloudflare credentials.**
- [ ] **Step 5: Add an explicit removal/return-to-Cloudflare plan.**
- [ ] **Step 6: Verify no Railway service is active without a decision.**

Verification:

```bash
node scripts/verify-railway-placement.mjs
node --test infra/railway/test/health.test.mjs
```

---

## Task 13: Complete disaster-recovery and incident runbooks

**Files:**
- Create: `docs/operations/cloudflare/runbooks/worker-rollback.md`
- Create: `docs/operations/cloudflare/runbooks/d1-time-travel.md`
- Create: `docs/operations/cloudflare/runbooks/d1-export-restore.md`
- Create: `docs/operations/cloudflare/runbooks/durable-object-recovery.md`
- Create: `docs/operations/cloudflare/runbooks/queue-dlq-replay.md`
- Create: `docs/operations/cloudflare/runbooks/workflow-cancel-retry.md`
- Create: `docs/operations/cloudflare/runbooks/device-revocation.md`
- Create: `docs/operations/cloudflare/runbooks/backup-index-reconciliation.md`
- Create: `docs/operations/cloudflare/runbooks/sensitive-telemetry-exposure.md`
- Create: `docs/operations/cloudflare/runbooks/release-manifest-revocation.md`
- Create: `docs/operations/cloudflare/runbooks/r2-index-mismatch.md`
- Create: `docs/operations/cloudflare/runbooks/cloudflare-total-outage.md`
- Create: `docs/operations/cloudflare/runbooks/secret-rotation.md`
- Create: `docs/operations/cloudflare/runbooks/domain-certificate-incident.md`
- Create: `docs/operations/cloudflare/runbooks/error-budget-exhaustion.md`
- Create: `scripts/cloud/verify-runbooks.mjs`

- [ ] **Step 1: Give every runbook detection, authority, prerequisites, containment, recovery, validation, rollback, and evidence sections.**
- [ ] **Step 2: Distinguish safe automatic remediation from founder-required action.**
- [ ] **Step 3: Add monthly, quarterly, semiannual, and annual exercise schedules.**
- [ ] **Step 4: Run a staging D1 restore, synthetic DLQ replay, clean-device encrypted restore, device revocation/re-pair, Worker rollback, and local-only outage drill.**
- [ ] **Step 5: Store exercise evidence in the restricted operations archive.**
- [ ] **Step 6: Verify all required runbooks and sections exist.**

Verification:

```bash
node scripts/cloud/verify-runbooks.mjs
```

---

## Task 14: Add desktop opt-in cloud controls and local-only degraded mode

**Files:**
- Create: `apps/desktop/src/main/cloud-service.ts`
- Create: `apps/desktop/src/shared/cloud-contracts.ts`
- Create: `apps/desktop/src/renderer/src/pages/CloudSettingsPage.tsx`
- Create: `apps/desktop/test/integration/cloud-service.test.ts`
- Create: `apps/desktop/test/renderer/cloud-settings-page.test.tsx`
- Modify: `apps/desktop/src/main/index.ts`
- Modify: `apps/desktop/src/renderer/src/App.tsx`
- Modify: `apps/desktop/src/renderer/src/components/AppShell.tsx`
- Modify: `docs/privacy-and-threat-model.md`

- [ ] **Step 1: Write tests proving all private cloud features are off by default.**
- [ ] **Step 2: Add independent founder controls for device pairing, encrypted backup, callback relay, and cloud proposals.**
- [ ] **Step 3: Show exactly what metadata leaves the device for each feature.**
- [ ] **Step 4: Add revoke, disable, and local deletion controls.**
- [ ] **Step 5: Make cloud failures non-fatal and show delayed/unavailable state without blocking local workflows.**
- [ ] **Step 6: Run a total-cloud-block test while exercising the local investor, application, Hackathon Studio, Atlas-import, task, meeting, draft, backup, and local-agent surfaces.**

Verification:

```bash
pnpm --filter @outreachr/desktop typecheck
pnpm --filter @outreachr/desktop test -- cloud-service.test.ts cloud-settings-page.test.tsx
xvfb-run --auto-servernum pnpm test:e2e
```

---

## Final qualification

- [ ] Run repository formatting, lint, typecheck, tests, coverage, builds, and Electron end-to-end tests.
- [ ] Run every cloud package test and Wrangler dry-run.
- [ ] Apply staging infrastructure and run public/private synthetic probes.
- [ ] Restore D1, Durable Object, R2 indexes, and an encrypted synthetic founder backup.
- [ ] Verify Queue duplicate delivery and DLQ replay.
- [ ] Verify private AI payload logging is disabled and no private payload appears in retained telemetry.
- [ ] Verify Cloudflare outage leaves the desktop locally operational.
- [ ] Verify no Railway runtime is active, or review the committed placement exception and exit plan.
- [ ] Review SLO dashboards, alerts, retention, budgets, and billing notifications.
- [ ] Promote production Workers only after founder approval.

Final commands:

```bash
pnpm verify
xvfb-run --auto-servernum pnpm test:e2e
node scripts/verify-cloud-boundary.mjs
node scripts/cloud/verify-bindings.mjs
node scripts/cloud/verify-storage-compatibility.mjs
node scripts/cloud/verify-runbooks.mjs
node scripts/verify-railway-placement.mjs
```

## Definition of done

The program is complete when:

- the desktop remains fully useful with Cloudflare blocked;
- public site, Atlas index, signed release metadata, and artifact delivery run on Cloudflare;
- production Workers use preview versions, staging verification, and founder promotion;
- every private request is signed and replay-protected;
- Cloudflare stores only client-encrypted backup content and cannot decrypt it;
- D1, Durable Object, R2, Queue, and Workflow recovery is exercised;
- private cloud agents return only encrypted typed proposals;
- the optional OAuth relay is one-time and device-encrypted;
- operations routes are Access-protected;
- logs are redacted and retention-limited;
- SLOs, alerts, error budgets, incidents, and recovery exercises are operational;
- native release trust remains accurately separated from cloud deployment;
- Railway remains absent or is justified by a reviewed placement exception;
- no cloud component introduces autonomous external action.