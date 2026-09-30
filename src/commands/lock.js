import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { guildConfig, save } from '../lib/store.js';
import { resolveChannel, resolveRole } from '../lib/resolvers.js';
import { lockChannel, isLockable } from '../lib/lock.js';
import { okEmbed, errEmbed, warnEmbed } from '../lib/embeds.js';
import { sendGuildLog } from '../lib/guildLog.js';

const command = {
  name: 'lock',
  description: 'Trava o canal para o @everyone ou cargo específico.',
  category: 'moderacao',
  userPermissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageChannels],

  slash: () =>
    new SlashCommandBuilder()
      .setName('lock')
      .setDescription('Trava o canal para o @everyone ou cargo específico.')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
      .addChannelOption((opt) =>
        opt.setName('canal').setDescription('Canal a travar (padrao: o atual)'),
      )
      .addRoleOption((opt) =>
        opt.setName('cargo').setDescription('Travar apenas este cargo (padrao: @everyone)'),
      )
      .addStringOption((opt) => opt.setName('motivo').setDescription('Aparece no audit log')),

  async run(ctx) {
    const guild = ctx.guild;
    const cfg = guildConfig(guild.id);

    let channel = null;
    let role = null;
    let reason = null;

    if (ctx.isSlash) {
      channel = ctx.getChannelOption('canal') ?? ctx.channel;
      role = ctx.getRoleOption('cargo') ?? null;
      reason = ctx.getStringOption('motivo') || `Lock por ${ctx.member.user.tag}`;
    } else {
      const [firstArg, secondArg, ...rest] = ctx.args;

      if (!firstArg) {
        channel = ctx.channel;
        role = null;
        reason = `Lock por ${ctx.member.user.tag}`;
      } else {
        const resolvedChannel = resolveChannel(guild, firstArg);
        if (resolvedChannel) {
          channel = resolvedChannel;
          const resolvedRole = secondArg ? resolveRole(guild, secondArg) : null;
          if (resolvedRole) {
            role = resolvedRole;
            reason = rest.join(' ');
          } else {
            role = null;
            reason = [secondArg, ...rest].filter(Boolean).join(' ');
          }
        } else {
          const resolvedRole = resolveRole(guild, firstArg);
          if (resolvedRole) {
            channel = ctx.channel;
            role = resolvedRole;
            reason = [secondArg, ...rest].filter(Boolean).join(' ');
          } else {
            channel = ctx.channel;
            role = null;
            reason = ctx.args.join(' ');
          }
        }
      }

      reason = reason || `Lock por ${ctx.member.user.tag}`;
    }

    if (!channel || !isLockable(channel)) {
      return ctx.send(errEmbed('Canal invalido. Marque um canal de texto, voz ou uma thread.'));
    }

    const me = guild.members.me;
    if (channel.isThread()) {
      if (!channel.manageable) {
        return ctx.send(errEmbed(`Nao tenho permissao para gerenciar o topico ${channel}.`));
      }
    } else if (!channel.permissionsFor(me)?.has(PermissionFlagsBits.ManageChannels)) {
      return ctx.send(errEmbed(`Nao tenho permissao de Gerenciar Canais no canal ${channel}.`));
    }

    // Um canal pode ter varios locks (um por cargo). Cada um guarda seu snapshot.
    const key = `${channel.id}:${role?.id ?? 'everyone'}`;
    if (cfg.locks[key]) {
      return ctx.send(warnEmbed(`${channel.toString()} ja esta travado${role ? ` para ${role}` : ''}.`));
    }

    const target = role ?? guild.roles.everyone;

    // Nao vale travar o canal pra quem esta executando o comando (exceto admin)
    const isSelfLock = role && ctx.member.roles.cache.has(role.id);
    if (isSelfLock && !ctx.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return ctx.send(
        errEmbed(
          `Voce tem o cargo ${role} - travar assim te impediria de falar em ${channel.toString()}.`,
        ),
      );
    }

    let snapshot;
    try {
      snapshot = await lockChannel(channel, { role, reason, by: ctx.member.user });
    } catch (error) {
      return ctx.send(errEmbed(`Nao consegui travar: ${error.message}`));
    }

    cfg.locks[key] = { ...snapshot, channelId: channel.id, label: target.name };
    save();

    await sendGuildLog(guild, {
      embeds: [
        {
          color: 0xed4245,
          title: 'Canal travado',
          description: `${channel} travado para ${target}`,
          fields: [
            { name: 'Moderador', value: `${ctx.member}`, inline: true },
            { name: 'Motivo', value: reason, inline: false },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    return ctx.send(
      okEmbed(
        `${channel.toString()} foi travado para ${target}.\nUse \`unlock\` para restaurar.`,
        'Canal travado',
      ),
    );
  },
};

export default command;
