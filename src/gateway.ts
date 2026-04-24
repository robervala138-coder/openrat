import http from 'node:http'
import { URL } from 'node:url'

import type { EndpointType, GatewayConfig, ProviderProfile, RotationStrategy } from './types.js'
import { buildModelsPayload, resolveProvider, supportsEndpoint } from './providers.js'
import { StatsTracker } from './stats.js'
import { normalizeBaseUrl, sanitizeKeyPreview, sleep } from './utils.js'

interface UpstreamFailure { status?: number; body?: string }
interface KeyState { unavailableUntil: number; spendLimitHit: boolean }

const RETRYABLE_STATUSES = new Set([401, 402, 403, 408, 409, 429, 500, 502, 503, 504])

export class GatewayServer {
  private readonly keyState = new Map<string, KeyState>()
  private readonly rrIndex = new Map<string, number>()
  private readonly stats = new StatsTracker()

  constructor(private readonly config: GatewayConfig) {}

  async listen(): Promise<void> {
    const host = this.config.server?.host ?? '127.0.0.1'
    const port = this.config.server?.port ?? 4419

    const server = http.createServer(async (req, res) => {
      // CORS — permite que o dashboard (porta diferente) acesse o gateway
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key')

      if (req.method === 'OPTIONS') {
        res.writeHead(204)
        res.end()
        return
      }

      try { await this.handleRequest(req, res) }
      catch (error) {
        const message = error instanceof Error ? error.message : 'Erro inesperado'
        if (!res.headersSent) {
          res.writeHead(500, { 'content-type': 'application/json' })
          res.end(JSON.stringify({ error: { message } }))
        }
      }
    })

    await new Promise<void>((resolve) => { server.listen(port, host, resolve) })
    const dashboardPort = this.config.server?.dashboardPort ?? port + 1
    process.stdout.write(`\n🐀 OpenRat gateway em http://${host}:${port}\n`)
    process.stdout.write(`   Dashboard: http://${host}:${dashboardPort}\n\n`)
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const pathname = new URL(req.url ?? '/', 'http://127.0.0.1').pathname

    // ── health ──────────────────────────────────────────────────────────────
    if (pathname === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: true, version: '2.0.0' }))
      return
    }

    // ── stats (para o dashboard) ─────────────────────────────────────────────
    if (pathname === '/openrat/stats' && req.method === 'GET') {
      this.checkMasterKey(req)
      const payload = this.buildStatsPayload()
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(payload))
      return
    }

    // ── models ───────────────────────────────────────────────────────────────
    if (pathname === '/v1/models' && req.method === 'GET') {
      this.checkMasterKey(req)
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(buildModelsPayload(this.config)))
      return
    }

    // ── completions / responses ──────────────────────────────────────────────
    if (pathname !== '/v1/chat/completions' && pathname !== '/v1/responses') {
      res.writeHead(404, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: { message: 'Endpoint não suportado.' } }))
      return
    }

    if (req.method !== 'POST') {
      res.writeHead(405, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: { message: 'Método não suportado.' } }))
      return
    }

    this.checkMasterKey(req)

    const body = await this.readJsonBody(req)
    const endpoint: EndpointType = pathname === '/v1/responses' ? 'responses' : 'chat/completions'
    const requestedModel = typeof body.model === 'string' ? body.model : undefined
    const resolved = resolveProvider(this.config, requestedModel)

    // schedule check
    if (!this.isScheduleActive(resolved.profile)) {
      res.writeHead(503, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: { message: `Provider "${resolved.id}" fora da janela de horário configurada.` } }))
      return
    }

    if (!supportsEndpoint(resolved.profile, endpoint)) {
      res.writeHead(400, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: { message: `Provider "${resolved.id}" não suporta ${endpoint}.` } }))
      return
    }

    const outboundBody = { ...body, model: resolved.profile.model }
    const upstream = await this.tryForward(resolved.id, endpoint, outboundBody)

    res.writeHead(upstream.status, Object.fromEntries(Array.from(upstream.headers.entries())))
    if (!upstream.body) { res.end(); return }

    const reader = upstream.body.getReader()
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      res.write(Buffer.from(chunk.value))
    }
    res.end()
  }

  // ── schedule ────────────────────────────────────────────────────────────────
  private isScheduleActive(profile: ProviderProfile): boolean {
    if (!profile.schedule) return true
    const hour = new Date().getHours()
    const { fromHour, toHour } = profile.schedule
    if (fromHour <= toHour) return hour >= fromHour && hour <= toHour
    // overnight: ex 22-06
    return hour >= fromHour || hour <= toHour
  }

  // ── spend limit ─────────────────────────────────────────────────────────────
  private isSpendLimitReached(providerId: string, apiKey: string, profile: ProviderProfile): boolean {
    const limit = profile.spendLimit
    if (!limit) return false
    const today = this.stats.getEstimatedUsdToday(providerId, apiKey)
    const month = this.stats.getEstimatedUsdMonth(providerId, apiKey)
    if (limit.dailyUsd != null && today >= limit.dailyUsd) return true
    if (limit.monthlyUsd != null && month >= limit.monthlyUsd) return true
    return false
  }

  // ── key ordering ─────────────────────────────────────────────────────────────
  private getKeyOrder(providerId: string, profile: ProviderProfile): string[] {
    const strategy: RotationStrategy = this.config.server?.rotation ?? 'fill-first'
    const now = Date.now()

    const available = profile.apiKeys.filter((key) => {
      const state = this.keyState.get(this.ksKey(providerId, key))
      if (state?.spendLimitHit) return false
      if (state && state.unavailableUntil > now) return false
      if (this.isSpendLimitReached(providerId, key, profile)) {
        this.markSpendLimit(providerId, key)
        return false
      }
      return true
    })

    const pool = available.length > 0 ? available : profile.apiKeys

    if (strategy === 'round-robin') {
      const idx = this.rrIndex.get(providerId) ?? 0
      this.rrIndex.set(providerId, (idx + 1) % pool.length)
      return [...pool.slice(idx % pool.length), ...pool.slice(0, idx % pool.length)]
    }

    return pool
  }

  // ── forward ──────────────────────────────────────────────────────────────────
  private async tryForward(providerId: string, endpoint: EndpointType, body: Record<string, unknown>): Promise<Response> {
    const profile = this.config.providers[providerId]
    const baseUrl = normalizeBaseUrl(profile.baseUrl ?? '')
    const url = `${baseUrl}/${endpoint}`
    const keys = this.getKeyOrder(providerId, profile)

    let lastFailure: UpstreamFailure | undefined

    for (const apiKey of keys) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${apiKey}`,
            ...profile.headers,
          },
          body: JSON.stringify(body),
        })

        // NOTE: We intentionally do NOT clone the body to parse usage here.
        // Cloning and consuming a streaming response before piping it to the client
        // would buffer the entire stream in memory and break true SSE streaming.
        // Token usage is tracked only for non-streaming (buffered) responses.
        let inputTokens = 0; let outputTokens = 0
        if (response.ok) {
          const contentType = response.headers.get('content-type') ?? ''
          const isStreaming = contentType.includes('text/event-stream')
          if (!isStreaming) {
            const cloned = response.clone()
            const text = await cloned.text().catch(() => '')
            try {
              const parsed = JSON.parse(text)
              inputTokens = parsed?.usage?.prompt_tokens ?? 0
              outputTokens = parsed?.usage?.completion_tokens ?? 0
            } catch { /* não é JSON parseável */ }
          }
          this.stats.recordRequest(providerId, apiKey, profile, inputTokens, outputTokens, false)
          return new Response(response.body, { status: response.status, headers: response.headers })
        }

        const failureBody = await response.text().catch(() => '')
        lastFailure = { status: response.status, body: failureBody }
        this.stats.recordRequest(providerId, apiKey, profile, 0, 0, true)

        if (!RETRYABLE_STATUSES.has(response.status)) {
          throw new Error(`Falha não repetível do upstream: ${response.status}`)
        }
        this.markKeyUnavailable(providerId, apiKey, response.status, failureBody)
        continue
      } catch (error) {
        lastFailure = { body: error instanceof Error ? error.message : String(error) }
        this.markKeyUnavailable(providerId, apiKey, undefined, lastFailure.body)
        await sleep(100)
      }
    }

    const detail = lastFailure?.status
      ? `${lastFailure.status}: ${lastFailure.body ?? ''}`
      : lastFailure?.body ?? 'sem detalhes'
    throw new Error(`Nenhuma chave disponível para "${providerId}". Último erro: ${detail}`)
  }

  // ── helpers ──────────────────────────────────────────────────────────────────
  private checkMasterKey(req: http.IncomingMessage): void {
    const required = this.config.server?.masterKey
    if (!required) return
    const authHeader = req.headers.authorization
    const apiKey = req.headers['x-api-key']
    const provided = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : Array.isArray(apiKey) ? apiKey[0] : apiKey
    if (provided !== required) throw new Error('Chave mestre inválida.')
  }

  private async readJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    const raw = Buffer.concat(chunks).toString('utf8')
    if (!raw.trim()) return {}
    return JSON.parse(raw) as Record<string, unknown>
  }

  private ksKey(providerId: string, apiKey: string): string {
    return `${providerId}:${apiKey}`
  }

  private markKeyUnavailable(providerId: string, apiKey: string, status?: number, body?: string): void {
    const reason = this.classifyFailure(status, body)
    const state = this.keyState.get(this.ksKey(providerId, apiKey)) ?? { unavailableUntil: 0, spendLimitHit: false }
    state.unavailableUntil = Date.now() + reason.cooldownMs
    this.keyState.set(this.ksKey(providerId, apiKey), state)
    process.stderr.write(`[failover] ${providerId} ${sanitizeKeyPreview(apiKey)} cooldown ${reason.cooldownMs}ms (${reason.label})\n`)
  }

  private markSpendLimit(providerId: string, apiKey: string): void {
    const state = this.keyState.get(this.ksKey(providerId, apiKey)) ?? { unavailableUntil: 0, spendLimitHit: false }
    state.spendLimitHit = true
    this.keyState.set(this.ksKey(providerId, apiKey), state)
    process.stderr.write(`[spend-limit] ${providerId} ${sanitizeKeyPreview(apiKey)} limite de gasto atingido\n`)
  }

  private classifyFailure(status?: number, body?: string): { label: string; cooldownMs: number } {
    const low = body?.toLowerCase() ?? ''
    if (status === 429 || low.includes('rate limit')) return { label: 'rate-limit', cooldownMs: 60_000 }
    if (status === 402 || low.includes('quota') || low.includes('insufficient')) return { label: 'quota', cooldownMs: 30 * 60_000 }
    if (status === 401 || status === 403 || low.includes('invalid api key')) return { label: 'auth', cooldownMs: 10 * 60_000 }
    if (status && status >= 500) return { label: 'server', cooldownMs: 15_000 }
    return { label: 'network', cooldownMs: 10_000 }
  }

  private buildStatsPayload() {
    const providers = Object.entries(this.config.providers).map(([id, profile]) => {
      const keyStatusMap = new Map<string, { status: any; unavailableUntil?: number }>()
      for (const key of profile.apiKeys) {
        const state = this.keyState.get(this.ksKey(id, key))
        if (state?.spendLimitHit) keyStatusMap.set(key, { status: 'spend-limit' })
        else if (state && state.unavailableUntil > Date.now()) keyStatusMap.set(key, { status: 'cooldown', unavailableUntil: state.unavailableUntil })
        else if (!this.isScheduleActive(profile)) keyStatusMap.set(key, { status: 'schedule-off' })
        else keyStatusMap.set(key, { status: 'active' })
      }
      return this.stats.buildProviderStats(
        id, profile, keyStatusMap,
        this.isScheduleActive(profile),
        profile.apiKeys.every(k => this.keyState.get(this.ksKey(id, k))?.spendLimitHit),
      )
    })
    return { providers, rotation: this.config.server?.rotation ?? 'fill-first', ts: Date.now() }
  }
}
