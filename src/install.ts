import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { loadConfig } from './config.js'
import { ensureParentDir, mergeObjects, pathExists, readJsonFile, writeJsonFile } from './fs.js'
import { getDefaultMultiConfigPath, loadMultiConfig, resolveAllInstances } from './multi-config.js'
import type { GatewayConfig, InstallOptions, InstallResult } from './types.js'
import { expandHome } from './utils.js'

// ── Entry point ───────────────────────────────────────────────────────────────

export async function installTarget(options: InstallOptions): Promise<InstallResult> {
  const config = await loadConfig(options.configPath)

  switch (options.target) {
    case 'openclaude':      return installOpenClaude(config, options)
    case 'openclaw':        return installOpenClaw(config, options)
    case 'vscode-openclaude': return installVsCode(config, options)
    case 'aider':           return installAider(config, options)
    case 'continue-dev':    return installContinueDev(config, options)
    case 'cline':           return installCline(config, options)
    case 'roo-code':        return installRooCode(config, options)
    case 'opencode':        return installOpenCode(config, options)
    case 'codex-cli':       return installCodexCli(config, options)
    case 'goose':           return installGoose(config, options)
    case 'cursor':          return installCursor(config, options)
    case 'amp':             return installAmp(config, options)
    case 'plandex':         return installPlandex(config, options)
    default:
      throw new Error(`Target não suportado: ${options.target satisfies never}`)
  }
}

// ── Helpers comuns ────────────────────────────────────────────────────────────

function gatewayBaseUrl(config: GatewayConfig): string {
  return `http://${config.server?.host ?? '127.0.0.1'}:${config.server?.port ?? 4419}/v1`
}

function defaultModel(config: GatewayConfig): string {
  return config.providers[config.routes.default].model
}

function masterKey(config: GatewayConfig): string {
  return config.server?.masterKey ?? 'openrat-local'
}

async function loadResolvedMultiGateways(configPath: string): Promise<GatewayConfig[]> {
  const candidates = [
    path.join(path.dirname(expandHome(configPath)), 'openrat.multi.json'),
    getDefaultMultiConfigPath(),
    path.join(process.cwd(), 'openrat.multi.json'),
  ]

  const seen = new Set<string>()
  for (const candidate of candidates) {
    if (seen.has(candidate)) continue
    seen.add(candidate)

    if (!await pathExists(candidate)) continue
    const multi = await loadMultiConfig(candidate)
    return resolveAllInstances(multi).map(({ gatewayConfig }) => gatewayConfig)
  }

  return []
}

async function writeLauncher(launcherPath: string, config: GatewayConfig, extraEnv: string, execCmd: string): Promise<void> {
  const contents = `#!/usr/bin/env bash
set -euo pipefail
export OPENAI_BASE_URL="${gatewayBaseUrl(config)}"
export OPENAI_API_KEY="${masterKey(config)}"
export OPENAI_MODEL="${defaultModel(config)}"
${extraEnv}
exec ${execCmd} "$@"
`
  await ensureParentDir(launcherPath)
  await fs.writeFile(launcherPath, contents, { encoding: 'utf8', mode: 0o755 })
}

function resolveVsCodeSettingsPath(override?: string): string {
  if (override) return expandHome(override)
  return path.join(os.homedir(), '.config/Code/User/settings.json')
}

function resolveCursorSettingsPath(override?: string): string {
  if (override) return expandHome(override)
  const platform = os.platform()
  const home = os.homedir()
  if (platform === 'darwin') return path.join(home, 'Library/Application Support/Cursor/User/settings.json')
  if (platform === 'win32') return path.join(home, 'AppData/Roaming/Cursor/User/settings.json')
  return path.join(home, '.config/Cursor/User/settings.json')
}

// ── Instaladores ──────────────────────────────────────────────────────────────

