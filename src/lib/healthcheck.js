import http from 'node:http';
import { logger } from './logger.js';

let server = null;

/**
 * Servidor HTTP simples para atender aos requisitos de porta do Render.com
 * e permitir monitoramento de uptime (ex: UptimeRobot, cron-job.org).
 */
export function startHealthCheck(client, port = process.env.PORT) {
  if (!port) return null;

  server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/health') {
      const isReady = client?.isReady?.() ?? false;
      const data = {
        status: isReady ? 'online' : 'starting',
        tag: client?.user?.tag ?? null,
        uptimeSeconds: Math.floor(process.uptime()),
        guilds: client?.guilds?.cache?.size ?? 0,
        timestamp: new Date().toISOString(),
      };

      res.writeHead(isReady ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data, null, 2));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

  server.listen(port, () => {
    logger.ok(`Servidor HTTP de health check ativo na porta ${port} (Render / UptimeRobot).`);
  });

  return server;
}

export function stopHealthCheck() {
  if (server) {
    server.close();
    server = null;
  }
}
