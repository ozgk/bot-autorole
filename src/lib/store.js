import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from './logger.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(HERE, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const TEMP_FILE = `${DATA_FILE}.tmp`;

/** @type {{ version: number, guilds: Record<string, any> } | null} */
let state = null;
let saveTimer = null;
let flushing = null;

function defaultGuildConfig() {
  return {
    enabled: true,
    prefix: null,
    autorole: {
      enabled: true,
      roles: [],
      applyToBots: false,
    },
    logChannelId: null,
    /** channelId -> { allow, deny, at, by } (estado do @everyone antes do lock) */
    locks: {},
  };
}

/** Carrega o arquivo de dados do disco (ou cria um novo). */
export async function init() {
  await mkdir(DATA_DIR, { recursive: true });

  if (!existsSync(DATA_FILE)) {
    state = { version: 1, guilds: {} };
    await flush();
    logger.info('Banco de dados criado em data/data.json');
    return;
  }

  try {
    const raw = await readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    state = { version: 1, guilds: {} };
    if (parsed && typeof parsed === 'object' && parsed.guilds && typeof parsed.guilds === 'object') {
      state.guilds = parsed.guilds;
    }
  } catch (error) {
    const backup = `${DATA_FILE}.corrompido-${Date.now()}`;
    logger.error(`data.json invalido (${error.message}). Movendo para ${path.basename(backup)} e comecando do zero.`);
    await rename(DATA_FILE, backup).catch(() => {});
    state = { version: 1, guilds: {} };
  }
}

/** Retorna (criando se preciso) a configuracao de um servidor. Mutações persistem no save(). */
export function guildConfig(guildId) {
  if (!state) throw new Error('store.init() precisa ser chamado antes de guildConfig()');
  state.guilds[guildId] ??= defaultGuildConfig();

  const guild = state.guilds[guildId];
  guild.enabled ??= true;
  guild.autorole ??= { enabled: true, roles: [], applyToBots: false };
  guild.autorole.roles = Array.isArray(guild.autorole.roles) ? guild.autorole.roles : [];
  guild.locks ??= {};
  guild.logChannelId ??= null;
  guild.prefix ??= null;

  return guild;
}

export function allGuilds() {
  if (!state) throw new Error('store.init() precisa ser chamado antes de allGuilds()');
  return state.guilds;
}

/** Agenda a gravacao em disco (debounce de 250ms). */
export function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    flush().catch((error) => logger.error('Falha ao salvar data.json:', error));
  }, 250);
}

/** Grava agora, de forma atomica (escreve em .tmp e renomeia). */
export async function flush() {
  if (!state) return;
  if (flushing) return flushing;

  const payload = JSON.stringify(state, null, 2);
  flushing = (async () => {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(TEMP_FILE, payload, 'utf8');
    await rename(TEMP_FILE, DATA_FILE);
  })();

  try {
    await flushing;
  } finally {
    flushing = null;
  }
}
