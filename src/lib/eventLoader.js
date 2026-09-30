import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { logger } from './logger.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EVENTS_DIR = path.resolve(HERE, '..', 'events');

/** Le src/events/*.js e registra cada um no client pelo `name` (Events.X). */
export async function loadEvents(client) {
  const files = (await readdir(EVENTS_DIR)).filter((file) => file.endsWith('.js'));

  for (const file of files) {
    const url = pathToFileURL(path.join(EVENTS_DIR, file)).href;

    try {
      const event = await import(url);

      if (!event.name || typeof event.execute !== 'function') {
        logger.warn(`Ignorando evento ${file}: falta "name" ou "execute".`);
        continue;
      }

      // once = dispara uma vez so (ex: ClientReady).
      const register = event.once ? client.once.bind(client) : client.on.bind(client);
      register(event.name, (...args) => {
        Promise.resolve(event.execute(...args)).catch((error) =>
          logger.error(`Erro no evento ${event.name}:`, error),
        );
      });

      logger.info(`Evento registrado: ${event.name}`);
    } catch (error) {
      logger.error(`Falha ao carregar evento ${file}:`, error);
    }
  }
}
