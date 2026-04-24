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
