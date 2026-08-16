# Demand-Loaded Execution and Cost-Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development`, `superpowers:test-driven-development`, and `superpowers:verification-before-completion`. Production behavior begins with a failing test and ends with fresh execution evidence.

**Goal:** Make execution class, routing, idle behavior, unit cost, evidence, and promotion gates first-class across development, testing, Cloudflare runtime, agents, media, settlement, and recovery.

**Architecture:** RNDRNTWRK CTRL classifies each operation and selects the least expensive execution substrate that satisfies authority, latency, persistence, isolation, privacy, and recovery requirements. Every workload is measured against a named completed-product unit. Public edge telemetry is the first implementation slice; later slices extend the same contract to Durable Objects, Dynamic Workers, Sandboxes, Workflows, Queues, AI Gateway, media, SW4P, SW4P Earn, and Ads.

**Normative design:** `docs/superpowers/specs/2026-08-16-demand-loaded-cost-control-design.md`

## Global constraints

- Cost means total system cost, not only server spend.
- Idle compute is approximately zero unless an explicit reviewed workload requires otherwise.
- Callers cannot choose unrestricted runtime classes, budget limits, or weighted cost results.
- No cost optimization may weaken founder authority, cryptographic integrity, privacy, evidence, settlement correctness, or recovery.
- Unit-cost records contain technical identifiers and aggregate dimensions only; no founder-private content enters analytics.
- Metrics are non-blocking. A telemetry outage cannot alter a product response or cause an external action.
- A release cannot be promoted only because functional tests pass.
- A cost regression may be accepted only with an explicit product, reliability, or security justification and a dated follow-up threshold.
- Hosted execution remains proposal-only for consequential founder actions.

---

## Task 0: Establish the normative control model

**Files:**
- Create: `docs/superpowers/specs/2026-08-16-demand-loaded-cost-control-design.md`
- Create: `docs/operations/cloudflare/cost-control.md`
- Modify: `docs/operations/cloudflare/platform-placement.md`
- Modify: `docs/operations/cloudflare/public-edge.md`

**Acceptance:**

```text
[ ] system cost equation includes build, test, runtime, AI, media, state, network, settlement and failure
[ ] execution classes A-G are defined
[ ] admission envelope is explicit
[ ] routing defects are identified
[ ] product-unit metrics are defined
[ ] technical narrative format is an execution trace
[ ] Railway exceptions require measured cost evidence
```

---

## Task 1: Add public-edge route cost attribution

**Files:**
- Test first: `cloud/public/test/cost-metrics.test.mjs`
- Create: `cloud/public/src/cost-metrics.mjs`
- Modify: `cloud/public/src/router.mjs`
- Modify: `cloud/public/wrangler.jsonc`

**Behavior:**

```text
request
  -> route classification
  -> response
  -> one optional Analytics Engine point
```

Route profile:

```text
route_class
execution_class
product_unit
cache_class
reviewed_R2_read_budget
```

Data point:

```text
index1  service:environment
blob1   route_class
blob2   execution_class
blob3   product_unit
blob4   cache_class
blob5   method
blob6   outcome
blob7   immutable_version
double1 request_count
double2 HTTP_status
double3 response_bytes
double4 actual_R2_read_operations
double5 handler_wall_ms
```

Tests must prove:

```text
[ ] every route class has one immutable profile
[ ] artifact delivery records one R2 read
[ ] liveness records zero storage reads
[ ] the version-metadata binding wins over mutable environment text
[ ] no request URL, artifact key or private payload enters the metric
[ ] metrics failure does not alter status, headers or response body
[ ] original router regression suite remains green
```

Verification:

```bash
node --check cloud/public/src/cost-metrics.mjs
node --check cloud/public/src/router.mjs
node --test cloud/public/test/router.test.mjs
node --test cloud/public/test/cost-metrics.test.mjs
node scripts/verify-cloud-boundary.mjs
```

---

## Task 2: Add public-edge resource ceilings and promotion evidence

**Files:**
- Modify: `cloud/public/wrangler.jsonc`
- Create: `cloud/public/test/config.test.mjs`
- Create: `scripts/cloud/compare-public-version-metrics.mjs`
- Create: `scripts/cloud/test/compare-public-version-metrics.test.mjs`
- Modify: `docs/operations/cloudflare/public-edge.md`

