import { commands } from './commandLoader.js';
import { CommandContext } from './context.js';
import { checkPermissions } from './permissions.js';
import { parseArgs } from './args.js';
import { guildConfig } from './store.js';
import { config } from '../config.js';
import { prefixFor, gateFor } from '../commands/panela.js';
import { errEmbed } from './embeds.js';
import { logger } from './logger.js';

/** Handler de comandos por mensagem (prefixo). */
export async function handleMessage(message) {
  const { client } = message;
  if (!message.inGuild() || message.author.bot) return;

  const guild = message.guild;
  const cfg = guildConfig(guild.id);
  const prefix = cfg.prefix ?? config.prefix;

  // Mencao direta ao bot: "@Bot" sem texto abre a ajuda/painel
  const trimmed = message.content.trim();
  const mentionRegex = new RegExp(`^<@!?${client.user.id}>$`);
  if (mentionRegex.test(trimmed)) {
    const helpCmd = commands.get('help') ?? commands.get('panela');
    if (helpCmd) {
      return runCommand(helpCmd, {
        message,
        guild,
        args: [],
      });
    }
  }

  if (!message.content.startsWith(prefix)) return;

  const [rawName, ...rest] = parseArgs(message.content.slice(prefix.length));
  if (!rawName) return;

  const command = commands.get(rawName.toLowerCase());
  if (!command) return;

  return runCommand(command, { message, guild, args: rest });
}

async function runCommand(command, { message, guild, args }) {
  const ctx = new CommandContext({
    client: message.client,
    command,
    guild,
    member: message.member,
    channel: message.channel,
    args,
    message,
  });

  const blocked = gateFor(guild);
  if (blocked && command.name !== 'panela') {
    return ctx.send(errEmbed(blocked));
  }

  const problem = checkPermissions(ctx);
  if (problem) return ctx.send(errEmbed(problem));

  try {
    await command.run(ctx);
  } catch (error) {
    logger.error(`Erro em !${command.name} (${guild.name}):`, error);
    await ctx
      .send(errEmbed(`Deu erro ao executar \`${command.name}\`.\n\`\`\`${error.message}\`\`\``))
      .catch(() => {});
  }
}

export { prefixFor, CommandContext };
