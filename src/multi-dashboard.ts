import http from 'node:http'
import os from 'node:os'
import { execFileSync, spawn } from 'node:child_process'
import type { InstanceStatus } from './types.js'

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

function doubleQuoteForDisplay(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function commandExists(command: string): boolean {
  try {
    execFileSync('sh', ['-lc', `command -v ${shellQuote(command)}`], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function terminalCommand(): { command: string; argsPrefix: string[] } | null {
  const candidates = [
    { command: 'x-terminal-emulator', argsPrefix: ['-e'] },
    { command: 'gnome-terminal', argsPrefix: ['--'] },
    { command: 'konsole', argsPrefix: ['-e'] },
    { command: 'xfce4-terminal', argsPrefix: ['-e'] },
    { command: 'mate-terminal', argsPrefix: ['-e'] },
    { command: 'tilix', argsPrefix: ['-e'] },
    { command: 'alacritty', argsPrefix: ['-e'] },
    { command: 'kitty', argsPrefix: ['-e'] },
    { command: 'xterm', argsPrefix: ['-e'] },
  ]
  return candidates.find((candidate) => commandExists(candidate.command)) ?? null
}

function openConfiguredTerminal(instance: InstanceStatus): void {
  const terminal = terminalCommand()
  if (!terminal) throw new Error('Nenhum emulador de terminal encontrado.')

  const apiKey = instance.masterKey ?? 'openrat-local'
  const baseUrl = `http://127.0.0.1:${instance.port}/v1`
  const model = instance.defaultModel ?? ''
  const shell = process.env.SHELL || '/bin/bash'
  const exports = [
    ['OPENAI_API_KEY', apiKey],
    ['OPENAI_BASE_URL', baseUrl],
    ['OPENAI_MODEL', model],
  ] as const
  const displayLines = exports.map(([key, value]) => `export ${key}="${doubleQuoteForDisplay(value)}"`)
  const exportLines = exports.map(([key, value]) => `export ${key}=${shellQuote(value)}`)
  const script = [
    ...exportLines,
    'clear',
    ...displayLines.map((line) => `printf '%s\\n' ${shellQuote(line)}`),
    `printf '\\nAmbiente pronto. Digite a CLI que deseja usar.\\n\\n'`,
    `exec ${shellQuote(shell)} -i`,
  ].join('\n')

  const child = spawn(terminal.command, [...terminal.argsPrefix, 'bash', '-lc', script], {
    cwd: os.homedir(),
    detached: true,
    stdio: 'ignore',
  })
  child.unref()
}

function buildMultiDashboardHtml(instances: InstanceStatus[]): string {
  const instancesJson = JSON.stringify(instances)
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OpenRat Multi — Dashboard Central</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Syne:wght@400;500;600;700;800&display=swap');

:root {
  --bg: #0d0f14;
  --bg2: #131620;
  --bg3: #181c28;
  --surface: #1e2436;
  --surface2: #252c3e;
  --border: rgba(255,255,255,0.06);
  --border2: rgba(255,255,255,0.12);
  --accent: #5b8dee;
  --accent2: #3b6fd6;
  --accent-glow: rgba(91,141,238,0.15);
  --green: #3ecf8e;
  --green-dim: rgba(62,207,142,0.12);
  --amber: #f0a545;
  --amber-dim: rgba(240,165,69,0.12);
  --red: #e05252;
  --red-dim: rgba(224,82,82,0.12);
  --text: #e8eaf2;
  --text2: #8b91a8;
  --text3: #555d78;
  --mono: 'JetBrains Mono', monospace;
  --sans: 'Syne', sans-serif;
  --r: 10px;
  --r2: 6px;
}

* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: var(--bg); color: var(--text); font-family: var(--sans); min-height: 100vh; }

/* ── TOPBAR ── */
.topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 24px;
  height: 56px;
  background: var(--bg2);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
}
.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text);
}
.logo-icon {
  width: 28px; height: 28px;
  background: linear-gradient(135deg, var(--accent), #7c3aed);
  border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px;
}
.multi-badge {
  background: linear-gradient(135deg, var(--accent), #7c3aed);
  color: white;
  border-radius: 20px;
  padding: 3px 12px;
  font-size: 11px;
  font-weight: 700;
  font-family: var(--mono);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.topbar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}
.live-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--green);
  box-shadow: 0 0 6px var(--green);
  animation: pulse 2s infinite;
}
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
.live-text {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--text2);
}

