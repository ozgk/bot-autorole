import { Events } from 'discord.js';
import { guildConfig, save } from '../lib/store.js';
import { logger } from '../lib/logger.js';

/** Limpa registros de canais deletados (locks e canal de log). */
export async function handleChannelDelete(channel) {
  if (!channel.guild) return;

  const cfg = guildConfig(channel.guild.id);
  let changed = false;

  if (cfg.logChannelId === channel.id) {
    cfg.logChannelId = null;
    changed = true;
    logger.warn(`Canal de logs apagado em ${channel.guild.name}; desativado.`);
  }

  for (const [key, lock] of Object.entries(cfg.locks)) {
    if (lock.channelId === channel.id || key.startsWith(`${channel.id}:`)) {
      delete cfg.locks[key];
      changed = true;
    }
  }

  if (changed) {
    save();
    logger.info(`Limpeza automatica de dados do canal apagado "${channel.name}" em ${channel.guild.name}.`);
  }
}

export const name = Events.ChannelDelete;
export const execute = handleChannelDelete;
