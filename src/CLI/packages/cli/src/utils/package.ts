/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    type PackageJson as BasePackageJson,
    readPackageUp
} from 'read-package-up';

export type PackageJson = BasePackageJson & {
    config?: {
        sandboxImageUri?: string;
    };
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let packageJson: PackageJson | undefined;

export async function getPackageJson(): Promise<PackageJson | undefined> {
    if (packageJson) {
        return packageJson;
    }

    const result = await readPackageUp({ cwd: __dirname });
    if (!result) {
        // TODO: Maybe bubble this up as an error.
        return;
    }

    packageJson = result.packageJson;
    return packageJson;
}
