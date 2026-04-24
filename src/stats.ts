import type { KeyStats, ProviderProfile, ProviderStats } from './types.js'
import { sanitizeKeyPreview } from './utils.js'

const DAY_MS = 24 * 60 * 60 * 1000

interface KeyRecord {
  requests: number
  inputTokens: number
  outputTokens: number
  errors: number
  lastUsed: number | null
  dailyReset: number
  monthlyReset: number
  estimatedUsdToday: number
  estimatedUsdMonth: number
}

export class StatsTracker {
  private records = new Map<string, KeyRecord>()

  private key(providerId: string, apiKey: string): string {
    return `${providerId}::${apiKey}`
  }

  private getOrCreate(providerId: string, apiKey: string): KeyRecord {
    const k = this.key(providerId, apiKey)
    if (!this.records.has(k)) {
      const now = Date.now()
      this.records.set(k, {
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        errors: 0,
        lastUsed: null,
        dailyReset: now + DAY_MS,
        monthlyReset: now + 30 * DAY_MS,
        estimatedUsdToday: 0,
        estimatedUsdMonth: 0,
      })
    }
    return this.records.get(k)!
  }

  recordRequest(
    providerId: string,
    apiKey: string,
    profile: ProviderProfile,
    inputTokens: number,
    outputTokens: number,
    isError: boolean,
  ): void {
    const rec = this.getOrCreate(providerId, apiKey)
    const now = Date.now()

    if (now > rec.dailyReset) {
      rec.estimatedUsdToday = 0
      rec.dailyReset = now + DAY_MS
    }
    if (now > rec.monthlyReset) {
      rec.estimatedUsdMonth = 0
      rec.monthlyReset = now + 30 * DAY_MS
    }

    rec.requests++
    rec.inputTokens += inputTokens
    rec.outputTokens += outputTokens
    rec.lastUsed = now
    if (isError) rec.errors++

    const inCost = ((profile.costPer1MInputTokens ?? 0) * inputTokens) / 1_000_000
    const outCost = ((profile.costPer1MOutputTokens ?? 0) * outputTokens) / 1_000_000
    const total = inCost + outCost
    rec.estimatedUsdToday += total
    rec.estimatedUsdMonth += total
  }

  getKeyStats(
    providerId: string,
    apiKey: string,
    status: KeyStats['status'],
    unavailableUntil?: number,
  ): KeyStats {
    const rec = this.getOrCreate(providerId, apiKey)
    return {
      providerId,
      keyPreview: sanitizeKeyPreview(apiKey),
      requests: rec.requests,
      inputTokens: rec.inputTokens,
      outputTokens: rec.outputTokens,
      estimatedUsdToday: rec.estimatedUsdToday,
      estimatedUsdMonth: rec.estimatedUsdMonth,
      errors: rec.errors,
      lastUsed: rec.lastUsed,
      status,
      unavailableUntil,
    }
  }

  getEstimatedUsdToday(providerId: string, apiKey: string): number {
    return this.getOrCreate(providerId, apiKey).estimatedUsdToday
  }

  getEstimatedUsdMonth(providerId: string, apiKey: string): number {
    return this.getOrCreate(providerId, apiKey).estimatedUsdMonth
  }

  buildProviderStats(
    providerId: string,
    profile: ProviderProfile,
    keyStatusMap: Map<string, { status: KeyStats['status']; unavailableUntil?: number }>,
    scheduleActive: boolean,
    spendLimitReached: boolean,
  ): ProviderStats {
    const keys: KeyStats[] = profile.apiKeys.map((k) => {
      const s = keyStatusMap.get(k) ?? { status: 'active' as const }
      return this.getKeyStats(providerId, k, s.status, s.unavailableUntil)
    })

    return {
      id: providerId,
      model: profile.model,
      keys,
      totalRequests: keys.reduce((a, b) => a + b.requests, 0),
      totalErrors: keys.reduce((a, b) => a + b.errors, 0),
      estimatedUsdToday: keys.reduce((a, b) => a + b.estimatedUsdToday, 0),
      estimatedUsdMonth: keys.reduce((a, b) => a + b.estimatedUsdMonth, 0),
      scheduleActive,
      spendLimitReached,
    }
  }
}
