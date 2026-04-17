import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
function ensureDir(dirPath) {
    if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
    }
}
function writeTree(baseDir, tree) {
    for (const [name, value] of Object.entries(tree)) {
        const targetPath = join(baseDir, name);
        if (Array.isArray(value)) {
            ensureDir(targetPath);
            for (const fileName of value) {
                writeFileSync(join(targetPath, fileName), '', 'utf8');
            }
            continue;
        }
        if (value && typeof value === 'object') {
            ensureDir(targetPath);
            writeTree(targetPath, value);
            continue;
        }
        if (typeof value === 'string') {
            ensureDir(baseDir);
            writeFileSync(targetPath, value, 'utf8');
            continue;
        }
        ensureDir(targetPath);
    }
}
export async function createTmpDir(treeOrOptions = {}) {
    if ('prefix' in treeOrOptions || 'parent' in treeOrOptions) {
        const options = treeOrOptions;
        const parent = options.parent ?? tmpdir();
        return mkdtempSync(join(parent, options.prefix ?? 'aether-'));
    }
    const tmpDir = mkdtempSync(join(tmpdir(), 'aether-'));
    writeTree(tmpDir, treeOrOptions);
    return tmpDir;
}
export async function cleanupTmpDir(dirPath) {
    rmSync(dirPath, { recursive: true, force: true });
}
//# sourceMappingURL=aetherTestUtils.js.map