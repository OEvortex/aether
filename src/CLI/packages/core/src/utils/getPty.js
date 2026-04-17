/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export const getPty = async () => {
    try {
        const lydell = '@lydell/node-pty';
        const module = await import(lydell);
        return { module, name: 'lydell-node-pty' };
    }
    catch (_e) {
        try {
            const nodePty = 'node-pty';
            const module = await import(nodePty);
            return { module, name: 'node-pty' };
        }
        catch (_e2) {
            return null;
        }
    }
};
//# sourceMappingURL=getPty.js.map