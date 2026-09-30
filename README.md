# Panela Bot

Bot de Discord completo com **cargo automático na entrada** (autorole), painel interativo de configuração (`!panela` / `/panela`), **lock/unlock de canais e categorias**, e comandos de moderação.

Feito em **Node.js (ES Modules) + discord.js v14** — compatível tanto com comandos por mensagem com prefixo dinâmico (`!`) quanto Slash Commands (`/`).

---

## Recursos Principais

- ⚡ **Autorole inteligente:** entrega múltiplos cargos instantaneamente na entrada do membro, com suporte opcional para bots e reatribuição retroativa (`apply`).
- 🔒 **Lock & Unlock granular e em massa:**
  - Trave apenas para `@everyone` ou para um `@Cargo` específico.
  - Trave por canal individual, categoria inteira ou servidor completo (`lockall`).
  - **Restauração fiel das permissões:** ao destravar, restaura exatamente os bitfields de allow/deny que existiam antes do lock.
- 🎛️ **Painel de Controle Unificado:** configure prefixo, canais de logs/auditoria, autorole e ative/desative o bot por servidor.
- 🤖 **Total Paridade:** Todos os comandos funcionam 100% tanto via prefixo (`!`) quanto via Slash Command (`/`).
- 🛡️ **Segurança e Hierarquia:** Verificação de permissões do usuário e do bot, verificação de hierarquia de cargos e proteção contra auto-bloqueio.

---

## Instalação

```bash
npm install
```

Copie `.env.example` para `.env` e preencha:

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DISCORD_TOKEN` | sim | Token do bot (Developer Portal → Bot → Reset Token) |
| `PREFIX` | não | Prefixo padrão dos comandos (padrão: `!`) |
| `OWNER_IDS` | não | IDs de usuários separados por vírgula para comandos de dono |
| `DEV_GUILD_ID` | não | ID do servidor de testes para registrar slash commands instantaneamente |

### Permissões que o bot precisa

No Developer Portal → **OAuth2 → URL Generator**, marque os escopos `bot` e `applications.commands`, com estas permissões:

- **Gerenciar Cargos** — autorole e `!role`
- **Gerenciar Canais** — lock/unlock
- **Ver Canais**, **Enviar Mensagens**, **Ler Histórico de Mensagens** — comandos por prefixo
- **Usar Comandos de Barra** — slash commands

> **Importante:** no Discord, o cargo do bot precisa estar posicionado **acima** dos cargos que ele gerencia na hierarquia do servidor.

### Scripts disponíveis

```bash
npm start          # Inicia o bot em producao
npm run dev        # Inicia em modo de desenvolvimento (com auto-reload do Node)
npm run deploy     # Registra os slash commands na API do Discord
npm test           # Executa os testes de fumaca automatizados
```

---

## Comandos

### `!panela` / `/panela` — Painel de Configuração

| Comando | O que faz |
| --- | --- |
| `!panela` ou `/panela status` | Exibe o painel completo de status e configuração do servidor |
| `!panela autorole add @Cargo` | Adiciona um ou mais cargos à lista de autorole |
| `!panela autorole remove @Cargo` | Remove um cargo da lista de autorole |
| `!panela autorole list` | Lista todos os cargos de autorole configurados |
| `!panela autorole clear` | Zera a lista de autorole do servidor |
| `!panela autorole on` / `off` | Liga ou desliga o autorole no servidor |
| `!panela autorole bots on` / `off` | Define se bots também devem receber os cargos de entrada |
| `!panela apply` | Aplica os cargos configurados a todos os membros atuais |
| `!panela prefix <novo>` | Altera o prefixo dos comandos de mensagem |
| `!panela logs #canal` | Define o canal de logs e auditoria (`logs off` para desativar) |
| `!panela reset` | Restaura todas as configurações do servidor para o padrão |
| `!panela on` / `!panela off` | Ativa ou desativa o bot no servidor |
| `!panela help` | Mostra o guia de uso e comandos |

> Marcar o bot no chat (`@PanelaBot`) sem nenhum texto também abre o painel de ajuda imediatamente.

