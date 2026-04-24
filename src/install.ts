import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { loadConfig } from './config.js'
import { ensureParentDir, mergeObjects, readJsonFile, writeJsonFile } from './fs.js'
import type { GatewayConfig, InstallOptions, InstallResult } from './types.js'
import { expandHome } from './utils.js'

export async function installTarget(options: InstallOptions): Promise<InstallResult> {
  const config = await loadConfig(options.configPath)

  switch (options.target) {
    case 'openclaude':
      return installOpenClaude(config, options)
    case 'openclaw':
      return installOpenClaw(config, options)
    case 'vscode-openclaude':
      return installVsCode(config, options)
    default:
      throw new Error(`Target nao suportado: ${options.target satisfies never}`)
  }
}

async function installOpenClaude(config: GatewayConfig, options: InstallOptions): Promise<InstallResult> {
  const settingsPath = expandHome(options.targetPath ?? '~/.claude/settings.json')
  const launcherPath = expandHome(options.launcherPath ?? '~/.local/bin/openclaude-keymux')
  const settings = await readJsonFile<Record<string, unknown>>(settingsPath, {})

  const agentModels: Record<string, { base_url: string; api_key: string }> = {}
  for (const provider of Object.values(config.providers)) {
    agentModels[provider.model] = {
      base_url: gatewayBaseUrl(config),
      api_key: config.server?.masterKey ?? 'openrat-local',
    }
  }

  const patched = mergeObjects(settings, {
    agentModels,
    agentRouting: {
      default: config.providers[config.routes.default].model,
    },
  })

  await writeJsonFile(settingsPath, patched)
  await writeLauncher(launcherPath, config)

  return {
    target: 'openclaude',
    updatedFiles: [settingsPath, launcherPath],
    notes: [
      'OpenClaude principal passa a usar o launcher, e subagentes usam agentModels/agentRouting.',
    ],
  }
}

async function installOpenClaw(config: GatewayConfig, options: InstallOptions): Promise<InstallResult> {
  const configPath = expandHome(options.targetPath ?? '~/.openclaw/openclaw.json')
  const current = await readJsonFile<Record<string, unknown>>(configPath, {})

  const models = Object.values(config.providers).map((provider) => ({
    id: provider.model,
    name: provider.model,
    reasoning: false,
    input: ['text', 'image'],
    contextWindow: 128000,
    maxTokens: 8192,
  }))

  const patched = mergeObjects(current, {
    env: {
      OPENRAT_API_KEY: config.server?.masterKey ?? 'openrat-local',
    },
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
      defaults: {
        model: {
          primary: `llm-pool/${config.providers[config.routes.default].model}`,
        },
      },
    },
  })

  await writeJsonFile(configPath, patched)
  return {
    target: 'openclaw',
    updatedFiles: [configPath],
    notes: ['OpenClaw recebeu um provider customizado "llm-pool" apontando para o gateway local.'],
  }
}

async function installVsCode(config: GatewayConfig, options: InstallOptions): Promise<InstallResult> {
  const settingsPath = expandHome(options.targetPath ?? resolveVsCodeSettingsPath())
  const launcherPath = expandHome(options.launcherPath ?? '~/.local/bin/openclaude-keymux')
  const settings = await readJsonFile<Record<string, unknown>>(settingsPath, {})

  await writeLauncher(launcherPath, config)

  const patched = mergeObjects(settings, {
    openclaude: {
      launchCommand: launcherPath,
      useOpenAIShim: false,
    },
  })

  await writeJsonFile(settingsPath, patched)

  return {
    target: 'vscode-openclaude',
    updatedFiles: [settingsPath, launcherPath],
    notes: ['O launcher do OpenClaude foi registrado no settings.json do VS Code.'],
  }
}

function gatewayBaseUrl(config: GatewayConfig): string {
  return `http://${config.server?.host ?? '127.0.0.1'}:${config.server?.port ?? 4419}/v1`
}

async function writeLauncher(launcherPath: string, config: GatewayConfig): Promise<void> {
  const defaultModel = config.providers[config.routes.default].model
  const masterKey = config.server?.masterKey ?? 'openrat-local'
  const contents = `#!/usr/bin/env bash
set -euo pipefail
export CLAUDE_CODE_USE_OPENAI=1
export OPENAI_BASE_URL="${gatewayBaseUrl(config)}"
export OPENAI_API_KEY="${masterKey}"
export OPENAI_MODEL="${defaultModel}"
exec openclaude "$@"
`
  await ensureParentDir(launcherPath)
  await fs.writeFile(launcherPath, contents, { encoding: 'utf8', mode: 0o755 })
}

function resolveVsCodeSettingsPath(): string {
  const homeDir = os.homedir()
  return path.join(homeDir, '.config/Code/User/settings.json')
}
