<div align="center">

# 🐀 OpenRat

**Gateway OpenAI-compatível local — roteie requisições entre múltiplos provedores de IA com rotação inteligente de chaves, limites de gasto, agendamento e painel visual.**

[![CI](https://github.com/robervala138-coder/openrat/actions/workflows/ci.yml/badge.svg)](https://github.com/robervala138-coder/openrat/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.0.0-green)](https://nodejs.org)

> Node.js puro. Sem banco de dados. Sem Docker. Sem Bun. Sem dependências externas de runtime.

[Funcionalidades](#funcionalidades) · [Início Rápido](#início-rápido) · [Configuração](#configuração) · [Referência CLI](#referência-cli) · [Integrações](#integrações) · [Modo Multi-Instância](#modo-multi-instância) · [Contribuindo](CONTRIBUTING.md)

</div>

---

## O que é o OpenRat?

O OpenRat é um gateway HTTP local que expõe uma **API compatível com OpenAI** (`/v1/chat/completions`, `/v1/responses`, `/v1/models`) e encaminha requisições para os provedores reais que você configurar — Google AI Studio, xAI (Grok), DeepSeek, OpenRouter ou qualquer serviço compatível com OpenAI.

Você aponta seu cliente (Claude Code, VS Code, LangChain, openai SDK…) para `http://127.0.0.1:4419` uma única vez, e o OpenRat cuida do resto: qual provedor usar, qual chave está disponível, quanto foi gasto, se está dentro da janela de agendamento, fallback automático e muito mais.

```
Seu cliente (LangChain, Claude Code, VS Code, openai SDK...)
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
| Auto-configuração para Claude Code / VS Code / OpenClaw | ✅ |

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

Isso cria o arquivo `openrat.config.json` no diretório atual. Edite-o e substitua as chaves de API de exemplo pelas suas chaves reais.

> 💡 **Dica:** Para suas chaves reais, use `openrat.config.local.json` — ele já está no `.gitignore`.

### 2. Referência do arquivo de configuração

```jsonc
{
  "server": {
    "host": "127.0.0.1",      // Endereço de escuta (padrão: 127.0.0.1)
    "port": 4419,              // Porta do gateway (padrão: 4419)
    "masterKey": "openrat-local", // Chave de autenticação enviada pelo seu cliente
    "rotation": "round-robin"  // "round-robin" | "fill-first"
  },
  "routes": {
    "default": "gemini-flash"  // ID do provedor de fallback
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
      "apiKeys": ["sk-key-1", "sk-key-2"]
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

### Estratégias de rotação de chaves

| Estratégia | Comportamento |
|---|---|
| `fill-first` | Usa a primeira chave disponível até atingir seu limite, depois passa para a próxima |
| `round-robin` | Distribui as requisições de forma uniforme entre todas as chaves disponíveis |

### Cooldowns de erro

Quando uma chave retorna um erro, ela é colocada em cooldown automaticamente:

| Erro | Cooldown |
|---|---|
| 401 Não autorizado | 24 horas |
| 429 Limite de taxa | 60 segundos |
| 5xx Erro no servidor | 30 segundos |
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

### Comandos multi-instância

```bash
openrat multi init  [--config CAMINHO]                                    # Criar openrat.multi.json
openrat multi start [--config CAMINHO] [--central-dashboard-port PORTA]   # Iniciar todas as instâncias
```

### Opções

| Opção | Descrição |
|---|---|
| `--config CAMINHO` | Caminho para o arquivo de configuração (padrão: `./openrat.config.json`) |
| `--target ALVO` | Alvo de instalação: `openclaude`, `openclaw`, `vscode-openclaude` |
| `--central-dashboard-port PORTA` | Porta do dashboard central no modo multi (padrão: `4400`) |

---

## Integrações

O OpenRat expõe uma API 100% compatível com OpenAI. Qualquer cliente que aceite `OPENAI_BASE_URL` funciona.

### Variáveis de ambiente universais

```bash
export OPENAI_BASE_URL="http://127.0.0.1:4419/v1"
export OPENAI_API_KEY="openrat-local"
export OPENAI_MODEL="gemini-2.5-flash"   # qualquer apelido configurado
```

### Claude Code

```bash
openrat install --target openclaude
```

Ou manualmente em `~/.claude/settings.json`:

```json
{
  "env": {
    "ANTHROPIC_API_KEY": "openrat-local",
    "ANTHROPIC_BASE_URL": "http://127.0.0.1:4419"
  }
}
```

### VS Code (extensão OpenClaude)

```bash
openrat install --target vscode-openclaude
```

### OpenClaw

```bash
openrat install --target openclaw
```

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
model: "gemini-2.5-flash"   →  provedor gemini-flash (correspondência exata)
model: "flash"               →  provedor gemini-flash (via apelido)
model: "modelo-desconhecido" →  provedor routes.default (fallback)
```

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

---

## Segurança

- O gateway escuta em `127.0.0.1` por padrão — **acessível apenas pela sua máquina**
- Nenhum dado é persistido além da memória do processo
- Nenhuma telemetria é enviada a servidores externos
- As requisições vão da sua máquina **diretamente para o provedor** — sem intermediários
- Use `openrat.config.local.json` para chaves de API reais (já está no `.gitignore`)
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
│   ├── multi-config.ts     # Carregamento e validação de configuração multi-instância
│   ├── orchestrator.ts     # Inicia e gerencia N instâncias paralelas
│   ├── providers.ts        # Resolução de provedor por modelo/apelido
│   ├── stats.ts            # Rastreamento de tokens e custo (em memória)
│   ├── healthcheck.ts      # Lógica de validação de chaves de API
│   ├── install.ts          # Auto-configuração de clientes
│   ├── detect.ts           # Detecta clientes de IA instalados
│   ├── menu.ts             # Menu interativo no terminal + servidor do gerenciador
│   ├── types.ts            # Tipos TypeScript compartilhados
│   ├── utils.ts            # Funções auxiliares compartilhadas
│   └── fs.ts               # Funções auxiliares para leitura/escrita de JSON
├── test/
│   ├── config.test.ts          # Testes de normalização e validação de configuração
│   ├── install.test.ts         # Testes do comando install
│   └── multi-config.test.ts    # Testes de resolução de portas multi-instância
├── examples/
│   ├── openrat.config.example.json  # Exemplo de configuração para instância única
│   └── openrat.multi.example.json   # Exemplo de configuração multi-instância
├── openrat-manager.html        # Gerenciador visual standalone (navegador)
├── openrat.multi.json          # Configuração multi-instância (placeholder)
├── .github/
│   ├── workflows/ci.yml        # GitHub Actions CI
│   ├── ISSUE_TEMPLATE/         # Templates para bug report e solicitação de funcionalidade
│   └── PULL_REQUEST_TEMPLATE/  # Template de PR
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE
├── package.json
├── tsconfig.json
└── .gitignore
```

### Fluxo de requisição

```
Cliente → Gateway (porta 4419)
  │
  ├─ Autenticar masterKey (Authorization: Bearer ou X-API-Key)
  ├─ Analisar corpo JSON da requisição
  ├─ Resolver provedor (pelo campo "model" ou apelidos configurados)
  ├─ Verificar: agendamento ativo? limite de gasto OK?
  ├─ Selecionar chave disponível (fill-first ou round-robin)
  │    └─ Filtra chaves em cooldown ou com limite de gasto atingido
  ├─ Encaminhar requisição para o provedor real
  ├─ Em caso de falha reprocessável: marcar cooldown, tentar próxima chave
  ├─ Rastrear tokens e custo no StatsTracker (apenas respostas JSON)
  └─ Retornar resposta ao cliente (suporta streaming SSE)
```

---

## Contribuindo

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para configuração, estilo de código e diretrizes de PR.

---

## Licença

MIT — veja [LICENSE](LICENSE).

---

<div align="center">
Feito com 🐀 no Brasil 🇧🇷
</div>