Tests must prove:

```text
[ ] CPU and subrequest limits are finite and below reviewed maximums
[ ] Analytics Engine and version-metadata bindings exist in every environment
[ ] production uses an immutable version identifier
[ ] comparison rejects operation amplification
[ ] comparison rejects material latency or error regression
[ ] comparison fails closed on missing candidate evidence
[ ] a reviewed override names reason, owner, expiry and threshold
```

Comparison input:

```json
{
  "baseline": {
    "version": "...",
    "route": "atlas_index",
    "requests": 1000,
    "errors": 0,
    "p95WallMs": 12,
    "r2Reads": 1000
  },
  "candidate": {
    "version": "...",
    "route": "atlas_index",
    "requests": 1000,
    "errors": 0,
    "p95WallMs": 13,
    "r2Reads": 1000
  }
}
```

---

## Task 3: Add build and test cost evidence

**Files:**
- Create: `packages/build-evidence/src/build-cost.ts`
- Create: `packages/build-evidence/test/build-cost.test.ts`
- Create: `scripts/build/write-build-cost-manifest.mjs`
- Modify: GitHub/self-hosted workflow configuration
- Modify: task-scoped Sandbox runner when introduced

Manifest:

```text
commit_sha
changed_packages
cache_hits
cache_misses
runner_seconds
sandbox_active_seconds
CPU_seconds
test_count
test_failures
artifact_bytes
estimated_cost
evidence_manifest_sha256
superseded_run_seconds
```

Tests must prove:

```text
[ ] negative or non-finite measurements fail
[ ] manifest digest is deterministic
[ ] a superseded run records cancellation rather than success
[ ] Sandbox evidence cannot be final until process termination and destruction are recorded
[ ] content-addressed cache reuse is distinguished from skipped required work
```

---

## Task 4: Add Sandbox lifecycle enforcement

**Files:**
- Create: `cloud/orchestrator/src/sandbox-policy.ts`
- Create: `cloud/orchestrator/test/sandbox-policy.test.ts`
- Create: `cloud/orchestrator/src/workflows/task-sandbox.ts`
- Create: `docs/operations/cloudflare/runbooks/sandbox-cleanup.md`

Policy:

```text
keepAlive=false by default
sleepAfter <= reviewed maximum
maximum_active_seconds required
copy-out target required
finally-destroy required
no founder credentials
bounded egress
```

Tests must prove:

```text
[ ] keepAlive without owner/expiry/destroy hook fails
[ ] missing durable copy-out fails
[ ] completion records child-process termination
[ ] timeout records forced destroy and recovery evidence
[ ] reused Sandbox IDs are tied to identical reviewed workload class
```

---

## Task 5: Add Durable Object hibernation qualification

**Files:**
- Create: `packages/runtime-policy/src/realtime.ts`
- Create: `packages/runtime-policy/test/realtime.test.ts`
- Apply later to 555stream and Arcade room Durable Objects

Qualification record:

```text
room_class
websocket_api
hibernation_enabled
hibernation_blockers
events_per_wakeup
active_duration
idle_connected_duration
state_bytes
```

Tests must prove:

```text
[ ] standard WebSocket API is rejected for a hibernation-required room
[ ] timers and outbound sockets are declared blockers
[ ] event batching has a reviewed maximum latency
[ ] room state can reconstruct after hibernation
[ ] idle connected duration is distinct from billable active duration
```

---

## Task 6: Add Dynamic Worker identity policy

**Files:**
- Create: `packages/runtime-policy/src/dynamic-worker.ts`
- Create: `packages/runtime-policy/test/dynamic-worker.test.ts`

Policy:

```text
load() for true one-off execution
get(stable_code_identity) for reviewed repeat execution
new identity only when code or capability digest changes
capability bindings are allowlisted
```

Tests must prove:

```text
[ ] random per-request identity for repeated code fails
[ ] code change produces a new identity
[ ] capability digest participates in identity
[ ] credentials are not exposed to loaded code
```

---

## Task 7: Add Queue and Workflow operation accounting

**Files:**
- Create: `packages/runtime-policy/src/durable-job-cost.ts`
- Create: `packages/runtime-policy/test/durable-job-cost.test.ts`
- Apply to orchestrator Workflows and Queue consumers

