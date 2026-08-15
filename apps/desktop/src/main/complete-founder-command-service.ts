import type {
  CompleteFounderAppBootstrap,
  CompleteFounderCommandMap,
  CompleteFounderCommandName,
  CompleteFounderCommandResult,
} from '../shared/hackathon-contracts';
import type {
  FounderAppBootstrap,
  FounderCommandMap,
  FounderCommandName,
  FounderCommandResult,
} from '../shared/venture-contracts';
import {
  HackathonCommandService,
  isHackathonCommand,
} from './hackathon-command-service';
import type { HackathonStudioService } from './hackathon-studio-service';

const BOOTSTRAP_RETURNING_COMMANDS = new Set<string>([
  'onboarding.complete',
  'investor.target',
  'pipeline.move',
  'connector.syncCalendar',
  'connector.syncMail',
  'backup.restore',
]);

export interface CompleteFounderBaseCommandService {
  bootstrap(): Promise<FounderAppBootstrap>;
  execute<K extends FounderCommandName>(
    name: K,
    untrustedPayload: unknown,
  ): Promise<FounderCommandResult<K>>;
}

export class CompleteFounderCommandService {
  readonly #base: CompleteFounderBaseCommandService;
  readonly #hackathons: HackathonStudioService;
  readonly #hackathonCommands: HackathonCommandService;

  constructor(options: {
    base: CompleteFounderBaseCommandService;
    hackathons: HackathonStudioService;
  }) {
    this.#base = options.base;
    this.#hackathons = options.hackathons;
    this.#hackathonCommands = new HackathonCommandService(options.hackathons);
  }

  async bootstrap(): Promise<CompleteFounderAppBootstrap> {
    const base = await this.#base.bootstrap();
    const hackathons = await this.#hackathons.bootstrap();
    return { ...base, ...hackathons };
  }

  async execute<K extends CompleteFounderCommandName>(
    name: K,
    untrustedPayload: unknown,
  ): Promise<CompleteFounderCommandResult<K>> {
    if (isHackathonCommand(name)) {
      return this.#hackathonCommands.execute(name, untrustedPayload) as Promise<
        CompleteFounderCommandResult<K>
      >;
    }

    const result = await this.#base.execute(
      name as keyof FounderCommandMap,
      untrustedPayload,
    );
    if (!BOOTSTRAP_RETURNING_COMMANDS.has(name)) {
      return result as CompleteFounderCommandResult<K>;
    }
    const hackathons = await this.#hackathons.bootstrap();
    return { ...(result as FounderAppBootstrap), ...hackathons } as CompleteFounderCommandResult<K>;
  }
}
