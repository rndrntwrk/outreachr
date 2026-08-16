import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function walk(root) {
  if (!existsSync(root)) return [];
  const files = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...walk(path));
    else files.push(path);
  }
  return files;
}

function repositoryPath(path) {
  return relative(repositoryRoot, path).replaceAll('\\', '/');
}

const cloudSourceFiles = [
  ...walk(join(repositoryRoot, 'cloud')),
  ...walk(join(repositoryRoot, 'packages')).filter((path) =>
    repositoryPath(path).split('/').some((segment) => segment.startsWith('cloud-')),
  ),
].filter((path) => {
  const extension = extname(path);
  return repositoryPath(path).includes('/src/') && ['.js', '.mjs', '.cjs', '.ts', '.tsx'].includes(extension);
});

const prohibitedImports = [
  {
    pattern: /apps\/desktop\/src\/main/gu,
    reason: 'cloud source cannot import Electron main-process code',
  },
  {
    pattern: /from\s+['"]electron['"]|require\(['"]electron['"]\)/gu,
    reason: 'cloud source cannot import Electron',
  },
  {
    pattern: /from\s+['"]sql\.js['"]|require\(['"]sql\.js['"]\)/gu,
    reason: 'cloud source cannot import the local SQL.js vault runtime',
  },
  {
    pattern: /secure-store|connector-service|agent-service/gu,
    reason: 'cloud source cannot import local credential, connector, or agent host services',
  },
];

for (const path of cloudSourceFiles) {
  const content = readFileSync(path, 'utf8');
  for (const rule of prohibitedImports) {
    if (rule.pattern.test(content)) {
      errors.push(`${repositoryPath(path)}: ${rule.reason}`);
    }
    rule.pattern.lastIndex = 0;
  }
}

const wranglerFiles = walk(join(repositoryRoot, 'cloud')).filter((path) =>
  /^wrangler\.(?:jsonc?|toml)$/u.test(path.split(/[\\/]/u).at(-1) ?? ''),
);
const secretKeyPattern = /["'](?:password|private[_-]?key|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret)["']\s*[:=]/giu;
for (const path of wranglerFiles) {
  const content = readFileSync(path, 'utf8');
  if (secretKeyPattern.test(content)) {
    errors.push(`${repositoryPath(path)}: production-like secret key appears in Wrangler configuration`);
  }
}

const placeholderRoots = [
  join(repositoryRoot, 'cloud'),
  join(repositoryRoot, 'docs', 'operations', 'cloudflare'),
];
const placeholderPattern = /\b(?:TBD|TODO|FIXME|YOUR_[A-Z0-9_]+)\b/gu;
for (const root of placeholderRoots) {
  for (const path of walk(root).filter((item) => ['.md', '.json', '.jsonc', '.toml'].includes(extname(item)))) {
    const content = readFileSync(path, 'utf8');
    if (placeholderPattern.test(content)) {
      errors.push(`${repositoryPath(path)}: unresolved placeholder is not allowed in cloud operating files`);
    }
    placeholderPattern.lastIndex = 0;
  }
}

const railwayConfig = join(repositoryRoot, 'infra', 'railway', 'railway.toml');
if (existsSync(railwayConfig)) {
  const content = readFileSync(railwayConfig, 'utf8');
  if (/\benabled\s*=\s*true\b/iu.test(content)) {
    const placementDecision = join(repositoryRoot, 'infra', 'railway', 'placement-decision.json');
    if (!existsSync(placementDecision)) {
      errors.push(
        'infra/railway/railway.toml: enabled Railway runtime requires infra/railway/placement-decision.json',
      );
    }
  }
}

if (errors.length) {
  for (const error of errors) console.error(`cloud-boundary: ${error}`);
  process.exitCode = 1;
} else {
  console.log(`cloud-boundary: PASS (${cloudSourceFiles.length} cloud source files checked)`);
}
