import type { AppBootstrap, CommandMap, CommandResultMap } from '../shared/contracts';
import type {
  FounderAppBootstrap,
  FounderCommandName,
  FounderCommandResult,
} from '../shared/venture-contracts';
import type { CommandService } from './command-service';
import { isVentureCommand, VentureCommandService } from './venture-command-service';
import type { VentureService } from './venture-service';

const APP_BOOTSTRAP_COMMANDS = new Set<string>([
  'onboarding.complete',
  'investor.target',
  'pipeline.move',
  'connector.syncCalendar',
  'connector.syncMail',
  'backup.restore',
]);

interface BaseCommandService {
  bootstrap(): Promise<AppBootstrap>;
  execute<K extends keyof CommandMap>(
    name: K,
    untrustedPayload: unknown,
  ): Promise<CommandResultMap[K]>;
}

export class FounderCommandService {
  readonly #base: BaseCommandService;
  readonly #ventures: VentureService;
  readonly #ventureCommands: VentureCommandService;

  constructor(options: { base: CommandService | BaseCommandService; ventures: VentureService }) {
    this.#base = options.base;
    this.#ventures = options.ventures;
    this.#ventureCommands = new VentureCommandService(options.ventures);
  }

  async bootstrap(): Promise<FounderAppBootstrap> {
    const base = await this.#base.bootstrap();
    const authority = await this.#ventures.bootstrap();
    return { ...base, ...authority };
  }

  async execute<K extends FounderCommandName>(
    name: K,
    untrustedPayload: unknown,
  ): Promise<FounderCommandResult<K>> {
    if (isVentureCommand(name)) {
      return this.#ventureCommands.execute(name, untrustedPayload) as Promise<
        FounderCommandResult<K>
      >;
    }

    const result = await this.#base.execute(name as keyof CommandMap, untrustedPayload);
    if (!APP_BOOTSTRAP_COMMANDS.has(name)) {
      return result as FounderCommandResult<K>;
    }
    const authority = await this.#ventures.bootstrap();
    return { ...(result as AppBootstrap), ...authority } as FounderCommandResult<K>;
  }
}
