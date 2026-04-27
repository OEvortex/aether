import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import syncProviders from './sync-providers.js';

const tempRoot = path.join(os.tmpdir(), 'aether-sync-providers-test');

function createTempDir() {
    fs.mkdirSync(tempRoot, { recursive: true });
    return fs.mkdtempSync(path.join(tempRoot, '-'));
}

function writeFile(filePath, content) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
}

describe('sync-providers script', () => {
    let workingDir;

    beforeEach(() => {
        workingDir = createTempDir();
    });

    afterEach(() => {
        if (workingDir && fs.existsSync(workingDir)) {
            fs.rmSync(workingDir, { recursive: true, force: true });
        }
    });

    it('syncs imports and provider entries in src/providers/config/index.ts', () => {
        const configDir = path.join(workingDir, 'src', 'providers', 'config');
        fs.mkdirSync(configDir, { recursive: true });

        writeFile(
            path.join(configDir, 'aihubmix.json'),
            JSON.stringify({ displayName: 'AIHubMix' }, null, 4)
        );
        writeFile(
            path.join(configDir, 'together.json'),
            JSON.stringify({ displayName: 'Together' }, null, 4)
        );

        writeFile(
            path.join(configDir, 'index.ts'),
            `import type { ProviderConfig } from '../../types/sharedTypes.js';
import aihubmix from "./aihubmix.json";

const providers = {
    aihubmix: aihubmix,
};

export type ProviderName = keyof typeof providers;

export const configProviders = providers as Record<ProviderName, ProviderConfig>;
`
        );

        syncProviders.syncProviderConfigIndex(
            configDir,
            path.join(configDir, 'index.ts')
        );

        const result = fs.readFileSync(
            path.join(configDir, 'index.ts'),
            'utf8'
        );

        expect(result).toContain('import aihubmix from "./aihubmix.json";');
        expect(result).toContain('import together from "./together.json";');
        expect(result).toContain('aihubmix: aihubmix,');
        expect(result).toContain('together: together,');
        expect(result).not.toContain('commonstack');
    });
});
