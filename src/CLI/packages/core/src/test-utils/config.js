/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { Config } from '../config/config.js';
/**
 * Default parameters used for {@link FAKE_CONFIG}
 */
export const DEFAULT_CONFIG_PARAMETERS = {
    usageStatisticsEnabled: true,
    debugMode: false,
    proxy: undefined,
    model: 'aether-9001-super-duper',
    targetDir: '/',
    cwd: '/'
};
/**
 * Produces a config.  Default paramters are set to
 * {@link DEFAULT_CONFIG_PARAMETERS}, optionally, fields can be specified to
 * override those defaults.
 */
export function makeFakeConfig(config = {
    ...DEFAULT_CONFIG_PARAMETERS
}) {
    return new Config({
        ...DEFAULT_CONFIG_PARAMETERS,
        ...config
    });
}
//# sourceMappingURL=config.js.map