// ── 1. openclaude ─────────────────────────────────────────────────────────────
async function installOpenClaude(config: GatewayConfig, options: InstallOptions): Promise<InstallResult> {
  const settingsPath  = expandHome(options.targetPath ?? '~/.claude/settings.json')
  const launcherPath  = expandHome(options.launcherPath ?? '~/.local/bin/openclaude-keymux')
  const settings      = await readJsonFile<Record<string, unknown>>(settingsPath, {})

  const agentModels: Record<string, { base_url: string; api_key: string }> = {}
  for (const provider of Object.values(config.providers)) {
    agentModels[provider.model] = { base_url: gatewayBaseUrl(config), api_key: masterKey(config) }
  }

  const patched = mergeObjects(settings, {
    agentModels,
    agentRouting: { default: defaultModel(config) },
  })

  await writeJsonFile(settingsPath, patched)
  await writeLauncher(launcherPath, config, 'export CLAUDE_CODE_USE_OPENAI=1', 'openclaude')

  return {
    target: 'openclaude',
    updatedFiles: [settingsPath, launcherPath],
    notes: ['agentModels e agentRouting configurados; use o launcher para o processo principal.'],
  }
}

// ── 2. openclaw ───────────────────────────────────────────────────────────────
async function installOpenClaw(config: GatewayConfig, options: InstallOptions): Promise<InstallResult> {
  const configPath = expandHome(options.targetPath ?? '~/.openclaw/openclaw.json')
  const current    = await readJsonFile<Record<string, unknown>>(configPath, {})

  const models = Object.values(config.providers).map(p => ({
    id: p.model, name: p.model, reasoning: false,
    input: ['text', 'image'], contextWindow: 128000, maxTokens: 8192,
  }))

  const patched = mergeObjects(current, {
    env: { OPENRAT_API_KEY: masterKey(config) },
    models: {
      providers: {
        'llm-pool': {
          baseUrl: gatewayBaseUrl(config),
          apiKey: '${OPENRAT_API_KEY}',
          api: 'openai-completions',
          models,
        },
      },
    },
    agents: {
      defaults: { model: { primary: `llm-pool/${defaultModel(config)}` } },
    },
  })

  await writeJsonFile(configPath, patched)
  return {
    target: 'openclaw',
    updatedFiles: [configPath],
    notes: ['Provider "llm-pool" adicionado ao OpenClaw apontando para o gateway local.'],
  }
}

// ── 3. vscode-openclaude ──────────────────────────────────────────────────────
async function installVsCode(config: GatewayConfig, options: InstallOptions): Promise<InstallResult> {
  const settingsPath = resolveVsCodeSettingsPath(options.targetPath)
  const launcherPath = expandHome(options.launcherPath ?? '~/.local/bin/openclaude-keymux')
  const settings     = await readJsonFile<Record<string, unknown>>(settingsPath, {})

  await writeLauncher(launcherPath, config, 'export CLAUDE_CODE_USE_OPENAI=1', 'openclaude')
  const patched = mergeObjects(settings, { openclaude: { launchCommand: launcherPath, useOpenAIShim: false } })
  await writeJsonFile(settingsPath, patched)

  return {
    target: 'vscode-openclaude',
    updatedFiles: [settingsPath, launcherPath],
    notes: ['Launcher do OpenClaude registrado no settings.json do VS Code.'],
  }
}

