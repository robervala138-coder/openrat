import os from 'node:os'
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

function cursorCandidates(homeDir: string): string[] {
  const platform = os.platform()
  if (platform === 'darwin') {
    return [path.join(homeDir, 'Library/Application Support/Cursor/User/settings.json')]
  }
  if (platform === 'win32') {
    return [path.join(homeDir, 'AppData/Roaming/Cursor/User/settings.json')]
  }
  return [path.join(homeDir, '.config/Cursor/User/settings.json')]
}

async function firstExisting(paths: string[]): Promise<boolean> {
  return Boolean(await findExisting(paths))
}

async function findExisting(paths: string[]): Promise<string | undefined> {
  for (const candidate of paths) {
    if (await pathExists(candidate)) return candidate
  }
  return undefined
}

export async function detectTargets(paths: DetectionPaths): Promise<DetectedTarget[]> {
  const homeDir = paths.homeDir

  const openClaudeSettings = path.join(homeDir, '.claude/settings.json')
  const openClawConfig     = path.join(homeDir, '.openclaw/openclaw.json')
  const vscodeSettings     = vscodeCandidates(homeDir)
  const aiderConfig        = path.join(homeDir, '.aider.conf.yml')
  const continueConfig     = path.join(homeDir, '.continue/config.json')
  const openCodeConfig     = path.join(homeDir, '.config/opencode/config.json')
  const codexConfig        = path.join(homeDir, '.codex/config.json')
  const gooseConfig        = path.join(homeDir, '.config/goose/config.yaml')
  const cursorSettings     = cursorCandidates(homeDir)
  const ampConfig          = path.join(homeDir, '.config/amp/settings.json')
  const plandexDir         = path.join(homeDir, '.plandex')

  const detected: DetectedTarget[] = [
    {
      id: 'openclaude',
      label: 'Claude Code (openclaude)',
      configPath: openClaudeSettings,
      exists: await pathExists(openClaudeSettings),
      notes: [
        'Configura ~/.claude/settings.json (agentModels + agentRouting).',
        'Cria launcher ~/.local/bin/openclaude-keymux.',
      ],
    },
    {
      id: 'openclaw',
      label: 'OpenClaw',
      configPath: openClawConfig,
      exists: await pathExists(openClawConfig),
      notes: ['Configura ~/.openclaw/openclaw.json com provider llm-pool.'],
    },
    {
      id: 'vscode-openclaude',
      label: 'VS Code — extensão OpenClaude',
      configPath: vscodeSettings[0],
      exists: await firstExisting(vscodeSettings),
      notes: ['Registra launcher no settings.json do VS Code.'],
    },
    {
      id: 'aider',
      label: 'Aider',
      configPath: aiderConfig,
      exists: await pathExists(aiderConfig),
      notes: [
        'Escreve ~/.aider.conf.yml com openai-api-base e openai-api-key.',
        'Requer: pip install aider-chat',
      ],
    },
    {
      id: 'continue-dev',
      label: 'Continue.dev',
      configPath: continueConfig,
      exists: await pathExists(continueConfig),
      notes: [
        'Injeta provider OpenAI-compatible em ~/.continue/config.json.',
        'Compatível com VS Code e JetBrains.',
      ],
    },
    {
      id: 'cline',
      label: 'Cline (VS Code)',
      configPath: vscodeSettings[0],
      exists: await firstExisting(vscodeSettings),
      notes: [
        'Configura cline.apiProvider = "openai" no settings.json do VS Code.',
      ],
    },
    {
      id: 'roo-code',
      label: 'Roo Code (VS Code)',
      configPath: vscodeSettings[0],
      exists: await firstExisting(vscodeSettings),
      notes: [
        'Configura roo-cline.openAiBaseUrl no settings.json do VS Code.',
      ],
    },
    {
      id: 'opencode',
      label: 'OpenCode (SST)',
      configPath: openCodeConfig,
      exists: await pathExists(openCodeConfig),
      notes: [
        'Escreve ~/.config/opencode/config.json.',
        'Requer: npm i -g opencode-ai',
      ],
    },
    {
      id: 'codex-cli',
      label: 'Codex CLI (OpenAI)',
      configPath: codexConfig,
      exists: await pathExists(codexConfig),
      notes: [
        'Escreve ~/.codex/config.json.',
        'Cria launcher ~/.local/bin/codex-openrat.',
        'Requer: npm i -g @openai/codex',
      ],
    },
    {
      id: 'goose',
      label: 'Goose (Block)',
      configPath: gooseConfig,
      exists: await pathExists(gooseConfig),
      notes: [
        'Escreve ~/.config/goose/config.yaml.',
        'Requer: goose (binary ou pip install goose-ai).',
      ],
    },
    {
      id: 'cursor',
      label: 'Cursor',
      configPath: cursorSettings[0],
      exists: await firstExisting(cursorSettings),
      notes: ['Injeta cursor.general.openAIBaseUrl no settings.json do Cursor.'],
    },
    {
      id: 'amp',
      label: 'Amp (Sourcegraph)',
      configPath: ampConfig,
      exists: await pathExists(ampConfig),
      notes: [
        'Escreve ~/.config/amp/settings.json.',
        'Requer: npm i -g @sourcegraph/amp',
      ],
    },
    {
      id: 'plandex',
      label: 'Plandex',
      configPath: plandexDir,
      exists: await pathExists(plandexDir),
      notes: [
        'Cria launcher ~/.local/bin/plandex-openrat com OPENAI_API_KEY e OPENAI_API_BASE_URL.',
        'Requer: curl -sL https://plandex.ai/install.sh | bash',
      ],
    },
  ]

  // Resolve paths reais do VS Code / Cursor
  const resolveFirst = async (cands: string[], entry: DetectedTarget | undefined) => {
    if (entry?.exists) entry.configPath = (await findExisting(cands)) ?? entry.configPath
  }
  await resolveFirst(vscodeSettings, detected.find(e => e.id === 'vscode-openclaude'))
  await resolveFirst(vscodeSettings, detected.find(e => e.id === 'cline'))
  await resolveFirst(vscodeSettings, detected.find(e => e.id === 'roo-code'))
  await resolveFirst(cursorSettings, detected.find(e => e.id === 'cursor'))

  return detected
}
