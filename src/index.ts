#!/usr/bin/env node
import os from 'node:os'

import { buildExampleConfig, getDefaultConfigPath, loadConfig } from './config.js'
import { detectTargets } from './detect.js'
import { writeJsonFile } from './fs.js'
import { GatewayServer } from './gateway.js'
import { DashboardServer } from './dashboard.js'
import { validateAllKeys, printHealthResults } from './healthcheck.js'
import { installTarget } from './install.js'
import {
  buildExampleMultiConfig,
  getDefaultMultiConfigPath,
  loadMultiConfig,
} from './multi-config.js'
import { startAllInstances, printInstancesSummary } from './orchestrator.js'
import { MultiDashboardServer } from './multi-dashboard.js'
import { showStartupMenu, launchManager } from './menu.js'
import type { TargetId } from './types.js'
import { parseArgs, promptSelect, toPrettyJson } from './utils.js'

// ─── ANSI helpers (inline, zero deps) ────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  blue:   '\x1b[38;5;69m',
  purple: '\x1b[38;5;135m',
  green:  '\x1b[38;5;84m',
  amber:  '\x1b[38;5;214m',
  red:    '\x1b[38;5;196m',
  gray:   '\x1b[38;5;245m',
  dgray:  '\x1b[38;5;238m',
  cyan:   '\x1b[38;5;87m',
}

function printHelp(): void {
  process.stdout.write(`
${C.blue}${C.bold}🐀 OpenRat v2.0${C.reset} ${C.gray}— Gateway local OpenAI-compatible${C.reset}

${C.purple}${C.bold}Comandos (instância única):${C.reset}
  ${C.cyan}openrat init${C.reset} ${C.gray}[--config PATH]       Cria arquivo de configuração${C.reset}
  ${C.cyan}openrat gateway${C.reset} ${C.gray}[--config PATH]    Sobe o gateway + dashboard${C.reset}
  ${C.cyan}openrat detect${C.reset}                     ${C.gray}Detecta ferramentas instaladas${C.reset}
  ${C.cyan}openrat install${C.reset} ${C.gray}[--config PATH] [--target TARGET]${C.reset}
  ${C.cyan}openrat check${C.reset} ${C.gray}[--config PATH]      Valida todas as chaves de API${C.reset}
  ${C.cyan}openrat status${C.reset} ${C.gray}[--config PATH]     Exibe status dos providers${C.reset}

${C.purple}${C.bold}Comandos (multi-instância):${C.reset}
  ${C.cyan}openrat multi init${C.reset} ${C.gray}[--config PATH]  Cria openrat.multi.json de exemplo${C.reset}
  ${C.cyan}openrat multi start${C.reset} ${C.gray}[--config PATH] [--central-dashboard-port PORT]${C.reset}
                                      ${C.gray}Sobe todas as instâncias + dashboard central${C.reset}

${C.purple}${C.bold}Menu interativo:${C.reset}
  ${C.cyan}openrat${C.reset}                            ${C.gray}Abre o menu de seleção no terminal${C.reset}
  ${C.cyan}openrat manager${C.reset}                    ${C.gray}Abre o manager visual direto no browser${C.reset}

${C.gray}Opções:
  --config PATH    Caminho para o arquivo de config (padrão: ./openrat.config.json)
  --target         openclaude | openclaw | vscode-openclaude
  --central-dashboard-port  Porta do dashboard central (padrão: 4400)${C.reset}
`)
}

// ─── Handlers de comandos single ──────────────────────────────────────────────

async function cmdInit(configPath: string): Promise<void> {
  await writeJsonFile(configPath, buildExampleConfig())
  process.stdout.write(`${C.green}✅ Arquivo criado em ${configPath}${C.reset}\n`)
  process.stdout.write(`   ${C.gray}Edite o arquivo e adicione suas chaves de API.${C.reset}\n`)
}

async function cmdGateway(configPath: string): Promise<void> {
  const config = await loadConfig(configPath)
  const port = config.server?.port ?? 4419
  const gateway = new GatewayServer(config)
  const dashboard = new DashboardServer(config, port)
  await gateway.listen()
  await dashboard.listen()
  process.stdout.write(`\n   ${C.gray}Pressione Ctrl+C para parar.${C.reset}\n`)
}

async function cmdCheck(configPath: string): Promise<void> {
  process.stdout.write(`${C.blue}🔍 Validando chaves de API...${C.reset}\n`)
  const config = await loadConfig(configPath)
  const results = await validateAllKeys(config)
  printHealthResults(results)
  const failed = results.filter(r => !r.ok)
  if (failed.length > 0) process.exitCode = 1
}

async function cmdStatus(configPath: string): Promise<void> {
  const config = await loadConfig(configPath)
  const providers = Object.entries(config.providers)
  process.stdout.write(`\n${C.blue}🐀 OpenRat${C.reset} — Status dos providers\n\n`)
  for (const [id, p] of providers) {
    const schedule = p.schedule ? `  ⏰ Horário: ${p.schedule.fromHour}h–${p.schedule.toHour}h` : ''
    const spend = p.spendLimit
      ? `  💰 Limite: diário $${p.spendLimit.dailyUsd ?? '—'} / mensal $${p.spendLimit.monthlyUsd ?? '—'}`
      : ''
    process.stdout.write(`  ${C.cyan}${id}${C.reset}\n`)
    process.stdout.write(`    ${C.gray}Modelo: ${C.amber}${p.model}${C.reset}  ${C.gray}Chaves: ${C.green}${p.apiKeys.length}${C.reset}  ${C.gray}Rotação: ${C.reset}${config.server?.rotation ?? 'fill-first'}\n`)
    if (schedule) process.stdout.write(schedule + '\n')
    if (spend)    process.stdout.write(spend + '\n')
    process.stdout.write('\n')
  }
}

