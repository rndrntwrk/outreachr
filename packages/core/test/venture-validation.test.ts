import { describe, expect, it } from 'vitest';

import {
  CanonicalDemoVersionSchema,
  CapitalMandateSchema,
  NarrativeProfileSchema,
  canonicalDemoDigest,
  narrativeDigest,
  type CanonicalDemoContent,
  type NarrativeContent,
} from '../src/index.js';

const NOW = '2026-08-15T08:00:00.000Z';
const SHA256 = 'a'.repeat(64);
const COMMIT_SHA = 'b'.repeat(40);

const narrativeContent: NarrativeContent = {
  purpose: 'investor',
  version: 1,
  description50: 'SW4P provides programmable settlement for applications.',
  description100:
    'SW4P provides a single application interface for settlement across EVM and Solana.',
  description250:
    'SW4P turns a bounded settlement instruction into a gas-aware, fee-correct, provable and reconcilable outcome.',
  problem: 'Applications repeatedly rebuild settlement operations for each supported rail.',
  productWedge: 'One application instruction produces one finished settlement result.',
  whyNow: 'Stablecoins and agent-operated applications need reliable settlement infrastructure.',
  technicalDifferentiation:
    'Route selection, gas policy, fees, execution state, finality, proof and reconciliation share one lifecycle.',
  evidenceFraming: 'Use reproducible route proofs, tests and dated implementation evidence.',
  businessModel: 'Usage and application fees for completed settlement operations.',
  useOfFunds: 'Production hardening, design-partner integrations and additional verified routes.',
  claimsBoundary: 'Do not present planned routes, partners or volume as current production evidence.',
  deckReference: null,
  demoReference: null,
};

const validNarrative = {
  id: 'narrative:sw4p:investor:1',
  legalEntityId: 'legal-entity:founder',
  ventureId: 'venture:sw4p',
  ...narrativeContent,
  contentSha256: SHA256,
  approvalState: 'draft' as const,
  approvedBy: null,
  approvedAt: null,
  createdAt: NOW,
  updatedAt: NOW,
};

const demoContent: CanonicalDemoContent = {
  version: 1,
  baselineRepository: 'rndrntwrk/sw4p',
  baselineCommitSha: COMMIT_SHA,
  branchConvention: 'hackathon/{event}/{entry}',
  expectedBaselineHours: 24,
  coreAssets: ['settlement API', 'receipt view'],
  evidenceRequirements: ['route proof', 'failure recovery'],
  approvedClaims: ['One instruction returns a reconciled settlement result.'],
};

const validDemo = {
  id: 'demo-version:d1:1',
  demoId: 'd1-sw4p-programmable-settlement',
  ...demoContent,
  contentSha256: SHA256,
  approvalState: 'draft' as const,
  approvedBy: null,
  approvedAt: null,
  createdAt: NOW,
  updatedAt: NOW,
};

const validMandate = {
  id: 'capital-mandate:round-1',
  roundId: 'round-1',
  legalEntityId: 'legal-entity:founder',
  ventureId: 'venture:sw4p',
  narrativeProfileId: 'narrative:sw4p:investor:1',
  stage: 'pre_seed' as const,
  targetAmountUsd: 1_500_000,
  minimumCheckUsd: 50_000,
  maximumCheckUsd: 250_000,
  instrument: 'SAFE',
  tokenSideLetterPolicy: 'No token side letter is offered by default.',
  geographies: ['United States', 'Global'],
  targetCloseDate: '2026-12-31',
  status: 'active' as const,
  approvedUseOfFunds: 'Production hardening, integrations and design-partner delivery.',
  createdAt: NOW,
  updatedAt: NOW,
};

describe('venture authority validation', () => {
  it('accepts valid authority records and rejects malformed hashes and ranges', () => {
    expect(NarrativeProfileSchema.safeParse(validNarrative).success).toBe(true);
    expect(
      NarrativeProfileSchema.safeParse({ ...validNarrative, contentSha256: 'short' }).success,
    ).toBe(false);
    expect(
      CapitalMandateSchema.safeParse({
        ...validMandate,
        minimumCheckUsd: 500_000,
        maximumCheckUsd: 100_000,
      }).success,
    ).toBe(false);
    expect(
      CanonicalDemoVersionSchema.safeParse({
        ...validDemo,
        baselineCommitSha: 'not-a-sha',
      }).success,
    ).toBe(false);
  });

  it('requires approval metadata only after approval', () => {
    expect(
      NarrativeProfileSchema.safeParse({
        ...validNarrative,
        approvalState: 'approved',
        approvedBy: null,
        approvedAt: null,
      }).success,
    ).toBe(false);
    expect(
      NarrativeProfileSchema.safeParse({
        ...validNarrative,
        approvalState: 'approved',
        approvedBy: 'founder',
        approvedAt: NOW,
      }).success,
    ).toBe(true);
  });

  it('blocks approval of a canonical demo with the all-zero baseline sentinel', () => {
    expect(
      CanonicalDemoVersionSchema.safeParse({
        ...validDemo,
        baselineCommitSha: '0'.repeat(40),
        approvalState: 'approved',
        approvedBy: 'founder',
        approvedAt: NOW,
      }).success,
    ).toBe(false);
    expect(
      CanonicalDemoVersionSchema.safeParse({
        ...validDemo,
        baselineCommitSha: '0'.repeat(40),
      }).success,
    ).toBe(true);
  });

  it('calculates deterministic content digests without database identity fields', () => {
    expect(narrativeDigest(narrativeContent)).toMatch(/^[a-f0-9]{64}$/u);
    expect(narrativeDigest({ ...narrativeContent })).toBe(narrativeDigest(narrativeContent));
    expect(canonicalDemoDigest(demoContent)).toMatch(/^[a-f0-9]{64}$/u);
    expect(canonicalDemoDigest({ ...demoContent })).toBe(canonicalDemoDigest(demoContent));
  });
});
