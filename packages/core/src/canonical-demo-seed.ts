import { createHash } from 'node:crypto';
import { z } from 'zod';

import { appendAuditEntry } from './repository.js';
import { IdSchema, IsoDateTimeSchema, stableJson } from './validation.js';
import { VentureRepository } from './venture-repository.js';
import {
  GitCommitShaSchema,
  Sha256Schema,
  type CanonicalDemoVersion,
} from './venture-validation.js';

export const RNDRNTWRK_CANONICAL_DEMO_IDS = [
  'd1-sw4p-programmable-settlement',
  'd2-gas-abstracted-creator-payouts',
  'd3-alice-governed-mcp-operator',
  'd4-white-label-community-agent',
  'd5-human-agent-live-studio',
  'd6-rndrntwrk-coordination-layer',
  'd7-555-arcade-agent-native-play',
  'd8-sw4p-earn-composable-crypto-economies',
  'd9-rndrntwrk-ctrl',
  'd10-cross-community-composable-economy',
  'd11-rndrntwrk-ads-programmable-sponsor-experiences',
] as const;

const EXPECTED_DEMO_IDS = new Set<string>(RNDRNTWRK_CANONICAL_DEMO_IDS);
const ZERO_COMMIT_SHA = '0'.repeat(40);
const PACKAGE_ID = 'rndrntwrk-canonical-demos';
const PREFERENCE_KEY = `canonical-demo-seed-import:${PACKAGE_ID}`;

const PublicRepositorySchema = z
  .string()
  .trim()
  .min(1)
  .max(4_096)
  .refine(
    (value) => value === 'unbound' || /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(value),
    'Use owner/repository or the literal unbound',
  );

export const CanonicalDemoSeedItemSchema = z
  .object({
    id: z.enum(RNDRNTWRK_CANONICAL_DEMO_IDS),
    name: z.string().trim().min(1).max(500),
    category: z.string().trim().min(1).max(500),
    status: z.enum(['draft', 'approved']),
    baselineRepository: PublicRepositorySchema,
    baselineCommitSha: GitCommitShaSchema,
    branchConvention: z.string().trim().min(1).max(1_000),
    expectedBaselineHours: z.number().int().min(1).max(1_000),
    coreAssets: z.array(z.string().trim().min(1).max(10_000)).min(1).max(1_000),
    evidenceRequirements: z
      .array(z.string().trim().min(1).max(10_000))
      .min(1)
      .max(1_000),
    approvedClaims: z.array(z.string().trim().min(1).max(10_000)).min(1).max(1_000),
  })
  .superRefine((item, context) => {
    const unbound = item.baselineRepository === 'unbound';
    const zeroSha = item.baselineCommitSha === ZERO_COMMIT_SHA;
    if (unbound !== zeroSha) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['baselineCommitSha'],
        message:
          'Unbound demo baselines must use the all-zero sentinel, and bound baselines must not',
      });
    }
    if (item.status === 'approved' && zeroSha) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['status'],
        message: 'An approved demo seed requires a real baseline commit SHA',
      });
    }
  });
export type CanonicalDemoSeedItem = z.output<typeof CanonicalDemoSeedItemSchema>;

export const CanonicalDemoSeedPackageSchema = z
  .object({
    packageId: z.literal(PACKAGE_ID),
    packageVersion: z.string().trim().regex(/^\d+\.\d+\.\d+$/u),
    demos: z.array(CanonicalDemoSeedItemSchema).length(RNDRNTWRK_CANONICAL_DEMO_IDS.length),
  })
  .superRefine((seed, context) => {
    const ids = seed.demos.map((item) => item.id);
    const idSet = new Set<string>(ids);
    if (idSet.size !== ids.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['demos'],
        message: 'Canonical demo seed IDs must be unique',
      });
    }
    const missing = [...EXPECTED_DEMO_IDS].filter((id) => !idSet.has(id));
    if (missing.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['demos'],
        message: `Canonical demo seed is missing: ${missing.join(', ')}`,
      });
    }
  });
export type CanonicalDemoSeedPackage = z.output<typeof CanonicalDemoSeedPackageSchema>;

const CanonicalDemoSeedImportMetadataSchema = z
  .object({
    packageVersion: z.string().min(1),
    logicalDigestSha256: Sha256Schema,
    importedAt: IsoDateTimeSchema,
    demoCount: z.number().int().min(1),
    versionDigests: z.record(IdSchema, Sha256Schema),
  })
  .superRefine((metadata, context) => {
    if (Object.keys(metadata.versionDigests).length !== metadata.demoCount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['versionDigests'],
        message: 'Canonical demo import metadata must retain one digest per imported demo',
      });
    }
  });
type CanonicalDemoSeedImportMetadata = z.output<
  typeof CanonicalDemoSeedImportMetadataSchema
>;

export interface CanonicalDemoSeedImportResult {
  packageId: string;
  packageVersion: string;
  logicalDigestSha256: string;
  demoCount: number;
  alreadyImported: boolean;
}

function versionId(item: CanonicalDemoSeedItem): string {
  return `demo-version:seed:${item.id}`;
}

function parseMetadata(value: string): CanonicalDemoSeedImportMetadata {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    throw new Error('Canonical demo seed import metadata contains invalid JSON');
  }
  return CanonicalDemoSeedImportMetadataSchema.parse(parsed);
}

