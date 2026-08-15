import { z } from 'zod';

import {
  HackathonCycleSchema as BaseHackathonCycleSchema,
  type HackathonCycleInput as BaseHackathonCycleInput,
} from './hackathon-validation.js';
import { Sha256Schema } from './venture-validation.js';

export * from './hackathon-validation.js';

export const HackathonCycleSchema = BaseHackathonCycleSchema.safeExtend({
  rulesSha256: Sha256Schema.nullable().default(null),
});

export type HackathonCycleInput = BaseHackathonCycleInput & {
  rulesSha256?: string | null;
};
export type HackathonCycle = z.output<typeof HackathonCycleSchema>;
