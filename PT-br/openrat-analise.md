# 🐀 OpenRat — Análise do Projeto & Revisão do README

---

## 1. Visão Geral do Projeto

**OpenRat v2.0.0** é um gateway HTTP local escrito em **TypeScript puro sobre Node.js**, sem dependências externas em runtime. Ele expõe uma API 100% compatível com OpenAI (`/v1/chat/completions`, `/v1/responses`, `/v1/models`) e encaminha as requisições para provedores de IA reais configurados pelo usuário.

### Stack técnica
- **Linguagem:** TypeScript 5.x, compilado para ES Modules
- **Runtime:** Node.js ≥ 22.0.0 (usa `node:http`, `node:fs`, `node:child_process` nativos)
- **Dependências de runtime:** zero (apenas `@types/node` + `typescript` como devDependencies)
- **Testes:** Node.js test runner nativo (`node --test`)
- **Build:** `tsc` direto, sem bundler

### Estrutura real do projeto

```
openrat/
├── src/                   # TypeScript fonte
│   ├── index.ts           # Ponto de entrada CLI
│   ├── gateway.ts         # Servidor HTTP principal
│   ├── dashboard.ts       # Dashboard single-instance
│   ├── multi-dashboard.ts # Dashboard central multi-instância
│   ├── config.ts          # Carregamento e validação de config
│   ├── multi-config.ts    # Config para modo multi
│   ├── orchestrator.ts    # Spawn de N instâncias paralelas
│   ├── providers.ts       # Resolução de provider por modelo/alias
│   ├── stats.ts           # Rastreamento de tokens e custo (in-memory)
│   ├── healthcheck.ts     # Validação de chaves de API
│   ├── install.ts         # Auto-configuração de 13 ferramentas
│   ├── detect.ts          # Detecção de clientes instalados
│   ├── menu.ts            # Menu interativo + servidor do manager
│   ├── background.ts      # Modo daemon (background + PID file)
│   ├── tray.ts            # Ícone de bandeja (Linux, python3+GTK)
│   ├── types.ts           # Tipos TypeScript compartilhados
│   ├── utils.ts           # Helpers diversos
│   └── fs.ts              # Helpers de leitura/escrita JSON
├── test/                  # Testes unitários
├── dist/                  # Compilado (gerado pelo build)
├── examples/              # Configs de exemplo
├── openrat-manager.html   # Interface visual do manager (browser)
├── openrat.multi.json     # ⚠️ Config real commitada (ver seção 3)
├── package.json
└── tsconfig.json
```

### Provedores suportados

| `type` | Provedor | `baseUrl` padrão |
|---|---|---|
| `google-ai-studio` | Google Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` |
| `xai` | xAI Grok | `https://api.x.ai/v1` |
| `openai-compatible` | DeepSeek, OpenRouter, qualquer API compatível | **Obrigatório definir `baseUrl`** |

### Fluxo de uma requisição

```
Cliente → GET/POST http://127.0.0.1:4419
  ├─ Autenticação via Authorization: Bearer ou X-API-Key
  ├─ Parse do corpo JSON (limite: 10 MB)
  ├─ Resolução do provider (model → alias → fallback)
  ├─ Verificação de schedule e spend limit
  ├─ Seleção de chave (fill-first ou round-robin)
  │    └─ Filtra chaves em cooldown ou com limite atingido
  ├─ Encaminhamento para o provider real
  ├─ Em falha retryável: cooldown na chave, tenta próxima
  ├─ Rastreamento de tokens e custo no StatsTracker
  └─ Resposta ao cliente (suporta SSE/streaming)
```

### Endpoints expostos pelo gateway

| Endpoint | Método | Auth? | Descrição |
|---|---|---|---|
| `/v1/chat/completions` | POST | Sim | Chat completions (OpenAI-compatible) |
| `/v1/responses` | POST | Sim | Responses API |
| `/v1/models` | GET | Não | Lista provedores configurados |
| `/openrat/stats` | GET | Sim | Stats para o dashboard |
| `/health` | GET | Não | Health check (`{ok: true, version: "2.0.0"}`) |

### Modo Background (Daemon)

O projeto tem um sistema completo de execução em background, acessível via menu interativo após iniciar o gateway:

- Quando o usuário escolhe "background", o processo pai re-spawna a si mesmo com o flag `--daemon` e termina, liberando o terminal
- O processo filho (daemon) grava um PID file em `~/.openrat/openrat.pid`
- Um script de parada é criado em `~/.openrat/stop.sh`
- Um ícone de bandeja do sistema é lançado via Python 3 + GTK AppIndicator3 (Linux, opcional)

### Cooldowns de chave (valores reais do código)

| Condição | Cooldown |
|---|---|
| 429 / "rate limit" | 60 segundos |
| 402 / "quota" / "insufficient" | 30 minutos |
| 401 ou **403** / "invalid api key" | 10 minutos |
| 5xx (≥ 500) | 15 segundos |
| Erro de rede / outros | 10 segundos |

### Targets de instalação (13 no total)