// ── 4. aider ─────────────────────────────────────────────────────────────────
async function installAider(config: GatewayConfig, options: InstallOptions): Promise<InstallResult> {
  const configPath = expandHome(options.targetPath ?? '~/.aider.conf.yml')

  // Aider usa YAML simples — escrevemos com template (sem dep yaml)
  const yamlContent = [
    '# Configurado pelo OpenRat — não edite as linhas abaixo manualmente',
    `openai-api-base: ${gatewayBaseUrl(config)}`,
    `openai-api-key: ${masterKey(config)}`,
    `model: openai/${defaultModel(config)}`,
    '',
  ].join('\n')

  await ensureParentDir(configPath)

  // Preserva linhas existentes que não são das chaves que gerenciamos
  let existing = ''
  try { existing = await fs.readFile(configPath, 'utf8') } catch { /* arquivo novo */ }

  const managedKeys = new Set(['openai-api-base', 'openai-api-key', 'model'])
  const preserved = existing
    .split('\n')
    .filter(line => {
      const key = line.split(':')[0].trim()
      return !managedKeys.has(key) && !line.startsWith('#')
    })
    .join('\n')
    .trim()

  await fs.writeFile(configPath, yamlContent + (preserved ? preserved + '\n' : ''), 'utf8')

  return {
    target: 'aider',
    updatedFiles: [configPath],
    notes: [
      'Use: aider (sem flags extras — config lida automaticamente de ~/.aider.conf.yml)',
      'Ou: aider --model openai/<seu-modelo>',
    ],
  }
}

// ── 5. continue-dev ───────────────────────────────────────────────────────────
async function installContinueDev(config: GatewayConfig, options: InstallOptions): Promise<InstallResult> {
  const configPath = expandHome(options.targetPath ?? '~/.continue/config.json')
  const current    = await readJsonFile<Record<string, unknown>>(configPath, { models: [] })

  // Remove entrada anterior do OpenRat e adiciona a nova
  const existingModels = (Array.isArray(current.models) ? current.models : []) as Record<string, unknown>[]
  const filteredModels  = existingModels.filter(m => m['provider'] !== 'openrat-gateway')

  const allProviderModels = Object.values(config.providers).map(p => ({
    title: `OpenRat — ${p.model}`,
    provider: 'openai',
    model: p.model,
    apiBase: gatewayBaseUrl(config),
    apiKey: masterKey(config),
    useLegacyCompletionsEndpoint: false,
  }))

  const patched = mergeObjects(current, {
    models: [...filteredModels, ...allProviderModels],
    tabAutocompleteModel: {
      title: `OpenRat (autocomplete)`,
      provider: 'openai',
      model: defaultModel(config),
      apiBase: gatewayBaseUrl(config),
      apiKey: masterKey(config),
    },
  })

  await writeJsonFile(configPath, patched)
  return {
    target: 'continue-dev',
    updatedFiles: [configPath],
    notes: [
      `${allProviderModels.length} modelo(s) adicionado(s) ao Continue.dev.`,
      'Selecione "OpenRat — <modelo>" no seletor de modelos da extensão.',
    ],
  }
}

// ── 6. cline ─────────────────────────────────────────────────────────────────
async function installCline(config: GatewayConfig, options: InstallOptions): Promise<InstallResult> {
  const settingsPath = resolveVsCodeSettingsPath(options.targetPath)
  const settings     = await readJsonFile<Record<string, unknown>>(settingsPath, {})

  const patched = mergeObjects(settings, {
    'cline.apiProvider': 'openai',
    'cline.openAiBaseUrl': gatewayBaseUrl(config),
    'cline.openAiApiKey': masterKey(config),
    'cline.openAiModelId': defaultModel(config),
  })

  await writeJsonFile(settingsPath, patched)
  return {
    target: 'cline',
    updatedFiles: [settingsPath],
    notes: [
      'Cline configurado com provider "openai" apontando para o gateway local.',
      'Reabra o VS Code para aplicar as mudanças.',
    ],
  }
}

// ── 7. roo-code ───────────────────────────────────────────────────────────────
async function installRooCode(config: GatewayConfig, options: InstallOptions): Promise<InstallResult> {
  const settingsPath = resolveVsCodeSettingsPath(options.targetPath)
  const settings     = await readJsonFile<Record<string, unknown>>(settingsPath, {})

  const patched = mergeObjects(settings, {
    'roo-cline.apiProvider': 'openai',
    'roo-cline.openAiBaseUrl': gatewayBaseUrl(config),
    'roo-cline.openAiApiKey': masterKey(config),
    'roo-cline.openAiModelId': defaultModel(config),
  })

  await writeJsonFile(settingsPath, patched)
  return {
    target: 'roo-code',
    updatedFiles: [settingsPath],
    notes: [
      'Roo Code configurado com provider "openai" apontando para o gateway local.',
      'Reabra o VS Code para aplicar as mudanças.',
    ],
  }
}

