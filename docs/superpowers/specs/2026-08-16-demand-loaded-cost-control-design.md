# Demand-Loaded Execution and Cost-Control Design

**Repository:** `rndrntwrk/outreachr`  
**Date:** 2026-08-16  
**Status:** Normative supplement to the Cloudflare-first deployment design  
**Primary operator:** Solo founder  
**Control layer:** RNDRNTWRK CTRL  

## 1. Decision

RNDRNTWRK minimizes fixed infrastructure cost, attaches variable cost to completed work, and reduces unit cost as utilization increases.

This document supersedes any cost framing based on vague founder burden, generic server expense, or cloud-feature inventory. Cost is a measurable property of the complete system:

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

Where `N` is a completed product unit such as a user, agent task, live minute, game session, settlement, claim, sponsor program, or verified build.

Target behavior:

```text
Cidle_compute -> approximately zero
Cunit(N) = Ctotal(N) / completed_units(N)
Cunit(100) < Cunit(10)
Cunit(1,000) < Cunit(100)
```

Absolute infrastructure spend can increase with product usage. The architecture must prevent fixed idle capacity, wrong execution classes, repeated work, uncontrolled fan-out, routing errors, and avoidable failure recovery from causing spend to increase faster than completed outcomes.

## 2. Control-plane schematic

```text
request / commit / event / agent task
                    |
                    v
        RNDRNTWRK CTRL admission
        identity + authority + task class
        latency + quality + privacy class
        persistence + isolation class
        cost ceiling + stop conditions
                    |
                    v
          execution-class router
        A  Worker isolate
        B  Durable Object
        C  Dynamic Worker
        D  Sandbox / Container
        E  Workflow
        F  Queue consumer
        G  reviewed AI provider
                    |
                    v
          evidence and cost ledger
        version + output + CPU + duration
        model cost + storage + network
        settlement + retries + recovery
                    |
                    v
       terminate / sleep / hibernate
```

The selected class is the least expensive substrate that satisfies the reviewed technical requirements. Workloads do not select unrestricted runtime capacity for themselves.

## 3. Admission envelope

Every hosted operation has a bounded envelope:

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

The envelope is immutable for the execution attempt. A retry creates a linked attempt with the same logical operation ID and a new attempt ID.

## 4. Execution classes

### 4.1 Class A — Worker isolate

Use for:

- authentication;
- request validation;
- routing;
- policy evaluation;
- API composition;
- short transformations;
- release and Atlas delivery;
- short settlement instruction validation;
- lightweight agent-control operations.

```text
request arrives
  -> isolate executes
  -> response or bounded downstream instruction
  -> no dedicated application process remains reserved
```

Required evidence:

```text
request_count
CPU_ms
subrequests
response_bytes
route_class
version
outcome
```

### 4.2 Class B — Durable Object

Use only when ordered, scoped, strongly consistent state is required:

- 555stream room state;
- Arcade game/session state;
- agent coordination session;
- settlement state machine;
- program-level lock;
- idempotency or nonce state.

Real-time sessions use WebSocket Hibernation when technically eligible.

```text
event arrives
  -> object wakes
  -> validates and applies ordered state transition
  -> persists required state
  -> sends output
  -> becomes hibernation-eligible
  -> leaves memory while eligible connections remain open
```

A timer, unfinished request, standard WebSocket, outbound socket, or application design that prevents hibernation is a cost defect unless explicitly reviewed.

### 4.3 Class C — Dynamic Worker

Use for demand-loaded code that needs isolate separation but not an operating-system process:

- one-off agent-generated tools;
- reviewed project-specific tool logic;
- temporary transformations;
- isolated plugins.

```text
agent proposes tool
  -> CTRL validates tool class and code identity
  -> Dynamic Worker receives bounded code and bindings
  -> code executes
  -> output and trace return
  -> isolate is discarded or briefly reused by stable ID
```

A fresh ID for unchanged repeated code is prohibited because it creates avoidable worker-creation cost.

### 4.4 Class D — Sandbox or Container

Use only for:

- filesystem operations;
- operating-system packages;
- browser automation;
- native binaries;
- compilation;
- isolated tests;
- media tools that cannot execute in an isolate;
- bounded long-running child processes.

