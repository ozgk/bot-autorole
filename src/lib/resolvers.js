const ID_PATTERN = /^\d{15,25}$/;

function stripMention(input) {
  return String(input ?? '').replace(/[<@&#!>]/g, '').trim();
}

/** Aceita <@&123>, 123, "Admin" ou "adm" (busca por nome exato e depois parcial). */
export function resolveRole(guild, input) {
  if (!input) return null;
  const raw = String(input).trim();
  const id = stripMention(raw);

  if (ID_PATTERN.test(id)) return guild.roles.cache.get(id) ?? null;

  const needle = raw.toLowerCase();
  return (
    guild.roles.cache.find((role) => role.name.toLowerCase() === needle) ??
    guild.roles.cache.find((role) => role.name.toLowerCase().includes(needle)) ??
    null
  );
}

/** Aceita <#123>, 123 ou "geral". */
export function resolveChannel(guild, input) {
  if (!input) return null;
  const raw = String(input).trim();
  const id = stripMention(raw);

  if (ID_PATTERN.test(id)) return guild.channels.cache.get(id) ?? null;

  const needle = raw.toLowerCase().replace(/^#/, '');
  return (
    guild.channels.cache.find((channel) => channel.name.toLowerCase() === needle) ??
    guild.channels.cache.find((channel) => channel.name.toLowerCase().includes(needle)) ??
    null
  );
}

/** Aceita <@123>, 123 ou "nome#0000" / "nome". */
export function resolveMember(guild, input) {
  if (!input) return null;
  const raw = String(input).trim();
  const id = stripMention(raw);

  if (ID_PATTERN.test(id)) return guild.members.cache.get(id) ?? null;

  const needle = raw.toLowerCase();
  return (
    guild.members.cache.find((member) => member.user.username.toLowerCase() === needle) ??
    guild.members.cache.find((member) => member.user.username.toLowerCase().includes(needle)) ??
    null
  );
}
