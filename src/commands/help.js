import { SlashCommandBuilder } from 'discord.js';
import { commands } from '../lib/commandLoader.js';
import { infoEmbed, errEmbed } from '../lib/embeds.js';
import { prefixFor, usageEmbed } from './panela.js';

const command = {
  name: 'help',
  aliases: ['ajuda', 'comandos'],
  description: 'Mostra a lista de comandos e instrucoes de uso.',
  category: 'geral',

  slash: () =>
    new SlashCommandBuilder()
      .setName('help')
      .setDescription('Mostra a lista de comandos e instrucoes de uso.')
      .addStringOption((opt) =>
        opt
          .setName('comando')
          .setDescription('Ver detalhes de um comando especifico')
          .addChoices(
            { name: 'panela - Painel de configuracao', value: 'panela' },
            { name: 'lock - Travar canal', value: 'lock' },
            { name: 'unlock - Destravar canal', value: 'unlock' },
            { name: 'lockall - Travar varios canais', value: 'lockall' },
            { name: 'unlockall - Destravar varios canais', value: 'unlockall' },
            { name: 'role - Gerenciar cargos de membros', value: 'role' },
            { name: 'ping - Latencia do bot', value: 'ping' },
          ),
      ),

  async run(ctx) {
    const guild = ctx.guild;
    const prefix = prefixFor(guild);

    const query = ctx.getStringOption('comando') || ctx.args[0]?.toLowerCase();

    if (query) {
      const target = commands.get(query);
      if (!target) {
        return ctx.send(errEmbed(`Comando \`${query}\` nao encontrado. Use \`${prefix}help\` para ver a lista.`));
      }

      if (target.name === 'panela') {
        return ctx.send(usageEmbed(prefix));
      }

      const embed = infoEmbed(target.description, `Comando: ${prefix}${target.name}`).addFields(
        {
          name: 'Categoria',
          value: target.category || 'geral',
          inline: true,
        },
        {
          name: 'Aliases',
          value: target.aliases?.length ? target.aliases.map((a) => `\`${prefix}${a}\``).join(', ') : '*Nenhum*',
          inline: true,
        },
      );

      if (target.name === 'lock') {
        embed.addFields({
          name: 'Exemplos de uso',
          value: [
            `\`${prefix}lock\` - Trava o canal atual para @everyone`,
            `\`${prefix}lock #chat\` - Trava o canal #chat para @everyone`,
            `\`${prefix}lock @Visitante\` - Trava apenas para o cargo @Visitante`,
            `\`${prefix}lock #chat @Visitante Manutencao\` - Trava com motivo`,
          ].join('\n'),
        });
      } else if (target.name === 'unlock') {
        embed.addFields({
          name: 'Exemplos de uso',
          value: [
            `\`${prefix}unlock\` - Destrava o canal atual restaurando permissoes`,
            `\`${prefix}unlock #chat\` - Destrava o canal #chat`,
            `\`${prefix}unlock @Visitante\` - Destrava o cargo no canal atual`,
          ].join('\n'),
        });
      } else if (target.name === 'lockall') {
        embed.addFields({
          name: 'Exemplos de uso',
          value: [
            `\`${prefix}lockall\` - Mostra explicacao e pede confirmacao`,
            `\`${prefix}lockall raid\` - Confirma e trava o servidor inteiro`,
            `\`${prefix}lockall #categoria\` - Trava todos os canais da categoria`,
          ].join('\n'),
        });
      } else if (target.name === 'unlockall') {
        embed.addFields({
          name: 'Exemplos de uso',
          value: [
            `\`${prefix}unlockall\` - Destrava todos os canais travados pelo bot`,
            `\`${prefix}unlockall #categoria\` - Destrava canais da categoria`,
          ].join('\n'),
        });
      } else if (target.name === 'role') {
        embed.addFields({
          name: 'Exemplos de uso',
          value: [
            `\`${prefix}role add @membro @cargo\` - Adiciona cargo ao membro`,
            `\`${prefix}role remove @membro @cargo\` - Remove cargo do membro`,
          ].join('\n'),
        });
      }

      return ctx.send(embed);
    }

    return ctx.send(usageEmbed(prefix));
  },
};

export default command;
