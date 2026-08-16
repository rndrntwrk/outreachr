# Cost, execution-class, and unit-economics control

This document defines how RNDRNTWRK places work, measures cost, and rejects infrastructure changes that increase the cost of a completed product outcome without a reviewed reason.

It is an architecture control, not a cloud-billing summary.

## 1. Cost function

Every program is evaluated as:

```text
Ctotal(N) =
    Cbuild
  + Ctest
  + Cruntime(N)
  + Cai(N)
  + Cmedia(N)
  + Cstate(N)
  + Cnetwork(N)
  + Csettlement(N)
  + Cfailure(N)
```

Where `N` is the number of completed product units: users, tasks, live minutes, game sessions, settlements, claims, sponsor programs, or another explicitly named unit.

The required direction is:

```text
Cidle_compute -> approximately zero
Cunit(N) = Ctotal(N) / completed_units(N)
Cunit(100) < Cunit(10)
Cunit(1,000) < Cunit(100)
```

Absolute spend may rise with successful usage. The architecture must prevent fixed idle capacity, uncontrolled fan-out, incorrect placement, repeated work, and long-lived execution from causing spend to rise faster than completed outcomes.

## 2. Admission envelope

RNDRNTWRK CTRL classifies work before execution.

```text
operation_id
program_id
venture_id
actor_id
task_class
latency_class
quality_class
persistence_class
isolation_class
privacy_class
cache_class
maximum_cpu_ms
maximum_subrequests
maximum_model_spend
maximum_active_seconds
stop_conditions
required_evidence
```

A workload cannot select its own unrestricted execution class. The admission layer resolves the least expensive class that satisfies the technical requirements.

## 3. Execution classes

| Class | Substrate | Use | Idle behavior | Primary cost unit |
|---|---|---|---|---|
| A | Worker isolate | Short stateless request, policy, routing, validation, API composition | No reserved process | request + CPU ms |
| B | Durable Object | Ordered scoped state, room, game, session, lock, state machine | Hibernates when eligible | request/message + active GB-s |
| C | Dynamic Worker | Demand-loaded tool or generated code requiring isolate separation | Created on demand; stable IDs permit bounded reuse | unique worker + request + CPU ms |
| D | Sandbox or Container | Filesystem, native binary, browser, compile, OS process, media tool | Sleep or explicit destroy | active instance time + requested resources |
| E | Workflow | Durable multi-step work, retry, wait, approval, reconciliation | Waiting does not consume CPU | invocation + CPU + steps + retained state |
| F | Queue consumer | Async work, backpressure, batching, retry, DLQ | No always-on consumer | write/read/delete operations + CPU |
| G | External AI provider | Inference selected by quality, cost, privacy, and latency policy | Request-scoped | provider cost per completed task |

### 3.1 Worker isolate

Use a Worker for authentication, routing, policy, lightweight transformations, release and Atlas delivery, and short control operations.

Workers Standard charges primarily by request and CPU time; wall-clock waiting is not CPU time. Static Asset requests are free, but Worker CPU still matters when `run_worker_first` executes code. Set explicit CPU and subrequest limits below platform maximums.

Reference:

- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/workers/platform/limits/

### 3.2 Durable Object

Use a Durable Object only when ordered, strongly consistent, scoped coordination is required.

Real-time sessions must use the WebSocket Hibernation API. A connected standard WebSocket that prevents hibernation creates duration cost while idle. Timers, unfinished requests, active sockets, and application design can prevent hibernation and must be tested.

Reference:

- https://developers.cloudflare.com/durable-objects/platform/pricing/
- https://developers.cloudflare.com/durable-objects/best-practices/websockets/

### 3.3 Dynamic Worker

Use `load()` for genuinely one-off code. Use `get(stableId, callback)` when repeated calls use the same reviewed code identity. A new ID or code version is a new billable Dynamic Worker creation; uncontrolled per-request IDs are prohibited.

Reference:

- https://developers.cloudflare.com/dynamic-workers/api-reference/
- https://developers.cloudflare.com/dynamic-workers/pricing/

