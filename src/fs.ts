import fs from 'node:fs/promises'
import path from 'node:path'

import { isRecord, toPrettyJson } from './utils.js'

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

export async function ensureParentDir(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
}

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    return JSON.parse(raw) as T
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return fallback
    }
    throw error
  }
}

export async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await ensureParentDir(filePath)
  await fs.writeFile(filePath, toPrettyJson(value), 'utf8')
}

export function mergeObjects<T>(base: T, patch: unknown): T {
  if (!isRecord(base) || !isRecord(patch)) {
    return patch as T
  }

  const result: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    const current = result[key]
    if (isRecord(current) && isRecord(value)) {
      result[key] = mergeObjects(current, value)
      continue
    }
    result[key] = value
  }
  return result as T
}
