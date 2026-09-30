import { Events } from 'discord.js';
import { applyAutorole } from '../lib/autorole.js';
import { guildConfig } from '../lib/store.js';
import { sendGuildLog } from '../lib/guildLog.js';
import { logger } from '../lib/logger.js';

/** Entrega os cargos automaticos quando alguem entra no servidor. */
export async function handleGuildMemberAdd(member) {
  if (member.partial) {
    member = await member.fetch().catch(() => member);
  }
  const guild = member.guild;
  const cfg = guildConfig(guild.id);

  if (cfg.autorole.enabled && cfg.autorole.roles.length) {
    const result = await applyAutorole(member).catch((error) => {
      logger.error(`Falha no autorole de ${guild.name}:`, error);
      return null;
    });

    if (result?.failed.length) {
      logger.warn(
        `Autorole em ${guild.name}: ${result.failed.length} falha(s) para ${member.user.tag}. ` +
          result.failed.map((item) => `${item.roleId} (${item.reason})`).join('; '),
      );
    }

    if (result?.added.length) {
      const addedRoles = result.added
        .map((id) => guild.roles.cache.get(id)?.name ?? id)
        .join(', ');

      await sendGuildLog(guild, {
        embeds: [
          {
            color: 0x57f287,
            title: 'Cargos automaticos aplicados',
            description: `${member} (${member.user.tag}) entrou no servidor.\nCargos entregues: **${addedRoles}**`,
            timestamp: new Date().toISOString(),
          },
        ],
      });
    }
  }
}

export const name = Events.GuildMemberAdd;
export const execute = handleGuildMemberAdd;
