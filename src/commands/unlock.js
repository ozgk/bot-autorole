import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { guildConfig, save } from '../lib/store.js';
import { resolveChannel, resolveRole } from '../lib/resolvers.js';
import { unlockChannel, isLockable } from '../lib/lock.js';
import { okEmbed, errEmbed, warnEmbed } from '../lib/embeds.js';
import { sendGuildLog } from '../lib/guildLog.js';

const command = {
  name: 'unlock',
  description: 'Destrava o canal, restaurando as permissoes anteriores.',
  category: 'moderacao',
  userPermissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageChannels],

  slash: () =>
    new SlashCommandBuilder()
      .setName('unlock')
      .setDescription('Destrava o canal, restaurando as permissoes anteriores.')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
      .addChannelOption((opt) =>
        opt.setName('canal').setDescription('Canal a destravar (padrao: o atual)'),
      )
      .addRoleOption((opt) =>
        opt.setName('cargo').setDescription('Destravar apenas este cargo (padrao: @everyone)'),
      ),

  async run(ctx) {
    const guild = ctx.guild;
    const cfg = guildConfig(guild.id);

    let channel = null;
    let role = null;

    if (ctx.isSlash) {
      channel = ctx.getChannelOption('canal') ?? ctx.channel;
      role = ctx.getRoleOption('cargo') ?? null;
    } else {
      const [firstArg, secondArg] = ctx.args;

      if (!firstArg) {
        channel = ctx.channel;
        role = null;
      } else {
        const resolvedChannel = resolveChannel(guild, firstArg);
        if (resolvedChannel) {
          channel = resolvedChannel;
          role = secondArg ? resolveRole(guild, secondArg) : null;
        } else {
          const resolvedRole = resolveRole(guild, firstArg);
          if (resolvedRole) {
            channel = ctx.channel;
            role = resolvedRole;
          } else {
            return ctx.send(errEmbed(`Nao encontrei o canal ou cargo \`${firstArg}\`.`));
          }
        }
      }
    }

    if (!channel || !isLockable(channel)) {
      return ctx.send(errEmbed('Canal invalido.'));
    }

    // Sem cargo informado: se o canal tem locks de varios cargos, destrava todos.
    const keys = role
      ? [`${channel.id}:${role.id}`]
      : Object.keys(cfg.locks).filter(
          (key) => cfg.locks[key].channelId === channel.id,
        );

    const existing = keys.filter((key) => cfg.locks[key]);
    if (!existing.length) {
      return ctx.send(
        warnEmbed(
          `${channel.toString()} nao esta travado${role ? ` para ${role}` : ''} por mim.`,
        ),
      );
    }

    const done = [];
    const failed = [];
    for (const key of existing) {
      try {
        await unlockChannel(channel, cfg.locks[key], {
          reason: `Unlock por ${ctx.member.user.tag}`,
        });
        done.push(cfg.locks[key].label ?? key);
        delete cfg.locks[key];
      } catch (error) {
        failed.push(`${key}: ${error.message}`);
      }
    }
    save();

    if (failed.length) {
      return ctx.send(
        errEmbed(
          `Alguns locks falharam:\n${failed.map((item) => `- ${item}`).join('\n')}`,
          'Falha parcial no unlock',
        ),
      );
    }

    await sendGuildLog(guild, {
      embeds: [
        {
          color: 0x57f287,
          title: 'Canal destravado',
          description: `${channel} destravado`,
          fields: [{ name: 'Moderador', value: `${ctx.member}`, inline: true }],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    return ctx.send(
      okEmbed(`${channel.toString()} foi destravado. Permissoes restauradas.`, 'Canal liberado'),
    );
  },
};

export default command;
