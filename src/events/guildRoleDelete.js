import { Events } from 'discord.js';
import { guildConfig, save } from '../lib/store.js';
import { logger } from '../lib/logger.js';

/** Avisa se um cargo configurado como autorole for apagado do servidor e limpa locks orfaos. */
export async function handleRoleDelete(role) {
  const cfg = guildConfig(role.guild.id);
  let changed = false;

  const index = cfg.autorole.roles.indexOf(role.id);
  if (index !== -1) {
    cfg.autorole.roles.splice(index, 1);
    changed = true;
    logger.warn(`Cargo "${role.name}" apagado em ${role.guild.name}; removido do autorole.`);
  }

  // Limpa locks associados a esse cargo
  for (const [key] of Object.entries(cfg.locks)) {
    if (key.endsWith(`:${role.id}`)) {
      delete cfg.locks[key];
      changed = true;
      logger.info(`Lock do cargo apagado "${role.name}" removido de ${role.guild.name}.`);
    }
  }

  if (changed) save();
}

export const name = Events.GuildRoleDelete;
export const execute = handleRoleDelete;
