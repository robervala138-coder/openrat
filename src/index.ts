#!/usr/bin/env node
import os from 'node:os'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildExampleConfig, getDefaultConfigPath, loadConfig } from './config.js'
import { detectTargets } from './detect.js'
import { writeJsonFile, readJsonFile } from './fs.js'
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
import { goBackground, getDefaultPidFile, getDefaultInfoFile } from './background.js'
import type { TargetId } from './types.js'
import { parseArgs, promptSelect, toPrettyJson } from './utils.js'

// ─── ANSI helpers (inline, zero deps) ────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  blue: '\x1b[38;5;69m',
  purple: '\x1b[38;5;135m',
  green: '\x1b[38;5;84m',
  amber: '\x1b[38;5;214m',
  red: '\x1b[38;5;196m',
  gray: '\x1b[38;5;245m',
  dgray: '\x1b[38;5;238m',
  cyan: '\x1b[38;5;87m',
}

function printHelp(): void {
  process.stdout.write(`
 ${C.blue}${C.bold}🐀 OpenRat v2.0${C.reset} ${C.gray}— Gateway local OpenAI-compatible${C.reset}

 ${C.purple}${C.bold}Comandos (instância única):${C.reset}
 ${C.cyan}openrat init${C.reset} ${C.gray}[--config PATH] Cria arquivo de configuração${C.reset}
 ${C.cyan}openrat gateway${C.reset} ${C.gray}[--config PATH] Sobe o gateway + dashboard${C.reset}
 ${C.cyan}openrat detect${C.reset} ${C.gray}Detecta ferramentas instaladas${C.reset}
 ${C.cyan}openrat install${C.reset} ${C.gray}[--config PATH] [--target TARGET]${C.reset}
 ${C.cyan}openrat check${C.reset} ${C.gray}[--config PATH] Valida todas as chaves de API${C.reset}
 ${C.cyan}openrat status${C.reset} ${C.gray}[--config PATH] Exibe status dos providers${C.reset}

 ${C.purple}${C.bold}Comandos (multi-instância):${C.reset}
 ${C.cyan}openrat multi init${C.reset} ${C.gray}[--config PATH] Cria openrat.multi.json de exemplo${C.reset}
 ${C.cyan}openrat multi start${C.reset} ${C.gray}[--config PATH] [--central-dashboard-port PORT]${C.reset}
 ${C.gray}Sobe todas as instâncias + dashboard central${C.reset}

 ${C.purple}${C.bold}Menu interativo:${C.reset}
 ${C.cyan}openrat${C.reset} ${C.gray}Abre o menu de seleção no terminal${C.reset}
 ${C.cyan}openrat manager${C.reset} ${C.gray}Abre o manager visual direto no browser${C.reset}

 ${C.gray}Opções:
 --config PATH Caminho para o arquivo de config (padrão: ~/.openrat/openrat.config.json)
 --target openclaude | openclaw | vscode-openclaude | aider | continue-dev | cline | roo-code | opencode | codex-cli | goose | cursor | amp | plandex
 --central-dashboard-port Porta do dashboard central (padrão: 4400)${C.reset}
 `)
}

// ─── Handlers de comandos single ──────────────────────────────────────────────

async function cmdInit(configPath: string): Promise<void> {
  await writeJsonFile(configPath, buildExampleConfig())
  process.stdout.write(`${C.green}✅ Arquivo criado em ${configPath}${C.reset}\n`)
  process.stdout.write(` ${C.gray}Edite o arquivo e adicione suas chaves de API.${C.reset}\n`)
}

