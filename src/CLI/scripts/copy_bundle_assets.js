import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const _root = join(__dirname, '..');

async function copyBuildAssets() {
    console.log('Copying build assets...');

    // No additional assets to copy for standalone CLI
    console.log('No additional assets to copy');
}

copyBuildAssets().catch(console.error);