// ── 8. opencode ───────────────────────────────────────────────────────────────
async function installOpenCode(config: GatewayConfig, options: InstallOptions): Promise<InstallResult> {
  const configPath = expandHome(options.targetPath ?? '~/.config/opencode/config.json')
  const current    = await readJsonFile<Record<string, unknown>>(configPath, {})
  const multiGateways = await loadResolvedMultiGateways(options.configPath)

  const provider: Record<string, { npm: string; name: string; options: { baseURL: string; apiKey: string }; models: Record<string, { name: string }> }> = {}

  if (multiGateways.length > 0) {
    for (const gateway of multiGateways) {
      const port = gateway.server?.port ?? 4419
      const model = defaultModel(gateway)
      const providerId = `openrat-${port}`

      provider[providerId] = {
        npm: '@ai-sdk/openai-compatible',
        name: `OpenRat ${port}`,
        options: {
          baseURL: gatewayBaseUrl(gateway),
          apiKey: masterKey(gateway),
        },
        models: {
          [model]: { name: model },
        },
      }
    }
  } else {
    const model = defaultModel(config)
    provider.openrat = {
      npm: '@ai-sdk/openai-compatible',
      name: 'OpenRat',
      options: {
        baseURL: gatewayBaseUrl(config),
        apiKey: masterKey(config),
      },
      models: {
        [model]: { name: model },
      },
    }
  }

  const defaultGateway = multiGateways[0] ?? config
  const defaultProviderId = multiGateways.length > 0
    ? `openrat-${defaultGateway.server?.port ?? 4419}`
    : 'openrat'

  const patched = mergeObjects(current, {
    provider,
    model: `${defaultProviderId}/${defaultModel(defaultGateway)}`,
  })

  await writeJsonFile(configPath, patched)
  return {
    target: 'opencode',
    updatedFiles: [configPath],
    notes: [
      'Use: opencode',
      multiGateways.length > 0
        ? `Providers OpenRat configurados para ${multiGateways.length} porta(s).`
        : 'Provider OpenRat configurado para o gateway local.',
      `Modelo padrão: ${defaultProviderId}/${defaultModel(defaultGateway)}`,
    ],
  }
}

// ── 9. codex-cli ─────────────────────────────────────────────────────────────
async function installCodexCli(config: GatewayConfig, options: InstallOptions): Promise<InstallResult> {
  const configPath   = expandHome(options.targetPath ?? '~/.codex/config.json')
  const launcherPath = expandHome(options.launcherPath ?? '~/.local/bin/codex-openrat')
  const current      = await readJsonFile<Record<string, unknown>>(configPath, {})

  const patched = mergeObjects(current, {
    apiKey: masterKey(config),
    model: defaultModel(config),
    baseURL: gatewayBaseUrl(config),
    provider: 'openai',
  })

  await writeJsonFile(configPath, patched)
  await writeLauncher(launcherPath, config, '', 'codex')

  return {
    target: 'codex-cli',
    updatedFiles: [configPath, launcherPath],
    notes: [
      'Use o launcher: codex-openrat (em vez de "codex" diretamente).',
      'Ou: export OPENAI_BASE_URL="' + gatewayBaseUrl(config) + '" && codex',
    ],
  }
}

