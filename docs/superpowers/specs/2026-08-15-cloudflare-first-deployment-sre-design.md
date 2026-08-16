# Cloudflare-First Deployment and SRE Design

**Repository:** `rndrntwrk/outreachr`  
**Date:** 2026-08-15  
**Status:** Approved architecture, implementation in progress  
**Primary operator:** Solo founder  
**Primary hosted platform:** Cloudflare Developer Platform  
**Fallback hosted platform:** Railway by reviewed exception only

## 1. Executive decision

Outreachr uses a **Cloudflare-first, founder-local-authority** deployment model.

The Electron application and encrypted SQLite vault remain the sovereign private operating record. Cloudflare hosts public distribution, reviewed Opportunity Atlas intelligence, durable jobs, callback ingress, optional client-side-encrypted backup, optional proposal-only cloud agents, and operations telemetry. The cloud layer accelerates and distributes work; it does not replace the desktop trust boundary or become a hosted CRM.

```text
Founder device
  Outreachr Electron
    encrypted canonical SQLite vault
    OS-backed credentials
    founder approvals, evidence and receipts
    local agents and loopback MCP
          |
          | explicit signed bounded requests
          v
Cloudflare
  public edge
  signed device API
  callback and webhook ingress
  internal durable orchestration
  encrypted object storage
  Access-protected operations
          |
          | documented exception only
          v
Railway
  smallest isolated unsupported workload
```

Native macOS signing/notarization and Windows publisher signing remain separate native trust procedures. Cloudflare may distribute the resulting artifacts and signed metadata but does not replace those operating-system-specific release gates.

## 2. Goals

The system must:

- preserve the encrypted local vault as canonical;
- remain useful during a total cloud outage;
- distribute the public site, documentation, Atlas packages, update metadata and release artifacts globally;
- support optional encrypted off-device backup without cloud plaintext access;
- support durable scheduled research, retries, queues, workflows and source freshness;
- provide secure HTTPS callback and webhook ingress when necessary;
- permit founder-authorized cloud research and proposal generation without external-action authority;
- provide SLOs, alerts, traces, logs, incident records, rollback and recovery;
- avoid GitHub-hosted build-minute dependency for Worker deployment;
- constrain Railway to written exceptions.

## 3. Non-goals

The first implementation does not:

- host the canonical founder database;
- create users, teams, shared editing or live cloud synchronization;
- turn the browser into the primary application;
- upload arbitrary private tables or local documents;
- provide unattended outreach, submission, publishing, spending, signing, terms acceptance or merging;
- expose the local MCP server or SQLite database publicly;
- retain private prompts or responses in observability systems;
- treat Railway as a second general-purpose platform;
- claim native release certification from Linux-only infrastructure.

## 4. Product and authority principles

### 4.1 Local authority, cloud acceleration

Cloudflare may serve, schedule, queue, coordinate, relay, store ciphertext and create proposals. The founder applies or rejects every consequential result through the ordinary local application.

### 4.2 Opt-in private features

Public downloads and Atlas packages are ordinary public services. Device registration, encrypted backup, hosted callback relay and cloud proposal generation are independently opt-in and revocable.

### 4.3 Opaque private storage

Private R2 objects use pseudonymous keys and minimal metadata. Object keys never include company, investor, opportunity, application, hackathon, document or message names.

### 4.4 Strong consistency where required

D1 stores shared relational metadata. SQLite-backed Durable Objects store scoped nonce, one-time claim, session and idempotency state. R2 stores immutable or large objects. KV is not used as an authority store.

### 4.5 Idempotency under at-least-once delivery

Every Queue message and private mutation has a stable operation ID and payload digest. Replays with the same digest return the existing result. A conflicting digest fails closed.

### 4.6 Cloud failure does not block local work

During a Cloudflare outage the founder can open Outreachr, operate the local vault, use local agents, manage applications and hackathons, create local backups and prepare release candidates. Cloud-dependent features display delayed or unavailable state without failing the application.

## 5. Service topology

### 5.1 `outreachr-public`

Public Worker and Static Assets:

- website and documentation;
- liveness and readiness;
- signed update metadata;
- public release checksums, signing-status and SBOM links;
- reviewed Atlas index and packages;
- immutable R2 artifact delivery.

It has read-only public bindings and no private-backup or AI credentials.

### 5.2 `outreachr-device-api`

Signed private device API:

- device registration and revocation;
- signature, timestamp, nonce and digest verification;
- backup upload/download grants;
- encrypted proposal retrieval;
- bounded job dispatch and status;
- rate limits and idempotency.

### 5.3 `outreachr-callback`

Public ingress Worker:

- optional one-time OAuth authorization-code relay;
- provider webhook signature verification;
- minimal receipt creation;
- asynchronous Queue production.

