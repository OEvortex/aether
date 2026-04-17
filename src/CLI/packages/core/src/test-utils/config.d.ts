/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ConfigParameters } from '../config/config.js';
import { Config } from '../config/config.js';
/**
 * Default parameters used for {@link FAKE_CONFIG}
 */
export declare const DEFAULT_CONFIG_PARAMETERS: ConfigParameters;
/**
 * Produces a config.  Default paramters are set to
 * {@link DEFAULT_CONFIG_PARAMETERS}, optionally, fields can be specified to
 * override those defaults.
 */
export declare function makeFakeConfig(config?: Partial<ConfigParameters>): Config;
