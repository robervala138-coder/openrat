import http from 'node:http'
import type { GatewayConfig } from './types.js'

const HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OpenRat Dashboard</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Syne:wght@400;700;800&display=swap');

  :root {
    --bg: #0a0a0f;
    --surface: #111118;
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

  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'Syne', sans-serif;
    min-height: 100vh;
  }

  /* ── noise overlay ── */
  body::before {
    content: '';
    position: fixed; inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
    pointer-events: none; z-index: 0;
  }

  .wrap { position: relative; z-index: 1; max-width: 1100px; margin: 0 auto; padding: 32px 24px; }

  /* ── header ── */
  header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 40px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--border);
  }
  .logo { display: flex; align-items: center; gap: 12px; }
  .logo-icon {
    font-size: 28px;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  .logo h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
  .logo span { color: var(--muted); font-size: 13px; font-weight: 400; }
  .live {
    display: flex; align-items: center; gap: 6px;
    font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--muted);
  }
  .dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--green);
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; } 50% { opacity: 0.3; }
  }

  /* ── summary cards ── */
  .cards {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px; margin-bottom: 36px;
  }
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    transition: border-color .2s;
  }
  .card:hover { border-color: var(--accent); }
  .card-label {
    font-size: 11px; text-transform: uppercase; letter-spacing: 1px;
    color: var(--muted); margin-bottom: 10px;
    font-family: 'JetBrains Mono', monospace;
  }
  .card-value { font-size: 28px; font-weight: 800; letter-spacing: -1px; }
  .card-sub { font-size: 12px; color: var(--muted); margin-top: 4px; font-family: 'JetBrains Mono', monospace; }

  /* ── rotation badge ── */
  .strategy-badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: #1e1e2e; border: 1px solid var(--accent);
    color: var(--rat); border-radius: 999px;
    padding: 4px 12px; font-size: 12px; font-family: 'JetBrains Mono', monospace;
    margin-bottom: 28px;
  }

  /* ── provider blocks ── */
  .section-title {
    font-size: 13px; text-transform: uppercase; letter-spacing: 2px;
    color: var(--muted); margin-bottom: 16px;
    font-family: 'JetBrains Mono', monospace;
  }

  .provider {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    margin-bottom: 20px;
    overflow: hidden;
    transition: border-color .2s;
  }
  .provider:hover { border-color: #2d2d4e; }

  .provider-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 22px;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
  }
  .provider-name { font-size: 16px; font-weight: 700; }
  .provider-model {
    font-size: 12px; color: var(--muted);
    font-family: 'JetBrains Mono', monospace; margin-top: 2px;
  }
  .provider-right { display: flex; align-items: center; gap: 16px; text-align: right; }
  .provider-cost { font-size: 13px; font-family: 'JetBrains Mono', monospace; }
  .provider-cost .val { font-size: 20px; font-weight: 700; color: var(--accent2); }

  .badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 10px; border-radius: 999px;
    font-size: 11px; font-family: 'JetBrains Mono', monospace; font-weight: 700;
    text-transform: uppercase; letter-spacing: .5px;
  }
  .badge-active { background: #052e16; color: var(--green); border: 1px solid #166534; }
  .badge-schedule { background: #1c1917; color: var(--yellow); border: 1px solid #92400e; }
  .badge-spend { background: #1c0a0a; color: var(--red); border: 1px solid #7f1d1d; }

  /* ── keys table ── */
  .keys-wrap { padding: 16px 22px 20px; }
  .keys-table {
    width: 100%; border-collapse: collapse;
    font-family: 'JetBrains Mono', monospace; font-size: 12px;
  }
  .keys-table th {
    text-align: left; padding: 6px 10px;
    color: var(--muted); font-weight: 400;
    border-bottom: 1px solid var(--border);
    text-transform: uppercase; letter-spacing: .5px; font-size: 10px;
  }
  .keys-table td { padding: 8px 10px; border-bottom: 1px solid #0d0d18; }
  .keys-table tr:last-child td { border-bottom: none; }

  .status-dot {
    display: inline-block; width: 8px; height: 8px;
    border-radius: 50%; margin-right: 6px;
  }
  .s-active { background: var(--green); }
  .s-cooldown { background: var(--yellow); }
  .s-spend { background: var(--red); }
  .s-off { background: var(--muted); }

  /* ── progress bar ── */
  .spend-bar-wrap { margin-top: 8px; }
  .spend-bar-label { font-size: 11px; color: var(--muted); margin-bottom: 4px; display: flex; justify-content: space-between; }
  .spend-bar { height: 4px; background: var(--border); border-radius: 2px; }
  .spend-bar-fill { height: 4px; border-radius: 2px; transition: width .5s; }
  .fill-ok { background: var(--green); }
  .fill-warn { background: var(--yellow); }
  .fill-over { background: var(--red); }

  /* ── footer ── */
  footer {
    text-align: center; margin-top: 48px;
    font-size: 12px; color: var(--muted);
    font-family: 'JetBrains Mono', monospace;
    border-top: 1px solid var(--border); padding-top: 20px;
  }

  .skeleton {
    background: linear-gradient(90deg, var(--surface) 25%, var(--border) 50%, var(--surface) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 8px; height: 100px;
  }
  @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div class="logo">
      <span class="logo-icon">🐀</span>
      <div>
        <h1>OpenRat</h1>
        <span>Gateway Dashboard</span>
      </div>
    </div>
    <div class="live">
      <div class="dot"></div>
      <span id="ts">carregando...</span>
    </div>
  </header>

  <div class="cards" id="cards">
    <div class="skeleton"></div>
    <div class="skeleton"></div>
    <div class="skeleton"></div>
    <div class="skeleton"></div>
  </div>

  <div id="strategy-wrap"></div>

  <p class="section-title">Providers</p>
  <div id="providers"><div class="skeleton"></div><div class="skeleton" style="margin-top:16px"></div></div>

  <footer>OpenRat v2.0 — Feito no Brasil 🇧🇷</footer>
</div>

<script>
const GATEWAY_PORT = __GATEWAY_PORT__

function fmt(n, dec=2) {
  if (n == null) return '—'
  return n.toFixed(dec)
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
  const map = { active: 's-active', cooldown: 's-cooldown', 'spend-limit': 's-spend', 'schedule-off': 's-off' }
  return '<span class="status-dot ' + (map[s]||'s-off') + '"></span>'
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
      '<p style="color:var(--red);font-family:monospace;padding:16px 0">' +
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

  document.getElementById('cards').innerHTML = \`
    <div class="card"><div class="card-label">Requisições hoje</div><div class="card-value">\${totalReqs.toLocaleString()}</div><div class="card-sub">\${totalErrs} erros</div></div>
    <div class="card"><div class="card-label">Gasto hoje</div><div class="card-value" style="color:var(--accent2)">\${fmtUsd(totalUsdToday)}</div><div class="card-sub">mês: \${fmtUsd(totalUsdMonth)}</div></div>
    <div class="card"><div class="card-label">Chaves ativas</div><div class="card-value" style="color:var(--green)">\${activeKeys}</div><div class="card-sub">de \${totalKeys} total</div></div>
    <div class="card"><div class="card-label">Providers</div><div class="card-value">\${providers.length}</div><div class="card-sub">\${providers.filter(p=>p.scheduleActive && !p.spendLimitReached).length} disponíveis</div></div>
  \`

  document.getElementById('strategy-wrap').innerHTML = \`
    <div class="strategy-badge">⚡ Estratégia: \${data.rotation}</div>
  \`

  document.getElementById('providers').innerHTML = providers.map(p => {
    const keyRows = p.keys.map(k => \`
      <tr>
        <td>\${statusDot(k.status)}\${k.keyPreview}</td>
        <td>\${k.requests.toLocaleString()}</td>
        <td>\${k.inputTokens.toLocaleString()}</td>
        <td>\${k.outputTokens.toLocaleString()}</td>
        <td style="color:var(--accent2)">\${fmtUsd(k.estimatedUsdToday)}</td>
        <td>\${k.errors}</td>
        <td style="color:var(--muted)">\${timeAgo(k.lastUsed)}</td>
        <td>\${statusDot(k.status)}\${k.status}</td>
      </tr>
    \`).join('')

    return \`
      <div class="provider">
        <div class="provider-header">
          <div>
            <div class="provider-name">\${p.id}</div>
            <div class="provider-model">\${p.model}</div>
          </div>
          <div class="provider-right">
            <div class="provider-cost">
              <div class="val">\${fmtUsd(p.estimatedUsdToday)}</div>
              <div style="font-size:11px;color:var(--muted)">hoje</div>
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

    const server = http.createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      res.end(html)
    })

    await new Promise<void>((resolve) => { server.listen(port, '127.0.0.1', resolve) })
    process.stdout.write(`   Dashboard rodando em http://127.0.0.1:${port}\n`)
  }
}
