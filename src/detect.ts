import path from 'node:path'

import { pathExists } from './fs.js'
import type { DetectionPaths, DetectedTarget } from './types.js'

function vscodeCandidates(homeDir: string): string[] {
  return [
    path.join(homeDir, '.config/Code/User/settings.json'),
    path.join(homeDir, '.config/Code - OSS/User/settings.json'),
    path.join(homeDir, '.config/VSCodium/User/settings.json'),
  ]
}

export async function detectTargets(paths: DetectionPaths): Promise<DetectedTarget[]> {
  const homeDir = paths.homeDir
  const openClaudeSettings = path.join(homeDir, '.claude/settings.json')
  const openClawConfig = path.join(homeDir, '.openclaw/openclaw.json')
  const vscodeSettings = vscodeCandidates(homeDir)

  const detected: DetectedTarget[] = [
    {
      id: 'openclaude',
      label: 'OpenClaude',
      configPath: openClaudeSettings,
      exists: await pathExists(openClaudeSettings),
      notes: ['Usa ~/.claude/settings.json e tambem pode receber um launcher dedicado.'],
    },
    {
      id: 'openclaw',
      label: 'OpenClaw',
      configPath: openClawConfig,
      exists: await pathExists(openClawConfig),
      notes: ['Usa ~/.openclaw/openclaw.json e um provider OpenAI-compatible local.'],
    },
    {
      id: 'vscode-openclaude',
      label: 'VS Code (OpenClaude extension)',
      configPath: vscodeSettings[0],
      exists: await firstExisting(vscodeSettings),
      notes: ['Procura settings.json do VS Code e aponta openclaude.launchCommand para o launcher.'],
    },
  ]

  if (detected[2]?.exists) {
    detected[2].configPath = (await findExisting(vscodeSettings)) ?? detected[2].configPath
  }

  return detected
}

async function firstExisting(paths: string[]): Promise<boolean> {
  const found = await findExisting(paths)
  return Boolean(found)
}

async function findExisting(paths: string[]): Promise<string | undefined> {
  for (const candidate of paths) {
    if (await pathExists(candidate)) {
      return candidate
    }
  }
  return undefined
}
