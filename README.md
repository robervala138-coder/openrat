<div align="center">

# 🐀 OpenRat

**Local OpenAI-compatible gateway — route requests across multiple AI providers with smart key rotation, spend limits, scheduling, and a visual dashboard.**

[![CI](https://github.com/robervala138-coder/openrat/actions/workflows/ci.yml/badge.svg)](https://github.com/robervala138-coder/openrat/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.0.0-green)](https://nodejs.org)

> Pure Node.js. No database. No Docker. No Bun. No external runtime dependencies.

[Features](#features) · [Quick Start](#quick-start) · [Configuration](#configuration) · [CLI Reference](#cli-reference) · [Integrations](#integrations) · [Multi-Instance Mode](#multi-instance-mode) · [Contributing](CONTRIBUTING.md)

</div>

---

## What is OpenRat?

OpenRat is a local HTTP gateway that exposes an **OpenAI-compatible API** (`/v1/chat/completions`, `/v1/responses`, `/v1/models`) and forwards requests to the real providers you configure — Google AI Studio, xAI (Grok), DeepSeek, OpenRouter, or any OpenAI-compatible service.

You point your client (Claude Code, VS Code, LangChain, openai SDK…) to `http://127.0.0.1:4419` once, and OpenRat handles the rest: which provider to use, which key is available, how much has been spent, whether it's within the scheduled window, automatic fallback, and more.

```
Your client (LangChain, Claude Code, VS Code, openai SDK...)
        │
        ▼
  http://127.0.0.1:4419  ◄── OpenRat Gateway
        │
        ├── Google AI Studio (gemini-2.5-flash)
        ├── xAI (grok-3-mini)
        ├── DeepSeek (deepseek-chat)
        └── OpenRouter (any free/paid model)
```

---

## Features

| Feature | OpenRat v2 |
|---|:---:|
| Visual web dashboard | ✅ |
| Daily / monthly spend limits per provider | ✅ |
| Time-based scheduling (restrict providers to certain hours) | ✅ |
| Round-robin and fill-first key rotation | ✅ |
| Multi-instance mode (N gateways in parallel) | ✅ |
| Central multi-dashboard aggregating all instances | ✅ |
| Visual browser manager (`openrat manager`) | ✅ |
| API key validation (`openrat check`) | ✅ |
| Token + estimated cost tracking | ✅ |
| Zero external runtime dependencies | ✅ |
| Simple JSON config | ✅ |
| No database | ✅ |
| Streaming (SSE) support | ✅ |
| Auto-configure Claude Code / VS Code / OpenClaw | ✅ |

---

## Quick Start

### Requirements

- **Node.js >= 22.0.0**

```bash
node --version   # must be v22 or higher
```

Install Node.js: https://nodejs.org

### Install

```bash
git clone https://github.com/robervala138-coder/openrat.git
cd openrat
npm install
npm run build
```

**Install as a global command (optional):**

```bash
npm install -g .
```

### Run

The easiest way is the interactive menu — just run with no arguments:

```bash
openrat
```

Use the arrow keys to choose between the visual browser manager or CLI commands.

---

## Configuration

### 1. Generate an example config

```bash
openrat init
```

This creates `openrat.config.json` in the current directory. Edit it and replace the placeholder API keys with your real ones.

> 💡 **Tip:** For your real keys, use `openrat.config.local.json` — it's already in `.gitignore`.

### 2. Config file reference

```jsonc
{
  "server": {
    "host": "127.0.0.1",      // Listen address (default: 127.0.0.1)
    "port": 4419,              // Gateway port (default: 4419)
    "masterKey": "openrat-local", // Auth key sent by your client
    "rotation": "round-robin"  // "round-robin" | "fill-first"
  },
  "routes": {
    "default": "gemini-flash"  // Fallback provider ID
  },
  "providers": {
    "gemini-flash": {
      "type": "google-ai-studio",
      "model": "gemini-2.5-flash",
      "aliases": ["gemini-fast", "flash"],  // Model name aliases
      "apiKeys": ["AIza-key-1", "AIza-key-2"],
      "costPer1MInputTokens": 0.075,
      "costPer1MOutputTokens": 0.30,
      "spendLimit": {
        "dailyUsd": 1.0,
        "monthlyUsd": 10.0
      },
      "schedule": {
        "fromHour": 8,
        "toHour": 22   // Only active between 08:00 and 22:00
      }
    },
    "grok-mini": {
      "type": "xai",
      "model": "grok-3-mini",
      "apiKeys": ["xai-key-1"]
    },
    "deepseek": {
      "type": "openai-compatible",
      "model": "deepseek-chat",
      "baseUrl": "https://api.deepseek.com/v1",
      "apiKeys": ["sk-key-1", "sk-key-2"]
    }
  }
}
```

See [`examples/openrat.config.example.json`](examples/openrat.config.example.json) for a complete example.

### Provider types

| `type` | Use for |
|---|---|
| `google-ai-studio` | Google Gemini models |
| `xai` | xAI Grok models |
| `openai-compatible` | DeepSeek, OpenRouter, any OpenAI-compatible API |

### Key rotation strategies

| Strategy | Behavior |
|---|---|
| `fill-first` | Uses the first available key until its limit is reached, then moves to the next |
| `round-robin` | Distributes requests across all available keys evenly |

### Error cooldowns

When a key returns an error, it is placed on cooldown automatically:

| Error | Cooldown |
|---|---|
| 401 Unauthorized | 24 hours |
| 429 Rate limit | 60 seconds |
| 5xx Server error | 30 seconds |
| Network error | 10 seconds |

---

## CLI Reference

### Single-instance commands

```bash
openrat                                # Interactive menu
openrat manager                        # Open visual manager in browser
openrat init    [--config PATH]        # Create openrat.config.json
openrat gateway [--config PATH]        # Start gateway + dashboard
openrat check   [--config PATH]        # Validate all API keys
openrat status  [--config PATH]        # Show provider summary
openrat detect                         # Detect installed AI clients
openrat install [--config PATH] [--target TARGET]  # Auto-configure a client
openrat --help                         # Show help
```

### Multi-instance commands

```bash
openrat multi init  [--config PATH]                              # Create openrat.multi.json
openrat multi start [--config PATH] [--central-dashboard-port PORT]  # Start all instances
```

### Options

| Option | Description |
|---|---|
| `--config PATH` | Path to config file (default: `./openrat.config.json`) |
| `--target TARGET` | Install target: `openclaude`, `openclaw`, `vscode-openclaude` |
| `--central-dashboard-port PORT` | Central dashboard port in multi mode (default: `4400`) |

---

## Integrations

OpenRat exposes a 100% OpenAI-compatible API. Any client that accepts `OPENAI_BASE_URL` works.

### Universal environment variables

```bash
export OPENAI_BASE_URL="http://127.0.0.1:4419/v1"
export OPENAI_API_KEY="openrat-local"
export OPENAI_MODEL="gemini-2.5-flash"   # any configured alias
```

### Claude Code

```bash
openrat install --target openclaude
```

Or manually in `~/.claude/settings.json`:

```json
{
  "env": {
    "ANTHROPIC_API_KEY": "openrat-local",
    "ANTHROPIC_BASE_URL": "http://127.0.0.1:4419"
  }
}
```

### VS Code (OpenClaude extension)

```bash
openrat install --target vscode-openclaude
```

### OpenClaw

```bash
openrat install --target openclaw
```

### Python — openai SDK

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://127.0.0.1:4419/v1",
    api_key="openrat-local"
)

response = client.chat.completions.create(
    model="gemini-2.5-flash",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

### Python — LangChain

```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    base_url="http://127.0.0.1:4419/v1",
    api_key="openrat-local",
    model="gemini-2.5-flash"
)
```

### Node.js / TypeScript

```typescript
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "http://127.0.0.1:4419/v1",
  apiKey: "openrat-local"
});

const response = await client.chat.completions.create({
  model: "gemini-2.5-flash",
  messages: [{ role: "user", content: "Hello!" }]
});
```

### Model routing

```
model: "gemini-2.5-flash"   →  provider gemini-flash (exact match)
model: "flash"               →  provider gemini-flash (via alias)
model: "unknown-model"       →  routes.default provider (fallback)
```

---

## Multi-Instance Mode

Each OpenRouter (or any free-tier provider) account has its own per-minute/per-day rate limits. With multi-instance mode you run **N gateways simultaneously**, each with its own key — multiplying throughput by N.

**Example with 3 OpenRouter free keys:**

```
rat-1 → port 4419 → key sk-or-v1-KEY_1
rat-2 → port 4421 → key sk-or-v1-KEY_2
rat-3 → port 4423 → key sk-or-v1-KEY_3
```

Each tool points to a different port. Result: **3× more concurrent requests**.

### Setup

```bash
openrat multi init
# Edit the generated file and set your real keys
openrat multi start
```

The **central dashboard** launches at port `4400` by default and shows all instances in one view.

Config example: [`examples/openrat.multi.example.json`](examples/openrat.multi.example.json)

---

## Security

- Gateway listens on `127.0.0.1` by default — **only accessible from your machine**
- No data is persisted beyond process memory
- No telemetry is sent to any external server
- Requests go from your machine **directly to the provider** — no intermediaries
- Use `openrat.config.local.json` for real API keys (already in `.gitignore`)
- To expose on the local network, change `host` to `"0.0.0.0"` and set up a firewall

---

## Project Structure

```
openrat/
├── src/
│   ├── index.ts            # CLI — parses commands, dispatches handlers
│   ├── gateway.ts          # Core HTTP gateway server
│   ├── dashboard.ts        # Single-instance visual dashboard
│   ├── multi-dashboard.ts  # Central dashboard for multi-instance mode
│   ├── config.ts           # Config loading & validation
│   ├── multi-config.ts     # Multi-instance config loading & validation
│   ├── orchestrator.ts     # Spawns and manages N parallel instances
│   ├── providers.ts        # Provider resolution by model/alias
│   ├── stats.ts            # Token + cost tracking (in-memory)
│   ├── healthcheck.ts      # API key validation logic
│   ├── install.ts          # Client auto-configuration
│   ├── detect.ts           # Detects installed AI clients
│   ├── menu.ts             # Interactive terminal menu + manager server
│   ├── types.ts            # Shared TypeScript types
│   ├── utils.ts            # Shared helpers
│   └── fs.ts               # JSON file read/write helpers
├── test/
│   ├── config.test.ts          # Config normalization & validation tests
│   ├── install.test.ts         # Install command tests
│   └── multi-config.test.ts    # Multi-instance port resolution tests
├── examples/
│   ├── openrat.config.example.json  # Single-instance config example
│   └── openrat.multi.example.json   # Multi-instance config example
├── openrat-manager.html        # Standalone visual manager (browser)
├── openrat.multi.json          # Multi-instance config (placeholder)
├── .github/
│   ├── workflows/ci.yml        # GitHub Actions CI
│   ├── ISSUE_TEMPLATE/         # Bug report & feature request templates
│   └── PULL_REQUEST_TEMPLATE/  # PR template
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE
├── package.json
├── tsconfig.json
└── .gitignore
```

### Request flow

```
Client → Gateway (port 4419)
  │
  ├─ Authenticate masterKey (Authorization: Bearer or X-API-Key)
  ├─ Parse request JSON body
  ├─ Resolve provider (by "model" field or configured aliases)
  ├─ Check: schedule active? spend limit OK?
  ├─ Select available key (fill-first or round-robin)
  │    └─ Filters out keys on cooldown or with spend-limit reached
  ├─ Forward request to real provider
  ├─ On retryable failure: mark cooldown, try next key
  ├─ Track tokens and cost in StatsTracker (JSON responses only)
  └─ Pipe response back to client (supports SSE streaming)
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, code style, and PR guidelines.

---

## License

MIT — see [LICENSE](LICENSE).

---

<div align="center">
Made with 🐀 in Brazil 🇧🇷
</div>
