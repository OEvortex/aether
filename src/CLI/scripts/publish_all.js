#!/usr/bin/env node

/**
 * Publish all @aetherai/* workspace packages to npm with synchronized versions.
 *
 * Usage:
 *   node scripts/publish_all.js [patch|minor|major] [--dry-run] [--tag <tag>]
 *
 * Examples:
 *   node scripts/publish_all.js                    # Publish current version
 *   node scripts/publish_all.js patch               # Bump patch, then publish
 *   node scripts/publish_all.js minor --dry-run     # Dry run with minor bump
 *   node scripts/publish_all.js --tag next          # Publish with 'next' tag
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import * as fs from 'node:fs';
import { dirname, join } from 'node:path';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const _PACKAGES_DIR = join(rootDir, 'packages');
const WORKSPACE_PACKAGES = [
    { path: 'packages/core', name: '@aetherai/aether-core' },
    { path: 'packages/test-utils', name: '@aetherai/aether-test-utils' },
    { path: 'packages/channels/base', name: '@aetherai/channel-base' },
    { path: 'packages/channels/telegram', name: '@aetherai/channel-telegram' },
    { path: 'packages/channels/weixin', name: '@aetherai/channel-weixin' },
    { path: 'packages/channels/dingtalk', name: '@aetherai/channel-dingtalk' },
    { path: 'packages/cli', name: '@aetherai/aether' }
];

function log(msg) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  ${msg}`);
    console.log('='.repeat(60));
}

function run(cmd, opts = {}) {
    console.log(`  $ ${cmd}`);
    try {
        return execSync(cmd, {
            stdio: 'inherit',
            cwd: opts.cwd || rootDir,
            env: { ...process.env, ...opts.env }
        });
    } catch (_err) {
        if (!opts.ignoreError) {
            process.exit(1);
        }
    }
}

function readPackageJson(pkgPath) {
    const fullPath = join(rootDir, pkgPath, 'package.json');
    if (!existsSync(fullPath)) {
        console.error(`  ERROR: ${fullPath} not found`);
        return null;
    }
    try {
        return JSON.parse(readFileSync(fullPath, 'utf8'));
    } catch (err) {
        console.error(`  ERROR: Failed to parse ${fullPath}: ${err.message}`);
        return null;
    }
}

function writePackageJson(pkgPath, pkgJson) {
    const fullPath = join(rootDir, pkgPath, 'package.json');
    writeFileSync(fullPath, `${JSON.stringify(pkgJson, null, 4)}\n`);
}

function bumpVersion(pkgJson, bumpType) {
    const [major, minor, patch] = pkgJson.version.split('.').map(Number);
    switch (bumpType) {
        case 'major':
            pkgJson.version = `${major + 1}.0.0`;
            break;
        case 'minor':
            pkgJson.version = `${major}.${minor + 1}.0`;
            break;
        case 'patch':
            pkgJson.version = `${major}.${minor}.${patch + 1}`;
            break;
        default:
            // No bump, use current version
            break;
    }
    return pkgJson;
}

function syncVersions(bumpType) {
    log('Synchronizing versions across all packages');

    // Default version if no bump
    const defaultVersion = '0.0.12';

    // First, build to get current versions
    const versions = new Map();
    for (const pkg of WORKSPACE_PACKAGES) {
        const pkgJson = readPackageJson(pkg.path);
        if (!pkgJson) {
            continue;
        }

        // If no bump type, set to default version
        if (!bumpType) {
            pkgJson.version = defaultVersion;
        } else {
            bumpVersion(pkgJson, bumpType);
        }
        versions.set(pkg.name, pkgJson.version);
        writePackageJson(pkg.path, pkgJson);
        console.log(`  ${pkg.name}: ${pkgJson.version}`);
    }

    // Update cross-package dependencies to use synced versions
    for (const pkg of WORKSPACE_PACKAGES) {
        const pkgJson = readPackageJson(pkg.path);
        if (!pkgJson) {
            continue;
        }

        let changed = false;

        // Update dependencies that reference other workspace packages
        const depTypes = [
            'dependencies',
            'devDependencies',
            'peerDependencies'
        ];
        for (const depType of depTypes) {
            if (!pkgJson[depType]) {
                continue;
            }
            for (const [depName, depVersion] of Object.entries(
                pkgJson[depType]
            )) {
                if (versions.has(depName)) {
                    const newVersion = `^${versions.get(depName)}`;
                    if (depVersion !== newVersion) {
                        pkgJson[depType][depName] = newVersion;
                        changed = true;
                    }
                }
            }
        }

        if (changed) {
            writePackageJson(pkg.path, pkgJson);
            console.log(`  Updated ${pkg.name} cross-package dependencies`);
        }
    }

    return versions;
}

function buildAll() {
    log('Building all packages');
    run('npm run build');
    run('npm run bundle');
}

function publishPackage(pkgPath, tag, dryRun) {
    const pkgJson = readPackageJson(pkgPath);
    if (!pkgJson) {
        return false;
    }

    log(`Publishing ${pkgJson.name}@${pkgJson.version}`);

    const args = ['npm', 'publish'];
    if (tag) {
        args.push('--tag', tag);
    }
    if (dryRun) {
        args.push('--dry-run');
    }
    args.push('--access', 'public');

    run(args.join(' '), { cwd: join(rootDir, pkgPath) });
    return true;
}

async function main() {
    const args = process.argv.slice(2);
    const bumpType = ['patch', 'minor', 'major'].find((a) => args.includes(a));
    const dryRun = args.includes('--dry-run');
    const tagMatch = args.find((a) => a.startsWith('--tag='));
    const tag = tagMatch ? tagMatch.split('=')[1] : undefined;

    if (dryRun) {
        console.log('\n  🔍 DRY RUN MODE - No packages will be published\n');
    }

    // Step 1: Sync versions
    const versions = syncVersions(bumpType);

    // Step 2: Build
    buildAll();

    // Step 2.1: Copy bundled CLI to packages/cli/dist for publishing
    log('Copying bundled CLI to packages/cli/dist');
    const cliBundleSrc = join(rootDir, 'dist', 'cli.mjs');
    const cliBundleDest = join(rootDir, 'packages', 'cli', 'dist', 'cli.mjs');

    // Ensure dist directory exists
    if (!existsSync(dirname(cliBundleDest))) {
        mkdirSync(dirname(cliBundleDest), { recursive: true });
    }

    if (existsSync(cliBundleSrc)) {
        copyFileSync(cliBundleSrc, cliBundleDest);
        log(`Copied ${cliBundleSrc} to ${cliBundleDest}`);
    } else {
        console.error(`\n  ❌ CLI bundle not found at ${cliBundleSrc}`);
        if (!dryRun) {
            process.exit(1);
        }
    }

    // Step 3: Publish in dependency order (core first, cli last)
    log('Publishing packages');
    const publishOrder = [
        'packages/core',
        'packages/test-utils',
        'packages/channels/base',
        'packages/channels/telegram',
        'packages/channels/weixin',
        'packages/channels/dingtalk',
        'packages/cli'
    ];

    for (const pkgPath of publishOrder) {
        const success = publishPackage(pkgPath, tag, dryRun);
        if (!success) {
            console.error(`\n  ❌ Failed to publish ${pkgPath}`);
            if (!dryRun) {
                process.exit(1);
            }
        }
    }

    log('✅ All packages published successfully!');
    console.log('\n  Published versions:');
    for (const [name, version] of versions) {
        console.log(`    ${name}: ${version}`);
    }
    console.log('');
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
