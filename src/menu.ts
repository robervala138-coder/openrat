import { execSync, spawn } from 'node:child_process'
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Read JSON body from an HTTP request */
function readJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw.trim()) { resolve({}); return }
      try { resolve(JSON.parse(raw) as Record<string, unknown>) } catch (e) { reject(e) }
    })
    req.on('error', reject)
  })
}

// ─── ANSI helpers ─────────────────────────────────────────────────────────────
const A = {
  reset:    '\x1b[0m',
  bold:     '\x1b[1m',
  dim:      '\x1b[2m',
  clear:    '\x1b[2J\x1b[H',
  hide:     '\x1b[?25l',
  show:     '\x1b[?25h',
  up:       (n: number) => `\x1b[${n}A`,
  col:      (n: number) => `\x1b[${n}G`,
  blue:     '\x1b[38;5;69m',
  purple:   '\x1b[38;5;135m',
  cyan:     '\x1b[38;5;87m',
  green:    '\x1b[38;5;84m',
  amber:    '\x1b[38;5;214m',
  red:      '\x1b[38;5;196m',
  white:    '\x1b[38;5;255m',
  gray:     '\x1b[38;5;245m',
  dgray:    '\x1b[38;5;238m',
  bgSel:    '\x1b[48;5;18m',
  bgDark:   '\x1b[48;5;234m',
}

const W = 58  // box width

