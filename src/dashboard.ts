import http from 'node:http'
import type { GatewayConfig } from './types.js'

const HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OpenRat Dashboard</title>
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

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--sans);
  font-size: 14px;
  min-height: 100vh;
}

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
.strategy-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--surface);
  border: 1px solid var(--border2);
  color: var(--accent);
  border-radius: 20px;
  padding: 4px 14px;
  font-size: 12px;
  font-weight: 600;
  font-family: var(--mono);
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

/* ── MAIN ── */
.main-wrap {
  max-width: 1100px;
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

/* ── PROVIDER BLOCKS ── */
.provider {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  margin-bottom: 16px;
  overflow: hidden;
  transition: border-color 0.15s;
}
.provider:hover { border-color: var(--border2); }
.provider-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--bg3);
}
.provider-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.provider-icon {
  width: 32px; height: 32px;
  background: var(--accent-glow);
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px;
  flex-shrink: 0;
}
.provider-name { font-size: 15px; font-weight: 700; }
.provider-model {
  font-size: 11px;
  color: var(--text3);
  font-family: var(--mono);
  margin-top: 1px;
}
.provider-right {
  display: flex;
  align-items: center;
  gap: 16px;
  text-align: right;
}
.provider-cost-val {
  font-size: 20px;
  font-weight: 700;
  font-family: var(--mono);
  color: var(--accent);
  letter-spacing: -0.02em;
}
.provider-cost-label {
  font-size: 10px;
  color: var(--text3);
  font-family: var(--mono);
}

/* ── BADGES ── */
.badge {
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  font-family: var(--mono);
}
.badge-active { background: var(--green-dim); color: var(--green); }
.badge-schedule { background: var(--amber-dim); color: var(--amber); }
.badge-spend { background: var(--red-dim); color: var(--red); }

/* ── KEYS TABLE ── */
.keys-wrap {
  padding: 16px 20px 20px;
}
.keys-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--mono);
  font-size: 12px;
}
.keys-table th {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text3);
  padding: 0 12px 10px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}
.keys-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  color: var(--text);
  vertical-align: middle;
}
.keys-table tr:last-child td { border-bottom: none; }
.keys-table tr:hover td { background: var(--bg3); }

.key-dot {
  display: inline-block;
  width: 6px; height: 6px;
  border-radius: 50%;
  margin-right: 5px;
  vertical-align: middle;
}
.kd-active { background: var(--green); }
.kd-cooldown { background: var(--amber); }
.kd-spend { background: var(--red); }
.kd-off { background: var(--text3); }

/* ── SPEND BAR ── */
.spend-bar-wrap { margin-top: 8px; }
.spend-bar-label {
  font-size: 11px;
  color: var(--text3);
  margin-bottom: 4px;
  display: flex;
  justify-content: space-between;
  font-family: var(--mono);
}
.spend-bar { height: 4px; background: var(--surface2); border-radius: 2px; }
.spend-bar-fill { height: 4px; border-radius: 2px; transition: width .5s; }
.fill-ok { background: var(--green); }
.fill-warn { background: var(--amber); }
.fill-over { background: var(--red); }

/* ── FOOTER ── */
footer {
  text-align: center;
  margin-top: 48px;
  font-size: 12px;
  color: var(--text3);
  font-family: var(--mono);
  border-top: 1px solid var(--border);
  padding-top: 20px;
}

/* ── SKELETON ── */
.skeleton {
  background: linear-gradient(90deg, var(--surface) 25%, var(--surface2) 50%, var(--surface) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--r2);
  height: 100px;
}
@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

