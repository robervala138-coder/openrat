# Contribuindo com o OpenRat

Obrigado pelo seu interesse em contribuir! Este documento explica como começar.

---

## Sumário

- [Configuração do Ambiente de Desenvolvimento](#configuração-do-ambiente-de-desenvolvimento)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Executando os Testes](#executando-os-testes)
- [Enviando Alterações](#enviando-alterações)
- [Estilo de Código](#estilo-de-código)
- [Reportando Problemas](#reportando-problemas)

---

## Configuração do Ambiente de Desenvolvimento

**Requisitos:** Node.js >= 22.0.0

```bash
# 1. Faça um fork e clone o repositório
git clone https://github.com/SEU_USUARIO/openrat.git
cd openrat

# 2. Instale as dependências
npm install

# 3. Compile o projeto
npm run build

# 4. Execute os testes
npm test
```

---

## Estrutura do Projeto

```
src/
├── index.ts          # Ponto de entrada da CLI — analisa comandos e despacha handlers
├── gateway.ts        # Servidor gateway HTTP principal
├── dashboard.ts      # Servidor do painel para instância única
├── multi-dashboard.ts# Dashboard central para modo multi-instância
├── config.ts         # Carregamento e validação de configuração
├── multi-config.ts   # Carregamento e validação de configuração multi-instância
├── orchestrator.ts   # Inicia e gerencia N instâncias paralelas
├── providers.ts      # Resolução de provedor por modelo/apelido
├── stats.ts          # Rastreamento de tokens e custo (em memória)
├── healthcheck.ts    # Lógica de validação de chaves de API
├── install.ts        # Lógica de auto-configuração de clientes
├── detect.ts         # Detecta clientes de IA instalados
├── menu.ts           # Menu interativo no terminal + servidor do gerenciador
├── types.ts          # Tipos TypeScript compartilhados
├── utils.ts          # Funções auxiliares compartilhadas
└── fs.ts             # Funções auxiliares para leitura/escrita de JSON

test/
├── config.test.ts        # Testes de normalização e validação de configuração
├── install.test.ts       # Testes do comando install
└── multi-config.test.ts  # Testes de resolução de portas multi-instância

examples/
├── openrat.config.example.json  # Exemplo de configuração para instância única
└── openrat.multi.example.json   # Exemplo de configuração multi-instância
```

---

## Executando os Testes

```bash
npm test
```

Os testes usam o executor de testes nativo do Node.js (`node:test`) — nenhum framework de testes adicional é necessário.

Ao adicionar novas funcionalidades, inclua ou atualize o arquivo de teste correspondente.

---

## Enviando Alterações

1. **Faça um fork** do repositório
2. **Crie uma branch** a partir de `main`:
   ```bash
   git checkout -b feat/minha-funcionalidade
   # ou
   git checkout -b fix/meu-bug
   ```
3. **Faça suas alterações** — mantenha os commits focados e atômicos
4. **Execute os testes** para garantir que nada está quebrado:
   ```bash
   npm test
   ```
5. **Abra um Pull Request** apontando para `main` com uma descrição clara do que foi alterado e por quê

### Convenções de nomenclatura de branches

| Prefixo | Usar para |
|---|---|
| `feat/` | Novas funcionalidades |
| `fix/` | Correções de bugs |
| `docs/` | Alterações na documentação |
| `refactor/` | Refatoração de código |
| `test/` | Adições ou correções de testes |
| `chore/` | Manutenção, ferramentas |

---

## Estilo de Código

- O **modo strict do TypeScript** está habilitado — todos os tipos devem ser explícitos
- **Sem dependências externas de runtime** — o OpenRat funciona intencionalmente com Node.js puro
- Use o protocolo `node:` para importar módulos nativos (ex.: `import path from 'node:path'`)
- Mantenha as funções pequenas e focadas
- Adicione comentários JSDoc nas funções exportadas

---

## Reportando Problemas

Use a aba [Issues do GitHub](https://github.com/robervala138-coder/openrat/issues).

Ao reportar um bug, inclua:

- Versão do Node.js (`node --version`)
- Sistema operacional e versão
- O comando que você executou
- A saída completa do erro
- Sua configuração (com as chaves de API **ocultadas**)
