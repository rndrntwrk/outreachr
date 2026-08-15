import { describe, expect, it } from 'vitest';

import { HackathonCommandService } from '../../src/main/hackathon-command-service';
import type { HackathonService } from '../../src/main/hackathon-service';

describe('HackathonCommandService', () => {
  it('rejects a renderer-supplied weighted score before entry creation', async () => {
    const calls: unknown[] = [];
    const service = {
      createEntry(input: unknown) {
        calls.push(input);
        return Promise.resolve(input);
      },
    } as unknown as HackathonService;
    const commands = new HackathonCommandService(service);

    await expect(
      commands.execute('hackathon.entry.create', {
        cycleId: 'cycle:test',
        legalEntityId: 'legal-entity:test',
        leadVentureId: 'venture:test',
        supportingVentureIds: [],
        narrativeProfileId: 'narrative:test',
        canonicalDemoVersionId: 'demo-version:test',
        trackIds: [],
        bountyIds: [],
        submissionConcept: 'A focused submission.',
        userOutcome: 'A completed user result.',
        ecosystemAdapter: 'One bounded adapter.',
        estimatedHours: 48,
        reusePercentage: 80,
        strategicFit: 9,
        acceptanceProbability: 7,
        capitalUpside: 8,
        distributionUpside: 9,
        technicalLeverage: 9,
        credibility: 8,
        urgency: 8,
        effortEfficiency: 8,
        lockInSafety: 8,
        weightedScore: 100,
      } as never),
    ).rejects.toThrow();
    expect(calls).toEqual([]);
  });

  it('rejects a renderer-supplied eligibility result and accepts founder facts only', async () => {
    const calls: unknown[] = [];
    const service = {
      evaluateEligibility(id: string, profile: unknown) {
        calls.push({ id, profile });
        return Promise.resolve({ id, profile });
      },
    } as unknown as HackathonService;
    const commands = new HackathonCommandService(service);

    await expect(
      commands.execute('hackathon.entry.evaluateEligibility', {
        id: 'entry:test',
        profile: {
          country: null,
          founderAge: null,
          isStudent: null,
          companyFoundedOn: null,
          teamSize: 1,
          usesExistingCode: true,
          willOpenSource: true,
          technologies: ['TypeScript'],
          attendanceMode: 'online',
          canAttendInPerson: false,
          priorFundingUsd: 0,
          participantIds: ['founder'],
          submissionLanguage: 'English',
          availableArtifacts: ['source', 'tests'],
        },
        status: 'eligible',
      } as never),
    ).rejects.toThrow();
    expect(calls).toEqual([]);
  });
});
