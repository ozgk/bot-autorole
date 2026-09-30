import 'dotenv/config';

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    console.error(
      `\n[config] A variavel de ambiente ${name} nao foi definida.\n` +
        '         Copie o arquivo .env.example para .env e preencha os valores.\n',
    );
    process.exit(1);
  }
  return value.trim();
}

function optionalList(name) {
  return (process.env[name] ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const config = {
  token: requireEnv('DISCORD_TOKEN'),
  prefix: (process.env.PREFIX ?? '!').trim() || '!',
  ownerIds: optionalList('OWNER_IDS'),
  devGuildId: (process.env.DEV_GUILD_ID ?? '').trim() || null,
};
