import { afterEach, describe, expect, it } from 'vitest';

import type {
  FounderCommandName,
  FounderCommandResult,
} from '../../src/shared/venture-contracts';
import { StudioCommandService, type StudioFounderCommandService } from '../../src/main/studio-command-service';
import { HackathonService } from '../../src/main/hackathon-service';
import { OpportunityService } from '../../src/main/opportunity-service';
import { VentureService } from '../../src/main/venture-service';
import type { VaultService } from '../../src/main/vault-service';
import {
  FIXED_NOW,
  RESOURCE_ROOT,
  initializedVault,
  onboard,
  removeTemporaryDirectory,
  temporaryDirectory,
} from '../helpers/vault';

class FounderStub implements StudioFounderCommandService {
  readonly #vault: VaultService;
  readonly #ventures: VentureService;

  constructor(vault: VaultService) {
    this.#vault = vault;
    this.#ventures = new VentureService({
      vault,
      resourceDirectory: RESOURCE_ROOT,
      now: () => FIXED_NOW,
    });
  }

  async bootstrap() {
    const authority = await this.#ventures.bootstrap();
    const base = await this.#vault.bootstrap();
    return { ...base, ...authority };
  }

  async execute<K extends FounderCommandName>(
    _name: K,
    _payload: unknown,
  ): Promise<FounderCommandResult<K>> {
    throw new Error('Founder command execution is not used in this bootstrap test');
  }
}

describe('StudioCommandService bootstrap', () => {
  let vault: VaultService | null = null;
  let directory: string | null = null;

  afterEach(async () => {
    vault?.vault.close();
    if (directory) await removeTemporaryDirectory(directory);
    vault = null;
    directory = null;
  });

  it('combines founder, opportunity and hackathon state without expanding external authority', async () => {
    directory = await temporaryDirectory('studio-command');
    vault = await initializedVault(directory, () => FIXED_NOW);
    await onboard(vault);
    const opportunities = new OpportunityService({ vault, now: () => FIXED_NOW });
    const hackathons = new HackathonService({ vault, now: () => FIXED_NOW });
    const studio = new StudioCommandService({
      founder: new FounderStub(vault),
      opportunities,
      hackathons,
    });

    const bootstrap = await studio.bootstrap();
    expect(bootstrap).toMatchObject({
      round: { companyName: 'Local Labs' },
      legalEntities: [{ id: 'legal-entity:founder' }],
      organizations: [],
      opportunities: [],
      hackathonCycles: [],
      hackathonEntries: [],
      hackathonPortfolio: {
        openUpcomingRollingCycles: 0,
        candidateEntries: 0,
        submittedEntries: 0,
      },
    });
  });
});
