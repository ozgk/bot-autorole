import { Events } from 'discord.js';
import { commands } from '../lib/commandLoader.js';
import { CommandContext, argsFromInteraction } from '../lib/context.js';
import { checkPermissions } from '../lib/permissions.js';
import { guildConfig } from '../lib/store.js';
import { gateFor } from '../commands/panela.js';
import { errEmbed } from '../lib/embeds.js';
import { logger } from '../lib/logger.js';

/** Handler de slash commands. */
export async function handleInteraction(interaction) {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) {
    return interaction
      .reply({ embeds: [errEmbed('Comando nao encontrado. Reinicie o bot.')], ephemeral: true })
      .catch(() => {});
  }

  // DM: nenhum comando daqui faz sentido.
  if (!interaction.inGuild()) {
    return interaction
      .reply({ embeds: [errEmbed('Estes comandos so funcionam dentro de um servidor.')], ephemeral: true })
      .catch(() => {});
  }

  const ctx = new CommandContext({
    client: interaction.client,
    command,
    guild: interaction.guild,
    member: interaction.member,
    channel: interaction.channel,
    args: argsFromInteraction(interaction),
    interaction,
  });

  const blocked = gateFor(interaction.guild);
  if (blocked && command.name !== 'panela') {
    return ctx.send(errEmbed(blocked)).catch(() => {});
  }

  const problem = checkPermissions(ctx);
  if (problem) {
    // Erro de permissao e sempre efemero, pra nao poluir o canal.
    const payload = { embeds: [errEmbed(problem)], flags: 64 };
    return interaction.deferred || interaction.replied
      ? interaction.followUp(payload).catch(() => {})
      : interaction.reply(payload).catch(() => {});
  }

  try {
    await command.run(ctx);
  } catch (error) {
    logger.error(`Erro em /${command.name}:`, error);

    const payload = { embeds: [errEmbed(`Deu erro: \`${error.message}\``)] };
    if (interaction.deferred) await interaction.editReply(payload).catch(() => {});
    else if (interaction.replied) await interaction.followUp(payload).catch(() => {});
    else await interaction.reply({ ...payload, flags: 64 }).catch(() => {});
  }
}

export const name = Events.InteractionCreate;
export const execute = handleInteraction;
