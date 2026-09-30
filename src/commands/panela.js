import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { config } from '../config.js';
import { guildConfig, save } from '../lib/store.js';
import { resolveRole, resolveChannel } from '../lib/resolvers.js';
import { parseToggle } from '../lib/args.js';
import { applyAutorole } from '../lib/autorole.js';
import { infoEmbed, okEmbed, errEmbed, warnEmbed, bulletList, truncate } from '../lib/embeds.js';

function prefixFor(guild) {
  const cfg = guildConfig(guild.id);
  return cfg.prefix ?? config.prefix;
}

/** Retorna uma mensagem se o bot estiver desativado neste servidor, senao null. */
function gateFor(guild) {
  const cfg = guildConfig(guild.id);
  if (cfg.enabled === false) {
    return (
      `Este bot esta **desativado** neste servidor. Use \`${prefixFor(guild)}panela on\` para religar.`
    );
  }
  return null;
}

async function statusEmbed(guild) {
  const cfg = guildConfig(guild.id);
  const prefix = prefixFor(guild);

  const roles = cfg.autorole.roles
    .map((id) => guild.roles.cache.get(id))
    .filter(Boolean)
    .map((role) => role.toString());

  // As chaves de cfg.locks sao "channelId:roleId", entao agrupamos por canal.
  const lockedChannels = [...new Set(Object.values(cfg.locks).map((lock) => lock.channelId))];
  const shown = lockedChannels.slice(0, 15).map((id) => `<#${id}>`).join(', ');
  const lockedList =
    shown +
    (lockedChannels.length > 15 ? ` e mais ${lockedChannels.length - 15}` : '');

  return infoEmbed(undefined, `Painel de configuracao - ${guild.name}`).addFields(
    {
      name: 'Status do Bot',
      value: cfg.enabled ? '🟢 Ativo' : '🔴 **Desativado**',
      inline: true,
    },
    {
      name: 'Prefixo',
      value: `\`${prefix}\``,
      inline: true,
    },
    {
      name: 'Autorole',
      value: `${cfg.autorole.enabled ? '🟢 Ativo' : '⚪ **Desativado**'}\nBots: **${cfg.autorole.applyToBots ? 'Sim' : 'Nao'}**`,
      inline: true,
    },
    {
      name: `Cargos de entrada (${roles.length})`,
      value: truncate(bulletList(roles), 1024),
      inline: false,
    },
    {
      name: 'Canal de logs',
      value: cfg.logChannelId ? `<#${cfg.logChannelId}>` : '*Nao configurado*',
      inline: true,
    },
    {
      name: `Canais travados (${lockedChannels.length})`,
      value: lockedChannels.length ? lockedList : '*Nenhum*',
      inline: true,
    },
  );
}

function usageEmbed(prefix) {
  return infoEmbed(undefined, 'Guia de Comandos - Panela Bot').addFields(
    {
      name: 'Cargos automaticos (Autorole)',
      value: [
        `\`${prefix}panela autorole add @Cargo\` - Adiciona cargo de entrada`,
        `\`${prefix}panela autorole add @Cargo1 @Cargo2\` - Varios de uma vez`,
        `\`${prefix}panela autorole remove @Cargo\` - Remove um cargo`,
        `\`${prefix}panela autorole list\` - Lista os cargos configurados`,
        `\`${prefix}panela autorole clear\` - Zera a lista de autorole`,
        `\`${prefix}panela autorole on|off\` - Liga ou desliga o autorole`,
        `\`${prefix}panela autorole bots on|off\` - Define se aplica a bots`,
        `\`${prefix}panela apply\` - Reaplica nos membros atuais do servidor`,
      ].join('\n'),
    },
    {
      name: 'Moderacao & Travamento de chat',
      value: [
        `\`${prefix}lock\` - Trava o canal atual para o @everyone`,
        `\`${prefix}lock #canal @Cargo motivo\` - Trava canal/cargo especifico`,
        `\`${prefix}unlock\` - Destrava o canal atual e restaura permissoes`,
        `\`${prefix}unlock #canal @Cargo\` - Destrava canal/cargo especifico`,
        `\`${prefix}lockall\` - Menu de confirmacao de trava geral`,
        `\`${prefix}lockall raid\` - Confirma e trava todos os canais`,
        `\`${prefix}lockall #categoria\` - Trava todos os canais de uma categoria`,
        `\`${prefix}unlockall\` - Destrava todos os canais travados`,
        `\`${prefix}unlockall #categoria\` - Destrava canais de uma categoria`,
        `\`${prefix}role add @membro @cargo\` - Adiciona cargo a um membro`,
        `\`${prefix}role remove @membro @cargo\` - Remove cargo de um membro`,
      ].join('\n'),
    },
    {
      name: 'Geral & Administracao',
      value: [
        `\`${prefix}panela\` - Mostra o painel com status do servidor`,
        `\`${prefix}panela prefix ?\` - Altera o prefixo do bot`,
        `\`${prefix}panela logs #canal\` - Define canal de logs e auditoria`,
        `\`${prefix}panela logs off\` - Desativa canal de logs`,
        `\`${prefix}panela reset\` - Restaura as configuracoes padrao`,
        `\`${prefix}panela on|off\` - Ativa ou desativa o bot no servidor`,
        `\`${prefix}ping\` - Mostra a latencia e status do bot`,
      ].join('\n'),
    },
  );
}