### 3.4 Sandbox and Container

Use OS-level execution only when the workload requires a filesystem, native dependency, browser, compiler, or long-running child process.

Default policy:

```text
keepAlive = false
sleepAfter = shortest measured safe interval
copy durable evidence out before shutdown
destroy() after bounded one-shot work
```

A `keepAlive: true` Sandbox must have an explicit owner, maximum active duration, `finally { destroy() }`, and an incident alert for missed destruction.

Reference:

- https://developers.cloudflare.com/sandbox/configuration/sandbox-options/
- https://developers.cloudflare.com/sandbox/api/lifecycle/

### 3.5 Workflow

Use Workflows for durable retries, external waits, human approvals, long-running program steps, release promotion, and reconciliation. A sleeping or API-waiting Workflow does not incur CPU time, but steps and retained state are cost dimensions and must be bounded.

Reference:

- https://developers.cloudflare.com/workflows/reference/pricing/

### 3.6 Queue

Use Queues for asynchronous fan-out and backpressure. Batch size, retry policy, acknowledgement behavior, message size, and DLQ configuration determine operation count. A failed batch can cause every unacknowledged message to be read again.

Reference:

- https://developers.cloudflare.com/queues/platform/pricing/
- https://developers.cloudflare.com/queues/configuration/batching-retries/

## 4. Routing cost controls

Incorrect routing is a system-cost defect.

```text
incorrect placement
  -> extra upstream round trips
  -> longer completion time
  -> lower throughput

public HTTP between internal Workers
  -> avoidable network boundary and policy surface

container for short stateless operation
  -> avoidable process and memory allocation

non-hibernating real-time room
  -> idle duration cost

new Dynamic Worker ID for repeated code
  -> repeated creation cost

AI cache bypass for identical safe request
  -> repeated provider cost

high-cost model for low-complexity task
  -> increased cost per completed task

obsolete build not cancelled
  -> runner and Sandbox time for an artifact that will not ship
```

### 4.1 Internal calls

Use Service Bindings for Worker-to-Worker calls. They avoid a public URL, add no Service Binding request fee under Workers Standard, and keep total CPU attribution across the call chain.

Reference:

- https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/
- https://developers.cloudflare.com/workers/platform/pricing/#service-bindings

### 4.2 Placement

Default edge placement is not always optimal. When a Worker performs repeated calls to a database or API, evaluate:

```text
placement.mode = smart
placement.region = cloud region
placement.host = TCP origin
placement.hostname = HTTP origin
```

Choose the option through measured end-to-end latency and completion cost, not by assumption.

Reference:

- https://developers.cloudflare.com/workers/configuration/placement/

### 4.3 Database connections

Use Hyperdrive when Workers access an external supported database. The origin connection pool is shared across Worker invocations and must be right-sized against database capacity. Track waiting clients, open connections, available slots, and maximum pool size.

Reference:

- https://developers.cloudflare.com/hyperdrive/concepts/connection-pooling/
- https://developers.cloudflare.com/hyperdrive/configuration/tune-connection-pool/

## 5. Development and test cost

The development pipeline is a workload router.

```text
source change
  -> dependency graph
  -> affected targets
  -> cache lookup
  -> only missing work executes
  -> isolated test environment
  -> evidence manifest
  -> process-tree termination
  -> Sandbox destruction
```

Every build records:

```text
commit_sha
changed_packages
cache_hits
cache_misses
runner_seconds
sandbox_active_seconds
cpu_seconds
test_count
test_failures
artifact_bytes
estimated_cost
evidence_manifest_sha256
```

Controls:

- content-addressed dependency and build caches;
- affected-package and affected-test selection;
- cancellation of superseded branch builds;
- no reusable `keepAlive` Sandbox unless measured startup cost justifies it;
- immediate process-tree termination after evidence copy-out;
- immutable artifacts and reproducible manifests;
- no promotion from an unverified environment.

## 6. AI routing and cost

Every model request carries:

```text
program_id
agent_id
venture_id
user_id
task_class
quality_class
latency_class
budget_class
privacy_class
cache_class
```