The existing loopback PKCE callback remains preferred. The relay never exchanges a code for a refresh token.

### 5.4 `outreachr-orchestrator`

Internal-only Worker:

- Workflows;
- Queue consumers;
- scheduled Atlas refresh;
- private and public AI Gateway policies;
- proposal encryption;
- task-scoped Sandboxes and Containers;
- operational metric emission.

It has no public route.

### 5.5 `outreachr-ops`

Cloudflare Access-protected founder operations:

- deployment and service status;
- Workflow and DLQ inspection;
- safe replay or cancellation;
- backup-index health;
- incident evidence;
- release promotion and revocation evidence.

## 6. Data placement

### 6.1 D1

`outreachr-public-prod` stores public release and Atlas indexes, source provenance and freshness.

`outreachr-control-prod` stores pseudonymous device public keys and revocation state, backup indexes, operation ledgers, callback receipt metadata, quotas, deployment evidence and incidents.

Neither database stores the plaintext vault, OAuth tokens, message bodies, application answers, private notes or private agent prompts.

### 6.2 R2

`outreachr-public-artifacts-prod` stores immutable releases, checksums, signed manifests, SBOMs and Atlas packages.

`outreachr-private-backups-prod` stores only client-side-encrypted backups, handoff bundles and proposal envelopes.

`outreachr-workflow-artifacts-prod` stores bounded source snapshots, normalized public data and transient Sandbox output with lifecycle deletion.

`outreachr-ops-archive-prod` stores redacted logs, database exports, incident evidence, deployment manifests and SLO reports.

### 6.3 Durable Objects

`DeviceSession` atomically consumes nonces and manages scoped device state.

`CallbackRelay` manages an expiring one-time encrypted authorization-code claim.

`OperationGate` serializes high-value operations and records idempotent results.

No Durable Object contains the founder vault.

### 6.4 Queues and Workflows

Baseline Queues:

- Atlas refresh;
- webhooks;
- backup maintenance;
- agent proposal jobs;
- release events;
- operations notifications;
- dead letter.

Baseline Workflows:

- Atlas source refresh and package candidate publication;
- encrypted backup verification and retention;
- founder-authorized proposal generation;
- signed release promotion.

## 7. Device security protocol

An opted-in device creates an Ed25519 key pair. The private key remains in the operating-system credential facility. The cloud stores the public key and a pseudonymous device ID.

Every private request signs:

```text
device ID
timestamp
nonce
operation ID
HTTP method
canonical path
body SHA-256
```

The API verifies revocation, clock skew, nonce uniqueness, body digest, signature, path policy and rate limit before dispatch. Every mutation is idempotent.

Protocol negotiation includes desktop version, cloud protocol version, local schema version and feature capabilities. A mismatch disables only the cloud feature.

## 8. Encrypted backup

The desktop:

1. exports the local vault;
2. verifies SQLite and append-only audit integrity;
3. derives the encryption key locally;
4. creates an authenticated encrypted backup;
5. calculates a ciphertext digest;
6. receives a short-lived upload grant;
7. uploads ciphertext directly to R2.

Cloudflare receives only pseudonymous device ID, backup ID, ciphertext size and digest, schema version, creation time, retention class and verification status.

Default retention is seven daily, eight weekly and twelve monthly verified backups plus founder-protected manual backups. A clean-device synthetic restore is exercised quarterly.

Device handoff uses a separate encrypted one-time bundle and does not create live multi-device synchronization.

## 9. Opportunity Atlas

Public packages are immutable, digest-pinned and signed. They retain source URL, publisher, observation and retrieval dates, confidence, freshness, rights, opportunities, cycles, programs, sponsors, bounties, accelerators, grants, funds, cloud credits, RNDRNTWRK component fit and canonical-demo fit.

Scheduled refresh uses conditional requests, byte and time limits, parser versions and rights policy. New sources, parser changes, rights changes, conflicts and large semantic changes require founder review.

## 10. Proposal-only cloud agents

Cloud agent execution is disabled until the founder opts in.

A signed context grant specifies the provider, purpose, allowed context classes, exact record IDs, tool allowlist, size limits, expiry and budget. The cloud cannot expand the grant.

Public research and private proposals use separate AI Gateway policies. Private proposal requests disable payload logging and caching, use DLP and strict budgets, and encrypt the final typed proposal to the founder device before persistent storage.

A cloud agent may research, compare, summarize, draft and propose bounded work. It may not send, submit, publish, spend, sign, accept terms, upload founder documents, merge or deploy code, change legal authority, approve narratives or demos, verify evidence, decrypt backups or access the local vault.

Sandbox execution is one task per Sandbox, with no founder credentials, default-deny or allowlisted egress, hard time/CPU/storage budgets and durable copy-out before destruction.

