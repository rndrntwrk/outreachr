# Private vault qualification

Use this runbook before a founder puts live fundraising, accelerator, grant, hackathon, sponsor, or partner information into an Outreachr vault.

The purpose is to prove the local authority, recovery, privacy, connector, and agent boundaries on the founder's actual device without committing any private material to GitHub.

## Required environment

```text
Device: founder-controlled macOS, Windows, or Linux account
Vault: new local workspace, not a copied demo vault
Secrets: operating-system credential facility available
Backup: separate founder-controlled directory
Mail: optional founder-owned Google or Microsoft account
Calendar: optional founder-owned Google or Microsoft account
Agent: Codex or Claude, optional and proposal-only
```

Do not qualify a vault on a shared operating-system account, a public workstation, or a device where other software can read the founder's user profile without authorization.

## First-launch checklist

Complete these items before connecting mail, calendar, or an agent:

```text
[ ] founder identity and SW4P company identity entered
[ ] pre-seed round configured
[ ] postal address and opt-out text reviewed
[ ] current investor seed digest visible
[ ] encrypted backup created before connector setup
[ ] audit chain reports healthy
[ ] local vault path recorded privately
```

The private vault path, backup location, password, account identifiers, connector credentials, contact graph, and qualification notes must not be copied into an issue, pull request, public fixture, or public contribution package.

## Initial qualification sequence

### 1. Confirm local authority

1. Start Outreachr from the intended founder operating-system account.
2. Confirm the displayed vault path is inside the founder-controlled application-data directory.
3. Confirm the operating-system secure-storage facility reports available.
4. Confirm the audit-chain status is healthy.
5. Confirm the application is using the expected version and source commit.

Stop if secure storage is unavailable, the audit chain is unhealthy, the vault opens at an unexpected path, or the schema is newer than the application understands.

### 2. Establish the SW4P mandate

Use one company story only:

```text
Company: SW4P
Category: Programmable internet-native settlement
Stage: Pre-seed
```

Do not load RNDRNTWRK parent, 555stream, 555 Arcade, RNDRNTWRK Ads, or `$555` as competing company narratives inside this qualification mandate.

### 3. Create the pre-connector backup

1. Select a founder-controlled backup directory separate from the live vault directory.
2. Use a unique password with at least 12 characters.
3. Create the encrypted backup.
4. Record the file name, date, application version, and checksum privately.
5. Do not keep the backup password in Outreachr, the repository, a shell-history command, or the same directory as the backup.

### 4. Qualify optional connectors

Connect only the founder-owned account selected for the mandate.

For mail:

- verify the authenticated sender identity;
- verify relationship sync is intentionally enabled or disabled;
- run a complete initial reconciliation before any provider send;
- use a synthetic `.example` recipient for the first send-path qualification;
- confirm the exact postal address and opt-out wording appear in the draft;
- confirm one durable reservation and no automatic retry after an uncertain response.

For calendar:

- create a synthetic meeting first;
- verify only selected attendee names and addresses are sent to the provider;
- verify private notes stay local;
- confirm a provider error does not silently create a local success state.

### 5. Qualify an optional agent

1. Select only the context classes required for the run.
2. Use a synthetic or public investor record for the first proposal.
3. Ask the agent to prepare research, a task, or an outreach draft.
4. Confirm the result is stored as a pending proposal.
5. Confirm the proposal requires founder review before application.
6. Confirm no send, submit, publish, upload, shell, raw-SQL, credential, or arbitrary file tool is available.

## Destructive recovery test

Run this test against a disposable synthetic vault, never the founder's live vault.

```text
1. Create encrypted backup.
2. Add a synthetic investor, task, meeting, and draft.
3. Restore the earlier backup.
4. Verify the synthetic records are absent.
5. Verify schema integrity, foreign keys, and audit chain.
```

Detailed procedure:

1. Create a fresh synthetic vault and complete onboarding with non-routable `.example` data.
2. Create an encrypted backup and close the application cleanly.
3. Reopen it and add:
   - one synthetic investor and person;
   - one open task;
   - one manual meeting;
   - one unapproved draft.
4. Restore the earlier backup.
5. Verify all four later records are absent.
6. Verify `PRAGMA integrity_check` reports `ok` through the application's integrity surface.
7. Verify the foreign-key check reports no violations.
8. Verify the audit chain reports healthy.
9. Verify connector secrets are not present in the exported vault plaintext.
10. Delete the synthetic vault using the typed-confirmation reset flow.

## Contribution and export check

Create a contribution export from a synthetic qualification vault and verify that it excludes:

```text
founder identity
rounds and targets
private contacts
messages and approvals
send ledger and mailbox observations
meetings and tasks
notes and knowledge
connector configuration and secrets
agent runs and proposals
audit history
```

Only rights-reviewed public firm, person, fund, source, tag, claim, and sourced professional-work-email records may enter the contribution package.

## Completion record

Record the following privately:

```text
application version
source commit
operating system
vault created
pre-connector backup created
backup restore tested
audit chain healthy
mail connector result, if used
calendar connector result, if used
agent proposal-only result, if used
contribution exclusion result
remaining workflow gaps
```

A qualification result is not evidence that a live fundraising campaign, transaction route, investor relationship, or application outcome exists. It verifies the founder-operated workspace and its safety boundaries.