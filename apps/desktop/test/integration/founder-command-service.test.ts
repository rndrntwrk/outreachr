import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { canonicalDemoSeedDigest } from '@outreachr/core';
import { afterEach, describe, expect, it } from 'vitest';

import {
  FounderCommandService,
  type FounderBaseCommandService,
} from '../../src/main/founder-command-service';
import { VentureCommandService } from '../../src/main/venture-command-service';
import { VentureService } from '../../src/main/venture-service';
import type { VaultService } from '../../src/main/vault-service';
import type {
  CommandMap,
  CommandResultMap,
  FounderSetupInput,
} from '../../src/shared/contracts';
import {
  FIXED_NOW,
  RESOURCE_ROOT,
  initializedVault,
  removeTemporaryDirectory,
  temporaryDirectory,
} from '../helpers/vault';

class StubBaseCommandService implements FounderBaseCommandService {
  readonly #vault: VaultService;

  constructor(vault: VaultService) {
    this.#vault = vault;
  }

  bootstrap() {
    return this.#vault.bootstrap();
  }

  async execute<K extends keyof CommandMap>(
    name: K,
    untrustedPayload: unknown,
  ): Promise<CommandResultMap[K]> {
    if (name === 'onboarding.complete') {
      return (await this.#vault.completeOnboarding(
        untrustedPayload as FounderSetupInput,
      )) as unknown as CommandResultMap[K];
    }
    if (name === 'search') {
      return [
        {
          id: 'knowledge:sw4p',
          kind: 'knowledge',
          title: 'SW4P',
          subtitle: 'Programmable settlement',
          href: '/knowledge',
        },
      ] as unknown as CommandResultMap[K];
    }
    throw new Error(`Stub base command is not implemented: ${String(name)}`);
  }
}

const onboarding: FounderSetupInput = {
  founderName: 'Ada Founder',
  founderEmail: 'ada@local.test',
  companyName: 'SW4P',
  companyOneLiner: 'Programmable internet-native settlement for applications.',
  stage: 'pre_seed',
  targetAmount: 1_500_000,
  targetCheckMinimum: 50_000,
  targetCheckMaximum: 250_000,
  sectors: ['Stablecoins', 'Payments'],
  geographies: ['Global'],
  narrative: 'Founder-reviewed SW4P capital mandate.',
  postalAddress: '123 Founder Way\nSan Francisco, CA 94107\nUnited States',
};

describe('FounderCommandService', () => {
  const directories: string[] = [];
  const services: VaultService[] = [];

  const create = async (): Promise<{
    vault: VaultService;
    ventures: VentureService;
    commands: FounderCommandService;
  }> => {
    const directory = await temporaryDirectory('founder-command-service');
    directories.push(directory);
    const vault = await initializedVault(directory, () => FIXED_NOW);
    services.push(vault);
    const ventures = new VentureService({
      vault,
      resourceDirectory: RESOURCE_ROOT,
      now: () => FIXED_NOW,
    });
    return {
      vault,
      ventures,
      commands: new FounderCommandService({
        base: new StubBaseCommandService(vault),
        ventures,
      }),
    };
  };

  afterEach(async () => {
    for (const service of services.splice(0)) {
      try {
        service.vault.close();
      } catch {
        // A restore path may already have replaced or closed the original database.
      }
    }
    await Promise.all(directories.splice(0).map(removeTemporaryDirectory));
  });

  it('merges founder authority into bootstrap and bootstrap-returning legacy commands', async () => {
    const { commands } = await create();
    const empty = await commands.bootstrap();
    expect(empty.legalEntities).toEqual([]);
    expect(empty.ventures).toEqual([]);

    const onboarded = await commands.execute('onboarding.complete', onboarding);
    expect(onboarded).toMatchObject({
      round: { companyName: 'SW4P', stage: 'pre_seed' },
      legalEntities: [{ id: 'legal-entity:founder', displayName: 'SW4P' }],
      ventures: [{ id: 'venture:legacy-default', name: 'SW4P' }],
      activeCapitalMandateId: 'capital-mandate:round:active',
    });

    const bootstrapped = await commands.bootstrap();
    expect(bootstrapped.legalEntities).toEqual(onboarded.legalEntities);
    expect(bootstrapped.capitalMandates).toEqual(onboarded.capitalMandates);
  });

  it('validates and routes venture commands without changing legacy command semantics', async () => {
    const { commands } = await create();
    await commands.execute('onboarding.complete', onboarding);

    await expect(
      commands.execute('legalEntity.save', {
        legalName: 'Invalid Entity',
        displayName: 'Invalid',
        jurisdiction: null,
        entityType: 'trust',
        status: 'active',
        incorporationReference: null,
        capTableReference: null,
        founderAuthority: 'Founder controls external commitments.',
        publicWebsite: null,
      } as never),
    ).rejects.toThrow();

    const saved = await commands.execute('legalEntity.save', {
      legalName: 'SW4P Research Foundation',
      displayName: 'SW4P Research',
      jurisdiction: null,
      entityType: 'foundation',
      status: 'planned',
      incorporationReference: null,
      capTableReference: null,
      founderAuthority: 'Founder controls external commitments.',
      publicWebsite: null,
    });
    expect(saved).toMatchObject({ displayName: 'SW4P Research', status: 'planned' });

    const search = await commands.execute('search', { query: 'SW4P' });
    expect(search).toEqual([
      {
        id: 'knowledge:sw4p',
        kind: 'knowledge',
        title: 'SW4P',
        subtitle: 'Programmable settlement',
        href: '/knowledge',
      },
    ]);
    expect(Array.isArray(search)).toBe(true);
  });

  it('routes the founder-reviewed canonical demo import through the venture command surface', async () => {
    const { commands } = await create();
    const input = JSON.parse(
      await readFile(join(RESOURCE_ROOT, 'rndrntwrk', 'canonical-demos.json'), 'utf8'),
    ) as unknown;
    const digest = canonicalDemoSeedDigest(input);

    await expect(
      commands.execute('canonicalDemo.importDefaults', { packageDigest: '0'.repeat(64) }),
    ).rejects.toThrow('Canonical demo package digest does not match founder review');
    const demos = await commands.execute('canonicalDemo.importDefaults', {
      packageDigest: digest,
    });
    expect(demos).toHaveLength(11);
    expect(demos.every((demo) => demo.versions[0]?.approvalState === 'draft')).toBe(true);
  });
});

describe('VentureCommandService validation', () => {
  it('rejects malformed payloads before reaching the authority service', async () => {
    const calls: unknown[] = [];
    const fake = {
      saveLegalEntity(input: unknown) {
        calls.push(input);
        return Promise.resolve(input);
      },
    } as unknown as VentureService;
    const commands = new VentureCommandService(fake);

    await expect(
      commands.execute('legalEntity.save', {
        legalName: '',
        displayName: '',
        jurisdiction: null,
        entityType: 'corporation',
        status: 'active',
        incorporationReference: null,
        capTableReference: null,
        founderAuthority: '',
        publicWebsite: null,
      }),
    ).rejects.toThrow();
    expect(calls).toEqual([]);
  });
});
