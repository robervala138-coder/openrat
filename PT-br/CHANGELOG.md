# Changelog

Todas as mudanças relevantes no OpenRat estão documentadas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
A versionamento segue o [Semantic Versioning](https://semver.org/).

---

## [2.0.0] — 2026-04-24

### Adicionado
- Menu interativo no terminal (`openrat` sem argumentos)
- Gerenciador visual no navegador (`openrat manager`)
- Modo multi-instância (`openrat multi start`) — execute N gateways em paralelo
- Dashboard central agregando todas as instâncias em execução
- Comando `openrat check` para validar todas as chaves de API configuradas
- Comando `openrat status` para exibir resumo dos provedores
- Comando `openrat detect` para detectar clientes de IA instalados
- Comando `openrat install` para auto-configurar Claude Code, VS Code e OpenClaw
- Limites de gasto: tetos diários e mensais em USD por provedor
- Agendamento por horário: restrinja provedores a intervalos específicos
- Estratégias de rotação de chaves round-robin e fill-first
- Rastreamento de tokens e custo estimado por chave (em memória)
- Sistema de cooldown por chave após erros
- Roteamento de modelos por apelido (mapeie qualquer nome a um provedor)
- Gerenciador HTML standalone completamente independente (`openrat-manager.html`)
- Configurações de exemplo em `examples/`

### Corrigido
- **Crítico:** Respostas em streaming (SSE) eram totalmente armazenadas em memória antes de serem encaminhadas ao cliente, interrompendo a saída em tempo real. Corrigido clonando apenas respostas não-streaming.
- **Normalização de configuração:** `dashboardPort` e `rotation` eram silenciosamente descartados durante a normalização, sempre usando os valores padrão `port+1` e `fill-first`. Ambos agora são preservados corretamente.
- **Alocação de portas multi-instância:** `resolveAllInstances` avançava o cursor de porta mesmo para instâncias com portas explícitas, causando atribuições incorretas para instâncias subsequentes. Corrigido com lógica separada para portas explícitas e auto-atribuídas.
- **Duplicação no CLI:** `index.ts` continha toda a lógica de comandos duplicada entre `runCommand()` e `main()`. Refatorado em funções handler individuais com um único dispatcher.
- **Rótulo do menu:** O item "Menu Interativo" abria o gerenciador no navegador. Rótulo corrigido para "Manager Visual (Browser)".
- **`openrat multi` sem subcomando:** Anteriormente disparava `showStartupMenu()` recursivamente, arriscando stack overflow. Agora exibe a ajuda e encerra.

### Alterado
- Versão atualizada para `2.0.0` para refletir o escopo das novas funcionalidades e correções
- Campos `author`, `repository`, `homepage` e `bugs` do `package.json` atualizados

---

## [0.1.0] — Lançamento inicial

- Gateway básico compatível com OpenAI
- Suporte aos provedores Google AI Studio, xAI (Grok) e compatíveis com OpenAI
- Arquivo de configuração JSON (`openrat.config.json`)
- Painel básico
