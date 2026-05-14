<div align="center">

# 🐀 OpenRat

**Gateway OpenAI-compatível local — roteie requisições entre múltiplos provedores de IA com rotação inteligente de chaves, limites de gasto, agendamento e painel visual.**

[![CI](https://github.com/robervala138-coder/openrat/actions/workflows/ci.yml/badge.svg)](https://github.com/robervala138-coder/openrat/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.0.0-green)](https://nodejs.org)

> Node.js puro. Sem banco de dados. Sem Docker. Sem Bun. Sem dependências externas de runtime.

[Funcionalidades](#funcionalidades) · [Início Rápido](#início-rápido) · [Configuração](#configuração) · [Referência CLI](#referência-cli) · [Integrações](#integrações) · [Modo Background](#modo-background) · [Modo Multi-Instância](#modo-multi-instância) · [Contribuindo](CONTRIBUTING.md)

</div>

---

## O que é o OpenRat?

O OpenRat é um gateway HTTP local que expõe uma **API compatível com OpenAI** (`/v1/chat/completions`, `/v1/responses`, `/v1/models`) e encaminha requisições para os provedores reais que você configurar — Google AI Studio, xAI (Grok), DeepSeek, OpenRouter ou qualquer serviço compatível com OpenAI.

Você aponta seu cliente (Claude Code, Codex CLI, Aider, Continue.dev, Cline, Cursor, openai SDK…) para `http://127.0.0.1:4419` uma única vez, e o OpenRat cuida do resto: qual provedor usar, qual chave está disponível, quanto foi gasto, se está dentro da janela de agendamento, fallback automático e muito mais.

```
Seu cliente (Claude Code, Codex CLI, Aider, Cline, Cursor, openai SDK...)
        │
        ▼
  http://127.0.0.1:4419  ◄── Gateway OpenRat
        │
        ├── Google AI Studio (gemini-2.5-flash)
        ├── xAI (grok-3-mini)
        ├── DeepSeek (deepseek-chat)
        └── OpenRouter (qualquer modelo gratuito/pago)
```

---

## Funcionalidades

| Funcionalidade | OpenRat v2 |
|---|:---:|
| Painel web visual | ✅ |
| Limites de gasto diário/mensal por provedor | ✅ |
| Agendamento por horário (restringir provedores a determinados horários) | ✅ |
| Rotação de chaves round-robin e fill-first | ✅ |
| Modo multi-instância (N gateways em paralelo) | ✅ |
| Multi-dashboard central agregando todas as instâncias | ✅ |
| Gerenciador visual no navegador (`openrat manager`) | ✅ |
| Validação de chaves de API (`openrat check`) | ✅ |
| Rastreamento de tokens e custo estimado | ✅ |
| Zero dependências externas de runtime | ✅ |
| Configuração simples em JSON | ✅ |
| Sem banco de dados | ✅ |
| Suporte a streaming (SSE) | ✅ |
| Auto-configuração de 13 ferramentas de IA para coding | ✅ |
| Modo background / daemon | ✅ |

---

## Início Rápido

### Requisitos

- **Node.js >= 22.0.0**

```bash
node --version   # deve ser v22 ou superior
```

Instale o Node.js: https://nodejs.org

### Instalação

```bash
git clone https://github.com/robervala138-coder/openrat.git
cd openrat
npm install
npm run build
```

**Instalar como comando global (opcional):**

```bash
npm install -g .
```

### Executar

A forma mais fácil é pelo menu interativo — basta rodar sem argumentos:

```bash
openrat
```

Use as setas do teclado para escolher entre o gerenciador visual no navegador ou os comandos CLI.

---

## Configuração

### 1. Gerar uma configuração de exemplo

```bash
openrat init
```

Isso cria `~/.openrat/openrat.config.json` por padrão. Edite-o e substitua as chaves de API de exemplo pelas suas chaves reais.

Para criar a configuração em outro local, use `--config CAMINHO`.

> 💡 **Dica:** Para suas chaves reais, use `openrat.config.local.json` — ele já está no `.gitignore`.

### 2. Referência do arquivo de configuração

```jsonc
{
  "server": {
    "host": "127.0.0.1",          // Endereço de escuta (padrão: 127.0.0.1)
    "port": 4419,                 // Porta do gateway (padrão: 4419)
    "dashboardPort": 4420,        // Porta do painel (padrão: port + 1)
    "masterKey": "openrat-local", // Chave de autenticação enviada pelo seu cliente
    "rotation": "round-robin"     // "round-robin" | "fill-first"
  },
  "routes": {
    "default": "gemini-flash"     // ID do provedor de fallback
  },
  "providers": {
    "gemini-flash": {
      "type": "google-ai-studio",
      "model": "gemini-2.5-flash",
      "aliases": ["gemini-fast", "flash"],  // Apelidos para o nome do modelo
      "apiKeys": ["AIza-key-1", "AIza-key-2"],
      "costPer1MInputTokens": 0.075,
      "costPer1MOutputTokens": 0.30,
      "spendLimit": {
        "dailyUsd": 1.0,
        "monthlyUsd": 10.0
      },
      "schedule": {
        "fromHour": 8,
        "toHour": 22   // Ativo apenas entre 08:00 e 22:00
      }
    },
    "grok-mini": {
      "type": "xai",
      "model": "grok-3-mini",
      "apiKeys": ["xai-key-1"]
    },
    "deepseek": {
      "type": "openai-compatible",
      "model": "deepseek-chat",
      "baseUrl": "https://api.deepseek.com/v1",
      "apiKeys": ["sk-key-1", "sk-key-2"],
      "headers": { "X-Custom-Header": "valor" },    // Headers extras opcionais
      "supportedEndpoints": ["chat/completions"]    // Restringe endpoints aceitos
    }
  }
}
```

Veja [`examples/openrat.config.example.json`](examples/openrat.config.example.json) para um exemplo completo.

### Tipos de provedor

| `type` | Usar para |
|---|---|
| `google-ai-studio` | Modelos Google Gemini |
| `xai` | Modelos xAI Grok |
| `openai-compatible` | DeepSeek, OpenRouter, qualquer API compatível com OpenAI |

> **Importante:** provedores `openai-compatible` precisam definir `baseUrl`. Não há URL padrão para esse tipo.

### Campos avançados do provedor

| Campo | Tipo | Descrição |
|---|---|---|
| `aliases` | `string[]` | Apelidos extras do modelo que roteiam para este provedor |
| `headers` | `Record<string, string>` | Headers HTTP adicionais enviados com cada requisição a este provedor |
| `supportedEndpoints` | `"chat/completions" \| "responses"` | Restringe quais endpoints este provedor aceita. Padrões: `google-ai-studio` → `["chat/completions"]`; `xai` → `["chat/completions"]`; `openai-compatible` → ambos. |
| `costPer1MInputTokens` | `number` | Custo em USD por 1M tokens de entrada (usado para rastreamento de gasto) |
| `costPer1MOutputTokens` | `number` | Custo em USD por 1M tokens de saída (usado para rastreamento de gasto) |
| `spendLimit.dailyUsd` | `number` | Gasto máximo em USD por dia para este provedor |
| `spendLimit.monthlyUsd` | `number` | Gasto máximo em USD por mês para este provedor |
| `schedule.fromHour` | `number` | Hora (0–23) em que este provedor se torna ativo |
| `schedule.toHour` | `number` | Hora (0–23) em que este provedor se torna inativo |

### Estratégias de rotação de chaves

| Estratégia | Comportamento |
|---|---|
| `fill-first` | Usa a primeira chave disponível até atingir seu limite, depois passa para a próxima |
| `round-robin` | Distribui as requisições de forma uniforme entre todas as chaves disponíveis |

### Cooldowns de erro

Quando uma chave retorna um erro, ela é colocada em cooldown automaticamente:

| Erro | Cooldown |
|---|---|
| 401 / 403 Não autorizado / Proibido | 10 minutos |
| 402 / quota | 30 minutos |
| 429 Limite de taxa | 60 segundos |
| 5xx Erro no servidor | 15 segundos |
| Erro de rede | 10 segundos |

---

## Referência CLI

### Comandos de instância única

```bash
openrat                                # Menu interativo
openrat manager                        # Abrir gerenciador visual no navegador
openrat init    [--config CAMINHO]     # Criar openrat.config.json
openrat gateway [--config CAMINHO]     # Iniciar gateway + painel
openrat check   [--config CAMINHO]     # Validar todas as chaves de API
openrat status  [--config CAMINHO]     # Exibir resumo dos provedores
openrat detect                         # Detectar clientes de IA instalados
openrat install [--config CAMINHO] [--target ALVO]  # Auto-configurar um cliente
openrat --help                         # Exibir ajuda
```

> **Dica:** Rodar `openrat install` sem `--target` abre uma lista interativa com os clientes detectados no seu sistema, permitindo escolher com as setas do teclado.

### Comandos multi-instância

```bash
openrat multi init  [--config CAMINHO]                                    # Criar openrat.multi.json
openrat multi start [--config CAMINHO] [--central-dashboard-port PORTA]   # Iniciar todas as instâncias
```

### Opções

| Opção | Descrição |
|---|---|
| `--config CAMINHO` | Caminho para o arquivo de configuração (padrão: `~/.openrat/openrat.config.json`; modo multi usa `~/.openrat/openrat.multi.json`) |
| `--target ALVO` | Alvo de instalação (veja a tabela abaixo) |
| `--central-dashboard-port PORTA` | Porta do dashboard central no modo multi (padrão: `4400`) |

### Alvos de instalação suportados

| Alvo | Ferramenta | Arquivo modificado |
|---|---|---|
| `openclaude` | Claude Code | `~/.claude/settings.json` + launcher |
| `openclaw` | OpenClaw | `~/.openclaw/openclaw.json` |
| `vscode-openclaude` | VS Code (extensão OpenClaude) | VS Code `settings.json` + launcher |
| `aider` | Aider | `~/.aider.conf.yml` |
| `continue-dev` | Continue.dev | `~/.continue/config.json` |
| `cline` | Cline (VS Code) | VS Code `settings.json` |
| `roo-code` | Roo Code (VS Code) | VS Code `settings.json` |
| `opencode` | OpenCode (SST) | `~/.config/opencode/config.json` |
| `codex-cli` | Codex CLI (OpenAI) | `~/.codex/config.json` + launcher |
| `goose` | Goose (Block) | `~/.config/goose/config.yaml` |
| `cursor` | Cursor | Cursor `settings.json` |
| `amp` | Amp (Sourcegraph) | `~/.config/amp/settings.json` |
| `plandex` | Plandex | apenas launcher |

---

## Integrações

O OpenRat expõe uma API 100% compatível com OpenAI. Qualquer cliente que aceite `OPENAI_BASE_URL` funciona.

### Variáveis de ambiente universais

```bash
export OPENAI_BASE_URL="http://127.0.0.1:4419/v1"
export OPENAI_API_KEY="openrat-local"
export OPENAI_MODEL="gemini-2.5-flash"   # qualquer apelido configurado
```

---

### Claude Code

```bash
openrat install --target openclaude
```

Configura `~/.claude/settings.json` com `agentModels` e `agentRouting`, e cria um launcher em `~/.local/bin/openclaude-keymux` com `CLAUDE_CODE_USE_OPENAI=1`. Sub-agentes iniciados pelo Claude Code também passam pelo OpenRat.

---

### Codex CLI (OpenAI)

```bash
openrat install --target codex-cli
```

Escreve `~/.codex/config.json` e cria o launcher `codex-openrat`. Use `codex-openrat` no lugar de `codex` para rotear as requisições pelo OpenRat.

> Requer: `npm i -g @openai/codex`

---

### Aider

```bash
openrat install --target aider
```

Escreve `~/.aider.conf.yml` com `openai-api-base` e `openai-api-key`. Depois disso, execute `aider` normalmente — ele lê a configuração automaticamente.

> Requer: `pip install aider-chat`

---

### Continue.dev

```bash
openrat install --target continue-dev
```

Adiciona todos os provedores configurados como modelos OpenAI-compatible em `~/.continue/config.json`. Selecione "OpenRat — \<modelo\>" no seletor de modelos do VS Code ou JetBrains.

---

### Cline (VS Code)

```bash
openrat install --target cline
```

Define `cline.apiProvider = "openai"`, `cline.openAiBaseUrl`, `cline.openAiApiKey` e `cline.openAiModelId` no `settings.json` do VS Code. Recarregue a janela para aplicar.

---

### Roo Code (VS Code)

```bash
openrat install --target roo-code
```

Define as chaves equivalentes `roo-cline.*` no `settings.json` do VS Code. Recarregue a janela para aplicar.

---

### OpenCode (SST)

```bash
openrat install --target opencode
```

Escreve `~/.config/opencode/config.json` com um provedor OpenAI-compatible apontando para o gateway local. Execute `opencode` normalmente após a instalação.

> Requer: `npm i -g opencode-ai`

---

### Goose (Block)

```bash
openrat install --target goose
```

Escreve `~/.config/goose/config.yaml` com `GOOSE_PROVIDER=openai` e a URL do gateway. Execute `goose session` normalmente após a instalação.

---

### Cursor

```bash
openrat install --target cursor
```

Injeta `cursor.general.openAIBaseUrl` e `cursor.general.openAIApiKey` no `settings.json` do Cursor. Reinicie o Cursor para aplicar.

> Observação: A página de configurações da interface do Cursor pode sobrescrever esses valores. Verifique em **Settings → Models** após reiniciar.

---

### Amp (Sourcegraph)

```bash
openrat install --target amp
```

Escreve `~/.config/amp/settings.json` com um provedor `openai-compatible`. Execute `amp` normalmente após a instalação.

> Requer: `npm i -g @sourcegraph/amp`

---

### Plandex

```bash
openrat install --target plandex
```

Cria o launcher `plandex-openrat` com `OPENAI_API_KEY` e `OPENAI_API_BASE_URL` pré-configurados. Use `plandex-openrat` no lugar de `plandex`.

> Requer: `curl -sL https://plandex.ai/install.sh | bash`

---

### OpenClaw

```bash
openrat install --target openclaw
```

Adiciona um provedor customizado `llm-pool` em `~/.openclaw/openclaw.json` apontando para o gateway local.

---

### VS Code — extensão OpenClaude

```bash
openrat install --target vscode-openclaude
```

Registra o caminho do launcher no `settings.json` do VS Code sob `openclaude.launchCommand`.

---

### Python — openai SDK

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://127.0.0.1:4419/v1",
    api_key="openrat-local"
)

response = client.chat.completions.create(
    model="gemini-2.5-flash",
    messages=[{"role": "user", "content": "Olá!"}]
)
```

### Python — LangChain

```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    base_url="http://127.0.0.1:4419/v1",
    api_key="openrat-local",
    model="gemini-2.5-flash"
)
```

### Node.js / TypeScript

```typescript
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "http://127.0.0.1:4419/v1",
  apiKey: "openrat-local"
});

