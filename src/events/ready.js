import { Events, ActivityType } from 'discord.js';
import { config } from '../config.js';
import { commands } from '../lib/commandLoader.js';
import { logger } from '../lib/logger.js';

export const name = Events.ClientReady;
export const once = true;

export async function execute(client) {
  const guilds = client.guilds.cache.size;
  logger.ok(`Online como ${client.user.tag} - ${commands.size} comando(s) em ${guilds} servidor(es).`);
  client.user.setActivity({
    name: `${config.prefix}panela | ${config.prefix}help`,
    type: ActivityType.Watching,
  });
}
