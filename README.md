<div align="center">

# 🐀 OpenRat

**Local OpenAI-compatible gateway — route requests across multiple AI providers with smart key rotation, spend limits, scheduling, and a visual dashboard.**

[![CI](https://github.com/robervala138-coder/openrat/actions/workflows/ci.yml/badge.svg)](https://github.com/robervala138-coder/openrat/actions)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.0.0-green)](https://nodejs.org)

> Pure Node.js. No database. No Docker. No Bun. No external runtime dependencies.

[Features](#features) · [Quick Start](#quick-start) · [Configuration](#configuration) · [CLI Reference](#cli-reference) · [Integrations](#integrations) · [Background Mode](#background-mode) · [Multi-Instance Mode](#multi-instance-mode) · [Contributing](CONTRIBUTING.md)

</div>

---

## What is OpenRat?

OpenRat is a local HTTP gateway that exposes an **OpenAI-compatible API** (`/v1/chat/completions`, `/v1/responses`, `/v1/models`) and forwards requests to the real providers you configure — Google AI Studio, xAI (Grok), DeepSeek, OpenRouter, or any OpenAI-compatible service.

You point your client (Claude Code, Codex CLI, Aider, Continue.dev, Cline, Cursor…) to `http://127.0.0.1:4419` once, and OpenRat handles the rest: which provider to use, which key is available, how much has been spent, whether it's within the scheduled window, automatic fallback, and more.

```
Your client (Claude Code, Codex CLI, Aider, Cline, Cursor, openai SDK...)
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
| Auto-configure 13 AI coding tools | ✅ |
| Background / daemon mode | ✅ |

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

This creates `~/.openrat/openrat.config.json` by default. Edit it and replace the placeholder API keys with your real ones.

To create the config in another location, pass `--config PATH`.

> 💡 **Tip:** For your real keys, use `openrat.config.local.json` — it's already in `.gitignore`.

### 2. Config file reference

```jsonc
{
  "server": {
    "host": "127.0.0.1",         // Listen address (default: 127.0.0.1)
    "port": 4419,                // Gateway port (default: 4419)
    "dashboardPort": 4420,       // Dashboard port (default: port + 1)
    "masterKey": "openrat-local", // Auth key sent by your client
    "rotation": "round-robin"    // "round-robin" | "fill-first"
  },
  "routes": {
    "default": "gemini-flash"    // Fallback provider ID
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
      "apiKeys": ["sk-key-1", "sk-key-2"],
      "headers": { "X-Custom-Header": "value" },   // Optional extra request headers
      "supportedEndpoints": ["chat/completions"]   // Restrict accepted endpoints
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

> **Important:** `openai-compatible` providers **must** define `baseUrl`. There is no default URL for this type.

### Provider advanced fields

| Field | Type | Description |
|---|---|---|
| `aliases` | `string[]` | Extra model name aliases that route to this provider |
| `headers` | `Record<string, string>` | Additional HTTP headers sent with every request to this provider |
| `supportedEndpoints` | `"chat/completions" \| "responses"` | Restricts which endpoints this provider accepts. Defaults: `google-ai-studio` → `["chat/completions"]`; `xai` → `["chat/completions"]`; `openai-compatible` → both. |
| `costPer1MInputTokens` | `number` | USD cost per 1M input tokens (used for spend tracking) |
| `costPer1MOutputTokens` | `number` | USD cost per 1M output tokens (used for spend tracking) |
| `spendLimit.dailyUsd` | `number` | Max USD spend per day for this provider |
| `spendLimit.monthlyUsd` | `number` | Max USD spend per month for this provider |
| `schedule.fromHour` | `number` | Hour (0–23) when this provider becomes active |
| `schedule.toHour` | `number` | Hour (0–23) when this provider becomes inactive |

### Key rotation strategies

| Strategy | Behavior |
|---|---|
| `fill-first` | Uses the first available key until its limit is reached, then moves to the next |
| `round-robin` | Distributes requests across all available keys evenly |

### Error cooldowns

When a key returns an error, it is placed on cooldown automatically:

| Error | Cooldown |
|---|---|
| 401 / 403 Unauthorized / Forbidden | 10 minutes |
| 402 / quota | 30 minutes |
| 429 Rate limit | 60 seconds |
| 5xx Server error | 15 seconds |
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

> **Tip:** Running `openrat install` without `--target` opens an interactive list of detected tools on your system, so you can pick one with the arrow keys.

### Multi-instance commands

```bash
openrat multi init  [--config PATH]                              # Create openrat.multi.json
openrat multi start [--config PATH] [--central-dashboard-port PORT]  # Start all instances
```

### Options

| Option | Description |
|---|---|
| `--config PATH` | Path to config file (default: `~/.openrat/openrat.config.json`; multi mode defaults to `~/.openrat/openrat.multi.json`) |
| `--target TARGET` | Install target (see table below) |
| `--central-dashboard-port PORT` | Central dashboard port in multi mode (default: `4400`) |

### Supported install targets

| Target | Tool | Config file modified |
|---|---|---|
| `openclaude` | Claude Code | `~/.claude/settings.json` + launcher |
| `openclaw` | OpenClaw | `~/.openclaw/openclaw.json` |
| `vscode-openclaude` | VS Code (OpenClaude ext.) | VS Code `settings.json` + launcher |
| `aider` | Aider | `~/.aider.conf.yml` |
| `continue-dev` | Continue.dev | `~/.continue/config.json` |
| `cline` | Cline (VS Code) | VS Code `settings.json` |
| `roo-code` | Roo Code (VS Code) | VS Code `settings.json` |
| `opencode` | OpenCode (SST) | `~/.config/opencode/config.json` |
| `codex-cli` | Codex CLI (OpenAI) | `~/.codex/config.json` + launcher |
| `goose` | Goose (Block) | `~/.config/goose/config.yaml` |
| `cursor` | Cursor | Cursor `settings.json` |
| `amp` | Amp (Sourcegraph) | `~/.config/amp/settings.json` |
| `plandex` | Plandex | launcher only |

---

## Integrations

OpenRat exposes a 100% OpenAI-compatible API. Any client that accepts `OPENAI_BASE_URL` works.

### Universal environment variables

```bash
export OPENAI_BASE_URL="http://127.0.0.1:4419/v1"
export OPENAI_API_KEY="openrat-local"
export OPENAI_MODEL="gemini-2.5-flash"   # any configured alias
```

---

### Claude Code

```bash
openrat install --target openclaude
```

Configures `~/.claude/settings.json` with `agentModels` and `agentRouting`, and creates a launcher at `~/.local/bin/openclaude-keymux` with `CLAUDE_CODE_USE_OPENAI=1`. All sub-agents spawned by Claude Code also go through OpenRat.

---

### Codex CLI (OpenAI)

```bash
openrat install --target codex-cli
```

Writes `~/.codex/config.json` and creates a `codex-openrat` launcher. Use `codex-openrat` instead of `codex` to route requests through OpenRat.

> Requires: `npm i -g @openai/codex`

---

### Aider

```bash
openrat install --target aider
```

Writes `~/.aider.conf.yml` with `openai-api-base` and `openai-api-key`. After this, just run `aider` normally — it reads the config automatically.

> Requires: `pip install aider-chat`

---

### Continue.dev

```bash
openrat install --target continue-dev
```

Injects all configured providers as OpenAI-compatible models in `~/.continue/config.json`. Select "OpenRat — \<model\>" from the model picker inside VS Code or JetBrains.

---

### Cline (VS Code)

```bash
openrat install --target cline
```

Sets `cline.apiProvider = "openai"`, `cline.openAiBaseUrl`, `cline.openAiApiKey`, and `cline.openAiModelId` in the VS Code `settings.json`. Reload the window to apply.

---

### Roo Code (VS Code)

```bash
openrat install --target roo-code
```

Sets the equivalent `roo-cline.*` keys in the VS Code `settings.json`. Reload the window to apply.

---

### OpenCode (SST)

```bash
openrat install --target opencode
```

Writes `~/.config/opencode/config.json` with an OpenAI-compatible provider pointing to the local gateway. Run `opencode` normally after install.

> Requires: `npm i -g opencode-ai`

---

### Goose (Block)

```bash
openrat install --target goose
```

Writes `~/.config/goose/config.yaml` with `GOOSE_PROVIDER=openai` and the gateway URL. Run `goose session` normally after install.

---

### Cursor

```bash
openrat install --target cursor
```

Injects `cursor.general.openAIBaseUrl` and `cursor.general.openAIApiKey` into Cursor's `settings.json`. Restart Cursor to apply.

> Note: Cursor's UI Settings page may override these values. Verify under **Settings → Models** after restarting.

---

### Amp (Sourcegraph)

```bash
openrat install --target amp
```

Writes `~/.config/amp/settings.json` with an `openai-compatible` provider. Run `amp` normally after install.

> Requires: `npm i -g @sourcegraph/amp`

---

### Plandex

```bash
openrat install --target plandex
```

Creates a `plandex-openrat` launcher with `OPENAI_API_KEY` and `OPENAI_API_BASE_URL` pre-set. Use `plandex-openrat` instead of `plandex`.

> Requires: `curl -sL https://plandex.ai/install.sh | bash`

---

### OpenClaw

```bash
openrat install --target openclaw
```

Adds a `llm-pool` custom provider to `~/.openclaw/openclaw.json` pointing to the local gateway.

---

### VS Code — OpenClaude extension

```bash
openrat install --target vscode-openclaude
```

Registers the launcher path in the VS Code `settings.json` under `openclaude.launchCommand`.

---

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

### Health check

```bash
curl http://127.0.0.1:4419/health
# {"ok":true,"version":"2.0.0"}
```

Useful for scripting, CI/CD pipelines, or confirming the gateway is up before sending requests.

---

## Background Mode

After starting the gateway with `openrat gateway` or `openrat multi start`, the interactive post-start menu offers a **"Run in background"** option. This detaches OpenRat from your terminal completely:

- The process re-spawns itself in detached mode and the terminal is released immediately
- A **PID file** is written to `~/.openrat/openrat.pid`
- A **stop script** is created at `~/.openrat/stop.sh`
- On Linux with `python3` + `gir1.2-appindicator3` installed, a **system tray icon** appears with "Open Dashboard" and "Stop OpenRat" menu items

**To stop a background instance:**

```bash
bash ~/.openrat/stop.sh
```

If the tray icon is unavailable (not Linux, or missing python3/GTK), OpenRat continues running silently in background and logs a note to `~/.openrat/openrat.log`.

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

### Multi-instance config reference

```jsonc
{
  "basePort": 4419,      // Base port for auto-numbering (optional).
                         // If set, you can omit "port" from each instance —
                         // instance 0 = basePort, instance 1 = basePort+2, etc.
  "instances": [
    {
      "name": "rat-1",
      "port": 4419,               // Gateway port (optional if basePort is set)
      "dashboardPort": 4420,      // Dashboard port (default: port + 1)
      "masterKey": "openrat-local",
      "rotation": "round-robin",
      "routes": { "default": "openrouter" },
      "providers": {
        "openrouter": {
          "type": "openai-compatible",
          "model": "tencent/hy3-preview:free",
          "baseUrl": "https://openrouter.ai/api/v1",
          "apiKeys": ["sk-or-v1-YOUR-KEY-1"],
          "supportedEndpoints": ["chat/completions"]
        }
      }
    }
  ]
}
```

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
│   ├── install.ts          # Auto-configuration for 13 AI tools
│   ├── detect.ts           # Detects installed AI clients
│   ├── menu.ts             # Interactive terminal menu + manager server
│   ├── background.ts       # Background / daemon mode (PID file, stop script)
│   ├── tray.ts             # System tray icon (Linux, python3 + GTK)
│   ├── types.ts            # Shared TypeScript types
│   ├── utils.ts            # Shared helpers
│   └── fs.ts               # JSON file read/write helpers
├── test/
│   ├── config.test.ts
│   ├── install.test.ts
│   └── multi-config.test.ts
├── examples/
│   ├── openrat.config.example.json
│   └── openrat.multi.example.json
├── openrat-manager.html    # Standalone visual manager UI (opened by `openrat manager`)
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE
├── package.json
└── tsconfig.json
```

### Request flow

```
Client → Gateway (port 4419)
  │
  ├─ Authenticate masterKey (Authorization: Bearer or X-API-Key)
  ├─ Parse request JSON body (max 10 MB)
  ├─ Resolve provider (by "model" field or configured aliases)
  ├─ Check: schedule active? spend limit OK?
  ├─ Select available key (fill-first or round-robin)
  │    └─ Filters out keys on cooldown or with spend-limit reached
  ├─ Forward request to real provider
  ├─ On retryable failure: mark cooldown, try next key
  ├─ Track tokens and cost in StatsTracker
  └─ Pipe response back to client (supports SSE streaming)
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, code style, and PR guidelines.

---

## License

AGPL-3.0 — open source protegido. Modificações e uso como serviço devem manter o código aberto.

---

<div align="center">
Made with 🐀 in Brazil 🇧🇷
</div>