async function cmdGateway(configPath: string): Promise<void> {
  const config = await loadConfig(configPath)
  const port = config.server?.port ?? 4419
  const dashboardPort = config.server?.dashboardPort ?? port + 1
  const host = config.server?.host ?? '127.0.0.1'

  const gateway = new GatewayServer(config)
  const dashboard = new DashboardServer(config, port)
  await gateway.listen()
  await dashboard.listen()

  // Graceful shutdown
  const shutdown = async () => {
    process.stdout.write(`\n${C.amber}⏹ Parando OpenRat...${C.reset}\n`)
    await dashboard.close()
    await gateway.close()
    process.stdout.write(`${C.green}✅ OpenRat parado.${C.reset}\n`)
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  await showPostStartMenu({
    mode: 'single',
    gatewayUrl: `http://${host}:${port}`,
    dashboardUrl: `http://${host}:${dashboardPort}`,
  })
}

// Same as cmdGateway but without the interactive menu (used in daemon mode)
async function cmdGatewayDaemon(configPath: string): Promise<void> {
  const config = await loadConfig(configPath)
  const port = config.server?.port ?? 4419
  const dashboardPort = config.server?.dashboardPort ?? port + 1

  const gateway = new GatewayServer(config)
  const dashboard = new DashboardServer(config, port)
  await gateway.listen()
  await dashboard.listen()

  // Graceful shutdown — no interactive output since we're a daemon
  const shutdown = async () => {
    await dashboard.close()
    await gateway.close()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
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
    const schedule = p.schedule ? ` ⏰ Horário: ${p.schedule.fromHour}h–${p.schedule.toHour}h` : ''
    const spend = p.spendLimit
      ? ` 💰 Limite: diário $${p.spendLimit.dailyUsd ?? '—'} / mensal $${p.spendLimit.monthlyUsd ?? '—'}`
      : ''
    process.stdout.write(` ${C.cyan}${id}${C.reset}\n`)
    process.stdout.write(`   ${C.gray}Modelo: ${C.amber}${p.model}${C.reset} ${C.gray}Chaves: ${C.green}${p.apiKeys.length}${C.reset} ${C.gray}Rotação: ${C.reset}${config.server?.rotation ?? 'fill-first'}\n`)
    if (schedule) process.stdout.write(schedule + '\n')
    if (spend) process.stdout.write(spend + '\n')
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
  const validTargets: TargetId[] = [
    'openclaude', 'openclaw', 'vscode-openclaude',
    'aider', 'continue-dev', 'cline', 'roo-code',
    'opencode', 'codex-cli', 'goose', 'cursor', 'amp', 'plandex',
  ]
  let target: TargetId
  if (typeof providedTarget === 'string') {
    if (!validTargets.includes(providedTarget as TargetId)) {
      process.stderr.write(`${C.red}Target inválido: ${providedTarget}. Use: ${validTargets.join(', ')}${C.reset}\n`)
      process.exit(1)
    }
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
  process.stdout.write(` ${C.gray}Edite o arquivo e adicione suas chaves.${C.reset}\n`)
  process.stdout.write(` ${C.gray}Dica: cada instância em uma porta diferente = uma chave diferente.${C.reset}\n`)
}

async function cmdMultiStart(multiConfigPath: string, centralPort: number): Promise<void> {
  const multiConfig = await loadMultiConfig(multiConfigPath)
  process.stdout.write(`\n${C.blue}🐀 OpenRat Multi${C.reset} — iniciando ${C.bold}${multiConfig.instances.length}${C.reset} instância(s)...\n`)
  const running = await startAllInstances(multiConfig)
  printInstancesSummary(running)
  const allStatuses = running.map(r => r.status)
  const central = new MultiDashboardServer(allStatuses, centralPort)
  await central.listen()

  // Graceful shutdown for all instances
  const shutdown = async () => {
    process.stdout.write(`\n${C.amber}⏹ Parando todas as instâncias...${C.reset}\n`)
    for (const inst of running) {
      try { await inst.dashboard.close() } catch {}
      try { await inst.gateway.close() } catch {}
    }
    process.stdout.write(`${C.green}✅ Todas as instâncias paradas.${C.reset}\n`)
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  const runningInsts = allStatuses.filter(s => s.status === 'running')
  if (runningInsts.length > 0) {
    const firstPort = runningInsts[0].port
    await showPostStartMenu({
      mode: 'multi',
      gatewayUrl: `http://127.0.0.1:${firstPort}`,
      dashboardUrl: `http://127.0.0.1:${centralPort}`,
      instances: runningInsts,
    })
  }
}

// Same as cmdMultiStart but without the interactive menu (used in daemon mode)
async function cmdMultiStartDaemon(multiConfigPath: string, centralPort: number): Promise<void> {
  const multiConfig = await loadMultiConfig(multiConfigPath)
  const running = await startAllInstances(multiConfig)
  const allStatuses = running.map(r => r.status)
  const central = new MultiDashboardServer(allStatuses, centralPort)
  await central.listen()

  const shutdown = async () => {
    for (const inst of running) {
      try { await inst.dashboard.close() } catch {}
      try { await inst.gateway.close() } catch {}
    }
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

// ─── Post-start interactive menu ──────────────────────────────────────────────
interface PostStartInfo {
  mode: 'single' | 'multi'
  gatewayUrl: string
  dashboardUrl: string
  instances?: Array<{ name: string; port: number; dashboardPort: number }>
}

async function showPostStartMenu(info: PostStartInfo): Promise<void> {
  const out = process.stdout
  const W = 58

  function boxLine(content: string, pad = ' '): string {
    const visible = content.replace(/\x1b\[[^m]*m/g, '')
    const padLen = W - 2 - visible.length
    return `${C.dgray}║${C.reset}${content}${pad.repeat(Math.max(0, padLen))}${C.dgray}║${C.reset}`
  }
  function divider(): string {
    return `${C.dgray}╠${'═'.repeat(W - 2)}╣${C.reset}`
  }
  function top(): string { return `${C.dgray}╔${'═'.repeat(W - 2)}╗${C.reset}` }
  function bottom(): string { return `${C.dgray}╚${'═'.repeat(W - 2)}╝${C.reset}` }

  out.write('\n')
  out.write(top() + '\n')
  out.write(boxLine(` ${C.green}${C.bold}✅ OpenRat está rodando!${C.reset}`) + '\n')
  out.write(divider() + '\n')
  out.write(boxLine(` ${C.gray}Gateway:${C.reset}  ${C.cyan}${info.gatewayUrl}${C.reset}`) + '\n')
  out.write(boxLine(` ${C.gray}Dashboard:${C.reset} ${C.cyan}${info.dashboardUrl}${C.reset}`) + '\n')

  if (info.instances && info.instances.length > 0) {
    out.write(divider() + '\n')
    out.write(boxLine(` ${C.purple}${C.bold}Instâncias ativas:${C.reset}`) + '\n')
    for (const inst of info.instances) {
      out.write(boxLine(`  ${C.green}●${C.reset} ${C.bold}${inst.name.padEnd(12)}${C.reset}  :${inst.port}  dash:${inst.dashboardPort}`) + '\n')
    }
  }

  out.write(divider() + '\n')
  out.write(boxLine(` ${C.bold}1${C.reset}  ${C.blue}Voltar à interface do OpenRat${C.reset}`) + '\n')
  out.write(boxLine(` ${C.bold}2${C.reset}  ${C.amber}Background (minimizar para bandeja)${C.reset}`) + '\n')
  out.write(boxLine(` ${C.bold}3${C.reset}  ${C.gray}Manter terminal aberto${C.reset}`) + '\n')
  out.write(bottom() + '\n')
  out.write(`\n ${C.gray}Escolha [1/2/3]: ${C.reset}`)

  const choice = await readSingleKey(['1', '2', '3'])

  if (choice === '1') {
    out.write(`\n ${C.blue}↩ Retornando à interface do OpenRat...${C.reset}\n\n`)
    const result = await showStartupMenu()
    if (result.action === 'terminal' && result.terminalCmd) {
      out.write(`\n${C.blue}▶${C.reset} Executando: ${C.cyan}openrat ${result.terminalCmd}${C.reset}\n\n`)
      await runCommand(result.terminalCmd, new Map())
    }
    return
  }

  if (choice === '2') {
    out.write(`\n ${C.amber}📎 Modo background...${C.reset}\n`)
    await goBackground({
      pidFile: getDefaultPidFile(),
      infoFile: getDefaultInfoFile(),
      dashboardUrl: info.dashboardUrl,
      gatewayUrl: info.gatewayUrl,
    })
    // Detach from terminal — process continues running
    return
  }

  // choice === '3' — keep terminal open
  out.write(`\n ${C.gray}Terminal aberto. Pressione Ctrl+C para parar.${C.reset}\n`)
}

function readSingleKey(validKeys: string[]): Promise<string> {
  return new Promise((resolve) => {
    const { stdin, stdout } = process
    if (!stdin.isTTY) {
      // Non-interactive: default to option 3 (keep terminal)
      resolve('3')
      return
    }
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')
    stdin.once('data', (key: string) => {
      stdin.setRawMode(false)
      stdin.pause()
      if (key === '\x03') {
        // Ctrl+C
        process.stdout.write('\n')
        process.exit(0)
      }
      if (validKeys.includes(key)) {
        resolve(key)
        return
      }
      // Invalid key, try again
      resolve(readSingleKey(validKeys))
    })
  })
}

// ─── Dispatcher unificado ─────────────────────────────────────────────────────

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
    case 'init': await cmdInit(configPath); return
    case 'gateway': await cmdGateway(configPath); return
    case 'check': await cmdCheck(configPath); return
    case 'status': await cmdStatus(configPath); return
    case 'detect': await cmdDetect(); return
    case 'install': await cmdInstall(configPath, flags); return
    default:
      throw new Error(`Comando desconhecido: ${command}`)
  }
}


// ─── Auto-setup: ensure ~/.openrat has configs and manager.html ──────────────
const OPENRAT_HOME = path.join(os.homedir(), '.openrat')

async function ensureOpenRatHome(): Promise<void> {
  await fs.promises.mkdir(OPENRAT_HOME, { recursive: true })

  // 1. Ensure openrat.config.json exists in ~/.openrat/
  const configPath = getDefaultConfigPath()
  try {
    await fs.promises.access(configPath)
  } catch {
    await writeJsonFile(configPath, buildExampleConfig())
    process.stdout.write(`${C.green}✅ Config criado em ${configPath}${C.reset}\n`)
  }

  // 2. Ensure openrat.multi.json exists in ~/.openrat/
  const multiConfigPath = getDefaultMultiConfigPath()
  try {
    await fs.promises.access(multiConfigPath)
  } catch {
    await writeJsonFile(multiConfigPath, buildExampleMultiConfig())
    process.stdout.write(`${C.green}✅ Multi-config criado em ${multiConfigPath}${C.reset}\n`)
  }

  // 3. Ensure manager.html is in ~/.openrat/
  const managerDest = path.join(OPENRAT_HOME, 'manager.html')
  try {
    await fs.promises.access(managerDest)
  } catch {
    // Try to find bundled manager.html
    const candidates = [
      path.join(fileURLToPath(import.meta.url), '..', '..', 'openrat-manager.html'),
      path.join(process.cwd(), 'openrat-manager.html'),
    ]
    for (const src of candidates) {
      try {
        if (fs.existsSync(src)) {
          await fs.promises.copyFile(src, managerDest)
          process.stdout.write(`${C.green}✅ Manager HTML copiado para ${managerDest}${C.reset}\n`)
          return
        }
      } catch {}
    }
    process.stderr.write(`${C.amber}⚠ openrat-manager.html não encontrado para copiar.${C.reset}\n`)
  }
}


// ─── Main ─────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  // ── Daemon mode: re-spawned child with --daemon flag ───────────────────────
  // When the user chooses "background", the parent process re-spawns itself
  // with --daemon and exits. The child reaches here, sets up the daemon
  // (pid file, tray icon, signal handlers), then starts the servers normally
  // WITHOUT showing the interactive menu.
  // ── Ensure ~/.openrat is set up before anything else ──────────────────────
if (!process.argv.includes('--daemon')) {
  await ensureOpenRatHome()
}

if (process.argv.includes('--daemon')) {
    const pidFile = process.env.OPENRAT_BG_PID_FILE ?? getDefaultPidFile()
    const infoFile = process.env.OPENRAT_BG_INFO_FILE ?? getDefaultInfoFile()
    const dashboardUrl = process.env.OPENRAT_BG_DASHBOARD_URL ?? ''
    const gatewayUrl = process.env.OPENRAT_BG_GATEWAY_URL ?? ''

    await goBackground({
      pidFile,
      infoFile,
      dashboardUrl,
      gatewayUrl,
    })

    // Figure out which command to run from the original argv (skip --daemon)
    const cleanArgv = process.argv.slice(2).filter(a => a !== '--daemon')
    const { command, flags } = parseArgs(cleanArgv)

    if (command === 'multi') {
      const multiConfigPath = typeof flags.get('config') === 'string'
        ? String(flags.get('config'))
        : getDefaultMultiConfigPath()
      const sub = cleanArgv[1]
    if (sub === 'start') {
      const centralPort = typeof flags.get('central-dashboard-port') === 'string'
        ? Number(flags.get('central-dashboard-port'))
        : 4400
      await cmdMultiStartDaemon(multiConfigPath, centralPort)
      return
    }
    // multi init or other subcommands don't make sense in daemon mode
    process.stderr.write(`${C.red}Subcomando "${sub}" não suportado em modo daemon.${C.reset}
`)
    process.exit(1)
  }

    // Default: run gateway (single mode)
    const configPath = typeof flags.get('config') === 'string'
      ? String(flags.get('config'))
      : getDefaultConfigPath()
    await cmdGatewayDaemon(configPath)
    return
  }

  // ── Normal (interactive) mode ──────────────────────────────────────────────
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
    if (result.action === 'manager') return // launchManager fica em loop

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
