# Aether Release Notes - v0.0.5 (CLI) & v0.3.9 (VS Code Extension)

## 🚀 Overview

This release brings **major improvements to npm publishing**, **new AI provider integrations**, and **critical bug fixes** across both the Aether CLI and VS Code Extension.

---

## 📦 Published npm Packages

All CLI packages are now published to npm under the `@aetherai` scope with synchronized versioning:

### Published Packages (v0.0.5)

- **@aetherai/aether** - Main CLI package
- **@aetherai/aether-core** - Core AI agent and utilities
- **@aetherai/channel-base** - Base channel abstraction
- **@aetherai/channel-telegram** - Telegram integration
- **@aetherai/channel-weixin** - WeChat (Weixin) integration
- **@aetherai/channel-dingtalk** - DingTalk integration
- **@aetherai/aether-test-utils** - Shared test utilities

### Installation

```bash
# Install CLI globally
npm install -g @aetherai/aether@0.0.5

# Or use core as a library
npm install @aetherai/aether-core@0.0.5
```

### What Changed

✅ **Automated Publishing**: Added `publish_all.js` script for synchronized multi-package publishing  
✅ **Prepack Build**: Automatic build step ensures `dist/` is always included in npm packages  
✅ **Version Sync**: All packages now stay in sync at the same version number  
✅ **Fixed Dependencies**: Changed `file:` local deps to versioned `^0.0.5` npm dependencies  
✅ **Public Access**: All packages configured with `publishConfig.access: "public"`

---

## 🆕 New AI Providers (Extension v0.3.9)

Added **13 new AI provider integrations**:

| Provider | API Endpoint | Features |
|----------|-------------|----------|
| **Baseten** | `https://inference.baseten.co/v1` | OpenAI-compatible, auto model fetch |
| **Berget** | `https://api.berget.ai/v1` | Open AI model endpoint |
| **Clarifai** | `https://api.clarifai.com/v2/ext/openai/v1` | OpenAI + Responses SDK |
| **Modal (Research)** | `https://api.us-west-2.modal.direct/v1` | Fixed research model |
| **Sherlock (CloudFerro)** | `https://api-sherlock.cloudferro.com/openai/v1` | Open model endpoint |
| **Cortecs** | `https://api.cortecs.ai/v1` | Open `/models` endpoint (no API key needed) |
| **Dinference** | `https://api.dinference.com/v1` | API key required for model listing |
| **FastRouter** | `https://api.fastrouter.ai/api/v1` | OpenAI + Responses + Anthropic bridges |
| **Fireworks** | `https://api.fireworks.ai/inference/v1` | OpenAI + Responses + Anthropic |
| **Friendli** | `https://api.friendli.ai/serverless/v1` | Open `/models` endpoint |
| **Jiekou** | `https://api.jiekou.ai/openai/` | OpenAI + Anthropic endpoints |
| **MegaNova** | `https://inference.meganova.ai/v1` | Auto model fetch |
| **Moark** | `https://api.moark.ai/v1` | Auto model fetch |

---

## 🔧 Critical Bug Fixes

### Extension (v0.3.9)

#### Provider Registry Fix
- **Fixed**: Critical bug where all Aether commands failed to register in VS Code
- **Root Cause**: Stale generated provider registry (`src/providers/config/index.ts`)
- **Solution**: Extension now regenerates provider registry before each build
- **Impact**: Resolves "command not found" errors for all Aether commands

#### OpenAI Responses API Improvements
- **System Messages**: Now correctly sent via `instructions` parameter instead of `role: "system"` in input array
- **Privacy**: Added `store: false` to prevent server-side conversation storage
- **Error Handling**: 
  - Richer error messages from `response.failed` and `response.incomplete` events
  - SDK-level `error.message` extraction for 4xx/5xx errors
  - Provider JSON error body parsing (e.g., `{"error":{"message":"..."}}`)

#### Settings Namespace Fix
- **Fixed**: 4 calls reading/writing to old `chp.*` namespace instead of `aether.*`
- **Impact**: Settings like `sdkMode`, `hideThinkingInUI`, and API keys now work correctly on fresh installs

---

## 📋 Full Changelog Summary

### CLI v0.0.5

#### Added
- ✅ npm publish automation for all `@aetherai/*` packages
- ✅ Version synchronization across workspace packages
- ✅ `publish:all`, `publish:all:patch`, `publish:all:minor` npm scripts
- ✅ `prepack` script for automatic build before publish
- ✅ `publishConfig` with public access
- ✅ esbuild bundling with proper shebang and executable permissions

#### Fixed
- 🐛 **CRITICAL**: Missing `dist/` folder on npm install (fixed with prepack build step)
- 🐛 Bin entry point now correctly references `dist/cli.js`
- 🐛 Workspace dependency resolution (`file:` → versioned `^` deps)
- 🐛 esbuild output path corrected
- 🐛 copy_bundle_assets script for standalone CLI publishing
- 🐛 Cross-package dependency versions synced to 0.0.5

#### Changed
- 🔄 All `@aetherai/*` packages synchronized to version 0.0.5
- 🔄 Changed dependency from `file:../core` to `^0.0.5`
- 🔄 Simplified root package.json bin entry
- 🔄 Updated publish workflow to build all packages before publishing

---

## 📊 Package Registry Links

- **@aetherai/aether**: https://www.npmjs.com/package/@aetherai/aether
- **@aetherai/aether-core**: https://www.npmjs.com/package/@aetherai/aether-core
- **@aetherai/channel-base**: https://www.npmjs.com/package/@aetherai/channel-base
- **@aetherai/channel-telegram**: https://www.npmjs.com/package/@aetherai/channel-telegram
- **@aetherai/channel-weixin**: https://www.npmjs.com/package/@aetherai/channel-weixin
- **@aetherai/channel-dingtalk**: https://www.npmjs.com/package/@aetherai/channel-dingtalk

---

## 🙏 Credits

**Contributors**: @vortexbaba  
**GitHub Release**: https://github.com/OEvortex/aether/releases  
**Branch**: `feature/cli`  
**Commit**: `d5d129ac`

---

## ⚠️ Breaking Changes

None in this release.

---

## 🔮 What's Next

- More AI provider integrations
- Improved model discovery and caching
- Enhanced error reporting and diagnostics
- Better rate limiting and retry logic

---

*Released on: 2026-04-14*
