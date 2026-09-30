import { guildConfig } from './store.js';
import { logger } from './logger.js';

/** Envia uma mensagem no canal de logs configurado do servidor (se houver). */
export async function sendGuildLog(guild, payload) {
  const { logChannelId } = guildConfig(guild.id);
  if (!logChannelId) return;

  const channel =
    guild.channels.cache.get(logChannelId) ??
    (await guild.channels.fetch(logChannelId).catch(() => null));

  if (!channel?.isTextBased()) return;

  try {
    await channel.send(payload);
  } catch (error) {
    logger.warn(`Nao consegui enviar log no canal ${logChannelId} de ${guild.name}: ${error.message}`);
  }
}