function line(content = '', padChar = ' '): string {
  const visible = content.replace(/\x1b\[[^m]*m/g, '')
  const pad = W - 2 - visible.length
  return `${A.dgray}║${A.reset}${content}${padChar.repeat(Math.max(0, pad))}${A.dgray}║${A.reset}`
}

function divider(left = '╠', right = '╣', mid = '═'): string {
  return `${A.dgray}${left}${mid.repeat(W - 2)}${right}${A.reset}`
}

function top():    string { return divider('╔', '╗') }
function bottom(): string { return divider('╚', '╝') }
function mid():    string { return divider() }
function blank():  string { return line() }

// ─── Logo banner ──────────────────────────────────────────────────────────────
function renderBanner(): string {
  const clr  = `${A.blue}${A.bold}`
  const rat  = `${A.purple}${A.bold}`
  const vers = `${A.gray}`
  const rst  = A.reset

  const rows = [
    top(),
    line(`  ${clr}  ██████╗ ██████╗ ███████╗███╗  ██╗${rst}`),
    line(`  ${clr} ██╔═══██╗██╔══██╗██╔════╝████╗ ██║${rst}`),
    line(`  ${clr} ██║   ██║██████╔╝█████╗  ██╔██╗██║${rst}`),
    line(`  ${clr} ██║   ██║██╔═══╝ ██╔══╝  ██║╚████║${rst}`),
    line(`  ${clr} ╚██████╔╝██║     ███████╗██║ ╚███║${rst}`),
    line(`  ${clr}  ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚══╝${rst}`),
    line(`  ${rat}  ██████╗  █████╗ ████████╗${rst}`),
    line(`  ${rat}  ██╔══██╗██╔══██╗╚══██╔══╝${rst}`),
    line(`  ${rat}  ██████╔╝███████║   ██║   ${rst}`),
    line(`  ${rat}  ██╔══██╗██╔══██║   ██║   ${rst}`),
    line(`  ${rat}  ██║  ██║██║  ██║   ██║   ${rst}`),
    line(`  ${rat}  ╚═╝  ╚═╝╚═╝  ╚═╝  ╚═╝   ${rst}`),
    line(`  ${A.gray}  Gateway local OpenAI-compatible     ${vers}v2.0${rst}`),
    mid(),
  ]
  return rows.join('\n')
}

// ─── Arrow-key menu ───────────────────────────────────────────────────────────
interface MenuItem {
  label:    string
  sublabel: string
  icon:     string
  color:    string
}

const MENU_ITEMS: MenuItem[] = [
  {
    icon:     '◈',
    label:    'Manager Visual (Browser)',
    sublabel: 'Abre o manager gráfico no browser',
    color:    A.blue,
  },
  {
    icon:     '▸',
    label:    'Usar Terminal',
    sublabel: 'Comandos CLI (multi start, check...)',
    color:    A.purple,
  },
]

function renderMenu(selected: number): string {
  const rows: string[] = []

  MENU_ITEMS.forEach((item, i) => {
    const isSelected = i === selected
    const prefix = isSelected ? `${item.color}${A.bold}  ${item.icon} ` : `${A.gray}    `
    const labelColor = isSelected ? `${item.color}${A.bold}` : A.gray
    const subColor   = isSelected ? A.white : A.dgray
    const bg         = isSelected ? A.bgDark : ''
    const rst        = A.reset

    rows.push(line(`${bg}${prefix}${labelColor}${item.label}${rst}${bg}${subColor}  ${item.sublabel}${rst}`))
    rows.push(blank())
  })

  rows.push(line(`  ${A.dgray}↑ ↓ navegar   Enter selecionar   q sair${A.reset}`))
  return rows.join('\n')
}

async function arrowMenu(): Promise<number | null> {
  let selected = 0
  const { stdin, stdout } = process

  if (!stdin.isTTY) {
    // Non-interactive: default to terminal mode
    return 1
  }

  stdin.setRawMode(true)
  stdin.resume()
  stdin.setEncoding('utf8')

  stdout.write(A.hide)

  const redraw = (firstRender = false) => {
    if (!firstRender) {
      // Count lines to overwrite
      const menuLines = MENU_ITEMS.length * 2 + 1
      stdout.write(A.up(menuLines) + A.col(1))
    }
    stdout.write(renderMenu(selected) + '\n')
  }

  redraw(true)

  return new Promise((resolve) => {
    stdin.on('data', function handler(key: string) {
      if (key === '\x1b[A' || key === 'k') {            // up / k
        selected = (selected - 1 + MENU_ITEMS.length) % MENU_ITEMS.length
        redraw()
      } else if (key === '\x1b[B' || key === 'j') {    // down / j
        selected = (selected + 1) % MENU_ITEMS.length
        redraw()
      } else if (key === '\r' || key === '\n') {        // enter
        stdin.removeListener('data', handler)
        stdin.setRawMode(false)
        stdin.pause()
        stdout.write(A.show)
        resolve(selected)
      } else if (key === 'q' || key === '\x03') {       // q or Ctrl+C
        stdin.removeListener('data', handler)
        stdin.setRawMode(false)
        stdin.pause()
        stdout.write(A.show)
        resolve(null)
      }
    })
  })
}

// ─── Terminal sub-menu ────────────────────────────────────────────────────────
const TERMINAL_CMDS = [
  { cmd: 'multi start',  desc: 'Subir todas as instâncias',        icon: '▶' },
  { cmd: 'multi init',   desc: 'Criar openrat.multi.json',         icon: '⊕' },
  { cmd: 'gateway',      desc: 'Subir instância única',            icon: '⚡' },
  { cmd: 'check',        desc: 'Validar chaves de API',            icon: '✓' },
  { cmd: 'status',       desc: 'Status dos providers',             icon: '◉' },
  { cmd: 'install',      desc: 'Instalar em ferramenta',           icon: '⊙' },
  { cmd: 'detect',       desc: 'Detectar ferramentas instaladas',  icon: '⊛' },
]

function renderTerminalMenu(selected: number): string {
  const rows: string[] = []
  rows.push(line(`  ${A.purple}${A.bold}Comandos disponíveis${A.reset}`))
  rows.push(blank())

  TERMINAL_CMDS.forEach((item, i) => {
    const isSel = i === selected
    const ic    = isSel ? `${A.amber}${A.bold}  ${item.icon} ` : `${A.dgray}    `
    const lbl   = isSel ? `${A.white}${A.bold}openrat ${item.cmd}` : `${A.gray}openrat ${item.cmd}`
    const desc  = isSel ? `  ${A.gray}${item.desc}` : `  ${A.dgray}${item.desc}`
    const bg    = isSel ? A.bgDark : ''
    const rst   = A.reset
    rows.push(line(`${bg}${ic}${lbl}${rst}${bg}${desc}${rst}`))
  })

  rows.push(blank())
  rows.push(line(`  ${A.dgray}↑ ↓ navegar   Enter executar   b voltar${A.reset}`))
  return rows.join('\n')
}

async function terminalSubMenu(): Promise<string | null> {
  let selected = 0
  const { stdin, stdout } = process

  if (!stdin.isTTY) return TERMINAL_CMDS[0].cmd

  stdin.setRawMode(true)
  stdin.resume()
  stdin.setEncoding('utf8')
  stdout.write(A.hide)

  const totalLines = TERMINAL_CMDS.length + 4

  const redraw = (first = false) => {
    if (!first) stdout.write(A.up(totalLines) + A.col(1))
    stdout.write(renderTerminalMenu(selected) + '\n')
  }
  redraw(true)

  return new Promise((resolve) => {
    stdin.on('data', function handler(key: string) {
      if (key === '\x1b[A' || key === 'k') {
        selected = (selected - 1 + TERMINAL_CMDS.length) % TERMINAL_CMDS.length
        redraw()
      } else if (key === '\x1b[B' || key === 'j') {
        selected = (selected + 1) % TERMINAL_CMDS.length
        redraw()
      } else if (key === '\r' || key === '\n') {
        stdin.removeListener('data', handler)
        stdin.setRawMode(false)
        stdin.pause()
        stdout.write(A.show)
        resolve(TERMINAL_CMDS[selected].cmd)
      } else if (key === 'b' || key === '\x1b') {
        stdin.removeListener('data', handler)
        stdin.setRawMode(false)
        stdin.pause()
        stdout.write(A.show)
        resolve(null)
      } else if (key === 'q' || key === '\x03') {
        stdin.removeListener('data', handler)
        stdin.setRawMode(false)
        stdin.pause()
          stdout.write(A.show + '\n')
          resolve(null)
      }
    })
  })
}

// ─── Manager HTTP server ───────────────────────────────────────────────────────
function findManagerHtml(): string | null {
  const candidates = [
    // 1. ~/.openrat/manager.html — primary location (works from any directory)
    path.join(os.homedir(), '.openrat', 'manager.html'),
    // 2. bundled alongside the dist folder
    path.join(fileURLToPath(import.meta.url), '..', '..', 'openrat-manager.html'),
    // 3. CWD fallback
    path.join(process.cwd(), 'openrat-manager.html'),
  ]
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p
    } catch {}
  }
  return null
}

