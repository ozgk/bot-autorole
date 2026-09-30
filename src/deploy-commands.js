/**
 * Registra os slash commands na API do Discord.
 *   npm run deploy            -> registra no DEV_GUILD_ID (se definido) ou global
 *   npm run deploy -- --clear -> remove todos os comandos registrados
 */
import { REST, Routes } from 'discord.js';
import { config } from './config.js';
import { loadCommands, uniqueCommands } from './lib/commandLoader.js';
import { logger } from './lib/logger.js';

async function main() {
  await loadCommands();

  const body = uniqueCommands()
    .filter((command) => typeof command.slash === 'function')
    .map((command) => command.slash().toJSON());

  const rest = new REST().setToken(config.token);
  const route = config.devGuildId
    ? Routes.applicationGuildCommands(await fetchClientId(), config.devGuildId)
    : Routes.applicationCommands(await fetchClientId());

  if (process.argv.includes('--clear')) {
    await rest.put(route, { body: [] });
    logger.ok(`Comandos removidos de ${config.devGuildId ?? 'global'}.`);
    return;
  }

  const result = await rest.put(route, { body });
  logger.ok(
    `${result.length} slash command(s) registrados em ${config.devGuildId ?? 'global'}.`,
  );

  if (!config.devGuildId) {
    logger.warn('Registro global pode levar ate 1 hora para aparecer. Use DEV_GUILD_ID para testes.');
  }
}

let cachedClientId = null;

async function fetchClientId() {
  if (cachedClientId) return cachedClientId;
  const rest = new REST().setToken(config.token);
  const me = await rest.get(Routes.currentApplication());
  cachedClientId = me.id;
  return cachedClientId;
}

main().catch((error) => {
  logger.error('Falha ao registrar os comandos:', error);
  process.exit(1);
});