`openclaude` · `openclaw` · `vscode-openclaude` · `aider` · `continue-dev` · `cline` · `roo-code` · `opencode` · `codex-cli` · `goose` · `cursor` · `amp` · `plandex`

---

## 2. Revisão Completa do README

O README está **bem estruturado, bem escrito e cobre os casos de uso principais com fidelidade**. Abaixo estão os pontos por categoria.

---

### ✅ O que está correto e completo

- Descrição geral do projeto e diagrama de arquitetura
- Requisitos (Node.js ≥ 22) e passos de instalação
- Tabela de features (todas as 14 conferem com o código)
- Referência de config: `host`, `port`, `masterKey`, `rotation`, `routes.default`, `providers`
- Tipos de provider (`google-ai-studio`, `xai`, `openai-compatible`)
- Estratégias de rotação (`fill-first`, `round-robin`) — descrições corretas
- Todos os 13 targets de instalação, com descrição de o que é modificado em cada um
- Integrações: Python openai SDK, LangChain, Node.js/TypeScript
- Lógica de model routing (exact → alias → fallback)
- Modo multi-instância: conceito, setup, `openrat.multi.json`
- Seção de segurança (localhost, sem telemetria, sem persistência)
- Estrutura do projeto (`src/`, `test/`, `examples/`)
- Cooldowns: valores numéricos corretos para todos os casos documentados
- Dica do `openrat.config.local.json` (arquivo está no `.gitignore` ✅)

---

### ⚠️ Problemas e Ausências Encontradas

#### 1. `403 Forbidden` ausente na tabela de cooldowns

**Situação no código (`gateway.ts`, linha 412):**
```typescript
if (status === 401 || status === 403 || low.includes('invalid api key'))
  return { label: 'auth', cooldownMs: 10 * 60_000 }
```

**No README:**
> | 401 Unauthorized | 10 minutes |

**O README documenta apenas 401, mas o código aplica o mesmo cooldown de 10 minutos para 403 Forbidden também.** Para provedores que retornam 403 em vez de 401 em caso de chave inválida, isso é informação relevante.

**Correção sugerida:**
```markdown
| 401 / 403 Unauthorized / Forbidden | 10 minutes |
```

---

#### 2. Campo `dashboardPort` ausente da referência de config

**Situação no código (`types.ts` e `config.ts`):**
```typescript
interface GatewayServerConfig {
  host?: string
  port?: number
  masterKey?: string
  dashboardPort?: number   // ← existe no código
  rotation?: RotationStrategy
}
// Padrão: port + 1
dashboardPort: config.server?.dashboardPort ?? port + 1
```

**No README:** o bloco `server` da referência de config não mostra `dashboardPort`.

**Impacto:** o usuário não sabe que pode customizar a porta do dashboard separadamente da porta do gateway. A única forma de descobrir é lendo o código-fonte.

**Correção sugerida — adicionar ao bloco de config:**
```jsonc
"server": {
  "host": "127.0.0.1",
  "port": 4419,
  "dashboardPort": 4420,   // Porta do dashboard (padrão: port + 1)
  "masterKey": "openrat-local",
  "rotation": "round-robin"
}
```

---

#### 3. Campos `headers` e `supportedEndpoints` do provider não documentados

**Situação no código (`types.ts`):**
```typescript
interface ProviderProfile {
  // ...campos documentados...
  headers?: Record<string, string>           // ← não documentado
  supportedEndpoints?: EndpointType[]        // ← não documentado
}
```

`supportedEndpoints` é até usado no `openrat.multi.example.json` (arquivo de exemplo oficial), mas não está explicado no README.

**Impacto:** quem quiser restringir um provider ao endpoint `/v1/chat/completions` (e.g. excluir `/v1/responses`) ou passar headers customizados não encontra isso na documentação.

**Correção sugerida — adicionar à referência de config do provider:**
```jsonc
"meu-provider": {
  "type": "openai-compatible",
  "model": "...",
  "baseUrl": "https://...",
  "apiKeys": ["..."],
  "headers": { "X-Custom-Header": "valor" },        // Headers extras opcionais
  "supportedEndpoints": ["chat/completions"]         // Restringe endpoints aceitos
}
```

---

#### 4. Modo background (daemon) e ícone de bandeja completamente ausentes

**Situação no código:**
O projeto tem `background.ts` e `tray.ts` implementando:
- Execução em background com `--daemon` flag (re-spawn detached)
- PID file em `~/.openrat/openrat.pid`
- Script de parada em `~/.openrat/stop.sh`
- Ícone de bandeja via Python 3 + GTK AppIndicator3 (Linux)
- O menu pós-start oferece "modo background" como opção

**No README:** nenhuma menção a background mode, daemon, tray icon, ou `stop.sh`.

**Impacto:** o usuário não sabe que pode manter o OpenRat rodando em background sem ocupar um terminal, nem como parar o processo.

**Correção sugerida — adicionar seção ao README:**

