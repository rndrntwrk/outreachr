import { describe, expect, it } from 'vitest';

import {
  evaluateHackathonEligibility,
  hackathonRulesDigest,
  type EligibilityProfile,
  type HackathonRule,
} from '../src/index.js';

const NOW = '2026-08-15T12:00:00.000Z';

const profile: EligibilityProfile = {
  evaluatedAt: NOW,
  country: 'US',
  founderAge: 35,
  isStudent: false,
  companyFoundedOn: '2026-01-01',
  teamSize: 2,
  usesExistingCode: true,
  willOpenSource: true,
  technologies: ['typescript', 'solana'],
  attendanceMode: 'online',
  canAttendInPerson: false,
  priorFundingUsd: 0,
  participantIds: ['founder'],
  submissionLanguage: 'en',
  availableArtifacts: ['readme', 'demo_video'],
};

function rule(
  id: string,
  ruleType: HackathonRule['ruleType'],
  value: unknown,
  overrides: Partial<HackathonRule> = {},
): HackathonRule {
  return {
    id,
    cycleId: 'cycle:test',
    ruleType,
    value,
    blocking: true,
    sourceId: 'source:rules',
    observedAt: NOW,
    confidence: 'verified',
    reviewState: 'accepted',
    reviewedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe('hackathon eligibility evaluation', () => {
  it('returns eligible for a verified accepted geography rule', () => {
    const rules = [rule('rule:geo', 'geography', { allowed: ['US', 'CA'] })];
    const result = evaluateHackathonEligibility(profile, rules);
    expect(result).toMatchObject({
      status: 'eligible',
      rulesSnapshotSha256: hackathonRulesDigest(rules),
    });
    expect(result.details[0]).toMatchObject({ ruleId: 'rule:geo', status: 'eligible' });
  });

  it('returns ineligible for an explicit student-only requirement', () => {
    const result = evaluateHackathonEligibility(profile, [
      rule('rule:student', 'student_status', { required: true }),
    ]);
    expect(result.status).toBe('ineligible');
    expect(result.details[0]?.reason).toContain('requires a current student');
  });

  it('does not require unavailable profile facts when a reviewed rule makes them optional', () => {
    const result = evaluateHackathonEligibility(
      { ...profile, isStudent: null, willOpenSource: null },
      [
        rule('rule:student-optional', 'student_status', { required: false }),
        rule('rule:open-source-optional', 'open_source', { required: false }),
      ],
    );
    expect(result.status).toBe('eligible');
  });

  it('fails closed when a required-technology rule has no usable list', () => {
    const result = evaluateHackathonEligibility(profile, [
      rule('rule:technology-empty', 'required_technology', { allOf: [] }),
    ]);
    expect(result.status).toBe('uncertain');
  });

  it('does not let an optional rule bypass pending blocking evidence review', () => {
    const result = evaluateHackathonEligibility(
      { ...profile, isStudent: null },
      [
        rule(
          'rule:student-pending',
          'student_status',
          { required: false },
          { reviewState: 'pending', reviewedAt: null },
        ),
      ],
    );
    expect(result.status).toBe('uncertain');
  });

  it('returns uncertain when a blocking company-age rule cannot be evaluated', () => {
    const result = evaluateHackathonEligibility(
      { ...profile, companyFoundedOn: null },
      [rule('rule:company-age', 'company_age', { maximumMonths: 12 })],
    );
    expect(result.status).toBe('uncertain');
  });

  it('rejects teams above the maximum and prohibited existing-code use', () => {
    const result = evaluateHackathonEligibility(
      { ...profile, teamSize: 4 },
      [
        rule('rule:team', 'team_size', { maximum: 3 }),
        rule('rule:code', 'existing_code', { allowed: false }),
      ],
    );
    expect(result.status).toBe('ineligible');
    expect(result.details.filter((detail) => detail.status === 'ineligible')).toHaveLength(2);
  });

  it('rejects required in-person attendance when the founder cannot attend', () => {
    const result = evaluateHackathonEligibility(profile, [
      rule('rule:attendance', 'attendance', { required: 'in_person' }),
    ]);
    expect(result.status).toBe('ineligible');
  });

  it('fails closed for pending, rejected, unknown or stale blocking evidence', () => {
    for (const uncertainRule of [
      rule(
        'rule:pending',
        'geography',
        { allowed: ['US'] },
        { reviewState: 'pending', reviewedAt: null },
      ),
      rule('rule:rejected', 'geography', { allowed: ['US'] }, { reviewState: 'rejected' }),
      rule('rule:unknown', 'geography', { allowed: ['US'] }, { confidence: 'unknown' }),
      rule('rule:stale', 'geography', { allowed: ['US'] }, { confidence: 'stale' }),
    ]) {
      expect(evaluateHackathonEligibility(profile, [uncertainRule]).status).toBe('uncertain');
    }
  });

  it('uses a stable digest independent of input rule ordering', () => {
    const a = rule('rule:a', 'geography', { allowed: ['US'] });
    const b = rule('rule:b', 'team_size', { maximum: 4 });
    expect(hackathonRulesDigest([a, b])).toBe(hackathonRulesDigest([b, a]));
  });
});