async function handleAutorole(ctx, guild, rest) {
  const cfg = guildConfig(guild.id);
  const [action, ...values] = rest;

  if (!action || action === 'list') {
    const roles = cfg.autorole.roles
      .map((id) => guild.roles.cache.get(id))
      .filter(Boolean)
      .map((role) => `${role.toString()} (\`${role.id}\`)`);
    return ctx.send(
      infoEmbed(bulletList(roles), 'Cargos de entrada').addFields({
        name: 'Status',
        value: `Autorole: ${cfg.autorole.enabled ? '**Ativo**' : '**Desativado**'}\nAplicar em bots: **${
          cfg.autorole.applyToBots ? 'Sim' : 'Nao'
        }**`,
      }),
    );
  }

  if (action === 'on' || action === 'off') {
    cfg.autorole.enabled = action === 'on';
    save();
    return ctx.send(okEmbed(`Autorole **${action === 'on' ? 'ativado' : 'desativado'}**.`));
  }

  if (action === 'bots') {
    const value = parseToggle(values[0]);
    if (value === null) return ctx.send(errEmbed('Use `autorole bots on` ou `autorole bots off`.'));
    cfg.autorole.applyToBots = value;
    save();
    return ctx.send(okEmbed(`Aplicar cargo em bots: **${value ? 'sim' : 'nao'}**.`));
  }

  if (action === 'add') {
    if (!values.length) return ctx.send(errEmbed('Informe pelo menos um cargo: `autorole add @Cargo`.'));

    const added = [];
    const unknown = [];
    for (const value of values) {
      const role = resolveRole(guild, value);
      if (!role) {
        unknown.push(value);
        continue;
      }
      if (role.managed) {
        unknown.push(`${value} (cargo gerenciado por integracao)`);
        continue;
      }
      if (!cfg.autorole.roles.includes(role.id)) {
        cfg.autorole.roles.push(role.id);
        added.push(role.toString());
      }
    }
    save();

    const fields = [];
    if (added.length) fields.push({ name: 'Adicionados', value: added.join('\n') });
    if (unknown.length) fields.push({ name: 'Ignorados', value: unknown.join('\n') });

    const warning = hierarchyWarning(guild);
    if (warning) fields.push({ name: 'Atencao', value: warning });

    return ctx.send(okEmbed(undefined, 'Autorole atualizado').addFields(fields));
  }

  if (action === 'remove') {
    if (!values.length) return ctx.send(errEmbed('Informe o cargo: `autorole remove @Cargo`.'));

    const removed = [];
    for (const value of values) {
      const role = resolveRole(guild, value);
      const id = role?.id ?? String(value).replace(/\D/g, '');
      const index = cfg.autorole.roles.indexOf(id);
      if (index !== -1) {
        cfg.autorole.roles.splice(index, 1);
        removed.push(role ? role.toString() : `\`${id}\``);
      }
    }
    save();

    if (!removed.length) return ctx.send(warnEmbed('Nenhum desses cargos estava na lista.'));
    return ctx.send(okEmbed(removed.join('\n'), 'Removidos do autorole'));
  }

  if (action === 'clear') {
    cfg.autorole.roles = [];
    save();
    return ctx.send(okEmbed('Lista de cargos de entrada zerada.'));
  }

  return ctx.send(errEmbed(`Subcomando \`${action}\` desconhecido. Veja \`${prefixFor(guild)}panela\`.`));
}