// ── 10. goose ─────────────────────────────────────────────────────────────────
async function installGoose(config: GatewayConfig, options: InstallOptions): Promise<InstallResult> {
  const configPath = expandHome(options.targetPath ?? '~/.config/goose/config.yaml')

  const yamlContent = [
    '# Configurado pelo OpenRat',
    'GOOSE_PROVIDER: openai',
    `OPENAI_API_KEY: "${masterKey(config)}"`,
    `OPENAI_BASE_URL: "${gatewayBaseUrl(config)}"`,
    `OPENAI_MODEL: "${defaultModel(config)}"`,
    '',
  ].join('\n')

  await ensureParentDir(configPath)

  // Preserva entradas que não são nossas
  let existing = ''
  try { existing = await fs.readFile(configPath, 'utf8') } catch { /* novo */ }

  const managedKeys = new Set(['GOOSE_PROVIDER', 'OPENAI_API_KEY', 'OPENAI_BASE_URL', 'OPENAI_MODEL'])
  const preserved = existing
    .split('\n')
    .filter(line => {
      const key = line.split(':')[0].trim()
      return !managedKeys.has(key) && !line.startsWith('#')
    })
    .join('\n')
    .trim()

  await fs.writeFile(configPath, yamlContent + (preserved ? preserved + '\n' : ''), 'utf8')

  return {
    target: 'goose',
    updatedFiles: [configPath],
    notes: [
      'Use: goose session',
      'O Goose usará o provider OpenAI apontando para o gateway local.',
    ],
  }
}

// ── 11. cursor ────────────────────────────────────────────────────────────────
async function installCursor(config: GatewayConfig, options: InstallOptions): Promise<InstallResult> {
  const settingsPath = resolveCursorSettingsPath(options.targetPath)
  const settings     = await readJsonFile<Record<string, unknown>>(settingsPath, {})

  const patched = mergeObjects(settings, {
    'cursor.general.openAIApiKey': masterKey(config),
    'cursor.general.openAIBaseUrl': gatewayBaseUrl(config),
    'cursor.general.enableOpenAICompatibility': true,
  })

  await writeJsonFile(settingsPath, patched)
  return {
    target: 'cursor',
    updatedFiles: [settingsPath],
    notes: [
      'Cursor configurado para usar o gateway local via OpenAI compatibility mode.',
      'Reinicie o Cursor para aplicar as mudanças.',
      'Nota: o Cursor pode sobrescrever essas configurações via UI — verifique em Settings > Models.',
    ],
  }
}

// ── 12. amp ───────────────────────────────────────────────────────────────────
async function installAmp(config: GatewayConfig, options: InstallOptions): Promise<InstallResult> {
  const configPath = expandHome(options.targetPath ?? '~/.config/amp/settings.json')
  const current    = await readJsonFile<Record<string, unknown>>(configPath, {})

  const patched = mergeObjects(current, {
    ai: {
      provider: 'openai-compatible',
      baseURL: gatewayBaseUrl(config),
      apiKey: masterKey(config),
      model: defaultModel(config),
    },
  })

  await writeJsonFile(configPath, patched)
  return {
    target: 'amp',
    updatedFiles: [configPath],
    notes: [
      'Amp configurado com provider openai-compatible.',
      'Use: amp (o provider será detectado automaticamente).',
    ],
  }
}

// ── 13. plandex ───────────────────────────────────────────────────────────────
async function installPlandex(config: GatewayConfig, options: InstallOptions): Promise<InstallResult> {
  const launcherPath = expandHome(options.launcherPath ?? '~/.local/bin/plandex-openrat')

  const extraEnv = `export OPENAI_API_BASE_URL="${gatewayBaseUrl(config)}"`
  await writeLauncher(launcherPath, config, extraEnv, 'plandex')

  return {
    target: 'plandex',
    updatedFiles: [launcherPath],
    notes: [
      'Use o launcher: plandex-openrat (em vez de "plandex" diretamente).',
      'Ou: export OPENAI_API_KEY="' + masterKey(config) + '" OPENAI_API_BASE_URL="' + gatewayBaseUrl(config) + '" && plandex',
    ],
  }
}
