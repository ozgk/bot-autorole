import { PermissionFlagsBits } from 'discord.js';
import { config } from '../config.js';

/**
 * Verifica as permissoes exigidas pelo comando.
 * Retorna uma mensagem de erro, ou null se estiver tudo certo.
 */
export function checkPermissions(ctx) {
  const { command, member, guild, channel } = ctx;

  if (command.ownerOnly && !config.ownerIds.includes(member.id)) {
    return 'Este comando e restrito ao dono do bot.';
  }

  const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);

  if (!isAdmin && command.userPermissions?.length) {
    if (!member.permissions.has(command.userPermissions)) {
      const missing = command.userPermissions
        .map((flag) => permissionName(flag))
        .join(', ');
      return `Voce precisa da permissao **${missing}** para usar este comando.`;
    }
  }

  const me = guild.members.me;
  if (command.botPermissions?.length) {
    const botPerms = channel?.permissionsFor(me) ?? me.permissions;
    if (!botPerms?.has(command.botPermissions)) {
      const missing = command.botPermissions.map((flag) => permissionName(flag)).join(', ');
      return `Eu preciso da permissao **${missing}** neste canal para executar isso.`;
    }
  }

  return null;
}

function permissionName(flag) {
  const entry = Object.entries(PermissionFlagsBits).find(([, value]) => value === flag);
  return entry ? entry[0] : String(flag);
}