### Moderação e Travamento de Chat

| Comando | O que faz |
| --- | --- |
| `!lock [motivo]` | Trava o canal atual para o `@everyone` |
| `!lock #canal [motivo]` | Trava um canal de texto específico |
| `!lock @Cargo [motivo]` | Trava o canal atual apenas para um cargo específico |
| `!lock #canal @Cargo [motivo]` | Trava um canal específico apenas para um cargo |
| `!unlock` | Destrava o canal atual e **restaura as permissões exatas anteriores** |
| `!unlock #canal` | Destrava um canal específico |
| `!unlock @Cargo` | Destrava apenas o cargo no canal atual |
| `!unlock #canal @Cargo` | Destrava o cargo no canal específico |
| `!lockall` | Mostra explicação de segurança e instruções de confirmação |
| `!lockall raid` | Confirma e trava **todos os canais** gerenciáveis do servidor |
| `!lockall #categoria` | Trava todos os canais de uma categoria específica |
| `!unlockall` | Destrava todos os canais que foram travados pelo bot |
| `!unlockall #categoria` | Destrava todos os canais travados de uma categoria |
| `!role add @membro @cargo` | Adiciona um cargo a um membro |
| `!role remove @membro @cargo` | Remove um cargo de um membro |

### Geral

| Comando | O que faz |
| --- | --- |
| `!ping` / `/ping` | Exibe a latência do WebSocket, tempo de resposta, uptime e uso de memória |
| `!help` / `/help` | Guia completo de comandos com exemplos e sintaxe |

---

## Estrutura do Projeto

```
src/
  index.js              # Entrada: inicializacao de intents, eventos e encerramento limpo
  config.js             # Validacao e leitura das variaveis do .env
  deploy-commands.js    # Script de registro dos Slash Commands na API do Discord
  commands/
    panela.js           # Painel de controle, autorole e configuracoes
    lock.js             # Travamento de canal (everyone ou por cargo)
    unlock.js           # Destravamento de canal com restauracao fiel
    lockall.js          # Travamento em massa (categoria ou servidor inteiro)
    unlockall.js        # Destravamento em massa
    role.js             # Atribuicao e remocao de cargos de membros
    ping.js             # Status de conexao, latencia e estatisticas
    help.js             # Guia interativo de ajuda e sintaxe
  events/
    ready.js            # Notificacao de inicializacao e presenca do bot
    messageCreate.js    # Roteamento de comandos por prefixo e mencao direta
    interactionCreate.js# Roteamento e tratamento de Slash Commands
    guildMemberAdd.js   # Entrega automatica de autorole ao entrar novo membro
    guildRoleDelete.js  # Limpeza automatica de cargos apagados no servidor
    channelDelete.js    # Limpeza automatica de locks e logs de canais apagados
  lib/
    commandLoader.js    # Carregamento dinamico dos comandos em src/commands/
    eventLoader.js      # Registro automatico dos ouvintes de eventos em src/events/
    context.js          # CommandContext unificado (prefixo e slash na mesma API)
    store.js            # Armazenamento atomico com debounce em data/data.json
    lock.js             # Snapshot e restauracao avancada de permissoes
    autorole.js         # Logica de verificacao e atribuicao de autorole
    permissions.js      # Validacao de permissoes de usuario e bot
    resolvers.js        # Resolucao flexivel de membros, cargos e canais
    embeds.js           # Padrao visual de embeds (sucesso, aviso, erro, info)
    args.js             # Parser de argumentos e switches com suporte a aspas
    logger.js           # Logger colorido com timestamps no console
scripts/
  smoke-test.js         # Suite de testes automatizados sem dependencia de rede
```

---

## Armazenamento e Tolerância a Falhas

- As configurações persistem em `data/data.json` através de escrita atômica (gravação em `.tmp` + `rename`) com debounce de 250ms.
- Em caso de arquivo JSON corrompido por encerramento abrupto do sistema, o bot cria automaticamente uma cópia de segurança (`data.json.corrompido-<timestamp>`) e reinicia o estado limpo sem travar.
