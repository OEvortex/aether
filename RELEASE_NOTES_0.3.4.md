# Release Notes - v0.3.4

**Release Date:** March 23, 2026

## 🚀 New Features

### MiniMax M2.7 Model Support
- Added MiniMax M2.7 model to OpenCode Zen Go provider configuration with Anthropic SDK mode support.

### Seraphyn Provider Integration
- New standalone AI provider integration for Seraphyn AI
- Custom fetch-based implementation with dedicated SSE parser
- OpenAI-compatible endpoint at `https://seraphyn.ai/api/v1`
- API key authentication support (`sk-xxxxxxxx` format)
- Dynamic model discovery via `/models` endpoint with 10-minute cooldown
- Robust JSON recovery for malformed tool-call arguments
- Full integration with account management, settings UI, and provider configuration
- Multi-account support with load balancing

## 🔄 Changes

### Code Formatting
- Standardized code formatting across multiple files
- Converted tabs to spaces for consistent indentation
- Standardized string quotes from single quotes to double quotes
- Improved code readability and maintainability

### Default SDK Mode
- Changed default SDK compatibility mode for OpenCode and OpenCode Zen Go from `anthropic` to `openai`

## 🐛 Bug Fixes

### SSE Stream Parsing Robustness
- Fixed `Unexpected end of JSON input` error when providers send non-standard SSE data
- Skip empty `data:` lines before JSON parsing
- Skip SSE comment lines that some providers send as metadata
- Skip truncated/incomplete JSON objects from TCP chunking
- Buffer partial SSE lines across TCP chunks

### Tool-Call Argument Recovery
- Fixed tool calls failing when providers emit malformed JSON arguments
- Added aggressive JSON normalization: quote bare keys, quote bare string values, escape invalid backslashes, strip code fences
- Falls back to `{ raw: "<original>" }` when recovery fails instead of dropping the tool call
- Fixed TypeScript type errors in the Seraphyn handler module

## 📦 Installation

Install or update the extension from the VS Code Marketplace:
- Search for "Copilot ++" in the Extensions view
- Or install directly: `ext install OEvortex.better-copilot-chat`

## 🔗 Links

- [GitHub Repository](https://github.com/OEvortex/better-copilot-chat)
- [Changelog](https://github.com/OEvortex/better-copilot-chat/blob/main/CHANGELOG.md)
- [Report Issues](https://github.com/OEvortex/better-copilot-chat/issues)
