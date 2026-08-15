# Security policy

Outreachr is a local-first fundraising and opportunity application. Use GitHub private vulnerability reporting on `rndrntwrk/outreachr` for issues that could expose credentials, private fundraising or application data, bypass founder approval, alter the audit chain, or cause an external action. Do not open a public issue for those reports.

Include the affected RNDRNTWRK version or commit, operating system, reproduction steps, the expected and observed authority boundary, and whether any external message, application, document, credential, source record, or local vault may have been affected.

## Supported versions

RNDRNTWRK supports the latest tagged fork release and the current `main` branch. Upstream-only releases from `lalalune/outreachr` are not RNDRNTWRK releases. Security fixes may be coordinated upstream when the underlying issue is generic, but the RNDRNTWRK fork retains responsibility for its venture, opportunity, Hackathon Studio, Atlas, and RNDRNTWRK CTRL modules.

## Security invariants

- OAuth refresh/access tokens are encrypted with Electron `safeStorage`; the application fails closed when secure encryption is unavailable.
- The SQLite vault contains no plaintext provider or agent secrets.
- No external message is sent without an immutable founder approval bound to recipient, sender, subject, body, attachments, and thread context.
- A canonical-person ledger blocks a second unsolicited initial message.
- Agent operations are read-only by default and may only propose external actions.
- Agents cannot submit applications, publish content, upload documents, spend funds, accept terms, sign agreements, merge code, or mark evidence verified.
- Imported seed, Opportunity Atlas, and contribution databases are treated as untrusted input and validated before attachment or copy.
- Private contacts, warm paths, application answers, diligence records, credentials, agent context, and vault backups never enter public contribution exports.
- Hackathon and application records retain the exact narrative, demo, evidence, and receipt versions used for external decisions.

Security reports should state whether the issue affects upstream Outreachr, an RNDRNTWRK-specific module, or both.
