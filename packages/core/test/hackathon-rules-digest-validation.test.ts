import { describe, expect, it } from 'vitest';

import { HackathonCycleSchema } from '../src/index.js';

const NOW = '2026-08-15T10:00:00.000Z';
const SHA256 = 'a'.repeat(64);

const cycle = {
  id: 'cycle:test',
  opportunityId: 'opportunity:test',
  cycleName: '2026 cycle',
  registrationOpenAt: null,
  registrationCloseAt: null,
  buildStartAt: null,
  buildEndAt: null,
  submissionDeadlineAt: null,
  judgingStartAt: null,
  judgingEndAt: null,
  demoDayAt: null,
  resultAt: null,
  format: 'unknown' as const,
  location: null,
  state: 'watchlist' as const,
  rulesSourceId: null,
  rulesRetrievedAt: null,
  rulesSha256: null,
  createdAt: NOW,
  updatedAt: NOW,
};

describe('hackathon cycle rules digest validation', () => {
  it('keeps unknown instants nullable and accepts only a lowercase SHA-256 rules digest', () => {
    expect(HackathonCycleSchema.parse(cycle).rulesSha256).toBeNull();
    expect(
      HackathonCycleSchema.safeParse({ ...cycle, rulesSha256: 'not-a-digest' }).success,
    ).toBe(false);
    expect(HackathonCycleSchema.safeParse({ ...cycle, rulesSha256: SHA256 }).success).toBe(true);
    expect(
      HackathonCycleSchema.safeParse({ ...cycle, rulesSha256: 'A'.repeat(64) }).success,
    ).toBe(false);
  });
});