The route is:

```text
classify task
  -> verify budget
  -> verify rate
  -> exact-cache decision
  -> select primary model
  -> timeout/error/budget result
  -> approved fallback or block
  -> record provider, model, tokens, estimated cost, retries and task outcome
```

AI Gateway caching is permitted only for exact, non-personalized, non-state-changing requests. Dynamic or user-specific requests explicitly bypass cache.

Spend limits block a request or move it to a reviewed cheaper fallback. Cost tracking is an estimate; provider invoices remain the exact billing source.

References:

- https://developers.cloudflare.com/ai-gateway/features/caching/
- https://developers.cloudflare.com/ai-gateway/features/spend-limits/

The primary unit is:

```text
model_cost_per_completed_task
```

Token count alone is insufficient. A cheap model that retries or produces unusable work can cost more per completed task.

## 7. Public edge metric contract

`outreachr-public` writes one non-blocking Analytics Engine point for every request when the binding exists.

Ordered fields:

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
double3 response_bytes, or -1 when unavailable
double4 actual_R2_read_operations
double5 handler_wall_ms
```

Analytics Engine accepts one sampling index, twenty blobs, and twenty doubles per point. Cost metrics are aggregate technical metadata and must not contain user, investor, opportunity, application, message, prompt, document, or credential content.

References:

- https://developers.cloudflare.com/analytics/analytics-engine/get-started/
- https://developers.cloudflare.com/analytics/analytics-engine/limits/

## 8. Product units

Required units include:

```text
Development
  cost_per_successful_build
  cost_per_tested_change
  cache_hit_ratio
  sandbox_active_seconds
  obsolete_run_seconds

Runtime
  CPU_ms_per_request
  cost_per_active_user
  cost_per_completed_program
  idle_compute_ratio
  request_amplification_factor

Agents
  model_cost_per_completed_task
  retries_per_completed_task
  cache_hit_ratio_by_task_class
  fallback_rate
  tool_calls_per_task

555stream
  cost_per_live_minute
  cost_per_active_participant
  hibernated_room_ratio
  events_per_runtime_wakeup
  media_process_active_seconds

555 Arcade
  cost_per_game_session
  cost_per_agent_player
  cost_per_generated_game
  event_batch_efficiency

SW4P
  cost_per_finalized_settlement
  route_failure_rate
  reconciliation_cost
  webhook_retry_count

SW4P Earn
  cost_per_economic_program
  cost_per_funded_source
  cost_per_claim
  reconciliation_delta

RNDRNTWRK Ads
  infrastructure_cost_per_delivered_program
  cost_per_playable_activation
  agent_cost_per_approved_creative
```

## 9. Promotion gates

A release is not promoted only because functional tests pass.

```text
build immutable version
  -> version-specific smoke test
  -> low-percentage deployment
  -> compare function, latency and unit-cost metrics
  -> promote or stop
```

The promotion gate compares the candidate with the current production baseline:

```text
p95 latency
error rate
CPU ms per request
subrequests per request
R2 operations per completed unit
Queue operations per completed unit
Workflow steps per completed unit
Sandbox active seconds per completed unit
AI cost per completed task
database query count
settlement failure and reconciliation delta
```

A candidate fails when:

- an absolute safety limit is exceeded;
- a route performs more storage or network operations than its reviewed profile;
- idle execution remains active without an explicit reason;
- the unit cost regresses materially without a reviewed product or reliability benefit;
- evidence cannot identify the version and completed product unit.

## 10. Story format for technical material

Technical stories are traces.

```text
commit
  -> affected graph
  -> cache result
  -> Sandbox execution
  -> evidence manifest
  -> destroy
  -> version upload
  -> low-percentage traffic
  -> cost and reliability comparison
  -> promotion or rollback
```

The narrative must name:

- the input;
- authority;
- selected execution class;
- state transition;
- cost envelope;
- evidence;
- output;
- stop or recovery condition.

Do not substitute emotional founder language, vague expense language, feature lists, or generic cloud claims for these mechanics.
