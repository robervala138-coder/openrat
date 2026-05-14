import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { writeJsonFile } from '../src/fs.js'
import { installTarget } from '../src/install.js'

test('install openclaude writes settings and launcher', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openrat-'))
  const configPath = path.join(tempDir, 'openrat.config.json')
  const settingsPath = path.join(tempDir, '.claude/settings.json')
  const launcherPath = path.join(tempDir, '.local/bin/openclaude-keymux')

  await writeJsonFile(configPath, {
    server: { host: '127.0.0.1', port: 4419, masterKey: 'secret' },
    routes: { default: 'gemini' },
    providers: {
      gemini: {
        type: 'google-ai-studio',
        model: 'gemini-2.5-flash',
        apiKeys: ['AIza-example-1'],
      },
    },
  })

  const result = await installTarget({
    configPath,
    target: 'openclaude',
    targetPath: settingsPath,
    launcherPath,
  })

  const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8')) as Record<string, unknown>
  const launcher = await fs.readFile(launcherPath, 'utf8')

  assert.equal(result.updatedFiles.length, 2)
  assert.match(launcher, /OPENAI_BASE_URL="http:\/\/127.0.0.1:4419\/v1"/)
  assert.deepEqual(settings.agentRouting, { default: 'gemini-2.5-flash' })
})

test('install opencode writes one OpenRat provider per multi gateway port', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openrat-'))
  const configPath = path.join(tempDir, 'openrat.config.json')
  const multiConfigPath = path.join(tempDir, 'openrat.multi.json')
  const opencodePath = path.join(tempDir, '.config/opencode/config.json')

  await writeJsonFile(configPath, {
    server: { host: '127.0.0.1', port: 4439, masterKey: 'secret' },
    routes: { default: 'glm' },
    providers: {
      glm: {
        type: 'openai-compatible',
        model: 'z-ai/glm-5.1',
        baseUrl: 'https://example.test/v1',
        apiKeys: ['sk-example'],
      },
    },
  })

  await writeJsonFile(multiConfigPath, {
    basePort: 4419,
    instances: [
      {
        name: 'rat-1',
        port: 4439,
        masterKey: 'openrat-local',
        routes: { default: 'glm' },
        providers: {
          glm: {
            type: 'openai-compatible',
            model: 'z-ai/glm-5.1',
            baseUrl: 'https://example.test/v1',
            apiKeys: ['sk-example-1'],
          },
        },
      },
      {
        name: 'rat-2',
        port: 4441,
        masterKey: 'openrat-local',
        routes: { default: 'glm' },
        providers: {
          glm: {
            type: 'openai-compatible',
            model: 'z-ai/glm-5.1',
            baseUrl: 'https://example.test/v1',
            apiKeys: ['sk-example-2'],
          },
        },
      },
    ],
  })

  await installTarget({
    configPath,
    target: 'opencode',
    targetPath: opencodePath,
  })

  const settings = JSON.parse(await fs.readFile(opencodePath, 'utf8')) as Record<string, any>

  assert.equal(settings.model, 'openrat-4439/z-ai/glm-5.1')
  assert.equal(settings.provider['openrat-4439'].npm, '@ai-sdk/openai-compatible')
  assert.equal(settings.provider['openrat-4439'].options.baseURL, 'http://127.0.0.1:4439/v1')
  assert.equal(settings.provider['openrat-4441'].options.baseURL, 'http://127.0.0.1:4441/v1')
  assert.deepEqual(settings.provider['openrat-4439'].models, {
    'z-ai/glm-5.1': { name: 'z-ai/glm-5.1' },
  })
})
