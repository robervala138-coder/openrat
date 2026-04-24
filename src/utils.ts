import os from 'node:os'
import path from 'node:path'

export function expandHome(inputPath: string, homeDir = os.homedir()): string {
  if (inputPath === '~') {
    return homeDir
  }

  if (inputPath.startsWith('~/')) {
    return path.join(homeDir, inputPath.slice(2))
  }

  return inputPath
}

export function ensureArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value]
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '')
}

export function toPrettyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function unique<T>(items: T[]): T[] {
  return [...new Set(items)]
}

export function sanitizeKeyPreview(key: string): string {
  if (key.length <= 8) {
    return '****'
  }

  return `${key.slice(0, 4)}...${key.slice(-4)}`
}

export function parseArgs(argv: string[]): { command?: string; flags: Map<string, string | boolean> } {
  const [command, ...rest] = argv
  const flags = new Map<string, string | boolean>()

  for (let index = 0; index < rest.length; index += 1) {
    const entry = rest[index]
    if (!entry.startsWith('--')) {
      continue
    }

    const key = entry.slice(2)
    const next = rest[index + 1]
    if (!next || next.startsWith('--')) {
      flags.set(key, true)
      continue
    }

    flags.set(key, next)
    index += 1
  }

  return { command, flags }
}

export async function promptSelect(message: string, options: string[]): Promise<number> {
  const stdin = process.stdin
  const stdout = process.stdout

  return new Promise((resolve, reject) => {
    stdout.write(`${message}\n`)
    options.forEach((option, index) => {
      stdout.write(`  ${index + 1}. ${option}\n`)
    })
    stdout.write('Escolha um numero: ')

    const onData = (chunk: Buffer) => {
      stdin.pause()
      stdin.removeListener('data', onData)
      const answer = chunk.toString().trim()
      const parsed = Number.parseInt(answer, 10)
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > options.length) {
        reject(new Error('Selecao invalida. Rode o comando novamente informando um numero valido.'))
        return
      }
      resolve(parsed - 1)
    }

    stdin.resume()
    stdin.once('data', onData)
  })
}
