import type {
  FounderOperationsBootstrap,
  FounderOperationsCommandName,
  FounderOperationsCommandResult,
} from '../shared/hackathon-execution-contracts';
import type {
  CompleteFounderCommandName,
  CompleteFounderCommandResult,
} from '../shared/hackathon-contracts';
import type { CompleteFounderCommandService } from './complete-founder-command-service';
import {
  HackathonExecutionCommandService,
  isHackathonExecutionCommand,
} from './hackathon-execution-command-service';
import type { HackathonStudioService } from './hackathon-studio-service';

export interface FounderOperationsBaseCommandService {
  bootstrap(): Promise<FounderOperationsBootstrap>;
  execute<K extends CompleteFounderCommandName>(
    name: K,
    untrustedPayload: unknown,
  ): Promise<CompleteFounderCommandResult<K>>;
}

export class FounderOperationsCommandService {
  readonly #base: FounderOperationsBaseCommandService;
  readonly #execution: HackathonExecutionCommandService;

  constructor(options: {
    base: CompleteFounderCommandService | FounderOperationsBaseCommandService;
    hackathons: HackathonStudioService;
  }) {
    this.#base = options.base;
    this.#execution = new HackathonExecutionCommandService(options.hackathons);
  }

  bootstrap(): Promise<FounderOperationsBootstrap> {
    return this.#base.bootstrap();
  }

  async execute<K extends FounderOperationsCommandName>(
    name: K,
    untrustedPayload: unknown,
  ): Promise<FounderOperationsCommandResult<K>> {
    if (isHackathonExecutionCommand(name)) {
      return this.#execution.execute(name, untrustedPayload) as Promise<
        FounderOperationsCommandResult<K>
      >;
    }
    return this.#base.execute(
      name as CompleteFounderCommandName,
      untrustedPayload,
    ) as Promise<FounderOperationsCommandResult<K>>;
  }
}
