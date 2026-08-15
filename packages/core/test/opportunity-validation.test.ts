import { describe, expect, it } from 'vitest';

import { OpportunitySchema, OpportunitySourceSchema } from '../src/index.js';

const NOW = '2026-08-15T10:00:00.000Z';

const validOpportunity = {
  id: 'opportunity:test',
  organizerOrganizationId: null,
  name: 'Example Hackathon',
  opportunityType: 'hackathon' as const,
  status: 'open' as const,
  publicUrl: 'https://example.test/hackathon',
  applicationUrl: null,
  openDate: null,
  deadline: null,
  startDate: null,
  endDate: null,
  format: 'online' as const,
  location: null,
  eligibilitySummary: null,
  termsSummary: null,
  capitalPrizeSummary: null,
  freshnessState: 'current' as const,
  reviewState: 'reviewed' as const,
  importedPackageId: null,
  importedPackageDigest: null,
  createdAt: NOW,
  updatedAt: NOW,
};

describe('opportunity validation', () => {
  it('preserves genuinely unknown dates as null', () => {
    const parsed = OpportunitySchema.parse(validOpportunity);
    expect(parsed.openDate).toBeNull();
    expect(parsed.deadline).toBeNull();
    expect(parsed.startDate).toBeNull();
    expect(parsed.endDate).toBeNull();
  });

  it('rejects invalid opportunity status and inconsistent known dates', () => {
    expect(OpportunitySchema.safeParse({ ...validOpportunity, status: 'maybe' }).success).toBe(false);
    expect(
      OpportunitySchema.safeParse({
        ...validOpportunity,
        openDate: '2026-09-10',
        deadline: '2026-09-01',
      }).success,
    ).toBe(false);
    expect(
      OpportunitySchema.safeParse({
        ...validOpportunity,
        startDate: '2026-09-10',
        endDate: '2026-09-09',
      }).success,
    ).toBe(false);
  });

  it('requires review timestamps only after an opportunity source decision', () => {
    const pending = {
      opportunityId: 'opportunity:test',
      sourceId: 'source:test',
      sourceRole: 'official rules',
      observedAt: NOW,
      confidence: 'verified' as const,
      reviewState: 'pending' as const,
      reviewedAt: null,
      createdAt: NOW,
    };
    expect(OpportunitySourceSchema.safeParse(pending).success).toBe(true);
    expect(
      OpportunitySourceSchema.safeParse({ ...pending, reviewState: 'accepted' }).success,
    ).toBe(false);
    expect(
      OpportunitySourceSchema.safeParse({
        ...pending,
        reviewState: 'accepted',
        reviewedAt: NOW,
      }).success,
    ).toBe(true);
  });
});
