import path from 'node:path'

import { readJsonFile } from './fs.js'
import type { EndpointType, GatewayConfig, ProviderProfile } from './types.js'
import { expandHome, unique } from './utils.js'

const DEFAULT_MASTER_KEY = 'openrat-local'
const DEFAULT_HOST = '127.0.0.1'
const DEFAULT_PORT = 4419

const DEFAULT_ENDPOINTS: Record<ProviderProfile['type'], EndpointType[]> = {
  'openai-compatible': ['chat/completions', 'responses'],
  'google-ai-studio': ['chat/completions'],
  xai: ['chat/completions'],
}

const DEFAULT_BASE_URLS: Record<ProviderProfile['type'], string | undefined> = {
  'openai-compatible': undefined,
  'google-ai-studio': 'https://generativelanguage.googleapis.com/v1beta/openai',
  xai: 'https://api.x.ai/v1',
}

export function getDefaultConfigPath(cwd = process.cwd()): string {
  return path.join(cwd, 'openrat.config.json')
}

export async function loadConfig(configPath: string): Promise<GatewayConfig> {
  const resolvedPath = expandHome(configPath)
  const config = await readJsonFile<GatewayConfig | null>(resolvedPath, null)
  if (!config) {
    throw new Error(`Arquivo de configuracao nao encontrado: ${resolvedPath}`)
  }

  validateConfig(config)
  return normalizeConfig(config)
}

export function normalizeConfig(config: GatewayConfig): GatewayConfig {
  const normalizedProviders: GatewayConfig['providers'] = {}

  for (const [providerId, profile] of Object.entries(config.providers)) {
    normalizedProviders[providerId] = {
      ...profile,
      aliases: unique([providerId, profile.model, ...(profile.aliases ?? [])]),
      supportedEndpoints: profile.supportedEndpoints ?? DEFAULT_ENDPOINTS[profile.type],
      baseUrl: profile.baseUrl ?? DEFAULT_BASE_URLS[profile.type],
    }
  }

  const port = config.server?.port ?? DEFAULT_PORT

  return {
    ...config,
    server: {
      host: config.server?.host ?? DEFAULT_HOST,
      port,
      masterKey: config.server?.masterKey ?? DEFAULT_MASTER_KEY,
      // Preserve dashboardPort and rotation — dropping them silently caused gateway
      // to always display port+1 regardless of what was configured.
      dashboardPort: config.server?.dashboardPort ?? port + 1,
      rotation: config.server?.rotation,
    },
    providers: normalizedProviders,
  }
}

export function validateConfig(config: GatewayConfig): void {
  if (!config.routes?.default) {
    throw new Error('routes.default e obrigatorio.')
  }

  if (!config.providers || Object.keys(config.providers).length === 0) {
    throw new Error('providers precisa ter pelo menos uma entrada.')
  }

  for (const [providerId, profile] of Object.entries(config.providers)) {
    if (!profile.model) {
      throw new Error(`providers.${providerId}.model e obrigatorio.`)
    }
    if (!Array.isArray(profile.apiKeys) || profile.apiKeys.length === 0) {
      throw new Error(`providers.${providerId}.apiKeys precisa ter ao menos uma chave.`)
    }
  }

  if (!config.providers[config.routes.default]) {
    throw new Error(`routes.default aponta para "${config.routes.default}", mas esse provider nao existe.`)
  }
}

export function buildExampleConfig(): GatewayConfig {
  return normalizeConfig({
    server: {
      host: DEFAULT_HOST,
      port: DEFAULT_PORT,
      masterKey: DEFAULT_MASTER_KEY,
    },
    routes: {
      default: 'gemini-flash',
    },
    providers: {
      'gemini-flash': {
        type: 'google-ai-studio',
        model: 'gemini-2.5-flash',
        aliases: ['gemini-fast'],
        apiKeys: ['AIza-example-1', 'AIza-example-2'],
      },
      'grok-mini': {
        type: 'xai',
        model: 'grok-3-mini',
        aliases: ['grok-fast'],
        apiKeys: ['xai-example-1'],
      },
      'deepseek-chat': {
        type: 'openai-compatible',
        model: 'deepseek-chat',
        baseUrl: 'https://api.deepseek.com/v1',
        apiKeys: ['sk-example-1', 'sk-example-2'],
      },
    },
  })
}
