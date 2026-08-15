# SW4P capital mandate

This runbook is the public-safe source of truth for operating one founder-controlled SW4P pre-seed mandate in the current Outreachr product.

Private contacts, relationship history, application answers, warm paths, expected checks, meeting notes, credentials, and the live vault remain outside this repository.

## Mandate identity

```text
Company: SW4P
Category: Programmable internet-native settlement
Stage: Pre-seed
Primary customer: Applications that move value across EVM and Solana
Core outcome: One settlement instruction becomes a gas-aware, fee-correct, provable and reconcilable result
Initial use cases: creator platforms, wallets, marketplaces, treasury tools, community applications and agent workflows
```

This mandate uses SW4P as the single company and investment wedge. RNDRNTWRK may be described as an originating product environment or strategic context only when relevant. Do not present RNDRNTWRK parent, 555stream, 555 Arcade, RNDRNTWRK Ads, SW4P Earn, or `$555` as separate companies inside the same round.

## Fifty-word description

SW4P gives applications one interface to execute settlement across EVM and Solana. A product specifies the receiver, asset, destination, fee and gas policy; SW4P handles routing, execution state, finality, failure recovery, proof and reconciliation. More rails are added when customer settlement demand justifies them.

## One-hundred-word description

SW4P is programmable internet-native settlement for applications. A product submits an instruction such as: deliver 250 USDC on Solana, collect the application fee, apply the approved gas policy and return proof. SW4P coordinates route choice, execution state, finality, failure recovery, webhooks and reconciliation across EVM and Solana. Creator platforms, wallets, marketplaces, treasury tools, community applications and agent workflows use one product interface instead of rebuilding settlement operations for every rail. SW4P is seeking design partners, ecosystem grants and pre-seed investors who care about correctness, developer experience and stablecoin settlement.

## Problem

Applications that move value across chains repeatedly rebuild the same operational layer:

- rail and route selection;
- gas sponsorship or recovery policy;
- fee calculation;
- execution state;
- finality monitoring;
- failure handling;
- webhooks;
- proofs;
- reconciliation.

That work is difficult to maintain, easy to fragment across product surfaces, and especially awkward when agents or automated workflows initiate the operation.

## Product wedge

SW4P accepts a settlement instruction and returns a finished economic result.

A representative instruction is:

```text
Deliver 250 USDC to the approved Solana account.
Collect the application fee.
Apply the approved gas policy.
Return execution state, finality, proof and reconciliation data.
```

The application remains responsible for the user relationship, product policy, custody choices, compliance obligations, and the truth of its instruction. SW4P supplies the programmable settlement operating layer.

## Customer use cases

### Creator and media platforms

Settle creator pay, production obligations, participant credits, sponsorship obligations, and platform fees without rebuilding each rail's operational state machine.

### Wallets and marketplaces

Expose a consistent application workflow while retaining product-specific routing, fee, and gas policies.

### Treasury and community applications

Move approved funds, preserve receipts, reconcile obligations, and keep program-level accounting connected to the originating instruction.

### Agent workflows

Let an approved agent propose or initiate a bounded settlement operation while human policy, tool authority, spend limits, finality, evidence, and reconciliation remain explicit.

## Claims boundary

### Implemented or evidenced

Current source repositories, test results, route proofs, SDK/API surfaces and founder-provided product truth.

Public material should use dated and reproducible evidence wherever possible. A repository, interface, or test proves only the behavior it actually demonstrates.

### Planned

Additional chains, partner-led fiat endpoints, broader production availability and customer-specific integrations.

Planned work should use future or current-progressive tense and should identify dependencies when material.

### Prohibited

Guaranteed coverage, guaranteed transaction success, guaranteed token performance, guaranteed liquidity, or unsupported live-route claims.

Do not imply that a planned rail, integration, partner, volume level, or production status is current merely because the architecture supports it.

## Evidence package

The mandate should reference, without copying private material into GitHub:

- current source commit or tagged build;
- architecture note;
- supported route description;
- SDK or API example;
- test output;
- one successful synthetic or approved route proof;
- one failure or recovery example;
- fee and gas-policy explanation;
- proof and reconciliation output;
- current product roadmap;
- design-partner request.

## Investor qualification

Prioritize investors with current evidence of interest in one or more of:

- stablecoins;
- payments and settlement;
- crypto infrastructure;
- developer infrastructure;
- Solana;
- EVM applications;
- wallets and marketplaces;
- treasury infrastructure;
- agent commerce or machine-initiated payments.

Do not load the entire opportunity atlas into the active round. Begin with 25–50 founder-reviewed firms and assign a concrete next action and date to every active target.

## Private lists

Create these lists inside the founder vault:

```text
SW4P / Apply now
SW4P / Warm introduction
SW4P / Stablecoin and payments
SW4P / Crypto infrastructure
SW4P / Developer infrastructure
SW4P / Ecosystem capital
SW4P / Conflict review
```

## Next-action vocabulary

Every active target needs a specific action, for example:

```text
Request introduction from [known person]
Review partner X portfolio conflict
Complete formal application
Prepare settlement architecture note
Send approved initial after source review
Do not contact until route proof is current
```

Avoid empty actions such as “follow up,” “research,” or “contact later” without an owner, object, or trigger.

## Disclosure policy

Use Outreachr knowledge policies consistently:

- `safe_for_outreach`: approved company category, public description, product wedge, public evidence, and design-partner request;
- `meeting_only`: detailed roadmap, current partner discussions, unit economics assumptions, and implementation trade-offs approved for a live conversation;
- `diligence_only`: private financial, legal, cap-table, security, and data-room information;
- `internal`: claims boundary, unresolved risks, unsupported routes, conflict analysis, target strategy, and founder notes.

## Synthetic qualification before a live send

Before any real outbound message:

1. qualify a new private vault using `private-vault-qualification.md`;
2. create a synthetic investor and `.example` person;
3. prepare an initial containing the exact configured postal address and opt-out wording;
4. approve the exact recipient, sender, subject, body, empty attachments, and unthreaded structure;
5. send through the connector test seam or a non-delivering test configuration;
6. verify one durable reservation and no automatic retry;
7. attempt a second initial and confirm it is blocked;
8. record a synthetic reply, meeting, and diligence task;
9. verify backup, restore, contribution exclusion, and audit integrity.

## Qualification result classifications

Record observations under one of four headings:

- `works`: current behavior is suitable for the mandate;
- `workflow gap`: the domain exists, but the founder experience needs improvement;
- `domain gap`: a required record or relationship does not exist in the schema;
- `security invariant`: a restriction that must be preserved.

Domain gaps should link to the relevant later implementation phase rather than being patched into the current investor model with improvised tags or notes.