/* ── RESPONSIVE ── */
@media (max-width: 800px) {
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
</head>
<body>

<div class="topbar">
  <div class="logo">
    <div class="logo-icon">🐀</div>
    <div>
      <div>OpenRat</div>
    </div>
  </div>
  <div class="topbar-right">
    <div class="strategy-badge" id="strategy-badge">⚡ fill-first</div>
    <div class="live-dot"></div>
    <span class="live-text" id="ts">carregando...</span>
  </div>
</div>

<div class="main-wrap">
  <div class="stat-grid" id="cards">
    <div class="skeleton"></div>
    <div class="skeleton"></div>
    <div class="skeleton"></div>
    <div class="skeleton"></div>
  </div>

  <p class="section-title">Providers</p>
  <div id="providers">
    <div class="skeleton"></div>
    <div class="skeleton" style="margin-top:16px"></div>
  </div>

  <footer>OpenRat v2.0 — Feito no Brasil 🇧🇷</footer>
</div>

<script>
const GATEWAY_PORT = __GATEWAY_PORT__

function fmt(n, dec=2) {
  if (n == null) return '—'
  return n.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}
function fmtInt(n) {
  if (n == null) return '0'
  return n.toLocaleString('pt-BR')
}
function fmtUsd(n) {
  if (!n) return '$0.00'
  return '$' + n.toFixed(4)
}
function timeAgo(ts) {
  if (!ts) return 'nunca'
  const d = Math.floor((Date.now() - ts) / 1000)
  if (d < 60) return d + 's atrás'
  if (d < 3600) return Math.floor(d/60) + 'm atrás'
  return Math.floor(d/3600) + 'h atrás'
}
function statusDot(s) {
  const map = { active: 'kd-active', cooldown: 'kd-cooldown', 'spend-limit': 'kd-spend', 'schedule-off': 'kd-off' }
  return '<span class="key-dot ' + (map[s]||'kd-off') + '"></span>'
}
function statusBadge(p) {
  if (p.spendLimitReached) return '<span class="badge badge-spend">Limite gasto</span>'
  if (!p.scheduleActive) return '<span class="badge badge-schedule">Fora do horário</span>'
  return '<span class="badge badge-active">Ativo</span>'
}
function spendBar(val, limit, label) {
  if (!limit) return ''
  const pct = Math.min((val / limit) * 100, 100)
  const cls = pct < 60 ? 'fill-ok' : pct < 90 ? 'fill-warn' : 'fill-over'
  return \`<div class="spend-bar-wrap">
  <div class="spend-bar-label"><span>\${label}</span><span>\${fmtUsd(val)} / \${fmtUsd(limit)}</span></div>
  <div class="spend-bar"><div class="spend-bar-fill \${cls}" style="width:\${pct}%"></div></div>
</div>\`
}

async function load() {
  try {
    const host = window.location.hostname || '127.0.0.1'
    const url = 'http://' + host + ':' + GATEWAY_PORT + '/openrat/stats'
    const res = await fetch(url, {
      headers: { Authorization: 'Bearer __MASTER_KEY__' }
    })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const data = await res.json()
    render(data)
  } catch(e) {
    const msg = (e && e.message) ? e.message : String(e)
    document.getElementById('providers').innerHTML =
      '<p style="color:var(--red);font-family:var(--mono);padding:16px 0">' +
      '❌ ' + msg + '<br><br>' +
      'Verifique se o gateway está rodando na porta ' + GATEWAY_PORT +
      '</p>'
  }
}

function render(data) {
  const providers = data.providers || []
  const totalReqs = providers.reduce((a,p) => a + p.totalRequests, 0)
  const totalErrs = providers.reduce((a,p) => a + p.totalErrors, 0)
  const totalUsdToday = providers.reduce((a,p) => a + p.estimatedUsdToday, 0)
  const totalUsdMonth = providers.reduce((a,p) => a + p.estimatedUsdMonth, 0)
  const totalKeys = providers.reduce((a,p) => a + p.keys.length, 0)
  const activeKeys = providers.reduce((a,p) => a + p.keys.filter(k => k.status === 'active').length, 0)

  document.getElementById('ts').textContent = new Date(data.ts).toLocaleTimeString('pt-BR')

  document.getElementById('strategy-badge').textContent = '⚡ ' + (data.rotation || 'fill-first')

  document.getElementById('cards').innerHTML = \`
  <div class="stat-card"><div class="stat-label">Requisições hoje</div><div class="stat-value">\${fmtInt(totalReqs)}</div><div class="stat-sub">\${totalErrs} erros</div></div>
  <div class="stat-card"><div class="stat-label">Gasto hoje</div><div class="stat-value accent">\${fmtUsd(totalUsdToday)}</div><div class="stat-sub">mês: \${fmtUsd(totalUsdMonth)}</div></div>
  <div class="stat-card"><div class="stat-label">Chaves ativas</div><div class="stat-value green">\${activeKeys}</div><div class="stat-sub">de \${totalKeys} total</div></div>
  <div class="stat-card"><div class="stat-label">Providers</div><div class="stat-value">\${providers.length}</div><div class="stat-sub">\${providers.filter(p=>p.scheduleActive && !p.spendLimitReached).length} disponíveis</div></div>
  \`

  document.getElementById('providers').innerHTML = providers.map(p => {
    const keyRows = p.keys.map(k => \`
    <tr>
      <td>\${statusDot(k.status)}\${k.keyPreview}</td>
      <td>\${fmtInt(k.requests)}</td>
      <td>\${fmtInt(k.inputTokens)}</td>
      <td>\${fmtInt(k.outputTokens)}</td>
      <td style="color:var(--accent)">\${fmtUsd(k.estimatedUsdToday)}</td>
      <td>\${k.errors}</td>
      <td style="color:var(--text3)">\${timeAgo(k.lastUsed)}</td>
      <td>\${statusDot(k.status)}\${k.status}</td>
    </tr>
    \`).join('')

    return \`
    <div class="provider">
      <div class="provider-header">
        <div class="provider-left">
          <div class="provider-icon">⚡</div>
          <div>
            <div class="provider-name">\${p.id}</div>
            <div class="provider-model">\${p.model}</div>
          </div>
        </div>
        <div class="provider-right">
          <div>
            <div class="provider-cost-val">\${fmtUsd(p.estimatedUsdToday)}</div>
            <div class="provider-cost-label">hoje</div>
          </div>
          \${statusBadge(p)}
        </div>
      </div>
      <div class="keys-wrap">
        <table class="keys-table">
          <thead><tr>
            <th>Chave</th><th>Reqs</th><th>Tokens In</th><th>Tokens Out</th><th>Gasto Hoje</th><th>Erros</th><th>Último uso</th><th>Status</th>
          </tr></thead>
          <tbody>\${keyRows}</tbody>
        </table>
      </div>
    </div>
    \`
  }).join('')
}

load()
setInterval(load, 5000)
</script>
</body>
</html>`

export class DashboardServer {
  private server: http.Server | null = null

  constructor(
    private readonly config: GatewayConfig,
    private readonly gatewayPort: number,
  ) {}

  async listen(): Promise<void> {
    const port = this.config.server?.dashboardPort ?? (this.gatewayPort + 1)

    const masterKey = this.config.server?.masterKey ?? 'openrat-local'
    const html = HTML
      .replace('__GATEWAY_PORT__', String(this.gatewayPort))
      .replace('__MASTER_KEY__', masterKey)

    this.server = http.createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      res.end(html)
    })

    await new Promise<void>((resolve) => { this.server!.listen(port, '127.0.0.1', resolve) })
    process.stdout.write(`  Dashboard: http://127.0.0.1:${port}\n`)
  }

  async close(): Promise<void> {
    if (!this.server) return
    return new Promise((resolve) => { this.server!.close(() => resolve()) })
  }
}