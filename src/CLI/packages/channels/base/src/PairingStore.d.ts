import type { PairingRequest } from './types.js';
export declare class PairingStore {
    private readonly name;
    constructor(name: string);
    listPending(): PairingRequest[];
    approve(_code: string): PairingRequest | undefined;
    savePending(requests: PairingRequest[]): void;
}