/* ── MAIN ── */
.main-wrap {
  max-width: 1200px;
  margin: 0 auto;
  padding: 28px 24px 48px;
}

/* ── STAT CARDS ── */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 28px;
}
.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 18px 20px;
  transition: border-color 0.15s;
}
.stat-card:hover { border-color: var(--border2); }
.stat-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text3);
  margin-bottom: 8px;
}
.stat-value {
  font-size: 24px;
  font-weight: 700;
  font-family: var(--mono);
  letter-spacing: -0.03em;
  color: var(--text);
}
.stat-value.green { color: var(--green); }
.stat-value.amber { color: var(--amber); }
.stat-value.accent { color: var(--accent); }
.stat-sub {
  font-size: 11px;
  color: var(--text3);
  margin-top: 4px;
  font-family: var(--mono);
}

/* ── SECTION TITLE ── */
.section-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text3);
  margin-bottom: 16px;
}

/* ── INSTANCE GRID ── */
.instances-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
  margin-bottom: 36px;
}

.instance-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  overflow: hidden;
  transition: border-color 0.15s, transform 0.15s;
}
.instance-card:hover { border-color: var(--border2); transform: translateY(-1px); }
.instance-card.error { border-color: var(--red-dim); }

.inst-header {
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
  background: var(--bg3);
}
.inst-name {
  font-size: 15px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}
.inst-status-dot {
  width: 9px; height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-running { background: var(--green); box-shadow: 0 0 6px var(--green); animation: pulse 2s infinite; }
.dot-error { background: var(--red); }
.inst-port {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--accent);
}

.inst-body { padding: 16px 20px; }
.inst-links { display: flex; gap: 8px; margin-bottom: 14px; }
.inst-link {
  flex: 1;
  text-align: center;
  padding: 7px 10px;
  border-radius: var(--r2);
  font-size: 11px;
  font-family: var(--mono);
  font-weight: 500;
  text-decoration: none;
  border: 1px solid var(--border);
  color: var(--text2);
  transition: all 0.15s;
  background: var(--bg);
  appearance: none;
  line-height: normal;
}
.inst-link:hover { border-color: var(--accent); color: var(--accent); }
.inst-link.primary { border-color: var(--accent); color: var(--accent); background: var(--accent-glow); }
.inst-link.primary:hover { background: rgba(91,141,238,0.25); }
.inst-link.terminal { cursor: pointer; }
.inst-link.terminal.opening { color: var(--amber); border-color: var(--amber); background: var(--amber-dim); }
.inst-link.terminal.error { color: var(--red); border-color: var(--red); background: var(--red-dim); }

.inst-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.inst-stat {
  background: var(--bg);
  border-radius: var(--r2);
  padding: 12px;
  border: 1px solid var(--border);
}
.inst-stat-label {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text3);
  margin-bottom: 4px;
  font-family: var(--mono);
}
.inst-stat-val {
  font-size: 18px;
  font-weight: 700;
  font-family: var(--mono);
}

.inst-providers { margin-top: 12px; }
.inst-provider-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 0;
  border-bottom: 1px solid var(--border);
  font-size: 11px;
  font-family: var(--mono);
}
.inst-provider-row:last-child { border-bottom: none; }
.inst-provider-name { color: var(--text3); }
.inst-provider-reqs { color: var(--accent); }
.inst-provider-usd { color: var(--green); }