Default lifecycle:

```text
create on first use
  -> restore content-addressed dependencies
  -> execute bounded task
  -> copy evidence to durable storage
  -> terminate process tree
  -> destroy or sleep at shortest reviewed inactivity interval
```

`keepAlive` defaults to false. Enabling it requires an owner, maximum duration, destruction in a `finally` path, and an alert for missed destruction.

Transient state must not be treated as durable state.

### 4.5 Class E — Workflow

Use for:

- multi-stage agent operations;
- human approval waits;
- release qualification and promotion;
- settlement reconciliation;
- retryable media processing;
- tasks spanning minutes, days, or weeks.

```text
step executes
  -> state is persisted
  -> workflow sleeps or waits
  -> external event or schedule resumes execution
```

CPU, steps, retries, retained state, and terminal outcome are measured separately.

### 4.6 Class F — Queue consumer

Use for:

- clip-generation requests;
- telemetry ingestion;
- indexing;
- notifications;
- settlement webhooks;
- non-interactive downstream work;
- batched transformations.

Queue cost controls include batch size, timeout, acknowledgement, retry count, message size, concurrency, and dead-letter handling. A failed batch must not cause uncontrolled retry amplification.

### 4.7 Class G — Reviewed AI provider

Inference is selected through:

```text
task classifier
  -> privacy and cache decision
  -> budget and rate check
  -> primary model
  -> timeout/error/budget result
  -> approved fallback or block
  -> outcome and cost record
```

The product unit is a completed task, not a token.

```text
model_cost_per_completed_task
retries_per_completed_task
fallback_rate
cache_hit_ratio_by_task_class
```

## 5. Routing is a cost control

Incorrect routing creates measurable expense:

```text
wrong geographic placement
  -> repeated upstream latency
  -> longer completion time
  -> lower throughput

public HTTP between internal Workers
  -> avoidable network and policy boundary

new database connection per request
  -> excess origin connections and handshakes

short operation in a Container
  -> avoidable process and memory allocation

non-hibernating idle room
  -> duration cost while no useful work completes

AI cache bypass for identical safe input
  -> repeated provider spend

high-cost model for low-complexity task
  -> increased cost per completed task

superseded build continues
  -> runner or Sandbox time for an artifact that cannot ship
```

Internal Worker calls use Service Bindings. Upstream-heavy Workers use measured placement. Supported external database access uses shared pooling rather than per-request connection creation.

## 6. Development and test architecture

```text
source change
  -> dependency graph
  -> affected packages and tests
  -> content-addressed cache lookup
  -> only missing work executes
  -> task-scoped Sandbox when OS isolation is required
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
CPU_seconds
test_count
test_failures
artifact_bytes
estimated_cost
evidence_manifest_sha256
```

Controls:

- affected-target selection;
- dependency and build caches;
- cancellation of superseded branch runs;
- one immutable artifact per content identity;
- no promotion from an unverified environment;
- no lingering test or browser process after evidence copy-out.

## 7. Deployment architecture

```text
build immutable version
  -> upload without production promotion
  -> version-specific smoke test
  -> low-percentage traffic
  -> compare functional, latency, error and unit-cost metrics
  -> progressive promotion or rollback
```

Promotion gates include:

```text
p95 latency
error rate
CPU_ms_per_request
subrequests_per_request
storage_operations_per_completed_unit
Queue_operations_per_completed_unit
Workflow_steps_per_completed_unit
Sandbox_active_seconds_per_completed_unit
AI_cost_per_completed_task
database_query_count
settlement_failure_rate
reconciliation_delta
```

A functionally correct candidate is rejected when its cost curve materially regresses without a reviewed product or reliability benefit.

## 8. Public edge implementation

`outreachr-public` classifies each request into a route profile and emits one non-blocking technical point when `COST_METRICS` is available.

```text
route_class
execution_class
product_unit
cache_class
method
outcome
immutable_version
request_count
HTTP_status
response_bytes
actual_R2_read_operations
handler_wall_ms
```

The Worker has explicit CPU and subrequest ceilings. A configuration change that increases those limits requires new evidence.