```markdown
## Background Mode

After starting the gateway, the interactive menu offers a **"Run in background"** option.
This detaches OpenRat from the terminal:

- A PID file is created at `~/.openrat/openrat.pid`
- A stop script is created at `~/.openrat/stop.sh`
- On Linux (with python3 + `gir1.2-appindicator3`), a system tray icon appears

To stop:
```bash
bash ~/.openrat/stop.sh
```

The tray icon is optional; if unavailable, OpenRat continues running in background
and logs to `~/.openrat/openrat.log`.
```

---

#### 5. Campo `basePort` ausente da referência de config multi-instância

**Situação no código (`types.ts`):**
```typescript
interface MultiConfig {
  basePort?: number    // ← Porta base para auto-numeração. Padrão: 4419
  instances: MultiInstance[]
}
```

**No README:** a seção Multi-Instance Mode não menciona `basePort`. O exemplo de setup usa portas explícitas (`4419`, `4421`, `4423`), mas o usuário não sabe que pode omiti-las e deixar o auto-cálculo funcionar.

**Correção sugerida — mencionar na seção Multi-Instance:**
```markdown
> **Tip:** Set `basePort` in `openrat.multi.json` to let OpenRat auto-assign ports
> starting from that value (instance 0 = basePort, instance 1 = basePort+2, etc.).
> You can omit `port` from each instance when using `basePort`.
```

---

#### 6. Endpoint `/health` não documentado

**Situação no código (`gateway.ts`):**
```typescript
if (pathname === '/health') {
  res.writeHead(200, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ ok: true, version: '2.0.0' }))
  return
}
```

**No README:** não há menção ao `/health` endpoint.

**Impacto:** útil para scripts de CI/CD, health checks de Docker, monitoramento, etc.

**Correção sugerida — adicionar ao README (seção de Integrations ou nova seção API):**
```markdown
### Health check

```bash
curl http://127.0.0.1:4419/health
# {"ok":true,"version":"2.0.0"}
```

---

#### 7. `openrat-manager.html` ausente da seção Project Structure

O arquivo `openrat-manager.html` existe na raiz do projeto e é a interface visual do manager que roda no browser, mas não aparece na árvore de diretórios do README.

**Correção sugerida — adicionar à árvore:**
```
├── openrat-manager.html    # Visual browser manager UI
```

---

#### 8. `openrat.multi.json` commitado acidentalmente no repositório

O arquivo `openrat.multi.json` está na raiz do projeto (confirmado no conteúdo do zip). Este parece ser um arquivo de configuração real do usuário, **não um arquivo de exemplo**. O arquivo de exemplo correto fica em `examples/openrat.multi.example.json`.

O `.gitignore` não cobre `openrat.multi.json` — apenas `openrat.multi.local.json`.

**Ação recomendada:**
1. Adicionar `openrat.multi.json` ao `.gitignore`
2. Ou remover o arquivo do repositório com `git rm --cached openrat.multi.json`

---

#### 9. `install` sem `--target` tem comportamento interativo não documentado

O README mostra `openrat install [--config PATH] [--target TARGET]`, mas não menciona que omitir `--target` abre um menu interativo de seleção com os targets detectados no sistema. Isso é comportamento útil de se conhecer.

---

### 📊 Resumo da Revisão

| Categoria | Status |
|---|---|
| Descrição geral do projeto | ✅ Correto e completo |
| Quick Start / Instalação | ✅ Correto |
| Referência de config (campos principais) | ✅ Correto |
| Tipos de provider e baseUrl padrão | ✅ Correto |
| Estratégias de rotação | ✅ Correto |
| Cooldowns (valores numéricos) | ✅ Correto, mas **falta 403** |
| 13 targets de instalação | ✅ Todos presentes e descritos |
| CLI Reference | ✅ Correto |
| Integrações (Python, Node.js, LangChain) | ✅ Correto |
| Multi-instance mode | ✅ Conceito correto, **falta `basePort`** |
| Seção de segurança | ✅ Correto |
| Project Structure | ⚠️ **Falta `openrat-manager.html`** |
| `dashboardPort` na config | ❌ **Ausente** |
| `headers` e `supportedEndpoints` | ❌ **Ausentes** |
| Modo background / daemon | ❌ **Completamente ausente** |
| Endpoint `/health` | ❌ **Ausente** |
| `openrat.multi.json` no repo | ⚠️ **Arquivo indevido commitado** |

---

## 3. Prioridades de Correção

**Alta prioridade** (afeta usuários diretamente):
1. Documentar o **modo background** — funcionalidade completa implementada, invisível no README
2. Adicionar `dashboardPort` à referência de config
3. Documentar `supportedEndpoints` (usado no exemplo oficial mas sem explicação)
4. Remover ou ignorar `openrat.multi.json` do repositório

**Média prioridade** (melhora a completude):
5. Adicionar 403 na tabela de cooldowns
6. Documentar campo `headers` do provider
7. Mencionar `basePort` no modo multi-instância
8. Documentar `/health` endpoint

**Baixa prioridade** (polimento):
9. Adicionar `openrat-manager.html` à árvore de Project Structure
10. Mencionar comportamento interativo do `install` sem `--target`