.inst-error-msg {
  padding: 12px 20px;
  color: var(--red);
  font-family: var(--mono);
  font-size: 12px;
}

/* ── KEYS SECTION ── */
.keys-section { margin-top: 36px; }
.keys-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}
.key-row {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r2);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--mono);
  font-size: 12px;
}
.key-row-left { display: flex; flex-direction: column; gap: 2px; }
.key-inst { color: var(--accent); font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; }
.key-preview { color: var(--text); }
.key-status { display: flex; align-items: center; gap: 5px; }
.ks-dot { width: 7px; height: 7px; border-radius: 50%; }
.ks-active { background: var(--green); }
.ks-cooldown { background: var(--amber); }
.ks-spend { background: var(--red); }
.ks-off { background: var(--text3); }
.key-reqs { color: var(--text3); font-size: 11px; }

.empty { color: var(--text3); font-family: var(--mono); font-size: 13px; padding: 16px 0; }

footer {
  text-align: center;
  margin-top: 48px;
  font-size: 12px;
  color: var(--text3);
  font-family: var(--mono);
  border-top: 1px solid var(--border);
  padding-top: 20px;
}

.skeleton {
  background: linear-gradient(90deg, var(--surface) 25%, var(--surface2) 50%, var(--surface) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--r2);
  height: 200px;
}
@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

@media (max-width: 800px) {
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
  .instances-grid { grid-template-columns: 1fr; }
}
</style>
</head>
<body>

<div class="topbar">
  <div class="logo">
    <div class="logo-icon">🐀</div>
    <div>OpenRat <span class="multi-badge">MULTI</span></div>
  </div>
  <div class="topbar-right">
    <div class="live-dot"></div>
    <span class="live-text" id="ts">carregando...</span>
  </div>
</div>

<div class="main-wrap">
  <div class="stat-grid" id="global-cards">
    <div class="skeleton" style="height:80px"></div>
    <div class="skeleton" style="height:80px"></div>
    <div class="skeleton" style="height:80px"></div>
    <div class="skeleton" style="height:80px"></div>
  </div>

  <p class="section-title">Instâncias</p>
  <div class="instances-grid" id="instances-grid">
    <div class="skeleton"></div>
    <div class="skeleton"></div>
  </div>

  <div class="keys-section">
    <p class="section-title">Chaves — visão global</p>
    <div class="keys-grid" id="keys-grid"></div>
  </div>

  <footer>OpenRat Multi v2.0 — Feito no Brasil 🇧🇷</footer>
</div>

<script>
const INSTANCES = ${instancesJson}

function fmtInt(n) { return n != null ? n.toLocaleString('pt-BR') : '0' }
function fmtUsd(n) { return n ? '$' + n.toFixed(4) : '$0.00' }
function timeAgo(ts) {
  if (!ts) return 'nunca'
  const d = Math.floor((Date.now() - ts) / 1000)
  if (d < 60) return d + 's'
  if (d < 3600) return Math.floor(d/60) + 'm'
  return Math.floor(d/3600) + 'h'
}

const statsCache = new Map()

