import { MessageFlags, EmbedBuilder } from 'discord.js';

/**
 * Normaliza payloads para aceitar strings, EmbedBuilders ou objetos de mensagem completos.
 */
export function normalizePayload(payload) {
  if (!payload) return {};
  if (payload instanceof EmbedBuilder) {
    return { embeds: [payload] };
  }
  if (typeof payload === 'string') {
    return { content: payload };
  }
  return payload;
}

/**
 * Une mensagem (!comando) e interacao (/comando) numa interface so, para que
 * cada comando seja escrito uma unica vez com suporte fluido a ambas.
 */
export class CommandContext {
  constructor({ client, command, guild, member, channel, args, message = null, interaction = null }) {
    this.client = client;
    this.command = command;
    this.guild = guild;
    this.member = member;
    this.channel = channel;
    this.args = args;
    this.message = message;
    this.interaction = interaction;
  }

  get isSlash() {
    return Boolean(this.interaction);
  }

  /** Primeira resposta do comando (funciona igual para prefixo e slash). */
  async send(payload) {
    const data = normalizePayload(payload);
    if (!this.interaction) return this.channel.send(data);

    const { interaction } = this;
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply(
        this.command.ephemeral ? { flags: MessageFlags.Ephemeral } : {},
      );
    }
    return interaction.editReply(data);
  }

  /** Mensagem extra, depois da primeira. */
  async followUp(payload) {
    const data = normalizePayload(payload);
    if (!this.interaction) return this.channel.send(data);
    return this.interaction.followUp(data);
  }

  getChannelOption(name) {
    return this.interaction?.options.getChannel(name) ?? null;
  }

  getRoleOption(name) {
    return this.interaction?.options.getRole(name) ?? null;
  }

  getStringOption(name) {
    return this.interaction?.options.getString(name) ?? null;
  }

  getUserOption(name) {
    return this.interaction?.options.getUser(name) ?? null;
  }

  getMemberOption(name) {
    return this.interaction?.options.getMember(name) ?? null;
  }

  getBooleanOption(name) {
    return this.interaction?.options.getBoolean(name) ?? null;
  }
}

/** Converte as opcoes de um slash command em argumentos de texto (mesmo parser do prefixo). */
export function argsFromInteraction(interaction) {
  const args = [];
  const group = interaction.options.getSubcommandGroup(false);
  if (group) args.push(group);

  const subcommand = interaction.options.getSubcommand(false);
  if (subcommand) args.push(subcommand);

  function collectLeaves(options) {
    if (!options) return;
    for (const opt of options) {
      if (opt.options && opt.options.length > 0) {
        collectLeaves(opt.options);
      } else if (opt.value !== undefined) {
        args.push(serializeOption(opt));
      }
    }
  }

  collectLeaves(interaction.options.data);
  return args;
}

function serializeOption(option) {
  const { value } = option;
  if (value === null || value === undefined) return '';
  if (option.role) return `<@&${option.role.id}>`;
  if (option.channel) return `<#${option.channel.id}>`;
  if (option.user) return `<@${option.user.id}>`;
  if (typeof value === 'boolean') return value ? 'on' : 'off';
  return String(value);
}
