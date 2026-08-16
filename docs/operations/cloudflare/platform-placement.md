# Platform placement and execution-class policy

Cloudflare is the default hosted platform for Outreachr. Railway is an exception-only fallback, not a parallel general-purpose estate.

Placement is a workload-classification decision. The selected substrate must satisfy persistence, ordering, isolation, latency, privacy, and recovery requirements with the lowest justified fixed and marginal cost.

The normative cost model, metric contract, and promotion gates are defined in [`cost-control.md`](cost-control.md).

## Admission record

Every hosted workload records:

```text
operation_id
program_id
actor_id
task_class
latency_class
persistence_class
isolation_class
privacy_class
cache_class
maximum_cpu_ms
maximum_subrequests
maximum_active_seconds
stop_conditions
required_evidence
```

The workload cannot request an unrestricted execution class. RNDRNTWRK CTRL or the reviewed service configuration selects the class.

## Cloudflare placement order

Evaluate the workload in this order:

1. **Worker request or scheduled handler** for short stateless validation, routing, policy, API composition, and transformations.
2. **Service Binding** for internal Worker-to-Worker calls rather than public HTTP routing.
3. **Durable Workflow** for retries, waits, long-running orchestration, external events, or human review.
4. **Queue** for asynchronous at-least-once delivery, backpressure, batching, and dead-letter handling.
5. **SQLite-backed Durable Object** for scoped strongly consistent coordination, ordered session state, locks, or hibernating real-time rooms.
6. **D1** for shared relational metadata whose workload fits D1 access patterns.
7. **R2** for immutable, large, public, transient, or client-encrypted objects.
8. **Dynamic Worker** for demand-loaded isolated code that does not require an operating-system process.
9. **Sandbox SDK or Container** for a filesystem, browser, compiler, native binary, or bounded Linux process.
10. **Split the workload** across these primitives before considering a second platform.

## Placement matrix

| Requirement | Default class | Required cost control |
|---|---|---|
| Short stateless request | Worker isolate | CPU and subrequest limits |
| Internal service call | Service Binding | No public URL; trace full call chain |
| Ordered scoped state | Durable Object | Hibernation eligibility and bounded storage |
| Durable wait/retry | Workflow | Step and retained-state budget |
| Async fan-out | Queue | Batch size, retry, acknowledgement, and DLQ budget |
| Demand-loaded tool code | Dynamic Worker | Stable code ID for reuse; no per-request identity churn |
| Browser/native/process task | Sandbox/Container | `keepAlive=false`, short `sleepAfter`, explicit destroy |
| Repeated external database access | Worker + Hyperdrive | Pool size, waiting clients, origin capacity |
| Repeated calls to one upstream | Worker placement near upstream | Measured end-to-end completion latency |

## Routing review

A placement review must reject:

```text
public HTTP where a Service Binding is available
container execution for a short stateless operation
non-hibernating Durable Object for an idle real-time room
new Dynamic Worker ID for unchanged repeated code
always-on process for scheduled or event-driven work
external database connection per request without pooling
unmeasured default edge placement for an upstream-heavy route
Sandbox keep-alive without an owner and destruction condition
```

The review compares:

```text
completed product unit
CPU ms
wall time
subrequests
storage operations
network boundaries
active instance seconds
retry amplification
failure recovery work
```

## Railway exception questions

A Railway runtime is prohibited unless a committed placement decision answers all of the following:

1. Which Cloudflare primitive or composition was evaluated?
2. Which documented limit, runtime incompatibility, or third-party constraint prevents safe operation on Cloudflare?
3. Which measured workload evidence demonstrates the limit?
4. Why can the workload not be split into Worker, Workflow, Queue, Durable Object, D1, R2, Dynamic Worker, or Sandbox steps?
5. Which data classes would Railway receive?
6. How is the service authenticated, rate-limited, isolated, observed, backed up, and recovered?
7. How are Cloudflare credentials scoped so the Railway service cannot administer the account?
8. How does the service prove it cannot access the founder vault or private device credentials?
9. What is the expected fixed cost, variable cost, idle cost, and cost per completed unit?
10. What triggers removal of the fallback and migration back to Cloudflare?

## Acceptable exception classes

- A continuously running POSIX daemon that cannot use a sleeping or task-scoped Container.
- A required native library or provider SDK unsupported by Workers and impractical in Sandbox.
- A long-lived Queue pull consumer whose connection model requires a persistent external process.
- A browser, media, or compute pipeline that exceeds practical Sandbox or Container limits after measurement.
- A third-party compatibility requirement for PostgreSQL that cannot be safely isolated behind a Cloudflare interface.
- An independent public status mirror or synthetic monitor outside Cloudflare's failure domain.

## Prohibited reasons

These are not sufficient reasons to add Railway:

- familiarity;
- avoiding workload classification;
- using a conventional server by default;
- native macOS or Windows packaging;
- storing the founder vault in Postgres;
- bypassing Worker, Workflow, Queue, Durable Object, Dynamic Worker, or Sandbox limits without measurement;
- creating a second secret or observability system without an exit plan;
- assuming always-on capacity is required before measuring demand.

## Required Railway boundary

An approved Railway fallback must:

- be one dedicated service with a reviewed Dockerfile;
- expose `/health/live` and `/health/ready`;
- accept only a signed internal protocol or narrowly scoped Queue credentials;
- receive the minimum data class necessary;
- use a dedicated service identity and no account-wide Cloudflare credential;
- emit the common redacted trace and unit-cost format;
- keep persistent state only in an explicit volume or PostgreSQL database;
- document backup and restore;
- define scale-to-zero or minimum-instance behavior explicitly;
- publish active instance seconds and cost per completed unit;
- remain replaceable;
- include a dated return-to-Cloudflare plan.

The service remains disabled until the placement decision is approved by the founder.
