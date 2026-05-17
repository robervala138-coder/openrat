# OpenRat — Guia de Providers e Chaves de API

> Referência rápida para configurar providers no OpenRat.
> Cada seção contem: URL base, site para criar chave de API, modelos free disponiveis,
> link do GitHub (quando aplicavel) e instrucoes de instalacao.

---

## Sumario

1. [OpenRouter](#1-openrouter)
2. [Groq](#2-groq)
3. [Google AI Studio](#3-google-ai-studio)
4. [HuggingFace](#4-huggingface)
5. [Cloudflare Workers AI](#5-cloudflare-workers-ai)
6. [9Router](#6-9router)
7. [OmniRoute](#7-omniroute)
8. [NVIDIA NIM](#8-nvidia-nim)
9. [xAI (Grok)](#9-xai-grok)
10. [DeepSeek](#10-deepseek)
11. [Configuracao Rapida no OpenRat](#11-configuracao-rapida-no-openrat)

---

## 1. OpenRouter

**O que e:** Agregador de modelos — roteia requisições para dezenas de providers (Anthropic, Google, Meta, Qwen, etc.) com uma unica chave.

| Item | Valor |
|---|---|
| **Site para criar chave** | [https://openrouter.ai/settings/keys](https://openrouter.ai/settings/keys) |
| **URL base** | `https://openrouter.ai/api/v1` |
| **GitHub** | [https://github.com/openrouter-team/openrouter-runner](https://github.com/openrouter-team/openrouter-runner) |
| **Instalacao** | Nenhuma — servico em nuvem, basta criar conta e gerar chave |
| **Tipo no OpenRat** | `openai-compatible` |

### Modelos Free

```
deepseek/deepseek-r1:free
deepseek/deepseek-r1-0528:free
deepseek/deepseek-chat-v3-0324:free
meta-llama/llama-3.2-3b-instruct:free
meta-llama/llama-3.1-8b-instruct:free
meta-llama/llama-3.3-70b-instruct:free
qwen/qwen3-coder:free
qwen/qwen3-235b-a22b:free
google/gemma-3n:free
google/gemma-3-27b-it:free
moonshotai/kimi-k2:free
mistralai/mistral-small-3.1-24b-instruct:free
nvidia/nemotron-3-super:free
x-ai/grok-3-mini-beta:free
openai/gpt-oss-120b:free
```

### Como obter a chave

1. Acesse [https://openrouter.ai/settings/keys](https://openrouter.ai/settings/keys)
2. Crie uma conta (GitHub, Google ou email)
3. Clique em **"Create Key"**
4. Copie a chave (formato: `sk-or-v1-...`)
5. Cole no `apiKeys` do config do OpenRat

### Exemplo no openrat.config.json

```json
{
  "type": "openai-compatible",
  "model": "deepseek/deepseek-r1:free",
  "baseUrl": "https://openrouter.ai/api/v1",
  "apiKeys": ["sk-or-v1-SUA-CHAVE-AQUI"],
  "aliases": ["openrouter", "free"],
  "supportedEndpoints": ["chat/completions"]
}
```

---

## 2. Groq

**O que e:** Infraestrutura de inferencia ultra-rapida (LPU). Roda modelos open-source com latencia muito baixa.

| Item | Valor |
|---|---|
| **Site para criar chave** | [https://console.groq.com/keys](https://console.groq.com/keys) |
| **URL base** | `https://api.groq.com/openai/v1` |
| **GitHub** | [https://github.com/groq/groq-sdk](https://github.com/groq/groq-sdk) |
| **Instalacao** | Nenhuma — servico em nuvem, criar conta e gerar chave |
| **Tipo no OpenRat** | `openai-compatible` |

### Modelos Free

```
llama-3.3-70b-versatile
llama-3.1-8b-instant
deepseek-r1-distill-llama-70b
mixtral-8x7b-32768
gemma2-9b-it
qwen-qwq-32b
```

### Como obter a chave

1. Acesse [https://console.groq.com/keys](https://console.groq.com/keys)
2. Crie uma conta (GitHub ou Google)
3. Clique em **"Create API Key"**
4. Copie a chave (formato: `gsk_...`)
5. Cole no `apiKeys` do config do OpenRat

### Exemplo no openrat.config.json

```json
{
  "type": "openai-compatible",
  "model": "llama-3.3-70b-versatile",
  "baseUrl": "https://api.groq.com/openai/v1",
  "apiKeys": ["gsk_SUA-CHAVE-AQUI"],
  "aliases": ["groq", "llama-70b"],
  "supportedEndpoints": ["chat/completions"]
}
```

---

## 3. Google AI Studio

**O que e:** Plataforma oficial do Google para acessar modelos Gemini via API. Tem cota generosa gratuita.

| Item | Valor |
|---|---|
| **Site para criar chave** | [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| **URL base** | `https://generativelanguage.googleapis.com/v1beta/openai` |
| **GitHub** | N/A — servico gerenciado do Google |
| **Instalacao** | Nenhuma — servico em nuvem |
| **Tipo no OpenRat** | `google-ai-studio` |

### Modelos Free

```
gemini-2.5-pro
gemini-2.5-flash
gemini-2.0-flash
gemini-1.5-pro
gemini-1.5-flash
```

### Como obter a chave

1. Acesse [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Faca login com conta Google
3. Clique em **"Create API Key"**
4. Selecione um projeto Google Cloud (ou crie um novo)
5. Copie a chave (formato: `AIza...`)
6. Cole no `apiKeys` do config do OpenRat

### Exemplo no openrat.config.json

```json
{
  "type": "google-ai-studio",
  "model": "gemini-2.5-flash",
  "apiKeys": ["AIza-SUA-CHAVE-AQUI"],
  "aliases": ["gemini", "flash"],
  "costPer1MInputTokens": 0.075,
  "costPer1MOutputTokens": 0.30,
  "spendLimit": {
    "dailyUsd": 1.0,
    "monthlyUsd": 10.0
  }
}
```

> **Nota:** O tipo `google-ai-studio` no OpenRat ja configura a URL base automaticamente. Nao precisa de `baseUrl`.

---

## 4. HuggingFace

**O que e:** Plataforma de ML open-source com inference server gratuito para modelos populares.

| Item | Valor |
|---|---|
| **Site para criar chave** | [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) |
| **URL base** | `https://router.huggingface.co/v1` |
| **GitHub** | [https://github.com/huggingface/huggingface-inference-server](https://github.com/huggingface/huggingface-inference-server) |
| **Instalacao** | Nenhuma — servico em nuvem |
| **Tipo no OpenRat** | `openai-compatible` |

### Modelos Free

```
meta-llama/Llama-3.3-70B-Instruct
deepseek-ai/DeepSeek-R1
Qwen/Qwen2.5-Coder-32B-Instruct
mistralai/Mistral-7B-Instruct-v0.3
google/gemma-2-9b-it
microsoft/Phi-3-mini-4k-instruct
```

### Como obter a chave

1. Acesse [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Crie uma conta (email, GitHub ou Google)
3. Clique em **"New token"**
4. Selecione tipo **"Read"** (suficiente para inference)
5. Copie a chave (formato: `hf_...`)
6. Cole no `apiKeys` do config do OpenRat

### Exemplo no openrat.config.json

```json
{
  "type": "openai-compatible",
  "model": "Qwen/Qwen2.5-Coder-32B-Instruct",
  "baseUrl": "https://router.huggingface.co/v1",
  "apiKeys": ["hf_SUA-CHAVE-AQUI"],
  "aliases": ["huggingface", "qwen-coder"],
  "supportedEndpoints": ["chat/completions"]
}
```

---

## 5. Cloudflare Workers AI

**O que e:** Inference na edge da Cloudflare. Roda modelos diretamente nos data centers Cloudflare.

| Item | Valor |
|---|---|
| **Site para criar chave** | [https://dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) |
| **URL base** | `https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/v1` |
| **GitHub** | [https://github.com/cloudflare/workers-ai](https://github.com/cloudcare/workers-ai) |
| **Instalacao** | Nenhuma — servico em nuvem. Porem exige Account ID na URL |
| **Tipo no OpenRat** | `openai-compatible` |

### Modelos Free

```
@cf/meta/llama-3.1-8b-instruct
@cf/meta/llama-3.3-70b-instruct-fp8-fast
@cf/deepseek-ai/deepseek-r1-distill-qwen-32b
@cf/google/gemma-3-12b-it
@cf/mistral/mistral-7b-instruct-v0.2
@cf/qwen/qwen1.5-14b-chat-awq
```

### Como obter a chave

1. Acesse [https://dash.cloudflare.com](https://dash.cloudflare.com) e crie uma conta
2. Va em **Profile > API Tokens**
3. Clique em **"Create Token"**
4. Use o template **"Workers AI (Read)"** ou crie um custom com permissao `Workers AI:Read`
5. Copie o token
6. Encontre seu **Account ID** em: [https://dash.cloudflare.com](https://dash.cloudflare.com) -> sidebar direita
7. Substitua `{ACCOUNT_ID}` na URL base

### Exemplo no openrat.config.json

```json
{
  "type": "openai-compatible",
  "model": "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "baseUrl": "https://api.cloudflare.com/client/v4/accounts/SEU-ACCOUNT-ID/ai/v1",
  "apiKeys": ["SEU-TOKEN-AQUI"],
  "aliases": ["cloudflare", "cf-llama"],
  "supportedEndpoints": ["chat/completions"]
}
```

> **Importante:** Nao esqueca de substituir `{ACCOUNT_ID}` pelo seu Account ID real da Cloudflare.

---

## 6. 9Router

**O que e:** Roteador de APIs que agrega multiplos providers (Claude, Qwen, Gemini, DeepSeek etc.) em um unico endpoint.

| Item | Valor |
|---|---|
| **Site** | [https://9router.com](https://9router.com) |
| **URL base** | `http://localhost:20128/v1` |
| **GitHub** | N/A |
| **Instalacao** | Requer execucao local (docker ou binario) — veja o site |
| **Tipo no OpenRat** | `openai-compatible` |

### Modelos Free

```
kr/claude-sonnet-4.5
kr/claude-haiku-4.5
kr/glm-5
kr/qwen3-coder-next
kr/deepseek-3.2
if/kimi-k2-thinking
if/qwen3-coder-plus
if/deepseek-r1
qw/qwen3-coder-plus
qw/qwen3-coder-flash
gc/gemini-2.5-pro
oc/auto
```

### Como obter a chave

1. Acesse [https://9router.com](https://9router.com)
2. Siga as instrucoes de instalacao local
3. Configure conforme documentacao do site
4. O gateway roda localmente em `localhost:20128`

### Exemplo no openrat.config.json

```json
{
  "type": "openai-compatible",
  "model": "kr/claude-sonnet-4.5",
  "baseUrl": "http://localhost:20128/v1",
  "apiKeys": ["SUA-CHAVE-9ROUTER"],
  "aliases": ["9router", "claude-9r"],
  "supportedEndpoints": ["chat/completions"]
}
```

---

## 7. OmniRoute

**O que e:** Roteador de APIs similar ao 9Router, agregando varios providers em um endpoint local.

| Item | Valor |
|---|---|
| **Site** | [https://omniroute.online](https://omniroute.online) |
| **URL base** | `http://localhost:20128/v1` |
| **GitHub** | N/A |
| **Instalacao** | Requer execucao local — veja o site |
| **Tipo no OpenRat** | `openai-compatible` |

### Modelos Free

```
iflow/deepseek-r1
iflow/qwen3-coder-plus
iflow/kimi-k2-thinking
qwen/qwen3-coder-plus
kiro/claude-sonnet-4.5
kiro/glm-5
gemini/gemini-2.5-pro
openrouter/auto
nvidia/nemotron-3-super
cloudflare/deepseek-r1
glm/glm-5
deepseek/deepseek-v3
meta/llama-3.3-70b
google/gemma-3-27b
```

### Como obter a chave

1. Acesse [https://omniroute.online](https://omniroute.online)
2. Siga as instrucoes de instalacao e configuracao
3. O gateway roda localmente

### Exemplo no openrat.config.json

```json
{
  "type": "openai-compatible",
  "model": "kiro/claude-sonnet-4.5",
  "baseUrl": "http://localhost:20128/v1",
  "apiKeys": ["SUA-CHAVE-OMNIROUTE"],
  "aliases": ["omniroute", "claude-omni"],
  "supportedEndpoints": ["chat/completions"]
}
```

---

## 8. NVIDIA NIM

**O que e:** Plataforma de inference da NVIDIA com modelos otimizados para GPU. Free tier com cota limitada.

| Item | Valor |
|---|---|
| **Site para criar chave** | [https://build.nvidia.com](https://build.nvidia.com) |
| **URL base** | `https://integrate.api.nvidia.com/v1` |
| **GitHub** | [https://github.com/NVIDIA/nim](https://github.com/NVIDIA/nim) |
| **Instalacao** | Nenhuma — servico em nuvem. NIM self-host disponivel via Docker |
| **Tipo no OpenRat** | `openai-compatible` |

### Modelos Free

```
nvidia/llama-3.1-nemotron-70b-instruct
nvidia/nemotron-3-super
nvidia/nemotron-nano-9b-v2
meta/llama-3.3-70b-instruct
deepseek-ai/deepseek-r1
google/gemma-2-9b-it
```

### Como obter a chave

1. Acesse [https://build.nvidia.com](https://build.nvidia.com)
2. Crie uma conta (email ou GitHub)
3. Clique em **"Get API Key"** no canto superior direito
4. Aceite os termos de uso
5. Copie a chave (formato: `nvapi-...`)
6. Cole no `apiKeys` do config do OpenRat

### Exemplo no openrat.config.json

```json
{
  "type": "openai-compatible",
  "model": "nvidia/llama-3.1-nemotron-70b-instruct",
  "baseUrl": "https://integrate.api.nvidia.com/v1",
  "apiKeys": ["nvapi-SUA-CHAVE-AQUI"],
  "aliases": ["nvidia", "nemotron"],
  "supportedEndpoints": ["chat/completions"]
}
```

### Instalacao Self-Host (opcional)

```bash
# Requer Docker e uma GPU NVIDIA
docker pull nvcr.io/nim/meta/llama-3.3-70b-instruct:latest
docker run --gpus all -p 8000:8000 nvcr.io/nim/meta/llama-3.3-70b-instruct:latest
# URL base local: http://localhost:8000/v1
```

---

## 9. xAI (Grok)

**O que e:** API oficial da xAI para acessar os modelos Grok (da equipe do Elon Musk).

| Item | Valor |
|---|---|
| **Site para criar chave** | [https://console.x.ai](https://console.x.ai) |
| **URL base** | `https://api.x.ai/v1` (configurado automaticamente pelo OpenRat) |
| **GitHub** | N/A |
| **Instalacao** | Nenhuma — servico em nuvem |
| **Tipo no OpenRat** | `xai` |

### Modelos Disponiveis

```
grok-3-mini
grok-3
grok-2
grok-2-mini
```

> **Nota:** Os modelos Grok nao sao gratuitos — possuem free trial com creditos iniciais.

### Como obter a chave

1. Acesse [https://console.x.ai](https://console.x.ai)
2. Crie uma conta
3. Va em **API Keys**
4. Clique em **"Create API Key"**
5. Copie a chave (formato: `xai-...`)
6. Cole no `apiKeys` do config do OpenRat

### Exemplo no openrat.config.json

```json
{
  "type": "xai",
  "model": "grok-3-mini",
  "apiKeys": ["xai-SUA-CHAVE-AQUI"],
  "aliases": ["grok", "grok-mini"]
}
```

> **Nota:** O tipo `xai` no OpenRat ja configura a URL base automaticamente. Nao precisa de `baseUrl`.

---

## 10. DeepSeek

**O que e:** Provider chines com modelos de codigo e raciocinio de alta qualidade. Precos muito baixos.

| Item | Valor |
|---|---|
| **Site para criar chave** | [https://platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys) |
| **URL base** | `https://api.deepseek.com/v1` |
| **GitHub** | [https://github.com/deepseek-ai](https://github.com/deepseek-ai) |
| **Instalacao** | Nenhuma — servico em nuvem |
| **Tipo no OpenRat** | `openai-compatible` |

### Modelos Disponiveis

```
deepseek-chat        (DeepSeek-V3)
deepseek-reasoner    (DeepSeek-R1)
```

> **Nota:** DeepSeek nao tem modelos 100% gratuitos, mas os precos sao muito baixos (~$0.27/1M input, ~$1.10/1M output).

### Como obter a chave

1. Acesse [https://platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys)
2. Crie uma conta (email ou GitHub)
3. Clique em **"Create API Key"**
4. Copie a chave (formato: `sk-...`)
5. Cole no `apiKeys` do config do OpenRat

### Exemplo no openrat.config.json

```json
{
  "type": "openai-compatible",
  "model": "deepseek-chat",
  "baseUrl": "https://api.deepseek.com/v1",
  "apiKeys": ["sk-SUA-CHAVE-AQUI"],
  "aliases": ["deepseek", "ds-chat"],
  "costPer1MInputTokens": 0.27,
  "costPer1MOutputTokens": 1.10
}
```

---

## 11. Configuracao Rapida no OpenRat

### Config completo com todos os providers free

Copie e cole no `~/.openrat/openrat.config.json`:

```json
{
  "server": {
    "host": "127.0.0.1",
    "port": 4419,
    "masterKey": "openrat-local",
    "rotation": "round-robin"
  },
  "routes": {
    "default": "gemini-flash"
  },
  "providers": {
    "gemini-flash": {
      "type": "google-ai-studio",
      "model": "gemini-2.5-flash",
      "aliases": ["gemini", "flash"],
      "apiKeys": ["AIza-SUA-CHAVE-GOOGLE"],
      "costPer1MInputTokens": 0.075,
      "costPer1MOutputTokens": 0.30,
      "spendLimit": { "dailyUsd": 1.0, "monthlyUsd": 10.0 }
    },
    "openrouter": {
      "type": "openai-compatible",
      "model": "deepseek/deepseek-r1:free",
      "baseUrl": "https://openrouter.ai/api/v1",
      "apiKeys": ["sk-or-v1-SUA-CHAVE-OPENROUTER"],
      "aliases": ["openrouter", "free"],
      "supportedEndpoints": ["chat/completions"]
    },
    "groq-llama": {
      "type": "openai-compatible",
      "model": "llama-3.3-70b-versatile",
      "baseUrl": "https://api.groq.com/openai/v1",
      "apiKeys": ["gsk_SUA-CHAVE-GROQ"],
      "aliases": ["groq", "llama-70b"],
      "supportedEndpoints": ["chat/completions"]
    },
    "huggingface": {
      "type": "openai-compatible",
      "model": "Qwen/Qwen2.5-Coder-32B-Instruct",
      "baseUrl": "https://router.huggingface.co/v1",
      "apiKeys": ["hf_SUA-CHAVE-HUGGINGFACE"],
      "aliases": ["hf", "qwen-coder"],
      "supportedEndpoints": ["chat/completions"]
    },
    "nvidia": {
      "type": "openai-compatible",
      "model": "nvidia/llama-3.1-nemotron-70b-instruct",
      "baseUrl": "https://integrate.api.nvidia.com/v1",
      "apiKeys": ["nvapi_SUA-CHAVE-NVIDIA"],
      "aliases": ["nvidia", "nemotron"],
      "supportedEndpoints": ["chat/completions"]
    },
    "cloudflare": {
      "type": "openai-compatible",
      "model": "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      "baseUrl": "https://api.cloudflare.com/client/v4/accounts/SEU-ACCOUNT-ID/ai/v1",
      "apiKeys": ["SEU-TOKEN-CLOUDFLARE"],
      "aliases": ["cf", "cf-llama"],
      "supportedEndpoints": ["chat/completions"]
    }
  }
}
```

### Instalar e rodar o OpenRat

```bash
# Clonar
git clone https://github.com/robervala138-coder/openrat.git
cd openrat

# Instalar dependencias
npm install

# Build
npm run build

# Instalar globalmente (opcional)
npm install -g .

# Rodar
openrat
```

### Comandos uteis

```bash
openrat init                          # Criar config de exemplo
openrat gateway                       # Subir gateway + dashboard
openrat manager                       # Abrir manager visual no browser
openrat check                         # Validar todas as chaves de API
openrat status                        # Ver status dos providers
openrat detect                        # Detectar ferramentas instaladas
openrat install --target openclaude   # Configurar Claude Code
openrat multi init                    # Criar config multi-instancia
openrat multi start                   # Subir todas as instancias
```

### Integracoes suportadas (13 ferramentas)

| Target | Ferramenta | Instalacao requerida |
|---|---|---|
| `openclaude` | Claude Code | `npm i -g openclaude` |
| `openclaw` | OpenClaw | Veja repositorio |
| `vscode-openclaude` | VS Code (ext. OpenClaude) | Instalar extensao |
| `aider` | Aider | `pip install aider-chat` |
| `continue-dev` | Continue.dev | Extensao VS Code / JetBrains |
| `cline` | Cline | Extensao VS Code |
| `roo-code` | Roo Code | Extensao VS Code |
| `opencode` | OpenCode (SST) | `npm i -g opencode-ai` |
| `codex-cli` | Codex CLI (OpenAI) | `npm i -g @openai/codex` |
| `goose` | Goose (Block) | `goose` binary |
| `cursor` | Cursor | [cursor.com](https://cursor.com) |
| `amp` | Amp (Sourcegraph) | `npm i -g @sourcegraph/amp` |
| `plandex` | Plandex | `curl -sL https://plandex.ai/install.sh \| bash` |

---

## Tabela Resumo — Sites para Criar Chave de API

| Provider | Site da Chave | Formato da Chave |
|---|---|---|
| OpenRouter | [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys) | `sk-or-v1-...` |
| Groq | [console.groq.com/keys](https://console.groq.com/keys) | `gsk_...` |
| Google AI Studio | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | `AIza...` |
| HuggingFace | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) | `hf_...` |
| Cloudflare | [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) | Token custom |
| NVIDIA NIM | [build.nvidia.com](https://build.nvidia.com) | `nvapi-...` |
| xAI (Grok) | [console.x.ai](https://console.x.ai) | `xai-...` |
| DeepSeek | [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys) | `sk-...` |
| 9Router | [9router.com](https://9router.com) | Config local |
| OmniRoute | [omniroute.online](https://omniroute.online) | Config local |
