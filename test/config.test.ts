import test from 'node:test'
import assert from 'node:assert/strict'

import { buildExampleConfig, normalizeConfig } from '../src/config.js'
import { resolveProvider } from '../src/providers.js'

test('normalizeConfig: injeta defaults de host, porta e masterKey', () => {
  const config = normalizeConfig({
    routes: { default: 'gemini' },
    providers: {
      gemini: {
        type: 'google-ai-studio',
        model: 'gemini-2.5-flash',
        apiKeys: ['a'],
      },
    },
  })

  assert.equal(config.server?.host, '127.0.0.1')
  assert.equal(config.server?.port, 4419)
  assert.equal(config.server?.masterKey, 'openrat-local')
})

test('normalizeConfig: injeta aliases incluindo providerId e model', () => {
  const config = normalizeConfig({
    routes: { default: 'gemini' },
    providers: {
      gemini: {
        type: 'google-ai-studio',
        model: 'gemini-2.5-flash',
        apiKeys: ['a'],
      },
    },
  })

  assert.equal(config.providers.gemini.aliases?.includes('gemini'), true)
  assert.equal(config.providers.gemini.aliases?.includes('gemini-2.5-flash'), true)
})

test('normalizeConfig: preserva dashboardPort e rotation do server', () => {
  const config = normalizeConfig({
    server: { port: 4419, dashboardPort: 9999, rotation: 'round-robin' },
    routes: { default: 'gemini' },
    providers: {
      gemini: {
        type: 'google-ai-studio',
        model: 'gemini-2.5-flash',
        apiKeys: ['a'],
      },
    },
  })

  assert.equal(config.server?.dashboardPort, 9999)
  assert.equal(config.server?.rotation, 'round-robin')
})

test('normalizeConfig: dashboardPort default é port + 1', () => {
  const config = normalizeConfig({
    server: { port: 4419 },
    routes: { default: 'gemini' },
    providers: {
      gemini: {
        type: 'google-ai-studio',
        model: 'gemini-2.5-flash',
        apiKeys: ['a'],
      },
    },
  })

  assert.equal(config.server?.dashboardPort, 4420)
})

test('normalizeConfig: injeta supportedEndpoints corretos por tipo', () => {
  const config = normalizeConfig({
    routes: { default: 'gemini' },
    providers: {
      gemini: {
        type: 'google-ai-studio',
        model: 'gemini-2.5-flash',
        apiKeys: ['a'],
      },
    },
  })

  assert.equal(config.providers.gemini.supportedEndpoints?.includes('chat/completions'), true)
  // google-ai-studio NÃO suporta responses
  assert.equal(config.providers.gemini.supportedEndpoints?.includes('responses'), false)
})

test('resolveProvider: resolve por alias antes do default', () => {
  const config = buildExampleConfig()
  const resolved = resolveProvider(config, 'grok-fast')
  assert.equal(resolved.id, 'grok-mini')
  assert.equal(resolved.profile.model, 'grok-3-mini')
})

test('resolveProvider: cai no default quando model não é encontrado', () => {
  const config = buildExampleConfig()
  const resolved = resolveProvider(config, 'modelo-inexistente')
  assert.equal(resolved.id, config.routes.default)
})