function openBrowser(url: string): void {
  const cmds: Record<string, string> = {
    linux:  `xdg-open "${url}"`,
    darwin: `open "${url}"`,
    win32:  `start "" "${url}"`,
  }
  const cmd = cmds[process.platform] ?? cmds['linux']
  try { execSync(cmd, { stdio: 'ignore' }) } catch {}
}

let managerServer: http.Server | null = null

async function serveManager(port = 4399): Promise<void> {
  const htmlPath = findManagerHtml()

  const managerStateFile = path.join(os.homedir(), '.openrat', 'manager-state.json')
 const managerVaultFile = path.join(os.homedir(), '.openrat', 'manager-vault.json')

 managerServer = http.createServer(async (req, res) => {
    // ── CORS for local manager — allow any localhost origin ──────────
    const origin = req.headers.origin
    if (origin) {
      try {
        const originUrl = new URL(origin)
        if (originUrl.hostname === '127.0.0.1' || originUrl.hostname === 'localhost') {
          res.setHeader('Access-Control-Allow-Origin', origin)
        }
      } catch {}
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

    // ── serve static manager HTML ──────────────────────────────────
    if (req.url === '/' || req.url === '/index.html') {
      const html = htmlPath
        ? fs.readFileSync(htmlPath, 'utf8')
        : FALLBACK_HTML

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(html)
      return
    }

    // ── Start gateway in background ────────────────────────────────
    if (req.url === '/openrat/start' && req.method === 'POST') {
      try {
        const body = await readJsonBody(req)
        const configPath = path.join(os.homedir(), '.openrat', 'openrat.multi.json')
        // Write the multi-config from the manager UI
        const { writeJsonFile } = await import('./fs.js')
        await writeJsonFile(configPath, body)

        // Find the openrat binary — prefer global install, fallback to local dist
        const localEntry = path.join(path.dirname(fileURLToPath(import.meta.url)), 'index.js')
        const openratBin = fs.existsSync(localEntry) ? localEntry : 'openrat'

        // Calculate URLs so the daemon can write them to the info file for the tray
        const basePort = (body as Record<string, unknown>).basePort as number ?? 4419
        const firstInstancePort = basePort
        const centralDashboardPort = 4400 // Multi-dashboard central port
        const pidFile = path.join(os.homedir(), '.openrat', 'openrat.pid')
        const infoFile = pidFile + '.info'

        // Spawn openrat with --daemon so it creates PID file + tray icon
        const child = spawn(openratBin, [
          'multi', 'start', '--config', configPath, '--daemon',
        ], {
          detached: true,
          stdio: 'ignore',
          env: {
            ...process.env,
            OPENRAT_BG_PID_FILE: pidFile,
            OPENRAT_BG_INFO_FILE: infoFile,
            OPENRAT_BG_DASHBOARD_URL: `http://127.0.0.1:${centralDashboardPort}`,
            OPENRAT_BG_GATEWAY_URL: `http://127.0.0.1:${firstInstancePort}`,
          },
        })
        child.unref()

        // Wait a short moment for the daemon to write its PID file
        await new Promise(r => setTimeout(r, 500))

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, pid: child.pid, configPath }))
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: msg }))
      }
      return
    }

    // ── Stop running gateway ───────────────────────────────────────
    if (req.url === '/openrat/stop' && req.method === 'POST') {
      let stopped = false
      // 1. Try PID file
      try {
        const pidFile = path.join(os.homedir(), '.openrat', 'openrat.pid')
        const pidRaw = fs.readFileSync(pidFile, 'utf8').trim()
        const pid = Number(pidRaw)
        if (pid && !isNaN(pid)) {
          try { process.kill(pid, 'SIGTERM'); stopped = true } catch {}
        }
      } catch {}
      // 2. Try stop script
      const stopScript = path.join(os.homedir(), '.openrat', 'stop.sh')
      if (fs.existsSync(stopScript)) {
        try { execSync(`bash "${stopScript}"`, { stdio: 'ignore' }); stopped = true } catch {}
      }
      // 3. Try to find openrat processes by port and kill them
      try {
        const portsToCheck = [4400] // central dashboard
        for (let p = 4419; p < 4419 + 30; p++) {
          portsToCheck.push(p) // both gateway and dashboard ports
        }
        for (const p of portsToCheck) {
          try {
            const out = execSync(`lsof -ti :${p} 2>/dev/null || true`, { encoding: 'utf8' }).trim()
            if (out) {
              for (const pidStr of out.split('\n')) {
                const p2 = Number(pidStr.trim())
                if (p2 && !isNaN(p2)) {
                  try { process.kill(p2, 'SIGTERM'); stopped = true } catch {}
                }
              }
            }
          } catch {}
        }
      } catch {}
      // 4. Nuclear: pkill openrat
      if (!stopped) {
        try { execSync('pkill -f "openrat.*multi.*start" 2>/dev/null || true', { stdio: 'ignore' }); stopped = true } catch {}
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, stopped }))
      return
    }

    // ── Check if gateway is running ────────────────────────────────
    if (req.url === '/openrat/status' && req.method === 'GET') {
      const pidFile = path.join(os.homedir(), '.openrat', 'openrat.pid')
      let running = false
      try {
        const pidRaw = fs.readFileSync(pidFile, 'utf8').trim()
        const pid = Number(pidRaw)
        if (pid && !isNaN(pid)) {
          try { process.kill(pid, 0); running = true } catch {}
        }
      } catch {}
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ running }))
      return
    }

  // ── Persistent state files ──

  if (req.url === '/openrat/state' && req.method === 'GET') {
  try {
  const data = fs.readFileSync(managerStateFile, 'utf8')
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(data)
  } catch {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end('null')
  }
  return
  }
  if (req.url === '/openrat/state' && req.method === 'POST') {
  try {
  const body = await readJsonBody(req)
  fs.writeFileSync(managerStateFile, JSON.stringify(body), 'utf8')
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ ok: true }))
  } catch (err) {
  const msg = err instanceof Error ? err.message : String(err)
  res.writeHead(500, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ ok: false, error: msg }))
  }
  return
  }

  if (req.url === '/openrat/vault' && req.method === 'GET') {
  try {
  const data = fs.readFileSync(managerVaultFile, 'utf8')
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(data)
  } catch {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end('[]')
  }
  return
  }
  if (req.url === '/openrat/vault' && req.method === 'POST') {
  try {
  const body = await readJsonBody(req)
  fs.writeFileSync(managerVaultFile, JSON.stringify(body), 'utf8')
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ ok: true }))
  } catch (err) {
  const msg = err instanceof Error ? err.message : String(err)
  res.writeHead(500, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ ok: false, error: msg }))
  }
  return
  }

  res.writeHead(404)
  res.end('Not found')
  })

  await new Promise<void>((resolve) => managerServer!.listen(port, '127.0.0.1', resolve))

  const url = `http://127.0.0.1:${port}`
  const out = process.stdout

  out.write('\n')
  out.write(top() + '\n')
  out.write(line(`  ${A.blue}${A.bold}OpenRat Manager${A.reset}  ${A.gray}rodando em:${A.reset}`) + '\n')
  out.write(line(`  ${A.cyan}${A.bold}${url}${A.reset}`) + '\n')
  out.write(blank() + '\n')

  if (htmlPath) {
    out.write(line(`  ${A.green}✓${A.reset} ${A.gray}Carregando: ${path.basename(htmlPath)}${A.reset}`) + '\n')
  } else {
    out.write(line(`  ${A.amber}⚠${A.reset} ${A.gray}openrat-manager.html não encontrado${A.reset}`) + '\n')
    out.write(line(`  ${A.dgray}  Coloque o arquivo em: ~/.openrat/manager.html${A.reset}`) + '\n')
  }

  out.write(blank() + '\n')
  out.write(line(`  ${A.dgray}Abrindo browser automaticamente...${A.reset}`) + '\n')
  out.write(line(`  ${A.dgray}Pressione Ctrl+C para parar.${A.reset}`) + '\n')
  out.write(bottom() + '\n\n')

  openBrowser(url)

  // Keep alive
  await new Promise(() => {})
}