function hierarchyWarning(guild) {
  const me = guild.members.me;
  const blocked = guildConfig(guild.id)
    .autorole.roles.map((id) => guild.roles.cache.get(id))
    .filter((role) => role && role.position >= me.roles.highest.position);

  if (!blocked.length) return null;
  return (
    'Nao consigo entregar estes cargos porque estao **acima ou no mesmo nivel** do meu cargo mais alto:\n' +
    blocked.map((role) => role.toString()).join(', ') +
    '\nArraste meu cargo para cima deles nas configuracoes do servidor.'
  );
}

async function handleApply(ctx, guild) {
  const cfg = guildConfig(guild.id);
  if (!cfg.autorole.roles.length) return ctx.send(errEmbed('Nenhum cargo configurado ainda.'));

  await ctx.send(infoEmbed('Reaplicando os cargos de entrada... isso pode levar alguns segundos.'));

  let members;
  try {
    members = await guild.members.fetch();
  } catch {
    return ctx.followUp(errEmbed('Nao consegui buscar a lista de membros.'));
  }

  let changed = 0;
  let failed = 0;
  for (const member of members.values()) {
    const result = await applyAutorole(member);
    if (result.added.length) changed += 1;
    if (result.failed.length) failed += 1;
  }

  return ctx.followUp(
    okEmbed(
      `Cargos aplicados em **${changed}** membro(s).` +
        (failed ? `\nFalhas em **${failed}** membro(s) - confira a hierarquia dos cargos.` : ''),
    ),
  );
}

