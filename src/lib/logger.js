const COLORS = {
  info: '\u001b[36m',
  ok: '\u001b[32m',
  warn: '\u001b[33m',
  error: '\u001b[31m',
  dim: '\u001b[90m',
  reset: '\u001b[0m',
};

function timestamp() {
  return new Date().toLocaleTimeString('pt-BR', { hour12: false });
}

function write(label, color, args) {
  console.log(`${COLORS.dim}[${timestamp()}]${COLORS.reset} ${color}${label.padEnd(5)}${COLORS.reset}`, ...args);
}

export const logger = {
  info: (...args) => write('INFO', COLORS.info, args),
  ok: (...args) => write('OK', COLORS.ok, args),
  warn: (...args) => write('AVISO', COLORS.warn, args),
  error: (...args) => write('ERRO', COLORS.error, args),
};