// ─── Minimal fallback HTML ────────────────────────────────────────────────────
const FALLBACK_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OpenRat Manager</title>
<style>
  body { background:#0d0f14; color:#e8eaf2; font-family:'Segoe UI',sans-serif;
         display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; }
  .box { text-align:center; }
  h1 { font-size:2rem; color:#5b8dee; }
  p { color:#8b91a8; margin:8px 0; }
  code { background:#1e2436; padding:4px 10px; border-radius:6px; color:#3ecf8e; font-size:0.9rem; }
</style>
</head>
<body>
<div class="box">
  <h1>🐀 OpenRat Manager</h1>
  <p>Arquivo <code>openrat-manager.html</code> não encontrado.</p>
  <p>Coloque-o em: <code>~/.openrat/manager.html</code></p>
</div>
</body>
</html>`

// ─── Main exported function ────────────────────────────────────────────────────
export async function showStartupMenu(): Promise<{ action: 'manager' | 'terminal'; terminalCmd?: string }> {
  const out = process.stdout

  out.write(A.clear)
  out.write(renderBanner() + '\n')

  const choice = await arrowMenu()

  if (choice === null) {
  out.write(A.show + '\n')
  return { action: 'manager' }
  }

  if (choice === 0) {
    // Menu Interativo
    out.write('\n')
    await serveManager()
    return { action: 'manager' }
  }

  // Terminal mode — show sub-menu
  out.write('\n')
  out.write(mid() + '\n')
  const cmd = await terminalSubMenu()
  out.write(bottom() + '\n\n')

  if (cmd === null) {
    // Back to main menu
    return showStartupMenu()
  }

  return { action: 'terminal', terminalCmd: cmd }
}

// ─── Direct manager launch (for `openrat manager` command) ────────────────────
export async function launchManager(port = 4399): Promise<void> {
  const out = process.stdout
  out.write('\n')
  out.write(renderBanner() + '\n')
  await serveManager(port)
}
