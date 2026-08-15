# Platform placement policy

Cloudflare is the default hosted platform for Outreachr. Railway is an exception-only fallback, not a parallel general-purpose estate.

## Cloudflare placement order

Evaluate the workload in this order:

1. Worker request or scheduled handler.
2. Durable Workflow for retries, waits, long-running orchestration, or human review.
3. Queue for asynchronous at-least-once delivery.
4. SQLite-backed Durable Object for scoped strongly consistent coordination.
5. D1 for shared relational metadata.
6. R2 for immutable, large, or client-encrypted objects.
7. Sandbox SDK or Containers for isolated Linux execution.
8. Split the workload across these primitives before considering a second platform.

## Railway exception questions

A Railway runtime is prohibited unless a committed placement decision answers all of the following:

1. Which Cloudflare primitive or composition was evaluated?
2. Which documented limit, runtime incompatibility, or third-party constraint prevents safe operation on Cloudflare?
3. Why can the workload not be split into Worker, Workflow, Queue, Durable Object, D1, R2, or Sandbox steps?
4. Which data classes would Railway receive?
5. How is the service authenticated, rate-limited, isolated, observed, backed up, and recovered?
6. How are Cloudflare credentials scoped so the Railway service cannot administer the account?
7. How does the service prove it cannot access the founder vault or private device credentials?
8. What triggers removal of the fallback and migration back to Cloudflare?

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
- avoiding Cloudflare resource design;
- using a conventional server by default;
- native macOS or Windows packaging;
- storing the founder vault in Postgres;
- bypassing Worker, Workflow, Queue, or Durable Object limits without measurement;
- creating a second secret or observability system without an exit plan.

## Required Railway boundary

An approved Railway fallback must:

- be one dedicated service with a reviewed Dockerfile;
- expose `/health/live` and `/health/ready`;
- accept only a signed internal protocol or Cloudflare Queue pull credentials;
- receive the minimum data class necessary;
- use a dedicated service identity and no account-wide Cloudflare credential;
- emit the common redacted log and metric format;
- keep persistent state only in an explicit volume or PostgreSQL database;
- document backup and restore;
- remain replaceable;
- include a dated return-to-Cloudflare plan.

The service remains disabled until the placement decision is approved by the founder.
