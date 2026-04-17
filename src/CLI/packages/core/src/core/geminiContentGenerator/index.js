/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { InstallationManager } from '../../utils/installationManager.js';
import { GeminiContentGenerator } from './geminiContentGenerator.js';
export { GeminiContentGenerator } from './geminiContentGenerator.js';
/**
 * Create a Gemini content generator.
 */
export function createGeminiContentGenerator(config, gcConfig) {
    const version = process.env.CLI_VERSION || process.version;
    const userAgent = config.userAgent ||
        `AetherCode/${version} (${process.platform}; ${process.arch})`;
    const baseHeaders = {
        'User-Agent': userAgent
    };
    let headers = { ...baseHeaders };
    if (gcConfig?.getUsageStatisticsEnabled()) {
        const installationManager = new InstallationManager();
        const installationId = installationManager.getInstallationId();
        headers = {
            ...headers,
            'x-gemini-api-privileged-user-id': `${installationId}`
        };
    }
    const httpOptions = { headers };
    const geminiContentGenerator = new GeminiContentGenerator({
        apiKey: config.apiKey === '' ? undefined : config.apiKey,
        vertexai: config.vertexai,
        httpOptions
    }, config);
    return geminiContentGenerator;
}
//# sourceMappingURL=index.js.map