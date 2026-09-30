import { Client, GatewayIntentBits, Partials, ActivityType } from 'discord.js';
import { config } from './config.js';
import { logger } from './lib/logger.js';
import { loadCommands, commands } from './lib/commandLoader.js';
import { loadEvents } from './lib/eventLoader.js';
import * as store from './lib/store.js';
import { startHealthCheck, stopHealthCheck } from './lib/healthcheck.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // autorole na entrada
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // comandos por prefixo (!panela)
    GatewayIntentBits.GuildModeration, // logs de auditoria
  ],
  // Membros podem chegar como parcial em algumas situacoes; o autorole lida com isso.
  partials: [Partials.GuildMember, Partials.Channel],
});

// ---- Encerramento limpo -------------------------------------------------
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.warn(`Recebido ${signal}. Gravando dados e desconectando...`);
  try {
    stopHealthCheck();
    await store.flush();
    await client.destroy();
    logger.ok('Tchau!');
  } catch (error) {
    logger.error('Erro ao encerrar:', error);
  } finally {
    process.exit(0);
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => void shutdown(signal));
}

process.on('unhandledRejection', (error) => logger.error('Promise rejeitada sem catch:', error));
process.on('uncaughtException', (error) => logger.error('Excecao nao tratada:', error));

// ---- Inicializacao ------------------------------------------------------
async function main() {
  await store.init();
  await loadCommands();
  await loadEvents(client);
  startHealthCheck(client);
  await client.login(config.token);
}



main().catch((error) => {
  logger.error('Falha ao iniciar o bot:', error);
  process.exit(1);
});
