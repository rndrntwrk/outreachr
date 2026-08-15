import { describe, expect, it } from 'vitest';

import { FounderOperationsCommandService } from '../../src/main/founder-operations-command-service';
import type { CompleteFounderCommandService } from '../../src/main/complete-founder-command-service';
import type { HackathonStudioService } from '../../src/main/hackathon-studio-service';

const bootstrap = {
  appVersion: '0.1.0-test',
  platform: 'linux',
  vaultPath: '/tmp/outreachr.sqlite',
  isFirstRun: false,
  seedVersion: 'test',
  seedSignatureStatus: 'test',
  round: null,
  investors: [],
  people: [],
  pipeline: [],
  workItems: [],
  tasks: [],
  meetings: [],
  mailEvents: [],
  drafts: [],
  knowledge: [],
  lists: [],
  sourceReview: [],
  connectors: [],
  agents: [],
  agentContextGrants: [],
  agentProposals: [],
  suppressions: [],
  communicationPolicy: {
    sendingPaused: true,
    dailySendLimit: 1,
    reservedToday: 0,
    hourlySendLimit: 1,
    reservedThisHour: 0,
    recipientDomainDailyLimit: 1,
    recipientDomainCooldownMinutes: 30,
    postalAddress: null,
    optOutText: 'opt out',
  },
  auditIntegrity: { ok: true, entries: 0, errorAt: null },
  counts: { firms: 0, people: 0, targeted: 0, contacted: 0, meetings: 0, commitments: 0 },
  legalEntities: [],
  ventures: [],
  narrativeProfiles: [],
  canonicalDemos: [],
  capitalMandates: [],
  activeCapitalMandateId: null,
  organizations: [],
  opportunities: [],
  cycles: [],
  entries: [],
  portfolio: {
    openUpcomingRollingCycles: 0,
    candidateEntries: 0,
    activeBuilds: 0,
    submissionReadyEntries: 0,
    submittedEntries: 0,
    finalistOrWinnerEntries: 0,
    nextDeadlineAt: null,
    blockedEntries: 0,
    estimatedActiveHours: 0,
  },
};

describe('FounderOperationsCommandService', () => {
  it('preserves the complete bootstrap and routes local execution records separately', async () => {
    const calls: unknown[] = [];
    const base = {
      bootstrap: () => Promise.resolve(bootstrap),
      execute: () => Promise.resolve([]),
    } as unknown as CompleteFounderCommandService;
    const hackathons = {
      saveAsset(input: unknown) {
        calls.push(input);
        return Promise.resolve({ id: 'asset:test', ...input });
      },
    } as unknown as HackathonStudioService;
    const commands = new FounderOperationsCommandService({ base, hackathons });

    expect((await commands.bootstrap()).portfolio).toEqual(bootstrap.portfolio);
    await commands.execute('hackathon.asset.save', {
      entryId: 'entry:test',
      kind: 'readme',
      required: true,
      status: 'draft',
      reference: null,
      contentSha256: null,
      founderReviewState: 'pending',
    });
    expect(calls).toHaveLength(1);
  });
});
