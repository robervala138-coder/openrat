import path from 'node:path'

import { readJsonFile, writeJsonFile } from './fs.js'
import type { GatewayConfig, MultiConfig, MultiInstance } from './types.js'
import { expandHome } from './utils.js'

export const DEFAULT_MULTI_CONFIG_PATH = './openrat.multi.json'
const BASE_PORT = 4419

export async function loadMultiConfig(configPath: string): Promise<MultiConfig> {
  const resolved = expandHome(configPath)
  const config = await readJsonFile<MultiConfig | null>(resolved, null)
  if (!config) throw new Error(`Arquivo não encontrado: ${resolved}`)
  validateMultiConfig(config)
  return config
}

function validateMultiConfig(config: MultiConfig): void {
  if (!Array.isArray(config.instances) || config.instances.length === 0) {
    throw new Error('"instances" precisa ter pelo menos uma entrada.')
  }

  const names = new Set<string>()
  const ports = new Set<number>()

  for (const [i, inst] of config.instances.entries()) {
    if (!inst.name) throw new Error(`instances[${i}]: "name" é obrigatório.`)
    if (names.has(inst.name)) throw new Error(`Nome duplicado: "${inst.name}".`)
    names.add(inst.name)

    if (!inst.routes?.default) throw new Error(`instances[${i}] (${inst.name}): "routes.default" é obrigatório.`)
    if (!inst.providers || Object.keys(inst.providers).length === 0)
      throw new Error(`instances[${i}] (${inst.name}): precisa de ao menos um provider.`)
    if (!inst.providers[inst.routes.default])
      throw new Error(`instances[${i}] (${inst.name}): routes.default aponta para provider inexistente.`)

    for (const [pid, p] of Object.entries(inst.providers)) {
      if (!p.model) throw new Error(`instances[${i}].providers.${pid}: "model" é obrigatório.`)
      if (!Array.isArray(p.apiKeys) || p.apiKeys.length === 0)
        throw new Error(`instances[${i}].providers.${pid}: "apiKeys" precisa ter ao menos uma chave.`)
    }

    // Check for explicit port collisions
    if (inst.port != null) {
      if (ports.has(inst.port)) throw new Error(`Porta duplicada: ${inst.port}`)
      ports.add(inst.port)
    }
  }
}

/**
 * Converte um MultiInstance para um GatewayConfig completo,
 * preenchendo portas automaticamente se necessário.
 */
export function instanceToGatewayConfig(inst: MultiInstance, autoPort: number): GatewayConfig {
  const port = inst.port ?? autoPort
  const dashboardPort = inst.dashboardPort ?? port + 1

  return {
    server: {
      host: '127.0.0.1',
      port,
      dashboardPort,
      masterKey: inst.masterKey ?? 'openrat-local',
      rotation: inst.rotation ?? 'fill-first',
    },
    routes: inst.routes,
    providers: inst.providers,
  }
}

/**
 * Resolve todas as instâncias, atribuindo portas automaticamente.
 * Pulos de 2 em 2 (gateway + dashboard).
 */
export function resolveAllInstances(config: MultiConfig): Array<{ inst: MultiInstance; gatewayConfig: GatewayConfig }> {
  const base = config.basePort ?? BASE_PORT
  let cursor = base
  const usedPorts = new Set(
    config.instances.flatMap(i => [i.port, i.dashboardPort].filter((p): p is number => p != null))
  )

  return config.instances.map((inst) => {
    let autoPort: number

    if (inst.port != null) {
      // Explicit port — no cursor movement needed.
      autoPort = inst.port
    } else {
      // Find next free consecutive pair (gateway + dashboard).
      while (usedPorts.has(cursor) || usedPorts.has(cursor + 1)) cursor += 2
      autoPort = cursor
      usedPorts.add(cursor)
      usedPorts.add(cursor + 1)
      cursor += 2
    }

    return { inst, gatewayConfig: instanceToGatewayConfig(inst, autoPort) }
  })
}

/** Gera um openrat.multi.json de exemplo */
export function buildExampleMultiConfig(): MultiConfig {
  return {
    basePort: 4419,
    instances: [
      {
        name: 'rat-1',
        port: 4419,
        masterKey: 'openrat-local',
        rotation: 'round-robin',
        routes: { default: 'openrouter' },
        providers: {
          openrouter: {
            type: 'openai-compatible',
            model: 'tencent/hy3-preview:free',
            baseUrl: 'https://openrouter.ai/api/v1',
            apiKeys: ['sk-or-v1-CHAVE_1_AQUI'],
            aliases: ['openrouter', 'tencent/hy3-preview:free'],
            supportedEndpoints: ['chat/completions'],
          },
        },
      },
      {
        name: 'rat-2',
        port: 4421,
        masterKey: 'openrat-local',
        rotation: 'round-robin',
        routes: { default: 'openrouter' },
        providers: {
          openrouter: {
            type: 'openai-compatible',
            model: 'tencent/hy3-preview:free',
            baseUrl: 'https://openrouter.ai/api/v1',
            apiKeys: ['sk-or-v1-CHAVE_2_AQUI'],
            aliases: ['openrouter', 'tencent/hy3-preview:free'],
            supportedEndpoints: ['chat/completions'],
          },
        },
      },
      {
        name: 'rat-3',
        port: 4423,
        masterKey: 'openrat-local',
        rotation: 'round-robin',
        routes: { default: 'openrouter' },
        providers: {
          openrouter: {
            type: 'openai-compatible',
            model: 'tencent/hy3-preview:free',
            baseUrl: 'https://openrouter.ai/api/v1',
            apiKeys: ['sk-or-v1-CHAVE_3_AQUI'],
            aliases: ['openrouter', 'tencent/hy3-preview:free'],
            supportedEndpoints: ['chat/completions'],
          },
        },
      },
    ],
  }
}

export function getDefaultMultiConfigPath(cwd = process.cwd()): string {
  return path.join(cwd, 'openrat.multi.json')
}