## 11. Deployment and environments

Cloud services use Wrangler versions and Cloudflare Workers Builds connected directly to GitHub.

```text
pull request
  frozen install
  tests and build
  versions upload
  isolated preview

main
  tests and build
  version upload
  staging deployment
  synthetic qualification
  founder production promotion
```

OpenTofu or Terraform manages D1, R2, Queues, DNS, Access, rate limits, Logpush and notifications. Wrangler manages Worker source versions. Preview environments receive no production private bindings or secrets.

Storage uses expand-and-contract migrations. A release records its supported storage range. Worker rollback never assumes data rollback.

## 12. SRE objectives

| Service | Objective |
|---|---:|
| Public site and update metadata | 99.95% monthly |
| Public artifact delivery | 99.95% monthly |
| Signed device API | 99.90% monthly |
| Backup grant and verification | 99.90% monthly |
| Valid webhook acknowledgement | 99.95% monthly |
| Queue terminal handling | 99.90% monthly |
| Due Atlas refresh | 99.0% monthly |
| Accepted agent jobs reaching terminal state | 99.5% monthly |
| Ordinary agent jobs within 15 minutes | 95% |
| Cloud control-plane RTO | under two hours |
| Local founder work during cloud outage | immediate |

Error-budget policy:

- below 50% used: normal delivery;
- 50–75%: reliability review for risky releases;
- 75–100%: freeze non-essential production change;
- exhausted: reliability and recovery work only.

## 13. Observability and incident management

Structured logs include service, environment, version, request or operation ID, trace ID, route or step, outcome, latency and bounded error code.

Logs never include tokens, authorization codes, request signatures, backup keys, vault content, private messages, application answers, private contacts, calendar descriptions, local document names or private agent payloads.

Workers traces use conservative sampling. Analytics Engine records service, Queue, Workflow, source freshness, backup age, device rejection, AI cost and release metrics. Redacted logs are exported to restricted R2 storage.

SEV-1 includes plaintext exposure, authentication bypass, backup-encryption bypass, metadata corruption, signing-key compromise or malicious release delivery.

SEV-2 includes sustained device API or backup outage, deadline-threatening Queue backlog, callback loss, bad deployment or required D1/DO recovery.

SEV-3 includes source freshness misses, agent latency degradation, non-critical public-site issues, log-export failure with local diagnostic retention, and cost warnings.

The founder is incident commander. Agents may summarize and propose actions but cannot rotate secrets, restore data, replay queues, revoke devices, delete objects or publish incident communication.

## 14. Disaster recovery

Recovery sources:

- local vault from local or client-encrypted R2 backup;
- D1 from Time Travel and daily R2 exports;
- Durable Objects from point-in-time recovery and reconstructed indexes;
- public artifacts from immutable R2 objects and signed manifests;
- Worker code from Git and Cloudflare version history;
- infrastructure from reviewed OpenTofu/Terraform configuration;
- proposals from encrypted envelopes or accepted local copies.

Exercises:

- monthly D1 staging restore;
- monthly synthetic DLQ replay;
- quarterly encrypted clean-device restore;
- quarterly device revoke and re-pair;
- quarterly Worker rollback and forward deployment;
- semiannual credential rotation;
- annual total-Cloudflare-outage local-only operation;
- release-manifest rollback and revocation before every stable desktop release.

## 15. Railway exception

Railway is introduced only after a written placement decision proves that the workload cannot be safely composed from Workers, Workflows, Queues, Durable Objects, D1, R2 and Sandbox/Containers.

Acceptable cases include a continuously running POSIX daemon, unsupported native dependency, persistent pull consumer, measured browser/media pipeline limit, strict third-party PostgreSQL requirement or independent status mirror.

Every fallback is a dedicated containerized service with liveness/readiness, signed internal authentication, minimum necessary data, no founder-vault access, no account-wide Cloudflare credential, common redacted telemetry, explicit persistent storage, backup/restore and a return-to-Cloudflare plan.

Railway is not a substitute for macOS or Windows native release trust.

## 16. Completion criteria

The architecture is implemented when:

- local Outreachr remains useful with every cloud route blocked;
- public site, Atlas index, signed release metadata and artifacts run on Cloudflare;
- private requests are signed and replay-protected;
- Cloudflare cannot decrypt founder backups;
- D1, DO, R2, Queue and Workflow recovery is exercised;
- cloud agents create only encrypted typed proposals;
- optional OAuth relay codes are one-time and device-encrypted;
- operations routes are Access-protected;
- telemetry is redacted and retention-limited;
- SLOs, alerts, error budgets and runbooks are operational;
- native release limitations remain explicit;
- Railway remains absent or is justified by a reviewed exception;
- no cloud component introduces autonomous external action.
