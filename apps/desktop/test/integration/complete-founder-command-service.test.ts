import { describe, expect, it } from 'vitest';

import {
  CompleteFounderCommandService,
  type CompleteFounderBaseCommandService,
} from '../../src/main/complete-founder-command-service';
import type { HackathonStudioService } from '../../src/main/hackathon-studio-service';
import type { FounderCommandMap, FounderCommandResultMap } from '../../src/shared/venture-contracts';
import { bootstrapFixture } from '../renderer/fixtures';

const hackathonBootstrap = {
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

class StubFounderCommands implements CompleteFounderBaseCommandService {
  bootstrap() {
    return Promise.resolve(bootstrapFixture() as never);
  }

  execute<K extends keyof FounderCommandMap>(
    name: K,
    _payload: unknown,
  ): Promise<FounderCommandResultMap[K]> {
    if (name === 'investor.target') return Promise.resolve(bootstrapFixture() as never);
    if (name === 'search') return Promise.resolve([] as never);
    throw new Error(`Unexpected founder command: ${String(name)}`);
  }
}

describe('CompleteFounderCommandService', () => {
  it('merges Hackathon Studio into bootstrap and bootstrap-returning legacy commands', async () => {
    const hackathons = {
      bootstrap: () => Promise.resolve(hackathonBootstrap),
    } as unknown as HackathonStudioService;
    const commands = new CompleteFounderCommandService({
      base: new StubFounderCommands(),
      hackathons,
    });

    expect((await commands.bootstrap()).portfolio).toEqual(hackathonBootstrap.portfolio);
    expect(
      (await commands.execute('investor.target', { id: 'firm:test', target: true })).portfolio,
    ).toEqual(hackathonBootstrap.portfolio);
    expect(await commands.execute('search', { query: 'SW4P' })).toEqual([]);
  });
});
