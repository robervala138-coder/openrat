# Changelog

All notable changes to OpenRat are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [2.0.0] — 2026-04-24

### Added
- Interactive terminal menu (`openrat` with no arguments)
- Visual browser-based manager (`openrat manager`)
- Multi-instance mode (`openrat multi start`) — run N parallel gateways
- Central multi-dashboard aggregating all running instances
- `openrat check` command to validate all configured API keys
- `openrat status` command to display provider summary
- `openrat detect` command to detect installed AI clients
- `openrat install` command to auto-configure Claude Code, VS Code, OpenClaw
- Spend limits: daily and monthly USD caps per provider
- Time-based scheduling: restrict providers to specific hours
- Round-robin and fill-first key rotation strategies
- Token and estimated cost tracking per key (in-memory)
- Cooldown system per key after errors
- Alias-based model routing (map any name to a provider)
- Fully standalone HTML manager (`openrat-manager.html`)
- Example configs in `examples/`

### Fixed
- **Critical:** Streaming (SSE) responses were fully buffered in memory before being forwarded to the client, breaking real-time output. Fixed by only cloning non-streaming responses.
- **Config normalization:** `dashboardPort` and `rotation` were silently dropped during config normalization, always defaulting to `port+1` and `fill-first`. Both are now preserved.
- **Multi-instance port allocation:** `resolveAllInstances` advanced the port cursor even for instances with explicit ports, causing wrong port assignments for subsequent instances. Fixed with separate logic for explicit vs auto-assigned ports.
- **CLI duplication:** `index.ts` contained all command logic duplicated across `runCommand()` and `main()`. Refactored into individual handler functions with a single dispatcher.
- **Menu label:** "Menu Interativo" item actually opened the browser manager. Corrected label to "Manager Visual (Browser)".
- **`openrat multi` without subcommand:** Previously triggered recursive `showStartupMenu()`, risking stack overflow. Now shows help and exits.

### Changed
- Version bumped to `2.0.0` to reflect the scope of new features and fixes
- `package.json` author, repository, homepage, and bugs fields updated

---

## [0.1.0] — Initial release

- Basic OpenAI-compatible gateway
- Google AI Studio, xAI (Grok), and OpenAI-compatible provider support
- JSON config file (`openrat.config.json`)
- Basic dashboard
