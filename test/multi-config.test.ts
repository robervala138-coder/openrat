import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveAllInstances, buildExampleMultiConfig } from '../src/multi-config.js'
import type { MultiConfig } from '../src/types.js'

test('resolveAllInstances: auto-atribui portas sequencialmente', () => {
  const config: MultiConfig = {
    basePort: 4419,
    instances: [
      {
        name: 'rat-1',
        routes: { default: 'p' },
        providers: { p: { type: 'openai-compatible', model: 'm', apiKeys: ['k'] } },
      },
      {
        name: 'rat-2',
        routes: { default: 'p' },
        providers: { p: { type: 'openai-compatible', model: 'm', apiKeys: ['k'] } },
      },
    ],
  }
  const resolved = resolveAllInstances(config)
  assert.equal(resolved[0].gatewayConfig.server!.port, 4419)
  assert.equal(resolved[1].gatewayConfig.server!.port, 4421)
})

test('resolveAllInstances: respeita porta explícita sem avançar cursor', () => {
  const config: MultiConfig = {
    basePort: 4419,
    instances: [
      {
        name: 'rat-explicit',
        port: 5000,
        routes: { default: 'p' },
        providers: { p: { type: 'openai-compatible', model: 'm', apiKeys: ['k'] } },
      },
      {
        name: 'rat-auto',
        routes: { default: 'p' },
        providers: { p: { type: 'openai-compatible', model: 'm', apiKeys: ['k'] } },
      },
    ],
  }
  const resolved = resolveAllInstances(config)
  // Primeira usa 5000 (explícita)
  assert.equal(resolved[0].gatewayConfig.server!.port, 5000)
  // Segunda pega 4419 (basePort), que está livre
  assert.equal(resolved[1].gatewayConfig.server!.port, 4419)
})

test('buildExampleMultiConfig: retorna 3 instâncias válidas', () => {
  const cfg = buildExampleMultiConfig()
  assert.equal(cfg.instances.length, 3)
  assert.equal(cfg.instances[0].port, 4419)
  assert.equal(cfg.instances[1].port, 4421)
  assert.equal(cfg.instances[2].port, 4423)
})
