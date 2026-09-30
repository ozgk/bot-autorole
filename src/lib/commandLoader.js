import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { logger } from './logger.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const COMMANDS_DIR = path.resolve(HERE, '..', 'commands');

/** @type {Map<string, object>} */
export const commands = new Map();

/** Le src/commands/*.js e registra cada comando pelo seu `name`. */
export async function loadCommands() {
  commands.clear();

  const files = (await readdir(COMMANDS_DIR)).filter((file) => file.endsWith('.js'));

  for (const file of files) {
    const url = pathToFileURL(path.join(COMMANDS_DIR, file)).href;
    try {
      const { default: command } = await import(url);

      if (!command?.name || typeof command.run !== 'function') {
        logger.warn(`Ignorando ${file}: falta "name" ou "run".`);
        continue;
      }
      if (commands.has(command.name)) {
        logger.warn(`Ignorando ${file}: ja existe um comando chamado "${command.name}".`);
        continue;
      }

      command.category ??= 'geral';
      command.aliases ??= [];
      command.guildOnly ??= true;

      commands.set(command.name, command);
      for (const alias of command.aliases) {
        if (commands.has(alias)) {
          logger.warn(`Alias "${alias}" de ${command.name} ja esta em uso.`);
          continue;
        }
        commands.set(alias, command);
      }
    } catch (error) {
      logger.error(`Falha ao carregar ${file}:`, error);
    }
  }

  return commands;
}

/** Lista de comandos sem repetir os que aparecem via alias. */
export function uniqueCommands() {
  return [...new Set(commands.values())];
}
