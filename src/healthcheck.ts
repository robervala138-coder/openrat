import type { GatewayConfig } from './types.js'
import { normalizeBaseUrl, sanitizeKeyPreview } from './utils.js'

export interface HealthResult {
  providerId: string
  keyPreview: string
  ok: boolean
  statusCode?: number
  latencyMs?: number
  error?: string
}

export async function validateAllKeys(config: GatewayConfig): Promise<HealthResult[]> {
  const results: HealthResult[] = []

  for (const [providerId, profile] of Object.entries(config.providers)) {
    const baseUrl = normalizeBaseUrl(profile.baseUrl ?? '')
    const url = `${baseUrl}/chat/completions`

    for (const apiKey of profile.apiKeys) {
      const start = Date.now()
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${apiKey}`,
            ...profile.headers,
          },
          body: JSON.stringify({
            model: profile.model,
            messages: [{ role: 'user', content: 'hi' }],
            max_tokens: 1,
          }),
          signal: AbortSignal.timeout(10_000),
        })

        const latencyMs = Date.now() - start
        // A key is considered valid if the provider accepted it (any non-auth error
        // means the key itself is fine — e.g. 400 bad request, 429 rate limit, 500 server).
        // Only 401 and 403 definitively indicate an invalid/forbidden key.
        const ok = res.status !== 401 && res.status !== 403

        results.push({
          providerId,
          keyPreview: sanitizeKeyPreview(apiKey),
          ok,
          statusCode: res.status,
          latencyMs,
          error: ok ? undefined : `HTTP ${res.status} (chave inválida ou sem permissão)`,
        })
      } catch (err) {
        results.push({
          providerId,
          keyPreview: sanitizeKeyPreview(apiKey),
          ok: false,
          latencyMs: Date.now() - start,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }
  }

  return results
}

export function printHealthResults(results: HealthResult[]): void {
  const pad = (s: string, n: number) => s.padEnd(n)

  process.stdout.write(`\n${'Provider'.padEnd(20)} ${'Chave'.padEnd(20)} ${'Status'.padEnd(10)} Latência\n`)
  process.stdout.write(`${'-'.repeat(65)}\n`)

  for (const r of results) {
    const status = r.ok ? '✅ OK' : `❌ ${r.error ?? 'ERRO'}`
    const latency = r.latencyMs != null ? `${r.latencyMs}ms` : '-'
    process.stdout.write(
      `${pad(r.providerId, 20)} ${pad(r.keyPreview, 20)} ${pad(status, 10)} ${latency}\n`,
    )
  }

  const total = results.length
  const ok = results.filter((r) => r.ok).length
  process.stdout.write(`\n${ok}/${total} chaves operacionais\n\n`)
}
