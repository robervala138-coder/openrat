# Contributing to OpenRat

Thank you for your interest in contributing! This document explains how to get started.

---

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Running Tests](#running-tests)
- [Submitting Changes](#submitting-changes)
- [Code Style](#code-style)
- [Reporting Issues](#reporting-issues)

---

## Development Setup

**Requirements:** Node.js >= 22.0.0

```bash
# 1. Fork and clone the repo
git clone https://github.com/YOUR_USERNAME/openrat.git
cd openrat

# 2. Install dependencies
npm install

# 3. Build the project
npm run build

# 4. Run tests
npm test
```

---

## Project Structure

```
src/
├── index.ts          # CLI entry point — parses commands, dispatches handlers
├── gateway.ts        # Core HTTP gateway server
├── dashboard.ts      # Single-instance dashboard server
├── multi-dashboard.ts# Central dashboard for multi-instance mode
├── config.ts         # Config loading & validation
├── multi-config.ts   # Multi-instance config loading & validation
├── orchestrator.ts   # Spawns and manages N parallel instances
├── providers.ts      # Provider resolution by model/alias
├── stats.ts          # Token and cost tracking (in-memory)
├── healthcheck.ts    # API key validation logic
├── install.ts        # Client auto-configuration logic
├── detect.ts         # Detects installed AI clients
├── menu.ts           # Interactive terminal menu + manager server
├── types.ts          # Shared TypeScript types
├── utils.ts          # Shared helpers
└── fs.ts             # JSON file read/write helpers

test/
├── config.test.ts        # Config normalization & validation tests
├── install.test.ts       # Install command tests
└── multi-config.test.ts  # Multi-instance port resolution tests

examples/
├── openrat.config.example.json  # Single-instance config example
└── openrat.multi.example.json   # Multi-instance config example
```

---

## Running Tests

```bash
npm test
```

Tests use Node.js's built-in test runner (`node:test`) — no extra test framework needed.

When adding new features, please include or update the relevant test file.

---

## Submitting Changes

1. **Fork** the repository
2. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/my-feature
   # or
   git checkout -b fix/my-bug
   ```
3. **Make your changes** — keep commits focused and atomic
4. **Run tests** to make sure nothing is broken:
   ```bash
   npm test
   ```
5. **Open a Pull Request** against `main` with a clear description of what changed and why

### Branch naming conventions

| Prefix | Use for |
|---|---|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation changes |
| `refactor/` | Code refactoring |
| `test/` | Test additions or fixes |
| `chore/` | Maintenance, tooling |

---

## Code Style

- **TypeScript strict mode** is enabled — all types must be explicit
- **No external runtime dependencies** — OpenRat intentionally runs on pure Node.js
- Use `node:` protocol imports for built-in Node modules (e.g., `import path from 'node:path'`)
- Keep functions small and focused
- Add JSDoc comments to exported functions

---

## Reporting Issues

Use the [GitHub Issues](https://github.com/robervala138-coder/openrat/issues) tab.

When reporting a bug, please include:

- Node.js version (`node --version`)
- OS and version
- The command you ran
- The full error output
- Your config (with API keys **redacted**)