const response = await client.chat.completions.create({
  model: "gemini-2.5-flash",
  messages: [{ role: "user", content: "Olá!" }]
});
```

### Roteamento de modelos

```
model: "gemini-2.5-flash"    →  provedor gemini-flash (correspondência exata)
model: "flash"                →  provedor gemini-flash (via apelido)
model: "modelo-desconhecido"  →  provedor routes.default (fallback)
```

### Health check

```bash
curl http://127.0.0.1:4419/health
# {"ok":true,"version":"2.0.0"}
```

Útil para scripts, pipelines de CI/CD ou para confirmar que o gateway está ativo antes de enviar requisições.

---

## Modo Background

Após iniciar o gateway com `openrat gateway` ou `openrat multi start`, o menu interativo pós-start oferece a opção **"Rodar em background"**. Isso desacopla o OpenRat do seu terminal completamente:

- O processo se re-spawna em modo detached e o terminal é liberado imediatamente
- Um **arquivo PID** é gravado em `~/.openrat/openrat.pid`
- Um **script de parada** é criado em `~/.openrat/stop.sh`
- No Linux com `python3` + `gir1.2-appindicator3` instalados, um **ícone de bandeja do sistema** aparece com as opções "Abrir Dashboard" e "Parar OpenRat"

**Para parar uma instância em background:**

```bash
bash ~/.openrat/stop.sh
```

Se o ícone de bandeja não estiver disponível (não é Linux ou falta python3/GTK), o OpenRat continua rodando silenciosamente em background e registra uma nota em `~/.openrat/openrat.log`.

---

## Modo Multi-Instância

Cada conta do OpenRouter (ou qualquer provedor com plano gratuito) tem seus próprios limites de taxa por minuto/dia. Com o modo multi-instância, você executa **N gateways simultaneamente**, cada um com sua própria chave — multiplicando o throughput por N.

**Exemplo com 3 chaves gratuitas do OpenRouter:**

```
rat-1 → porta 4419 → chave sk-or-v1-CHAVE_1
rat-2 → porta 4421 → chave sk-or-v1-CHAVE_2
rat-3 → porta 4423 → chave sk-or-v1-CHAVE_3
```

Cada ferramenta aponta para uma porta diferente. Resultado: **3× mais requisições simultâneas**.

### Configuração

```bash
openrat multi init
# Edite o arquivo gerado e defina suas chaves reais
openrat multi start
```

O **dashboard central** é iniciado na porta `4400` por padrão e exibe todas as instâncias em uma única tela.

Exemplo de configuração: [`examples/openrat.multi.example.json`](examples/openrat.multi.example.json)

### Referência da config multi-instância

```jsonc
{
  "basePort": 4419,       // Porta base para auto-numeração (opcional).
                          // Se definida, você pode omitir "port" de cada instância —
                          // instância 0 = basePort, instância 1 = basePort+2, etc.
  "instances": [
    {
      "name": "rat-1",
      "port": 4419,               // Porta do gateway (opcional se basePort estiver definido)
      "dashboardPort": 4420,      // Porta do painel (padrão: port + 1)
      "masterKey": "openrat-local",
      "rotation": "round-robin",
      "routes": { "default": "openrouter" },
      "providers": {
        "openrouter": {
          "type": "openai-compatible",
          "model": "tencent/hy3-preview:free",
          "baseUrl": "https://openrouter.ai/api/v1",
          "apiKeys": ["sk-or-v1-SUA-CHAVE-1"],
          "supportedEndpoints": ["chat/completions"]
        }
      }
    }
  ]
}
```

---

## Segurança

- O gateway escuta em `127.0.0.1` por padrão — **acessível apenas pela sua máquina**
- Nenhum dado é persistido além da memória do processo
- Nenhuma telemetria é enviada a servidores externos
- As requisições vão da sua máquina **diretamente para o provedor** — sem intermediários
- Use `openrat.config.local.json` para chaves de API reais (ignorado pelo `.gitignore`)
- Para expor na rede local, altere `host` para `"0.0.0.0"` e configure um firewall

---

## Estrutura do Projeto

```
openrat/
├── src/
│   ├── index.ts            # CLI — analisa comandos e despacha handlers
│   ├── gateway.ts          # Servidor gateway HTTP principal
│   ├── dashboard.ts        # Painel visual para instância única
│   ├── multi-dashboard.ts  # Dashboard central para modo multi-instância
│   ├── config.ts           # Carregamento e validação de configuração
│   ├── multi-config.ts     # Carregamento e validação de configuração multi
│   ├── orchestrator.ts     # Inicia e gerencia N instâncias paralelas
│   ├── providers.ts        # Resolução de provedor por modelo/apelido
│   ├── stats.ts            # Rastreamento de tokens e custo (em memória)
│   ├── healthcheck.ts      # Lógica de validação de chaves de API
│   ├── install.ts          # Auto-configuração de 13 ferramentas de IA
│   ├── detect.ts           # Detecta clientes de IA instalados
│   ├── menu.ts             # Menu interativo no terminal + servidor do gerenciador
│   ├── background.ts       # Modo background / daemon (PID file, script de parada)
│   ├── tray.ts             # Ícone de bandeja do sistema (Linux, python3 + GTK)
│   ├── types.ts            # Tipos TypeScript compartilhados
│   ├── utils.ts            # Funções auxiliares compartilhadas
│   └── fs.ts               # Funções auxiliares para leitura/escrita de JSON
├── test/
│   ├── config.test.ts
│   ├── install.test.ts
│   └── multi-config.test.ts
├── examples/
│   ├── openrat.config.example.json
│   └── openrat.multi.example.json
├── openrat-manager.html    # Interface visual standalone do gerenciador (aberta por `openrat manager`)
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE
├── package.json
└── tsconfig.json
```

### Fluxo de requisição

```
Cliente → Gateway (porta 4419)
  │
  ├─ Autenticar masterKey (Authorization: Bearer ou X-API-Key)
  ├─ Analisar corpo JSON da requisição (limite: 10 MB)
  ├─ Resolver provedor (pelo campo "model" ou apelidos configurados)
  ├─ Verificar: agendamento ativo? limite de gasto OK?
  ├─ Selecionar chave disponível (fill-first ou round-robin)
  │    └─ Filtra chaves em cooldown ou com limite de gasto atingido
  ├─ Encaminhar requisição para o provedor real
  ├─ Em caso de falha reprocessável: marcar cooldown, tentar próxima chave
  ├─ Rastrear tokens e custo no StatsTracker
  └─ Retornar resposta ao cliente (suporta streaming SSE)
```

---

## Contribuindo

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para configuração, estilo de código e diretrizes de PR.

---

## Licença

AGPL-3.0 — open source protegido. Modificações e uso como serviço devem manter o código aberto.

---

<div align="center">
Feito com 🐀 no Brasil 🇧🇷
</div>