const command = {
  name: 'panela',
  description: 'Painel de configuracao do bot no servidor.',
  category: 'config',
  userPermissions: [PermissionFlagsBits.ManageGuild],

  slash: () =>
    new SlashCommandBuilder()
      .setName('panela')
      .setDescription('Painel de configuracao do bot no servidor.')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addSubcommand((sub) => sub.setName('status').setDescription('Mostra a configuracao atual do servidor'))
      .addSubcommand((sub) => sub.setName('help').setDescription('Exibe o guia de comandos'))
      .addSubcommandGroup((group) =>
        group
          .setName('autorole')
          .setDescription('Configuracoes de cargos automaticos na entrada')
          .addSubcommand((sub) =>
            sub
              .setName('add')
              .setDescription('Adiciona cargo(s) de entrada')
              .addRoleOption((opt) => opt.setName('cargo').setDescription('Cargo principal').setRequired(true))
              .addRoleOption((opt) => opt.setName('cargo2').setDescription('Cargo extra 1'))
              .addRoleOption((opt) => opt.setName('cargo3').setDescription('Cargo extra 2')),
          )
          .addSubcommand((sub) =>
            sub
              .setName('remove')
              .setDescription('Remove um cargo de entrada')
              .addRoleOption((opt) => opt.setName('cargo').setDescription('Cargo a remover').setRequired(true)),
          )
          .addSubcommand((sub) => sub.setName('list').setDescription('Lista os cargos de entrada atuais'))
          .addSubcommand((sub) =>
            sub
              .setName('toggle')
              .setDescription('Liga ou desliga a entrega de autorole')
              .addBooleanOption((opt) => opt.setName('ativo').setDescription('Ativo?').setRequired(true)),
          )
          .addSubcommand((sub) =>
            sub
              .setName('bots')
              .setDescription('Define se o autorole tambem se aplica a bots')
              .addBooleanOption((opt) => opt.setName('ativo').setDescription('Aplicar em bots?').setRequired(true)),
          )
          .addSubcommand((sub) =>
            sub
              .setName('clear')
              .setDescription('Limpa todos os cargos configurados no autorole'),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('prefix')
          .setDescription('Troca o prefixo dos comandos por mensagem')
          .addStringOption((opt) => opt.setName('novo').setDescription('Novo prefixo').setRequired(true)),
      )
      .addSubcommand((sub) =>
        sub
          .setName('logs')
          .setDescription('Define o canal de auditoria e logs')
          .addChannelOption((opt) => opt.setName('canal').setDescription('Canal de texto').setRequired(true)),
      )
      .addSubcommand((sub) => sub.setName('apply').setDescription('Reaplica os cargos nos membros que ja estao no servidor'))
      .addSubcommand((sub) => sub.setName('reset').setDescription('Restaura as configuracoes do servidor para o padrao'))
      .addSubcommand((sub) => sub.setName('on').setDescription('Ativa o bot neste servidor'))
      .addSubcommand((sub) => sub.setName('off').setDescription('Desativa o bot neste servidor')),

  async run(ctx) {
    const guild = ctx.guild;
    const cfg = guildConfig(guild.id);
    const prefix = prefixFor(guild);

    if (!ctx.args.length) return ctx.send(await statusEmbed(guild));

    const [sub, ...rest] = ctx.args;

    if (sub === 'autorole') {
      if (rest[0] === 'toggle') {
        const enabled = parseToggle(rest[1]) ?? ['on', 'true'].includes(rest[1]);
        cfg.autorole.enabled = enabled;
        save();
        return ctx.send(
          okEmbed(`Autorole **${enabled ? 'ativado' : 'desativado'}**.`),
        );
      }
      if (rest[0] === 'bots') {
        const enabled = parseToggle(rest[1]) ?? ['on', 'true'].includes(rest[1]);
        cfg.autorole.applyToBots = enabled;
        save();
        return ctx.send(
          okEmbed(`Aplicar cargo em bots: **${enabled ? 'sim' : 'nao'}**.`),
        );
      }
      return handleAutorole(ctx, guild, rest);
    }

    if (sub === 'status') return ctx.send(await statusEmbed(guild));
    if (sub === 'help') return ctx.send(usageEmbed(prefix));

    if (sub === 'prefix') {
      const value = rest[0];
      if (!value || value.length > 5 || /\s/.test(value)) {
        return ctx.send(errEmbed('Informe um prefixo de 1 a 5 caracteres, sem espacos.'));
      }
      cfg.prefix = value;
      save();
      return ctx.send(okEmbed(`Prefixo agora e \`${value}\`. Exemplo: \`${value}lock\`.`));
    }

    if (sub === 'logs') {
      if (!rest[0] || parseToggle(rest[0]) === false) {
        cfg.logChannelId = null;
        save();
        return ctx.send(okEmbed('Logs desativados.'));
      }
      const channel = resolveChannel(guild, rest[0]);
      if (!channel?.isTextBased()) return ctx.send(errEmbed('Nao encontrei esse canal de texto.'));
      cfg.logChannelId = channel.id;
      save();
      return ctx.send(okEmbed(`Logs serao enviados para ${channel.toString()}.`));
    }

    if (sub === 'apply') return handleApply(ctx, guild);

    if (sub === 'reset') {
      const locks = Object.keys(cfg.locks);
      cfg.autorole = { enabled: true, roles: [], applyToBots: false };
      cfg.logChannelId = null;
      cfg.prefix = null;
      cfg.locks = {};
      save();
      return ctx.send(
        okEmbed(
          'Configuracoes zeradas.' +
            (locks.length
              ? `\nO registro de **${locks.length}** canal(is) travado(s) foi apagado - use \`${prefix}unlock\` antes de resetar da proxima vez se quiser destravar automaticamente.`
              : ''),
        ),
      );
    }

    if (sub === 'on' || sub === 'off') {
      cfg.enabled = sub === 'on';
      save();
      return ctx.send(okEmbed(`Bot **${sub === 'on' ? 'ativado' : 'desativado'}** neste servidor.`));
    }

    return ctx.send(usageEmbed(prefix));
  },
};

export { gateFor, prefixFor, usageEmbed };
export default command;
