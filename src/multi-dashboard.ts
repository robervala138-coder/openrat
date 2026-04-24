import http from 'node:http'
import type { InstanceStatus } from './types.js'

function buildMultiDashboardHtml(instances: InstanceStatus[]): string {
  const instancesJson = JSON.stringify(instances)
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OpenRat Multi — Dashboard Central</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Syne:wght@400;700;800&display=swap');

  :root {
    --bg: #0a0a0f;
    --surface: #111118;
    --surface2: #16161f;
    --border: #1e1e2e;
    --accent: #7c3aed;
    --accent2: #06b6d4;
    --green: #10b981;
    --red: #ef4444;
    --yellow: #f59e0b;
    --text: #e2e8f0;
    --muted: #64748b;
    --rat: #a78bfa;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: var(--bg); color: var(--text); font-family: 'Syne', sans-serif; min-height: 100vh; }
  body::before {
    content: ''; position: fixed; inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
    pointer-events: none; z-index: 0;
  }

  .wrap { position: relative; z-index: 1; max-width: 1200px; margin: 0 auto; padding: 32px 24px; }

  header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 36px; padding-bottom: 20px; border-bottom: 1px solid var(--border);
  }
  .logo { display: flex; align-items: center; gap: 14px; }
  .logo-icon { font-size: 32px; }
  .logo h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
  .logo span { color: var(--muted); font-size: 13px; }
  .multi-badge {
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    color: white; border-radius: 999px; padding: 4px 14px;
    font-size: 12px; font-weight: 700; font-family: 'JetBrains Mono', monospace;
    letter-spacing: 1px; text-transform: uppercase;
  }
  .live { display: flex; align-items: center; gap: 6px; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--muted); }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }

  /* Global summary */
  .global-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin-bottom: 36px; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 18px; transition: border-color .2s; }
  .card:hover { border-color: var(--accent); }
  .card-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); margin-bottom: 8px; font-family: 'JetBrains Mono', monospace; }
  .card-value { font-size: 26px; font-weight: 800; letter-spacing: -1px; }
  .card-sub { font-size: 11px; color: var(--muted); margin-top: 3px; font-family: 'JetBrains Mono', monospace; }

  /* Instance grid */
  .section-title { font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: var(--muted); margin-bottom: 16px; font-family: 'JetBrains Mono', monospace; }
  .instances-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 18px; margin-bottom: 36px; }

  .instance-card {
    background: var(--surface); border: 1px solid var(--border); border-radius: 14px; overflow: hidden;
    transition: border-color .2s, transform .15s;
  }
  .instance-card:hover { border-color: #3d3d6b; transform: translateY(-1px); }
  .instance-card.error { border-color: #7f1d1d; }

  .inst-header {
    padding: 16px 20px; display: flex; align-items: center; justify-content: space-between;
    border-bottom: 1px solid var(--border);
    background: var(--surface2);
  }
  .inst-name { font-size: 15px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
  .inst-status-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
  .dot-running { background: var(--green); box-shadow: 0 0 6px var(--green); animation: pulse 2s infinite; }
  .dot-error { background: var(--red); }
  .inst-port { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--accent2); }

  .inst-body { padding: 16px 20px; }
  .inst-links { display: flex; gap: 10px; margin-bottom: 14px; }
  .inst-link {
    flex: 1; text-align: center; padding: 6px 10px; border-radius: 8px;
    font-size: 11px; font-family: 'JetBrains Mono', monospace; text-decoration: none;
    border: 1px solid var(--border); color: var(--text); transition: all .2s;
    background: var(--bg);
  }
  .inst-link:hover { border-color: var(--accent2); color: var(--accent2); }
  .inst-link.primary { border-color: var(--accent); color: var(--rat); background: #1a0a3a; }
  .inst-link.primary:hover { background: #2a1055; }

  .inst-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .inst-stat { background: var(--bg); border-radius: 8px; padding: 10px 12px; border: 1px solid var(--border); }
  .inst-stat-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); margin-bottom: 4px; font-family: 'JetBrains Mono', monospace; }
  .inst-stat-val { font-size: 18px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }

  .inst-providers { margin-top: 12px; }
  .inst-provider-row { display: flex; align-items: center; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid var(--border); font-size: 11px; font-family: 'JetBrains Mono', monospace; }
  .inst-provider-row:last-child { border-bottom: none; }
  .inst-provider-name { color: var(--muted); }
  .inst-provider-reqs { color: var(--accent2); }
  .inst-provider-usd { color: var(--green); }

  .inst-error-msg { padding: 12px 20px; color: var(--red); font-family: 'JetBrains Mono', monospace; font-size: 12px; }

  /* Keys overview section */
  .keys-section { margin-top: 36px; }
  .keys-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
  .key-row {
    background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
    padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;
    font-family: 'JetBrains Mono', monospace; font-size: 12px;
  }
  .key-row-left { display: flex; flex-direction: column; gap: 2px; }
  .key-inst { color: var(--rat); font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
  .key-preview { color: var(--text); }
  .key-status { display: flex; align-items: center; gap: 5px; }
  .ks-dot { width: 7px; height: 7px; border-radius: 50%; }
  .ks-active { background: var(--green); }
  .ks-cooldown { background: var(--yellow); }
  .ks-spend { background: var(--red); }
  .ks-off { background: var(--muted); }
  .key-reqs { color: var(--muted); font-size: 11px; }

  footer { text-align: center; margin-top: 48px; font-size: 12px; color: var(--muted); font-family: 'JetBrains Mono', monospace; border-top: 1px solid var(--border); padding-top: 20px; }

  .skeleton { background: linear-gradient(90deg, var(--surface) 25%, var(--border) 50%, var(--surface) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8px; height: 200px; }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

  .empty { color: var(--muted); font-family: 'JetBrains Mono', monospace; font-size: 13px; padding: 16px 0; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div class="logo">
      <span class="logo-icon">🐀</span>
      <div>
        <h1>OpenRat <span class="multi-badge">MULTI</span></h1>
        <span>Dashboard Central — todas as instâncias</span>
      </div>
    </div>
    <div class="live"><div class="dot"></div><span id="ts">carregando...</span></div>
  </header>

  <div class="global-cards" id="global-cards">
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

function fmtUsd(n) { return n ? '$' + n.toFixed(4) : '$0.00' }
function timeAgo(ts) {
  if (!ts) return 'nunca'
  const d = Math.floor((Date.now() - ts) / 1000)
  if (d < 60) return d + 's'
  if (d < 3600) return Math.floor(d/60) + 'm'
  return Math.floor(d/3600) + 'h'
}

// Cache dos stats de cada instância
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

async function loadAll() {
  // Fetch all instances in parallel
  const results = await Promise.all(INSTANCES.map(async (inst) => {
    const stats = await fetchInstanceStats(inst)
    if (stats) statsCache.set(inst.name, stats)
    return { inst, stats: statsCache.get(inst.name) || null }
  }))
  render(results)
  document.getElementById('ts').textContent = new Date().toLocaleTimeString('pt-BR')
}

function render(results) {
  // Global aggregates
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
    <div class="card"><div class="card-label">Instâncias ativas</div><div class="card-value" style="color:var(--green)">\${running}</div><div class="card-sub">de \${INSTANCES.length} total</div></div>
    <div class="card"><div class="card-label">Reqs hoje</div><div class="card-value">\${totalReqs.toLocaleString()}</div><div class="card-sub">\${totalErrors} erros</div></div>
    <div class="card"><div class="card-label">Gasto hoje</div><div class="card-value" style="color:var(--accent2)">\${fmtUsd(totalUsdToday)}</div></div>
    <div class="card"><div class="card-label">Chaves</div><div class="card-value" style="color:var(--rat)">\${activeKeys}</div><div class="card-sub">\${totalKeys} total</div></div>
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
        <span class="inst-provider-reqs">\${p.totalRequests} reqs</span>
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
        </div>
        <div class="inst-stats">
          <div class="inst-stat"><div class="inst-stat-label">Reqs hoje</div><div class="inst-stat-val">\${instReqs.toLocaleString()}</div></div>
          <div class="inst-stat"><div class="inst-stat-label">Gasto hoje</div><div class="inst-stat-val" style="color:var(--accent2)">\${fmtUsd(instUsd)}</div></div>
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
            <span style="font-size:11px;color:var(--muted)">\${key.status}</span>
          </div>
          <div class="key-reqs">\${key.requests} reqs · \${fmtUsd(key.estimatedUsdToday)}</div>
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
  constructor(
    private readonly instances: InstanceStatus[],
    private readonly port: number,
  ) {}

  async listen(): Promise<void> {
    const html = buildMultiDashboardHtml(this.instances)
    const server = http.createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      res.end(html)
    })
    await new Promise<void>((resolve) => { server.listen(this.port, '127.0.0.1', resolve) })
    process.stdout.write(`\n🐀 Dashboard Central: http://127.0.0.1:${this.port}\n`)
  }
}