Metrics:

```text
logical_operation_id
attempt_id
workflow_steps
workflow_cpu_ms
queue_writes
queue_reads
queue_deletes
retry_count
dead_letter_count
retained_state_bytes
completed_units
```

Tests must prove:

```text
[ ] retries share one logical operation ID
[ ] duplicate effects fail closed
[ ] failed batches expose read amplification
[ ] missing acknowledgement policy fails
[ ] unit cost separates useful completion from terminal failure
```

---

## Task 8: Add AI routing budgets

**Files:**
- Create: `packages/runtime-policy/src/ai-route.ts`
- Create: `packages/runtime-policy/test/ai-route.test.ts`
- Add reviewed AI Gateway route configuration when the orchestrator is implemented

Envelope:

```text
program_id
agent_id
venture_id
task_class
quality_class
latency_class
budget_class
privacy_class
cache_class
```

Tests must prove:

```text
[ ] private or state-changing requests cannot use shared cache
[ ] exact public requests can use reviewed cache
[ ] model route is selected from reviewed task class
[ ] spend exhaustion blocks or uses an approved fallback
[ ] retry cost is assigned to the same completed-task unit
[ ] provider estimate and final provider invoice remain distinguishable
```

---

## Task 9: Add SW4P and SW4P Earn cost units

**Files:**
- Add shared cost contract to SW4P integration layer
- Add reconciliation-cost tests
- Add source-aware economic-program metrics

SW4P:

```text
cost_per_finalized_settlement
route_failure_rate
webhook_retry_count
reconciliation_cost
```

SW4P Earn:

```text
cost_per_economic_program
cost_per_funded_source
cost_per_claim
reconciliation_delta
```

Tests must prove that settlement execution and economic composition remain separately attributable.

---

## Task 10: Add media, Arcade, and Ads cost units

**Files:**
- Extend 555stream room/runtime evidence
- Extend Arcade game/session evidence
- Extend Ads campaign execution evidence

Required metrics:

```text
555stream
  live_minutes
  active_participants
  hibernated_room_ratio
  events_per_wakeup
  media_process_active_seconds

555 Arcade
  game_sessions
  agent_players
  generated_games
  event_batch_efficiency

RNDRNTWRK Ads
  delivered_programs
  playable_activations
  approved_creatives
  agent_cost
  settlement_cost
```

No metric may contain participant messages, sponsor briefs, private prompts, or creative payloads.

---

## Task 11: Add the shared promotion gate

**Files:**
- Create: `packages/release-policy/src/unit-cost-gate.ts`
- Create: `packages/release-policy/test/unit-cost-gate.test.ts`
- Integrate into Cloudflare version promotion and later native release evidence

The gate compares:

```text
function
latency
errors
CPU
subrequests
storage operations
network boundaries
Queue operations
Workflow steps
Sandbox active seconds
AI cost
settlement failures
reconciliation delta
```

Override schema:

```text
reason
benefit_class: product | reliability | security
owner
approved_at
expires_at
maximum_regression
follow_up_issue
```

A missing or expired override fails closed.

---

## Verification gate

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
node --test cloud/public/test/*.test.mjs
node scripts/verify-cloud-boundary.mjs
```

Cloudflare account qualification additionally requires:

```text
[ ] Wrangler dry-run succeeds
[ ] Analytics Engine datasets exist
[ ] version metadata is present
[ ] staging route profiles match expected operation counts
[ ] metric outage test preserves product responses
[ ] candidate-vs-baseline gate runs before promotion
[ ] no production promotion is automatic
```

## Definition of done

- Every workload has a reviewed execution class and product unit.
- Public edge route cost attribution is running.
- Test and Sandbox work terminates after evidence copy-out.
- Real-time sessions demonstrate hibernation behavior.
- Internal routing and upstream placement are measured.
- AI requests carry budget, cache, privacy, and fallback policy.
- Durable jobs expose retry and operation amplification.
- SW4P, SW4P Earn, 555stream, Arcade, and Ads have separate unit economics.
- Release promotion compares cost with function, latency, and reliability.
- Technical articles and operating documents use execution traces rather than emotional framing.
