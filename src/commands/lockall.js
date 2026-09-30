import { PermissionFlagsBits, SlashCommandBuilder, ChannelType } from 'discord.js';
import { guildConfig, save } from '../lib/store.js';
import { resolveChannel } from '../lib/resolvers.js';
import { lockChannel, isLockable } from '../lib/lock.js';
import { okEmbed, errEmbed, infoEmbed } from '../lib/embeds.js';
import { sendGuildLog } from '../lib/guildLog.js';
import { prefixFor } from './panela.js';

const command = {
  name: 'lockall',
  description: 'Trava vários canais de uma vez (categoria ou servidor inteiro).',
  category: 'moderacao',
  userPermissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageChannels],

  slash: () =>
    new SlashCommandBuilder()
      .setName('lockall')
      .setDescription('Trava vários canais de uma vez.')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
      .addChannelOption((opt) =>
        opt
          .setName('categoria')
          .setDescription('Categoria a travar (padrao: o servidor inteiro)')
          .addChannelTypes(ChannelType.GuildCategory),
      )
      .addStringOption((opt) =>
        opt
          .setName('motivo')
          .setDescription('Motivo do travamento (necessário para travar o servidor inteiro)')
          .addChoices(
            { name: 'Raid / invasao', value: 'raid' },
            { name: 'Manutencao', value: 'manutencao' },
            { name: 'Emergencia', value: 'emergencia' },
          ),
      ),

  async run(ctx) {
    const guild = ctx.guild;
    const cfg = guildConfig(guild.id);

    let category = null;
    let reason = null;

    if (ctx.isSlash) {
      category = ctx.getChannelOption('categoria');
      reason = ctx.getStringOption('motivo');
    } else {
      const [firstArg, ...rest] = ctx.args;
      if (firstArg) {
        const resolved = resolveChannel(guild, firstArg);
        if (resolved && (resolved.type === ChannelType.GuildCategory || resolved.type === 4)) {
          category = resolved;
          reason = rest.join(' ');
        } else {
          // Nao e uma categoria: e o motivo/confirmacao de trava geral
          reason = ctx.args.join(' ');
        }
      }
    }

    let channels;
    if (category) {
      reason = reason || `Lockall na categoria ${category.name} por ${ctx.member.user.tag}`;
      channels = category.children.cache
        .filter((channel) => isLockable(channel))
        .map((channel) => channel);
    } else {
      // Confirmacao obrigatoria: travar o servidor inteiro e uma acao pesada.
      if (!reason) {
        const prefix = prefixFor(guild);
        return ctx.send(
          infoEmbed(
            'Isso vai travar **todos os canais** que eu consigo gerenciar.\n\n' +
              `Para confirmar, repita com um motivo:\n\`${prefix}lockall raid\` ou \`${prefix}lockall manutencao\`\n\n` +
              `Para travar apenas uma categoria: \`${prefix}lockall #categoria\`.`,
            'Confirmar lock geral',
          ),
        );
      }
      reason = reason || `Lockall geral por ${ctx.member.user.tag}`;
      channels = guild.channels.cache
        .filter((channel) => isLockable(channel) && channel.permissionsFor(guild.members.me)?.has(PermissionFlagsBits.ManageChannels))
        .map((channel) => channel);
    }

    const targets = channels.filter((channel) => !cfg.locks[`${channel.id}:everyone`]);
    if (!targets.length) {
      return ctx.send(errEmbed('Nenhum canal novo para travar (todos ja estavam travados).'));
    }

    await ctx.send(infoEmbed(`Travando **${targets.length}** canal(is)...`));

    let locked = 0;
    let failed = 0;
    for (const channel of targets) {
      try {
        const snapshot = await lockChannel(channel, { reason, by: ctx.member.user });
        cfg.locks[`${channel.id}:everyone`] = {
          ...snapshot,
          channelId: channel.id,
          label: guild.roles.everyone.name,
        };
        locked += 1;
      } catch {
        failed += 1;
      }
    }
    save();

    await sendGuildLog(guild, {
      embeds: [
        {
          color: 0xed4245,
          title: 'Lock em massa',
          description: `${locked} canal(is) travado(s)`,
          fields: [
            { name: 'Moderador', value: `${ctx.member}`, inline: true },
            { name: 'Motivo', value: reason },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    return ctx.followUp(
      okEmbed(
        `**${locked}** canal(is) travado(s).` +
          (failed ? `\n**${failed}** falharam (sem permissao).` : '') +
          '\nUse `unlockall` para reverter.',
        'Lock aplicado',
      ),
    );
  },
};

export default command;
