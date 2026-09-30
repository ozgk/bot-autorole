import { PermissionFlagsBits } from 'discord.js';
import { guildConfig } from './store.js';

/**
 * Aplica os cargos de autorole em um membro.
 * @returns {Promise<{ added: string[], skipped: string[], failed: { roleId: string, reason: string }[] }>}
 */
export async function applyAutorole(member) {
  const result = { added: [], skipped: [], failed: [] };
  const guild = member.guild;
  const cfg = guildConfig(guild.id).autorole;

  if (!cfg.enabled || cfg.roles.length === 0) return result;
  if (member.user.bot && !cfg.applyToBots) return result;

  const me = guild.members.me;
  const highest = me.roles.highest.position;

  for (const roleId of cfg.roles) {
    const role = guild.roles.cache.get(roleId);
    if (!role) {
      result.failed.push({ roleId, reason: 'cargo nao existe mais' });
      continue;
    }
    if (member.roles.cache.has(roleId)) {
      result.skipped.push(roleId);
      continue;
    }
    if (role.position >= highest) {
      result.failed.push({ roleId, reason: 'cargo acima do meu na hierarquia' });
      continue;
    }
    if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      result.failed.push({ roleId, reason: 'estou sem a permissao Gerenciar Cargos' });
      continue;
    }

    try {
      await member.roles.add(role, 'Autorole: entrada no servidor');
      result.added.push(roleId);
    } catch (error) {
      result.failed.push({ roleId, reason: error.message });
    }
  }

  return result;
}
