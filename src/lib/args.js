const ARG_PATTERN = /"([^"]*)"|'([^']*)'|(\S+)/g;

/** Divide "addrole @Membro motivo aqui" em tokens, respeitando aspas. */
export function parseArgs(input) {
  const args = [];
  if (!input) return args;

  ARG_PATTERN.lastIndex = 0;
  let match;
  while ((match = ARG_PATTERN.exec(input)) !== null) {
    args.push(match[1] ?? match[2] ?? match[3]);
  }
  return args;
}

/** "on" | "ativar" | "1" -> true ; "off" | "desativar" | "0" -> false ; resto -> null */
export function parseToggle(token) {
  const value = String(token ?? '').toLowerCase();
  if (['on', 'ativar', 'ligar', '1', 'true', 'sim', 'enable'].includes(value)) return true;
  if (['off', 'desativar', 'desligar', '0', 'false', 'nao', 'disable'].includes(value)) return false;
  return null;
}
