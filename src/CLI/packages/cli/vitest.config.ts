/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'node:path';
/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@aetherai/aether-core': path.resolve(
                __dirname,
                '../core/index.ts'
            ),
            '@aetherai/aether-test-utils': path.resolve(
                __dirname,
                '../core/src/aetherTestUtils.ts'
            )
        }
    },
    test: {
        include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)', 'config.test.ts'],
        exclude: ['**/node_modules/**', '**/dist/**', '**/cypress/**'],
        environment: 'jsdom',
        globals: true,
        reporters: ['default', 'junit'],
        silent: true,
        outputFile: {
            junit: 'junit.xml'
        },
        setupFiles: ['./test-setup.ts'],
        coverage: {
            enabled: true,
            provider: 'v8',
            reportsDirectory: './coverage',
            include: ['src/**/*'],
            reporter: [
                ['text', { file: 'full-text-summary.txt' }],
                'html',
                'json',
                'lcov',
                'cobertura',
                ['json-summary', { outputFile: 'coverage-summary.json' }]
            ]
        },
        poolOptions: {
            threads: {
                minThreads: 8,
                maxThreads: 16
            }
        },
        server: {
            deps: {
                inline: [/@aetherai\/aether-core/]
            }
        }
    }
});
