import type {
  StudioAppBootstrap,
  StudioCommandName,
  StudioCommandResult,
} from '../shared/hackathon-contracts';
import type {
  FounderAppBootstrap,
  FounderBootstrapCommandName,
  FounderCommandName,
  FounderCommandResult,
} from '../shared/venture-contracts';
import type { FounderCommandService } from './founder-command-service';
import { HackathonCommandService, isHackathonCommand } from './hackathon-command-service';
import type { HackathonService } from './hackathon-service';
import type { OpportunityService } from './opportunity-service';

const FOUNDER_BOOTSTRAP_COMMANDS = new Set<FounderBootstrapCommandName>([
  'onboarding.complete',
  'investor.target',
  'pipeline.move',
  'connector.syncCalendar',
  'connector.syncMail',
  'backup.restore',
]);

export interface StudioFounderCommandService {
  bootstrap(): Promise<FounderAppBootstrap>;
  execute<K extends FounderCommandName>(
    name: K,
    untrustedPayload: unknown,
  ): Promise<FounderCommandResult<K>>;
}

export class StudioCommandService {
  readonly #founder: StudioFounderCommandService;
  readonly #opportunities: OpportunityService;
  readonly #hackathons: HackathonService;
  readonly #hackathonCommands: HackathonCommandService;

  constructor(options: {
    founder: FounderCommandService | StudioFounderCommandService;
    opportunities: OpportunityService;
    hackathons: HackathonService;
  }) {
    this.#founder = options.founder;
    this.#opportunities = options.opportunities;
    this.#hackathons = options.hackathons;
    this.#hackathonCommands = new HackathonCommandService({
      opportunities: options.opportunities,
      hackathons: options.hackathons,
    });
  }

  async bootstrap(): Promise<StudioAppBootstrap> {
    const founder = await this.#founder.bootstrap();
    const opportunities = this.#opportunities.bootstrap();
    const hackathons = await this.#hackathons.bootstrap();
    return { ...founder, ...opportunities, ...hackathons };
  }

  async execute<K extends StudioCommandName>(
    name: K,
    untrustedPayload: unknown,
  ): Promise<StudioCommandResult<K>> {
    if (isHackathonCommand(name)) {
      return this.#hackathonCommands.execute(name, untrustedPayload) as unknown as Promise<
        StudioCommandResult<K>
      >;
    }

    const founderName = name as FounderCommandName;
    const result = await this.#founder.execute(founderName, untrustedPayload);
    if (!FOUNDER_BOOTSTRAP_COMMANDS.has(founderName as FounderBootstrapCommandName)) {
      return result as unknown as StudioCommandResult<K>;
    }
    const opportunities = this.#opportunities.bootstrap();
    const hackathons = await this.#hackathons.bootstrap();
    return {
      ...(result as FounderAppBootstrap),
      ...opportunities,
      ...hackathons,
    } as unknown as StudioCommandResult<K>;
  }
}
