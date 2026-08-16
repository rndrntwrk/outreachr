# Outreachr cloud estate

The `cloud/` directory contains optional, demand-loaded services around the founder-operated Outreachr desktop application.

The desktop application and its encrypted SQLite vault remain the canonical private workspace. Cloud services may distribute public material, coordinate durable jobs, store client-side-encrypted objects, relay bounded callbacks, and return founder-reviewable proposals. They do not own the founder vault and they do not gain authority to send, submit, publish, spend, sign, accept terms, upload founder documents to a third party, merge code, approve narratives or demos, or verify evidence.

## Control model

Every hosted workload must declare:

```text
execution class
product unit
cost envelope
persistence and isolation requirement
stop or hibernation condition
required evidence
```

The default design minimizes fixed idle capacity, attaches variable cost to completed work, and compares unit cost during release promotion.

Normative documents:

- [`Demand-Loaded Execution and Cost-Control Design`](../docs/superpowers/specs/2026-08-16-demand-loaded-cost-control-design.md)
- [`Demand-Loaded Cost-Control Implementation Plan`](../docs/superpowers/plans/2026-08-16-demand-loaded-cost-control.md)
- [`Cost-control operations`](../docs/operations/cloudflare/cost-control.md)
- [`Platform placement`](../docs/operations/cloudflare/platform-placement.md)

## Services

| Directory | Service | Default execution behavior | Exposure |
|---|---|---|---|
| `public/` | Public website, health, Opportunity Atlas index, update metadata, and R2 artifact delivery | Request-scoped Worker isolate | Public |
| `device-api/` | Signed device API and encrypted-backup grants | Request-scoped Worker plus scoped Durable Object | Private signed device API |
| `callback/` | Optional OAuth relay and provider webhooks | Request-scoped Worker plus Queue handoff | Public ingress with strict verification |
| `orchestrator/` | Workflows, Queues, scheduled research, agents, and Sandboxes | Event-driven; no public route; task-scoped OS execution | Internal bindings and triggers only |
| `ops/` | Status, workflow/DLQ inspection, recovery, and release promotion | Access-protected request and Workflow operations | Cloudflare Access protected |

Only `public/` exists in the first implementation slice. Later services are added in the order specified by the Cloudflare deployment plan and the demand-loaded cost-control plan.

## Public Worker

```bash
cd cloud/public
npm test
npm run dry-run
npm run dev
```

The first Worker expects:

- a Worker Static Assets binding named `ASSETS`;
- an R2 binding named `PUBLIC_ARTIFACTS`;
- an Analytics Engine binding named `COST_METRICS` for technical unit attribution;
- a version-metadata binding named `CF_VERSION_METADATA`;
- immutable or reviewed objects at `atlas/index.json`, `releases/index.json`, `releases/manifests/...`, and `releases/artifacts/...`.

The Worker records route class, execution class, product unit, cache class, immutable version, response bytes, actual R2 reads, and handler wall time. Metric delivery is non-blocking and cannot alter the request result.

Production deployment is intentionally not automatic:

```text
upload immutable version
  -> version-specific probes
  -> low-percentage traffic
  -> function, latency, error and unit-cost comparison
  -> founder promotion or rollback
```

## Secrets

Do not commit production secrets, API tokens, signing keys, provider credentials, device private keys, backup passwords, or OAuth codes. Public Worker configuration contains no secrets. Private services use narrowly scoped secrets or Secrets Store bindings and expose only bounded technical metadata in logs.

The offline update-manifest signing private key must not be stored in a Worker secret.

## Railway

Railway is an exception-only fallback. A runtime service may not be enabled unless a reviewed placement decision identifies:

- the measured Cloudflare limitation;
- the execution class that was evaluated;
- the data boundary;
- the authentication model;
- fixed, idle, and variable cost;
- cost per completed product unit;
- observability and recovery;
- the return-to-Cloudflare plan.
