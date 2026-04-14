/* eslint-disable no-undef, @typescript-eslint/no-require-imports */
const esbuild = require('esbuild');
const fs = require('node:fs');
const path = require('node:path');
const isWatch = process.argv.includes('--watch');
const isDev = process.argv.includes('--dev');

const REPO_ROOT = path.join(__dirname, '.');

const commonOptions = {
    bundle: true,
    external: ['vscode'],
    format: 'cjs',
    platform: 'node',
    sourcemap: isDev,
    minify: !isDev,
    mainFields: ['module', 'main'],
    resolveExtensions: ['.ts', '.js', '.mjs', '.json'],
    logLevel: 'info',
    banner: { js: '#!/usr/bin/env node' }
};

const cliBuildOptions = {
    ...commonOptions,
    entryPoints: ['./packages/cli/index.ts'],
    outfile: 'dist/cli.js',
};

async function build() {
    try {
        if (isWatch) {
            console.log('Starting watch mode for CLI...');
            const ctx = await esbuild.context(cliBuildOptions);
            await ctx.watch();
            console.log('Watching for changes...');
        } else {
            console.log('Cleaning dist directory...');
            const distPath = path.join(REPO_ROOT, 'dist');
            if (fs.existsSync(distPath)) {
                await fs.promises.rm(distPath, { recursive: true, force: true });
            }

            console.log('Building CLI...');
            const startTime = Date.now();
            await esbuild.build(cliBuildOptions);
            const buildTime = Date.now() - startTime;
            console.log(`Build completed in ${buildTime}ms`);

            // Make the output executable on Unix
            const outFile = path.join(REPO_ROOT, 'dist', 'cli.js');
            await fs.promises.chmod(outFile, 0o755);
            console.log('Made cli.js executable');
        }
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

build();
