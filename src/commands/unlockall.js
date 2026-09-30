import { PermissionFlagsBits, SlashCommandBuilder, ChannelType } from 'discord.js';
import { guildConfig, save } from '../lib/store.js';
import { resolveChannel } from '../lib/resolvers.js';
import { unlockChannel } from '../lib/lock.js';
import { okEmbed, errEmbed, infoEmbed } from '../lib/embeds.js';
import { sendGuildLog } from '../lib/guildLog.js';

const command = {
  name: 'unlockall',
  description: 'Destrava todos os canais que eu tenha travado.',
  category: 'moderacao',
  userPermissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageChannels],

  slash: () =>
    new SlashCommandBuilder()
      .setName('unlockall')
      .setDescription('Destrava todos os canais travados.')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
      .addChannelOption((opt) =>
        opt
          .setName('categoria')
          .setDescription('Destravar apenas esta categoria')
          .addChannelTypes(ChannelType.GuildCategory),
      ),

  async run(ctx) {
    const guild = ctx.guild;
    const cfg = guildConfig(guild.id);

    let categoryId = null;

    if (ctx.isSlash) {
      const category = ctx.getChannelOption('categoria');
      categoryId = category?.id ?? null;
    } else {
      const [categoryArg] = ctx.args;
      if (categoryArg) {
        const category = resolveChannel(guild, categoryArg);
        if (!category) return ctx.send(errEmbed(`Nao encontrei a categoria \`${categoryArg}\`.`));
        categoryId = category.id;
      }
    }

    const keys = [];
    for (const [key, lock] of Object.entries(cfg.locks)) {
      if (!categoryId) {
        keys.push(key);
        continue;
      }
      // O snapshot nao guarda o pai, entao resolvemos o canal pra checar.
      const channel =
        guild.channels.cache.get(lock.channelId) ??
        (await guild.channels.fetch(lock.channelId).catch(() => null));
      if (channel?.parentId === categoryId) keys.push(key);
    }

    if (!keys.length) {
      return ctx.send(
        errEmbed(
          'Nao ha nenhum canal travado por mim' + (categoryId ? ' nesta categoria.' : '.'),
        ),
      );
    }

    await ctx.send(infoEmbed(`Destravando **${keys.length}** canal(is)...`));

    let unlocked = 0;
    let failed = 0;
    for (const key of keys) {
      const lock = cfg.locks[key];
      const channel =
        guild.channels.cache.get(lock.channelId) ??
        (await guild.channels.fetch(lock.channelId).catch(() => null));

      if (!channel) {
        delete cfg.locks[key];
        continue;
      }

      try {
        await unlockChannel(channel, lock, { reason: `Unlockall por ${ctx.member.user.tag}` });
        delete cfg.locks[key];
        unlocked += 1;
      } catch {
        failed += 1;
      }
    }
    save();

    await sendGuildLog(guild, {
      embeds: [
        {
          color: 0x57f287,
          title: 'Unlock em massa',
          description: `${unlocked} canal(is) destravado(s)`,
          fields: [{ name: 'Moderador', value: `${ctx.member}`, inline: true }],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    return ctx.followUp(
      okEmbed(
        `**${unlocked}** canal(is) destravado(s).` + (failed ? `\n**${failed}** falharam.` : ''),
        'Canais liberados',
      ),
    );
  },
};

export default command;
