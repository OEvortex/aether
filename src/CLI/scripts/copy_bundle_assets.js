import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

async function copyBuildAssets() {
    console.log('Copying build assets...');

    // No additional assets to copy for standalone CLI
    console.log('No additional assets to copy');
}

copyBuildAssets().catch(console.error);
