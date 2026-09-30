/**
 * Teste de fumaca: carrega todos os comandos/eventos e valida os payloads.
 * Roda com: node scripts/smoke-test.js
 *
 * Nao precisa de token real: injeta um valor falso antes de importar o src.
 */
import assert from 'node:assert/strict';
import { EmbedBuilder, PermissionsBitField, PermissionOverwrites } from 'discord.js';

process.env.DISCORD_TOKEN ??= 'token-falso-apenas-para-teste';
process.env.PREFIX ??= '!';

const { loadCommands, uniqueCommands, commands } = await import('../src/lib/commandLoader.js');
const { parseArgs, parseToggle } = await import('../src/lib/args.js');
const { bulletList, truncate } = await import('../src/lib/embeds.js');
const { normalizePayload, argsFromInteraction } = await import('../src/lib/context.js');
const { isLockable } = await import('../src/lib/lock.js');
const store = await import('../src/lib/store.js');
const { logger } = await import('../src/lib/logger.js');

let passed = 0;
let failed = 0;

async function check(label, fn) {
  try {
    await fn();
    passed += 1;
    logger.ok(`ok  ${label}`);
  } catch (error) {
    failed += 1;
    logger.error(`FALHOU  ${label}\n        ${error.message}`);
    process.exitCode = 1;
  }
}

// ---- Parser de argumentos ----------------------------------------------
check('parseArgs separa por espacos', () => {
  assert.deepEqual(parseArgs('add @Cargo motivo aqui'), ['add', '@Cargo', 'motivo', 'aqui']);
});

check('parseArgs respeita aspas', () => {
  assert.deepEqual(parseArgs('motivo "raid em andamento"'), ['motivo', 'raid em andamento']);
});

check('parseArgs lida com string vazia', () => {
  assert.deepEqual(parseArgs(''), []);
});

check('parseToggle reconhece variacoes', () => {
  for (const value of ['on', 'ativar', '1', 'true', 'sim']) assert.equal(parseToggle(value), true);
  for (const value of ['off', 'desativar', '0', 'false']) assert.equal(parseToggle(value), false);
  assert.equal(parseToggle('talvez'), null);
});

check('truncate corta textos longos', () => {
  assert.equal(truncate('abc', 10), 'abc');
  assert.equal(truncate('a'.repeat(50), 10).length, 10);
});

check('bulletList trata lista vazia', () => {
  assert.equal(bulletList([]), '*nada aqui ainda*');
  assert.equal(bulletList(['a', 'b']), '- a\n- b');
});

// ---- Context & Payloads -------------------------------------------------
check('normalizePayload converte EmbedBuilder para objeto compativel', () => {
  const embed = new EmbedBuilder().setTitle('Teste');
  const res = normalizePayload(embed);
  assert.ok(Array.isArray(res.embeds));
  assert.equal(res.embeds[0], embed);
});

check('normalizePayload converte string para objeto de conteudo', () => {
  const res = normalizePayload('Ola');
  assert.equal(res.content, 'Ola');
});

check('normalizePayload mantem objetos intactos', () => {
  const obj = { content: 'Oi', ephemeral: true };
  assert.equal(normalizePayload(obj), obj);
});

check('argsFromInteraction serializa subcomandos e opcoes aninhadas', () => {
  const mock = {
    options: {
      getSubcommandGroup: () => 'autorole',
      getSubcommand: () => 'add',
      data: [
        {
          name: 'autorole',
          options: [
            {
              name: 'add',
              options: [
                { name: 'cargo', value: '111', role: { id: '111' } },
                { name: 'cargo2', value: '222', role: { id: '222' } },
              ],
            },
          ],
        },
      ],
    },
  };
  assert.deepEqual(argsFromInteraction(mock), ['autorole', 'add', '<@&111>', '<@&222>']);
});

check('argsFromInteraction funciona com opcoes sem subcomandos', () => {
  const mock = {
    options: {
      getSubcommandGroup: () => null,
      getSubcommand: () => null,
      data: [
        { name: 'motivo', value: 'raid em andamento' },
      ],
    },
  };
  assert.deepEqual(argsFromInteraction(mock), ['raid em andamento']);
});

// ---- Bitfield restoration para unlock -----------------------------------
check('bitfield allow/deny restaura flags corretas no Discord.js', () => {
  // Teste de bitfields: 1024n (ViewChannel) e 2048n (SendMessages)
  const allowBits = new PermissionsBitField(1024n);
  const denyBits = new PermissionsBitField(2048n);
  const options = {};
  for (const perm of allowBits.toArray()) options[perm] = true;
  for (const perm of denyBits.toArray()) options[perm] = false;

  const res = PermissionOverwrites.resolveOverwriteOptions(options);
  assert.equal(res.allow.bitfield.toString(), '1024');
  assert.equal(res.deny.bitfield.toString(), '2048');
});

// ---- Comandos -----------------------------------------------------------
await loadCommands();

check('comandos esperados foram carregados', () => {
  for (const name of ['panela', 'lock', 'unlock', 'lockall', 'unlockall', 'role', 'ping', 'help']) {
    assert.ok(commands.has(name), `comando "${name}" nao carregou`);
  }
});

check('todo comando tem name/description/run', () => {
  for (const command of uniqueCommands()) {
    assert.equal(typeof command.name, 'string', 'name invalido');
    assert.equal(typeof command.description, 'string', `${command.name}: description invalida`);
    assert.equal(typeof command.run, 'function', `${command.name}: run invalido`);
  }
});

check('slash payloads sao validos e unicos', () => {
  const seen = new Set();
  for (const command of uniqueCommands()) {
    if (typeof command.slash !== 'function') continue;

    const json = command.slash().toJSON();
    assert.equal(json.name, command.name, 'nome do slash diverge do comando');
    assert.ok(json.description.length > 0 && json.description.length <= 100, 'description fora de 1-100');
    assert.ok(!seen.has(json.name), `slash duplicado: ${json.name}`);
    seen.add(json.name);

    for (const option of json.options ?? []) {
      assert.ok(option.name === option.name.toLowerCase(), `opcao ${option.name} precisa ser minuscula`);
      assert.ok(option.description.length > 0, `opcao ${option.name} sem descricao`);
    }
  }
  assert.ok(seen.size >= 8, 'poucos slash commands registrados');
});

check('comandos de moderacao exigem permissao', () => {
  for (const name of ['lock', 'unlock', 'lockall', 'unlockall', 'role', 'panela']) {
    const command = commands.get(name);
    assert.ok(command.userPermissions?.length, `${name} nao exige permissao`);
  }
});

// ---- Store --------------------------------------------------------------
await check('store cria e le configuracao de servidor', async () => {
  await store.init();
  const cfg = store.guildConfig('123456789012345678');
  assert.equal(cfg.enabled, true, 'enabled deveria comecar true');
  assert.equal(cfg.prefix, null);
  assert.deepEqual(cfg.autorole.roles, []);
  assert.deepEqual(cfg.locks, {});
});

await check('store persiste e recarrega do disco', async () => {
  const cfg = store.guildConfig('123456789012345678');
  cfg.autorole.roles.push('999888777666555444');
  await store.flush();

  const { readFile } = await import('node:fs/promises');
  const raw = JSON.parse(await readFile('data/data.json', 'utf8'));
  assert.deepEqual(raw.guilds['123456789012345678'].autorole.roles, ['999888777666555444']);

  // Limpa o servidor de mentira criado pelo teste.
  delete store.allGuilds()['123456789012345678'];
  await store.flush();
});

logger.info(`\n${passed} verificacao(oes) passaram${failed ? `, ${failed} falharam` : ''}.`);
