import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { resolveRole, resolveMember } from '../lib/resolvers.js';
import { okEmbed, errEmbed, warnEmbed } from '../lib/embeds.js';

const command = {
  name: 'role',
  description: 'Adiciona ou remove cargos de um membro.',
  category: 'moderacao',
  userPermissions: [PermissionFlagsBits.ManageRoles],
  botPermissions: [PermissionFlagsBits.ManageRoles],

  slash: () =>
    new SlashCommandBuilder()
      .setName('role')
      .setDescription('Adiciona ou remove cargos de um membro.')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
      .addSubcommand((sub) =>
        sub
          .setName('add')
          .setDescription('Adiciona um cargo a um membro')
          .addUserOption((opt) => opt.setName('membro').setDescription('Membro').setRequired(true))
          .addRoleOption((opt) => opt.setName('cargo').setDescription('Cargo').setRequired(true)),
      )
      .addSubcommand((sub) =>
        sub
          .setName('remove')
          .setDescription('Remove um cargo de um membro')
          .addUserOption((opt) => opt.setName('membro').setDescription('Membro').setRequired(true))
          .addRoleOption((opt) => opt.setName('cargo').setDescription('Cargo').setRequired(true)),
      ),

  async run(ctx) {
    const guild = ctx.guild;
    let action = null;
    let member = null;
    let role = null;

    if (ctx.isSlash) {
      action = ctx.interaction.options.getSubcommand();
      const targetUser = ctx.interaction.options.getUser('membro');
      if (targetUser) {
        member = await guild.members.fetch(targetUser.id).catch(() => null);
      }
      role = ctx.interaction.options.getRole('cargo');
    } else {
      const [actionArg, memberArg, roleArg] = ctx.args;
      action = actionArg?.toLowerCase();

      if (!['add', 'remove'].includes(action)) {
        return ctx.send(errEmbed('Use `role add @membro @cargo` ou `role remove @membro @cargo`.'));
      }
      if (!memberArg || !roleArg) {
        return ctx.send(errEmbed('Faltou informar o membro ou o cargo: `role add @membro @cargo`.'));
      }

      member = await resolveMemberAsync(guild, memberArg);
      if (!member) return ctx.send(errEmbed(`Nao encontrei o membro \`${memberArg}\`.`));

      role = resolveRole(guild, roleArg);
      if (!role) return ctx.send(errEmbed(`Nao encontrei o cargo \`${roleArg}\`.`));
    }

    if (!member) {
      return ctx.send(errEmbed('Membro nao encontrado no servidor.'));
    }
    if (!role) {
      return ctx.send(errEmbed('Cargo nao encontrado.'));
    }

    if (role.managed) {
      return ctx.send(errEmbed('Este cargo e gerenciado por uma integracao ou bot e nao pode ser modificado.'));
    }

    if (role.position >= guild.members.me.roles.highest.position) {
      return ctx.send(
        errEmbed(
          `O cargo ${role} esta acima ou no mesmo nivel do meu na hierarquia. Arraste meu cargo para cima dele.`,
        ),
      );
    }

    const isAuthorAdmin = ctx.member.permissions.has(PermissionFlagsBits.Administrator);
    if (!isAuthorAdmin && role.position >= ctx.member.roles.highest.position) {
      return ctx.send(
        errEmbed(`Voce nao pode gerenciar o cargo ${role} porque ele esta no mesmo nivel ou acima do seu cargo mais alto.`),
      );
    }

    const hasRole = member.roles.cache.has(role.id);

    try {
      if (action === 'add') {
        if (hasRole) return ctx.send(warnEmbed(`${member} ja possui o cargo ${role}.`));
        await member.roles.add(role, `Por ${ctx.member.user.tag}`);
      } else {
        if (!hasRole) return ctx.send(warnEmbed(`${member} nao possui o cargo ${role}.`));
        await member.roles.remove(role, `Por ${ctx.member.user.tag}`);
      }
    } catch (error) {
      return ctx.send(errEmbed(`Nao consegui alterar os cargos: ${error.message}`));
    }

    return ctx.send(
      okEmbed(
        `Cargo ${role} **${action === 'add' ? 'adicionado a' : 'removido de'}** ${member}.`,
      ),
    );
  },
};

/** Tenta cache primeiro, depois busca na API (membros grandes nao cabem no cache). */
async function resolveMemberAsync(guild, input) {
  const cached = resolveMember(guild, input);
  if (cached) return cached;

  const id = String(input).replace(/\D/g, '');
  if (!id) return null;
  return guild.members.fetch(id).catch(() => null);
}

export default command;
