import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyFile, mkdir } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const _root = join(__dirname, '..');

async function copyBuildAssets() {
    console.log('Copying build assets...');

    const bundleSrc = join(_root, 'dist', 'cli.mjs');
    const bundleDest = join(_root, 'packages', 'cli', 'dist', 'cli.mjs');

    try {
        await copyFile(bundleSrc, bundleDest);
        console.log('Copied bundle to packages/cli/dist/cli.mjs');
    } catch (error) {
        console.error('Failed to copy bundle:', error);
        throw error;
    }

    // Copy knownProvidersData.js to CLI dist directory
    const utilsSrc = join(_root, '..', 'utils', 'knownProvidersData.js');
    const utilsDest = join(_root, 'packages', 'cli', 'dist', 'utils', 'knownProvidersData.js');

    try {
        await mkdir(join(_root, 'packages', 'cli', 'dist', 'utils'), { recursive: true });
        await copyFile(utilsSrc, utilsDest);
        console.log('Copied knownProvidersData.js to packages/cli/dist/utils/knownProvidersData.js');
    } catch (error) {
        console.error('Failed to copy knownProvidersData.js:', error);
        throw error;
    }
}

copyBuildAssets().catch(console.error);
