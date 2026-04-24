import { GatewayServer } from './gateway.js'
import { DashboardServer } from './dashboard.js'
import { normalizeConfig } from './config.js'
import { resolveAllInstances } from './multi-config.js'
import type { GatewayConfig, MultiConfig, InstanceStatus } from './types.js'

export interface RunningInstance {
  status: InstanceStatus
  gateway: GatewayServer
}

/**
 * Sobe todas as instâncias definidas em um MultiConfig em paralelo.
 * Retorna lista com status de cada uma (rodando ou com erro).
 */
export async function startAllInstances(config: MultiConfig): Promise<RunningInstance[]> {
  const resolved = resolveAllInstances(config)
  const results: RunningInstance[] = []

  const startTasks = resolved.map(async ({ inst, gatewayConfig }) => {
    const normalized = normalizeConfig(gatewayConfig)
    const port = normalized.server!.port!
    const dashboardPort = normalized.server!.dashboardPort ?? port + 1

    const gateway = new GatewayServer(normalized)
    const dashboard = new DashboardServer(normalized, port)

    try {
      await gateway.listen()
      await dashboard.listen()

      results.push({
        gateway,
        status: {
          name: inst.name,
          port,
          dashboardPort,
          pid: process.pid,
          status: 'running',
          startedAt: Date.now(),
        },
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      process.stderr.write(`❌ [${inst.name}] Falha ao iniciar: ${msg}\n`)
      results.push({
        gateway,
        status: {
          name: inst.name,
          port,
          dashboardPort,
          pid: process.pid,
          status: 'error',
          startedAt: Date.now(),
          errorMessage: msg,
        },
      })
    }
  })

  await Promise.all(startTasks)
  return results
}

/** Imprime a tabela resumo de todas as instâncias */
export function printInstancesSummary(instances: RunningInstance[]): void {
  const running = instances.filter(i => i.status.status === 'running')
  const failed = instances.filter(i => i.status.status === 'error')

  process.stdout.write('\n')
  process.stdout.write('╔══════════════════════════════════════════════════════════════╗\n')
  process.stdout.write('║  🐀  OpenRat Multi — Instâncias em execução                 ║\n')
  process.stdout.write('╠══════════════════════════════════════════════════════════════╣\n')

  for (const { status: s } of running) {
    const name = s.name.padEnd(12)
    const gw = `http://127.0.0.1:${s.port}`.padEnd(28)
    const dash = `http://127.0.0.1:${s.dashboardPort}`
    process.stdout.write(`║  ✅ ${name}  Gateway: ${gw}  Dashboard: ${dash}\n`)
  }

  if (failed.length > 0) {
    process.stdout.write('╠══════════════════════════════════════════════════════════════╣\n')
    for (const { status: s } of failed) {
      process.stdout.write(`║  ❌ ${s.name.padEnd(12)}  ERRO: ${(s.errorMessage ?? '').slice(0, 46)}\n`)
    }
  }

  process.stdout.write('╠══════════════════════════════════════════════════════════════╣\n')
  process.stdout.write(`║  Total: ${running.length} rodando, ${failed.length} com erro`.padEnd(63) + '║\n')
  process.stdout.write('╚══════════════════════════════════════════════════════════════╝\n')
  process.stdout.write('\n   Pressione Ctrl+C para parar todas as instâncias.\n\n')
}
