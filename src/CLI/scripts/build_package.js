import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const tsconfigPath = join(root, 'tsconfig.json');

function findTscPath(startDir) {
  let current = startDir;
  for (let i = 0; i < 8; i++) {
    const candidate = join(current, 'node_modules', 'typescript', 'lib', 'tsc.js');
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = join(current, '..');
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return null;
}

const tscPath = findTscPath(root);

if (!existsSync(tsconfigPath)) {
  throw new Error(`Missing tsconfig.json in ${root}`);
}

if (!tscPath) {
  throw new Error(`Missing TypeScript compiler at ${tscPath}`);
}

rmSync(join(root, 'dist'), { recursive: true, force: true });

execSync(`node "${tscPath}" -p tsconfig.json`, {
  stdio: 'inherit',
  cwd: root,
});
