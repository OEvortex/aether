# Changelog

All notable changes to the Aether CLI will be documented in this file.

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
