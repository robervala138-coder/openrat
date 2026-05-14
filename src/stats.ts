import type { KeyStats, ProviderProfile, ProviderStats } from './types.js'
import { sanitizeKeyPreview } from './utils.js'

interface KeyRecord {
  requests: number
  inputTokens: number
  outputTokens: number
  errors: number
  lastUsed: number | null
  estimatedUsdToday: number
  estimatedUsdMonth: number
  /** Start of current calendar day (midnight) as ms timestamp */
  dayStart: number
  /** Start of current calendar month (1st day midnight) as ms timestamp */
  monthStart: number
}

/** Get midnight of the current day in local time */
function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Get midnight of the 1st of the current month in local time */
function startOfMonth(ts: number): number {
  const d = new Date(ts)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
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
        estimatedUsdToday: 0,
        estimatedUsdMonth: 0,
        dayStart: startOfDay(now),
        monthStart: startOfMonth(now),
      })
    }
    return this.records.get(k)!
  }

  /** Check if we crossed a day or month boundary and reset counters accordingly */
  private checkResets(rec: KeyRecord, now: number): void {
    const todayStart = startOfDay(now)
    if (rec.dayStart < todayStart) {
      rec.estimatedUsdToday = 0
      rec.dayStart = todayStart
    }

    const thisMonthStart = startOfMonth(now)
    if (rec.monthStart < thisMonthStart) {
      rec.estimatedUsdMonth = 0
      rec.monthStart = thisMonthStart
    }
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

    this.checkResets(rec, now)

    rec.requests++
    rec.lastUsed = now
    if (isError) {
      rec.errors++
      return
    }

    rec.inputTokens += inputTokens
    rec.outputTokens += outputTokens

    const inCost = ((profile.costPer1MInputTokens ?? 0) * inputTokens) / 1_000_000
    const outCost = ((profile.costPer1MOutputTokens ?? 0) * outputTokens) / 1_000_000
    const total = inCost + outCost
    rec.estimatedUsdToday += total
    rec.estimatedUsdMonth += total
  }

  /** Record token usage from a streaming SSE response (called after stream ends) */
  recordStreamingUsage(
    providerId: string,
    apiKey: string,
    profile: ProviderProfile,
    inputTokens: number,
    outputTokens: number,
  ): void {
    if (inputTokens === 0 && outputTokens === 0) return
    const rec = this.getOrCreate(providerId, apiKey)
    const now = Date.now()

    this.checkResets(rec, now)

    rec.inputTokens += inputTokens
    rec.outputTokens += outputTokens

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
    // Ensure resets are applied before reading
    this.checkResets(rec, Date.now())
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
    const rec = this.getOrCreate(providerId, apiKey)
    this.checkResets(rec, Date.now())
    return rec.estimatedUsdToday
  }

  getEstimatedUsdMonth(providerId: string, apiKey: string): number {
    const rec = this.getOrCreate(providerId, apiKey)
    this.checkResets(rec, Date.now())
    return rec.estimatedUsdMonth
  }

  /** Clean up old records for keys no longer in config. Call periodically. */
  pruneStaleKeys(activeKeys: Set<string>): void {
    for (const k of this.records.keys()) {
      if (!activeKeys.has(k)) {
        this.records.delete(k)
      }
    }
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