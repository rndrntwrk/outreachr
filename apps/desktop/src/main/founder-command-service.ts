import type { AppBootstrap, CommandMap, CommandResultMap } from '../shared/contracts';
import type {
  FounderAppBootstrap,
  FounderCommandName,
  FounderCommandResult,
} from '../shared/venture-contracts';
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

export interface FounderBaseCommandService {
  bootstrap(): Promise<AppBootstrap>;
  execute<K extends keyof CommandMap>(
    name: K,
    untrustedPayload: unknown,
  ): Promise<CommandResultMap[K]>;
}

export class FounderCommandService {
  readonly #base: FounderBaseCommandService;
  readonly #ventures: VentureService;
  readonly #ventureCommands: VentureCommandService;

  constructor(options: { base: FounderBaseCommandService; ventures: VentureService }) {
    this.#base = options.base;
    this.#ventures = options.ventures;
    this.#ventureCommands = new VentureCommandService(options.ventures);
  }

  async bootstrap(): Promise<FounderAppBootstrap> {
    const authority = await this.#ventures.bootstrap();
    const base = await this.#base.bootstrap();
    return { ...base, ...authority };
  }

  async execute<K extends FounderCommandName>(
    name: K,
    untrustedPayload: unknown,
  ): Promise<FounderCommandResult<K>> {
    if (isVentureCommand(name)) {
      const result = await this.#ventureCommands.execute(name, untrustedPayload);
      return result as unknown as FounderCommandResult<K>;
    }

    const result = await this.#base.execute(name as keyof CommandMap, untrustedPayload);
    if (!APP_BOOTSTRAP_COMMANDS.has(name)) {
      return result as unknown as FounderCommandResult<K>;
    }
    const authority = await this.#ventures.bootstrap();
    const refreshedBase = await this.#base.bootstrap();
    return { ...refreshedBase, ...authority } as unknown as FounderCommandResult<K>;
  }
}
