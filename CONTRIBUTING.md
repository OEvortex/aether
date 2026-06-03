# Contributing to Aether

Thanks for your interest in Aether — supercharging GitHub Copilot with multiple AI providers! 🚀

## Code of Conduct

Be respectful, constructive, and inclusive. That's it.

## How to Contribute

### 🐛 Bugs
Open an issue with:
- Steps to reproduce
- Expected vs actual behavior
- Your environment (OS, Node version, VS Code version)

### 💡 Features
Open a feature request describing what you want and why it'd be useful.

### 🔧 Pull Requests
1. Fork & branch from `main`
2. Test your changes
3. One feature per PR
4. Link to any related issue

## Development

```bash
git clone https://github.com/YOUR_USERNAME/aether.git
cd aether
npm install
npm run dev
```

## Style
- TypeScript: Follow standard TS conventions
- Format with Prettier: `npm run format`
- Lint: `npm run lint`

## Project Structure

```
aether/
├── src/              # Source code
│   ├── providers/    # AI provider integrations
│   ├── extension/    # VS Code extension
│   └── shared/       # Shared types & utilities
├── test/             # Tests
└── docs/             # Documentation
```

## Need Help?
Open a discussion or issue — happy to help! ✨