async function fetchInstanceStats(inst) {
  if (inst.status !== 'running') return null
  try {
    const url = 'http://127.0.0.1:' + inst.port + '/openrat/stats'
    const res = await fetch(url, { headers: { Authorization: 'Bearer ' + (inst.masterKey || 'openrat-local') }, signal: AbortSignal.timeout(3000) })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

async function openTerminal(instanceName, button) {
  const previousText = button.textContent
  button.classList.remove('error')
  button.classList.add('opening')
  button.textContent = '⏳ Abrindo'
  try {
    const res = await fetch('/open-terminal?name=' + encodeURIComponent(instanceName), { method: 'POST' })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Falha ao abrir terminal' }))
      throw new Error(body.error || 'Falha ao abrir terminal')
    }
    button.textContent = '✅ Terminal'
    setTimeout(() => { button.textContent = previousText; button.classList.remove('opening') }, 1800)
  } catch (error) {
    button.textContent = '❌ Terminal'
    button.title = error instanceof Error ? error.message : String(error)
    button.classList.remove('opening')
    button.classList.add('error')
    setTimeout(() => { button.textContent = previousText; button.classList.remove('error') }, 3000)
  }
}

async function loadAll() {
  const results = await Promise.all(INSTANCES.map(async (inst) => {
    const stats = await fetchInstanceStats(inst)
    if (stats) statsCache.set(inst.name, stats)
    return { inst, stats: statsCache.get(inst.name) || null }
  }))
  render(results)
  document.getElementById('ts').textContent = new Date().toLocaleTimeString('pt-BR')
}

function render(results) {
  let totalReqs = 0, totalErrors = 0, totalUsdToday = 0, totalKeys = 0, activeKeys = 0
  for (const { stats } of results) {
    if (!stats) continue
    for (const p of stats.providers || []) {
      totalReqs += p.totalRequests
      totalErrors += p.totalErrors
      totalUsdToday += p.estimatedUsdToday
      totalKeys += p.keys.length
      activeKeys += p.keys.filter(k => k.status === 'active').length
    }
  }

  const running = results.filter(r => r.inst.status === 'running').length
  document.getElementById('global-cards').innerHTML = \`
  <div class="stat-card"><div class="stat-label">Instâncias ativas</div><div class="stat-value green">\${running}</div><div class="stat-sub">de \${INSTANCES.length} total</div></div>
  <div class="stat-card"><div class="stat-label">Reqs hoje</div><div class="stat-value">\${fmtInt(totalReqs)}</div><div class="stat-sub">\${totalErrors} erros</div></div>
  <div class="stat-card"><div class="stat-label">Gasto hoje</div><div class="stat-value accent">\${fmtUsd(totalUsdToday)}</div></div>
  <div class="stat-card"><div class="stat-label">Chaves</div><div class="stat-value green">\${activeKeys}</div><div class="stat-sub">\${totalKeys} total</div></div>
  \`

  // Instance cards
  document.getElementById('instances-grid').innerHTML = results.map(({ inst, stats }) => {
    const isError = inst.status === 'error'
    const dotClass = isError ? 'dot-error' : 'dot-running'
    const providers = stats?.providers || []
    const instReqs = providers.reduce((a, p) => a + p.totalRequests, 0)
    const instUsd = providers.reduce((a, p) => a + p.estimatedUsdToday, 0)
    const instKeys = providers.reduce((a, p) => a + p.keys.filter(k => k.status === 'active').length, 0)

    const providerRows = providers.map(p =>
      \`<div class="inst-provider-row">
        <span class="inst-provider-name">\${p.id}</span>
        <span class="inst-provider-reqs">\${fmtInt(p.totalRequests)} reqs</span>
        <span class="inst-provider-usd">\${fmtUsd(p.estimatedUsdToday)}</span>
      </div>\`
    ).join('')

    const errorHtml = isError
      ? \`<div class="inst-error-msg">❌ \${inst.errorMessage || 'Erro desconhecido'}</div>\`
      : ''

    const bodyHtml = isError ? '' : \`
    <div class="inst-body">
      <div class="inst-links">
        <a class="inst-link primary" href="http://127.0.0.1:\${inst.dashboardPort}" target="_blank">📊 Dashboard</a>
        <a class="inst-link" href="http://127.0.0.1:\${inst.port}/health" target="_blank">❤️ Health</a>
        <a class="inst-link" href="http://127.0.0.1:\${inst.port}/v1/models" target="_blank">🤖 Models</a>
        <button class="inst-link terminal" type="button" onclick='openTerminal(\${JSON.stringify(inst.name)}, this)'>💻 Terminal</button>
      </div>
      <div class="inst-stats">
        <div class="inst-stat"><div class="inst-stat-label">Reqs hoje</div><div class="inst-stat-val">\${fmtInt(instReqs)}</div></div>
        <div class="inst-stat"><div class="inst-stat-label">Gasto hoje</div><div class="inst-stat-val" style="color:var(--accent)">\${fmtUsd(instUsd)}</div></div>
        <div class="inst-stat"><div class="inst-stat-label">Chaves ativas</div><div class="inst-stat-val" style="color:var(--green)">\${instKeys}</div></div>
        <div class="inst-stat"><div class="inst-stat-label">Status</div><div class="inst-stat-val" style="font-size:13px">\${stats ? '✅ online' : '⏳ aguardando'}</div></div>
      </div>
      \${providers.length > 0 ? \`<div class="inst-providers">\${providerRows}</div>\` : ''}
    </div>
    \`

    return \`
    <div class="instance-card \${isError ? 'error' : ''}">
      <div class="inst-header">
        <div class="inst-name">
          <span class="inst-status-dot \${dotClass}"></span>
          \${inst.name}
        </div>
        <span class="inst-port">:\${inst.port}</span>
      </div>
      \${bodyHtml}\${errorHtml}
    </div>
    \`
  }).join('')

  // Keys global grid
  const allKeys = []
  for (const { inst, stats } of results) {
    if (!stats) continue
    for (const prov of stats.providers || []) {
      for (const key of prov.keys || []) {
        allKeys.push({ instName: inst.name, key })
      }
    }
  }

  const statusMap = { active: 'ks-active', cooldown: 'ks-cooldown', 'spend-limit': 'ks-spend', 'schedule-off': 'ks-off' }
  document.getElementById('keys-grid').innerHTML = allKeys.length === 0
    ? '<p class="empty">Nenhuma chave carregada ainda...</p>'
    : allKeys.map(({ instName, key }) => \`
    <div class="key-row">
      <div class="key-row-left">
        <span class="key-inst">\${instName}</span>
        <span class="key-preview">\${key.keyPreview}</span>
      </div>
      <div style="text-align:right">
        <div class="key-status">
          <span class="ks-dot \${statusMap[key.status] || 'ks-off'}"></span>
          <span style="font-size:11px;color:var(--text3)">\${key.status}</span>
        </div>
        <div class="key-reqs">\${fmtInt(key.requests)} reqs · \${fmtUsd(key.estimatedUsdToday)}</div>
      </div>
    </div>
    \`).join('')
}

loadAll()
setInterval(loadAll, 5000)
</script>
</body>
</html>`
}

export class MultiDashboardServer {
  private server: http.Server | null = null

  constructor(
    private readonly instances: InstanceStatus[],
    private readonly port: number,
  ) {}

  async listen(): Promise<void> {
    const html = buildMultiDashboardHtml(this.instances)
    this.server = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://127.0.0.1:${this.port}`)
      if (req.method === 'POST' && url.pathname === '/open-terminal') {
        const name = url.searchParams.get('name') ?? ''
        const instance = this.instances.find((inst) => inst.name === name)
        if (!instance) {
          res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ error: 'Instância não encontrada.' }))
          return
        }
        if (instance.status !== 'running') {
          res.writeHead(409, { 'content-type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ error: 'A instância não está rodando.' }))
          return
        }
        try {
          openConfiguredTerminal(instance)
          res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ ok: true }))
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ error: message }))
        }
        return
      }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      res.end(html)
    })
    await new Promise<void>((resolve) => { this.server!.listen(this.port, '127.0.0.1', resolve) })
    process.stdout.write(`\n🐀 Dashboard Central: http://127.0.0.1:${this.port}\n`)
  }

  async close(): Promise<void> {
    if (!this.server) return
    return new Promise((resolve) => { this.server!.close(() => resolve()) })
  }
}