## 9. Product units

### Development

```text
cost_per_successful_build
cost_per_tested_change
cache_hit_ratio
sandbox_active_seconds
obsolete_run_seconds
```

### Runtime

```text
CPU_ms_per_request
cost_per_active_user
cost_per_completed_program
idle_compute_ratio
request_amplification_factor
```

### Agents

```text
model_cost_per_completed_task
retries_per_completed_task
cache_hit_ratio_by_task_class
fallback_rate
tool_calls_per_task
```

### 555stream

```text
cost_per_live_minute
cost_per_active_participant
hibernated_room_ratio
events_per_runtime_wakeup
media_process_active_seconds
```

### 555 Arcade

```text
cost_per_game_session
cost_per_agent_player
cost_per_generated_game
event_batch_efficiency
```

### SW4P

```text
cost_per_finalized_settlement
route_failure_rate
reconciliation_cost
webhook_retry_count
```

### SW4P Earn

```text
cost_per_economic_program
cost_per_funded_source
cost_per_claim
reconciliation_delta
```

### RNDRNTWRK Ads

```text
infrastructure_cost_per_delivered_program
cost_per_playable_activation
agent_cost_per_approved_creative
```

## 10. Failure and recovery cost

Failure cost is first-class:

```text
Cfailure =
    retry_compute
  + duplicate_storage_operations
  + reconciliation_work
  + rollback_work
  + operator_time
  + lost_completed_units
```

Every retry must preserve the logical operation ID. Duplicate side effects are prohibited. Queue consumers, Workflows, callbacks, settlement webhooks, and release operations are idempotent.

A recovery record includes:

```text
failed_attempt_id
logical_operation_id
failure_class
retries
replayed_steps
compensating_actions
recovery_duration
additional_cost
final_outcome
```

## 11. Technical story format

A public or internal story is an execution trace:

```text
input
  -> authority
  -> classification
  -> selected execution class
  -> state transition
  -> cost envelope
  -> evidence
  -> output
  -> terminate, sleep, hibernate, retry, or rollback
```

Example:

```text
commit 8f31c2 modifies the SW4P Solana adapter
  -> CTRL calculates the affected dependency graph
  -> cached layers are restored
  -> task-scoped Sandbox test:8f31c2 starts
  -> adapter and reconciliation suites execute
  -> evidence manifest is copied to durable storage
  -> child processes terminate
  -> Sandbox is destroyed
  -> immutable release version is uploaded
  -> one-percent traffic receives the candidate
  -> route latency, settlement finality, retries and reconciliation delta are compared
  -> version is promoted or rolled back
```

Do not replace this structure with emotional founder language, vague expense language, generic scale claims, feature lists, or completion-checkmark storytelling.

## 12. Completion criteria

The design is implemented when:

- every hosted workload has an execution class and product unit;
- idle processes are absent or explicitly justified;
- test Sandboxes terminate after evidence copy-out;
- real-time rooms demonstrate hibernation eligibility;
- internal calls use reviewed routing and placement;
- AI requests carry cost, cache, privacy, and fallback classes;
- public edge requests emit versioned route-cost points;
- build, release, runtime, media, AI, settlement, and recovery cost records use shared operation IDs;
- promotion compares unit cost alongside function, latency, and errors;
- product-unit cost can be compared at 10, 100, and 1,000 completed units;
- technical materials use trace-based storytelling.

## 13. Normative implementation references

- [`docs/operations/cloudflare/cost-control.md`](../../operations/cloudflare/cost-control.md)
- [`docs/operations/cloudflare/platform-placement.md`](../../operations/cloudflare/platform-placement.md)
- [`docs/operations/cloudflare/public-edge.md`](../../operations/cloudflare/public-edge.md)
- Cloudflare Workers pricing and limits
- Durable Objects pricing and WebSocket hibernation
- Dynamic Workers API and pricing
- Sandbox lifecycle and options
- Workflows pricing
- Queues pricing and batching/retries
- Service Bindings
- Worker placement
- Hyperdrive connection pooling
- AI Gateway caching and spend limits
- Analytics Engine limits and pricing
