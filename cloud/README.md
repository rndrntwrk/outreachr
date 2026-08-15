# Outreachr cloud estate

The `cloud/` directory contains optional shared services around the founder-operated Outreachr desktop application.

The desktop application and its encrypted SQLite vault remain the canonical private workspace. Cloud services may distribute public material, coordinate durable jobs, store client-side-encrypted objects, relay bounded callbacks, and return founder-reviewable proposals. They do not own the founder vault and they do not gain authority to send, submit, publish, spend, sign, accept terms, upload founder documents to a third party, merge code, approve narratives or demos, or verify evidence.

## Services

| Directory | Service | Exposure |
|---|---|---|
| `public/` | Public website, health, Opportunity Atlas index, update metadata, and R2 artifact delivery | Public |
| `device-api/` | Signed device API and encrypted-backup grants | Private signed device API |
| `callback/` | Optional OAuth relay and provider webhooks | Public ingress with strict verification |
| `orchestrator/` | Workflows, Queues, scheduled research, agents, and Sandboxes | Internal bindings and triggers only |
| `ops/` | Status, workflow/DLQ inspection, recovery, and release promotion | Cloudflare Access protected |

Only `public/` exists in the first implementation slice. Later services are added in the order specified by `docs/superpowers/plans/2026-08-15-cloudflare-first-deployment-sre.md`.

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
- immutable or reviewed objects at `atlas/index.json`, `releases/index.json`, `releases/manifests/...`, and `releases/artifacts/...`.

Production deployment is intentionally not automatic. Workers Builds should upload a version, staging checks should run, and the founder should promote the verified version.

## Secrets

Do not commit production secrets, API tokens, signing keys, provider credentials, device private keys, backup passwords, or OAuth codes. Public Worker configuration contains no secrets. Private services will use Cloudflare secrets or Secrets Store bindings and will expose only bounded metadata in logs.

The offline update-manifest signing private key must not be stored in a Worker secret.

## Railway

Railway is an exception-only fallback. A runtime service may not be enabled unless a reviewed placement decision identifies the Cloudflare limitation, data boundary, authentication model, observability, and return-to-Cloudflare plan.
