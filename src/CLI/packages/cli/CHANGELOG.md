# Changelog

All notable changes to the Aether CLI will be documented in this file.

## [0.0.5] - 2026-04-14

### Added
- Added npm publish automation script for all @aetherai/* packages
- Added version synchronization across all workspace packages
- Added `publish:all`, `publish:all:patch`, `publish:all:minor` npm scripts
- Added `prepack` script to automatically build before npm publish
- Added `publishConfig` with public access for all workspace packages
- Added esbuild bundling with proper shebang and executable permissions

### Fixed
- **CRITICAL**: Fixed missing `dist/` folder when installing from npm by adding `prepack` build step
- Fixed bin entry point to correctly reference `dist/cli.js`
- Fixed workspace dependency resolution (`file:` to versioned `^` dependencies)
- Fixed esbuild output from `packages/cli/dist/index.js` to `dist/cli.js`
- Fixed copy_bundle_assets script for standalone CLI publishing
- Fixed cross-package dependency versions to sync at 0.0.5

### Changed
- Synchronized all @aether-* packages to version 0.0.5
  - @aetherai/aether: 0.0.5
  - @aether/aether-core: 0.0.5
  - @aether/channel-base: 0.0.5
  - @aether/channel-telegram: 0.0.5
  - @aether/channel-weixin: 0.0.5
  - @aether/channel-dingtalk: 0.0.5
- Changed @aetherai/aether dependency from `file:../core` to `^0.0.5`
- Simplified root package.json bin entry to use bundled `dist/cli.js`
- Updated publish workflow to build all packages before publishing

## [0.0.2] - 2025-04-13

### Fixed
- Fixed banner re-appearing after slash commands (e.g., /provider, /model) by removing unnecessary refreshStatic calls
- Fixed TypeScript compilation errors related to modelProviders removal
- Fixed credential resolution for runtime-discovered models
- Fixed credential resolution for static models from provider catalogs

### Changed
- Updated copyright headers to 2026 OEvortex
- Added fuzzy matching search to model dialog
- Fixed API key display in model dialog to show provider API key status
- **BREAKING**: Refactored CLI to exclusively use `providers` key for model configuration
- **BREAKING**: Removed legacy `modelProviders` key from settings schema
- **BREAKING**: Removed environment variable fallbacks for API keys and base URLs
- Credentials now only read from settings/providers configuration
- Models now inherit provider API keys when they don't have their own
- Updated error messages to reference "provider" instead of "modelProviders"
- Replaced "authType" with "sdkMode" in CLI model display
- **BREAKING**: Migrated from `tokenLimits.ts` to `globalContextLengthManager.ts` for model context length management
- **BREAKING**: Moved `globalContextLengthManager` to aether-core package and exported it for shared use
- Changed default output token limit from 32K to 16K for better input quota preservation
- Changed token compression threshold from 70% to 65% of context window
- Updated model credential resolution to use settings as sole source of truth

## [0.0.1] - Initial Release