async function cmdDetect(): Promise<void> {
  const targets = await detectTargets({ homeDir: os.homedir() })
  process.stdout.write(toPrettyJson(targets))
}

async function cmdInstall(configPath: string, flags: Map<string, string | boolean>): Promise<void> {
  const targets = await detectTargets({ homeDir: os.homedir() })
  const providedTarget = flags.get('target')
  let target: TargetId
  if (typeof providedTarget === 'string') {
    target = providedTarget as TargetId
  } else {
    const choices = targets.map((e) => `${e.label}${e.exists ? ' (detectado)' : ' (não detectado)'}`)
    const idx = await promptSelect('Selecione o sistema alvo:', choices)
    target = targets[idx].id
  }
  const result = await installTarget({ configPath, target })
  process.stdout.write(toPrettyJson(result))
}

// ─── Handlers de comandos multi ───────────────────────────────────────────────

async function cmdMultiInit(multiConfigPath: string): Promise<void> {
  await writeJsonFile(multiConfigPath, buildExampleMultiConfig())
  process.stdout.write(`${C.green}✅ Arquivo criado em ${multiConfigPath}${C.reset}\n`)
  process.stdout.write(`   ${C.gray}Edite o arquivo e adicione suas chaves.${C.reset}\n`)
  process.stdout.write(`   ${C.gray}Dica: cada instância em uma porta diferente = uma chave diferente.${C.reset}\n`)
}

async function cmdMultiStart(multiConfigPath: string, centralPort: number): Promise<void> {
  const multiConfig = await loadMultiConfig(multiConfigPath)
  process.stdout.write(`\n${C.blue}🐀 OpenRat Multi${C.reset} — iniciando ${C.bold}${multiConfig.instances.length}${C.reset} instância(s)...\n`)
  const running = await startAllInstances(multiConfig)
  printInstancesSummary(running)
  const allStatuses = running.map(r => r.status)
  const central = new MultiDashboardServer(allStatuses, centralPort)
  await central.listen()
}

// ─── Dispatcher unificado ─────────────────────────────────────────────────────
// Usado tanto pelo menu interativo (que monta a string do comando) quanto pelos
// argumentos diretos da CLI. Elimina a duplicação anterior entre runCommand e main.

async function runCommand(commandStr: string, flags: Map<string, string | boolean>): Promise<void> {
  const parts = commandStr.trim().split(/\s+/)
  const command = parts[0]
  const sub = parts[1]

  // ── multi ──────────────────────────────────────────────────────────────────
  if (command === 'multi') {
    const multiConfigPath = typeof flags.get('config') === 'string'
      ? String(flags.get('config'))
      : getDefaultMultiConfigPath()

    if (sub === 'init') { await cmdMultiInit(multiConfigPath); return }

    if (sub === 'start') {
      const centralPort = typeof flags.get('central-dashboard-port') === 'string'
        ? Number(flags.get('central-dashboard-port'))
        : 4400
      await cmdMultiStart(multiConfigPath, centralPort)
      return
    }

    process.stdout.write(`Subcomando desconhecido: ${sub ?? '(nenhum)'}\n`)
    process.stdout.write(`Use: openrat multi init | openrat multi start\n`)
    return
  }

  // ── single ─────────────────────────────────────────────────────────────────
  const configPath = typeof flags.get('config') === 'string'
    ? String(flags.get('config'))
    : getDefaultConfigPath()

  switch (command) {
    case 'init':    await cmdInit(configPath); return
    case 'gateway': await cmdGateway(configPath); return
    case 'check':   await cmdCheck(configPath); return
    case 'status':  await cmdStatus(configPath); return
    case 'detect':  await cmdDetect(); return
    case 'install': await cmdInstall(configPath, flags); return
    default:
      throw new Error(`Comando desconhecido: ${command}`)
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const { command, flags } = parseArgs(process.argv.slice(2))

  if (command === 'manager') {
    await launchManager()
    return
  }

  if (command === '--help' || command === '-h') {
    printHelp()
    return
  }

  // Sem argumentos → menu interativo
  if (command === undefined) {
    const result = await showStartupMenu()
    if (result.action === 'manager') return  // launchManager fica em loop

    if (result.action === 'terminal' && result.terminalCmd) {
      process.stdout.write(`\n${C.blue}▶${C.reset} Executando: ${C.cyan}openrat ${result.terminalCmd}${C.reset}\n\n`)
      await runCommand(result.terminalCmd, flags)
    }
    return
  }

  // 'multi' sem subcomando → apenas exibe ajuda
  if (command === 'multi' && process.argv.length === 3) {
    printHelp()
    return
  }

  // Comandos diretos — monta a string completa e delega ao dispatcher
  const fullCmd = [command, ...process.argv.slice(3)].join(' ')
  await runCommand(fullCmd, flags)
}

main().catch((error) => {
  process.stderr.write(`${C.red}❌ ${error instanceof Error ? error.message : String(error)}${C.reset}\n`)
  process.exitCode = 1
})
