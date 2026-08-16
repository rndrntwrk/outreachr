# Cloud data classification

The Cloudflare estate is optional infrastructure around the founder-owned local vault. Every new field, object, log, metric, queue message, workflow input, or agent context must be assigned one classification before implementation.

| Class | Examples | Allowed stores | Logging | Default retention | Deletion authority |
|---|---|---|---|---|---|
| `public` | Website assets, reviewed Atlas packages, public release metadata, checksums, SBOMs | Public R2, public D1, Worker Static Assets, caches | Ordinary bounded access logs | Project lifetime or versioned release policy | Founder release or Atlas policy |
| `pseudonymous-control` | Device ID, public device key, backup ID, operation ID, workflow state, quota counters | Control D1, SQLite Durable Objects, operations R2 | IDs may be logged when necessary; no private labels | Operational need, normally 30–180 days | Founder or automated retention policy |
| `client-encrypted-private` | Encrypted vault backup, encrypted handoff bundle, encrypted proposal envelope | Private R2 only, with pseudonymous index in control D1 | Ciphertext digest, size, status, and timing only | Backup or proposal-specific retention | Signed founder request or documented retention workflow |
| `transient-founder-authorized` | Minimized private agent prompt, selected private record summaries, one-time OAuth code | Workflow memory, scoped Durable Object, Sandbox memory, short-lived encrypted R2 only when required | Payload logging disabled; metadata-only telemetry | Minutes or hours, never indefinite | Automatic expiry; founder can cancel the run |
| `secret` | Cloudflare service token, provider API key, webhook verification key | Cloudflare secret binding or Secrets Store; founder OS keychain for device identity | Never | Until rotation or revocation | Founder |
| `prohibited-cloud` | Plaintext local vault, backup password, local device private key, OAuth refresh token in the baseline, message bodies, mailbox subjects, private calendar descriptions, private document contents, raw local agent credential stores | None | Never | None | Not applicable |

## Rules

1. The local SQLite vault is always `prohibited-cloud` in plaintext.
2. An object key or metadata field must not reveal a founder, investor, company, application, hackathon entry, document, or message name when the object is private.
3. A public source fact does not become private merely because the founder imports it; the private selection, notes, decision, application, and relationship history remain separate records.
4. Private AI Gateway requests disable payload logging and caching. A provider receives only the context explicitly granted for that run.
5. Preview deployments receive only synthetic or explicitly sanitized data.
6. Logs use bounded error codes and pseudonymous operation IDs. They never contain request signatures, authorization codes, credentials, private prompts, or decrypted backup content.
7. Adding a new cloud persistence table, bucket prefix, or retained payload requires a privacy review and an update to this document.
