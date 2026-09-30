import { SlashCommandBuilder } from 'discord.js';
import { infoEmbed } from '../lib/embeds.js';

function formatUptime(uptimeSeconds) {
  const days = Math.floor(uptimeSeconds / 86400);
  const hours = Math.floor((uptimeSeconds % 86400) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = Math.floor(uptimeSeconds % 60);
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(' ');
}

const command = {
  name: 'ping',
  description: 'Mostra a latencia da API, WebSocket e status do bot.',
  category: 'geral',

  slash: () =>
    new SlashCommandBuilder()
      .setName('ping')
      .setDescription('Mostra a latencia e status do bot.'),

  async run(ctx) {
    const wsPing = ctx.client.ws.ping;
    const uptime = formatUptime(process.uptime());
    const memMb = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);

    const createdTimestamp = ctx.interaction?.createdTimestamp ?? ctx.message?.createdTimestamp ?? Date.now();
    const roundtrip = Math.max(0, Date.now() - createdTimestamp);

    const embed = infoEmbed(undefined, '🏓 Pong!').addFields(
      {
        name: 'WebSocket',
        value: `\`${wsPing >= 0 ? `${wsPing}ms` : 'calculando...'}\``,
        inline: true,
      },
      {
        name: 'Resposta',
        value: `\`${roundtrip}ms\``,
        inline: true,
      },
      {
        name: 'Tempo Online',
        value: `\`${uptime}\``,
        inline: true,
      },
      {
        name: 'Memória (Heap)',
        value: `\`${memMb} MB\``,
        inline: true,
      },
      {
        name: 'Node.js',
        value: `\`${process.version}\``,
        inline: true,
      },
    );

    return ctx.send(embed);
  },
};

export default command;
