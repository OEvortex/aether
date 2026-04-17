import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
function pairingDir() {
    const dir = join(homedir(), '.aether', 'channels', 'pairing');
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    return dir;
}
function pairingFile(name) {
    return join(pairingDir(), `${name}.json`);
}
export class PairingStore {
    name;
    constructor(name) {
        this.name = name;
    }
    listPending() {
        const file = pairingFile(this.name);
        if (!existsSync(file)) {
            return [];
        }
        try {
            return JSON.parse(readFileSync(file, 'utf8'));
        }
        catch {
            return [];
        }
    }
    approve(_code) {
        return undefined;
    }
    savePending(requests) {
        writeFileSync(pairingFile(this.name), JSON.stringify(requests, null, 2), 'utf8');
    }
}
//# sourceMappingURL=PairingStore.js.map