function sameStringArray(left: readonly string[], right: readonly string[]): boolean {
  return stableJson(left) === stableJson(right);
}

function versionMatchesItem(
  version: CanonicalDemoVersion,
  item: CanonicalDemoSeedItem,
): boolean {
  return (
    version.demoId === item.id &&
    version.baselineRepository === item.baselineRepository &&
    version.baselineCommitSha === item.baselineCommitSha &&
    version.branchConvention === item.branchConvention &&
    version.expectedBaselineHours === item.expectedBaselineHours &&
    sameStringArray(version.coreAssets, item.coreAssets) &&
    sameStringArray(version.evidenceRequirements, item.evidenceRequirements) &&
    sameStringArray(version.approvedClaims, item.approvedClaims)
  );
}

function findVersion(
  repository: VentureRepository,
  seedVersionId: string,
): CanonicalDemoVersion | null {
  for (const demo of repository.listCanonicalDemos()) {
    const found = demo.versions.find((version) => version.id === seedVersionId);
    if (found) return found;
  }
  return null;
}

export function canonicalDemoSeedDigest(input: unknown): string {
  const seed = CanonicalDemoSeedPackageSchema.parse(input);
  return createHash('sha256').update(stableJson(seed), 'utf8').digest('hex');
}

export function importCanonicalDemoSeed(
  repository: VentureRepository,
  input: unknown,
  options: { importedAt: string; founderId?: string },
): CanonicalDemoSeedImportResult {
  const seed = CanonicalDemoSeedPackageSchema.parse(input);
  const importedAt = IsoDateTimeSchema.parse(options.importedAt);
  const founderId = IdSchema.parse(options.founderId ?? 'founder');
  const digest = canonicalDemoSeedDigest(seed);
  const priorRow = repository.vault.one<{ value_json: string }>(
    'SELECT value_json FROM local_preferences WHERE key=?',
    [PREFERENCE_KEY],
  );

  if (priorRow) {
    const prior = parseMetadata(priorRow.value_json);
    if (prior.logicalDigestSha256 !== digest) {
      throw new Error(
        `Canonical demo seed package ${seed.packageId} was already imported with a different digest`,
      );
    }
    for (const [seedVersionId, expectedDigest] of Object.entries(prior.versionDigests)) {
      const current = findVersion(repository, seedVersionId);
      if (!current) {
        throw new Error(`Imported canonical demo version ${seedVersionId} is missing`);
      }
      if (current.contentSha256 !== expectedDigest) {
        throw new Error(`Imported canonical demo version ${seedVersionId} changed after import`);
      }
    }
    return {
      packageId: seed.packageId,
      packageVersion: prior.packageVersion,
      logicalDigestSha256: digest,
      demoCount: prior.demoCount,
      alreadyImported: true,
    };
  }

  return repository.vault.transaction(() => {
    const versionDigests: Record<string, string> = {};
    for (const item of seed.demos) {
      repository.upsertCanonicalDemo({
        id: item.id,
        name: item.name,
        category: item.category,
        status: 'active',
        createdAt: importedAt,
        updatedAt: importedAt,
      });

      const seedVersionId = versionId(item);
      let version = findVersion(repository, seedVersionId);
      if (!version) {
        version = repository.createCanonicalDemoVersion({
          id: seedVersionId,
          demoId: item.id,
          baselineRepository: item.baselineRepository,
          baselineCommitSha: item.baselineCommitSha,
          branchConvention: item.branchConvention,
          expectedBaselineHours: item.expectedBaselineHours,
          coreAssets: item.coreAssets,
          evidenceRequirements: item.evidenceRequirements,
          approvedClaims: item.approvedClaims,
          createdAt: importedAt,
          updatedAt: importedAt,
        });
      } else if (!versionMatchesItem(version, item)) {
        throw new Error(`Canonical demo seed version ${seedVersionId} conflicts with existing content`);
      }

      if (item.status === 'approved' && version.approvalState === 'draft') {
        version = repository.approveCanonicalDemoVersion(seedVersionId, founderId, importedAt);
      }
      if (item.status === 'approved' && version.approvalState !== 'approved') {
        throw new Error(`Canonical demo seed version ${seedVersionId} is not approved`);
      }
      versionDigests[seedVersionId] = version.contentSha256;
    }

    const metadata = CanonicalDemoSeedImportMetadataSchema.parse({
      packageVersion: seed.packageVersion,
      logicalDigestSha256: digest,
      importedAt,
      demoCount: seed.demos.length,
      versionDigests,
    });
    repository.vault.run(
      `INSERT INTO local_preferences(key,value_json,updated_at) VALUES (?,?,?)
       ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at`,
      [PREFERENCE_KEY, stableJson(metadata), importedAt],
    );
    appendAuditEntry(repository.vault, {
      occurredAt: importedAt,
      actorType: 'system',
      actorId: null,
      action: 'canonical_demo_seed.imported',
      entityType: 'canonical_demo_seed',
      entityId: seed.packageId,
      detail: {
        packageVersion: seed.packageVersion,
        logicalDigestSha256: digest,
        demoCount: seed.demos.length,
      },
    });

    return {
      packageId: seed.packageId,
      packageVersion: seed.packageVersion,
      logicalDigestSha256: digest,
      demoCount: seed.demos.length,
      alreadyImported: false,
    };
  });
}
