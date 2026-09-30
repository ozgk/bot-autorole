import { PermissionsBitField } from 'discord.js';

/**
 * O lock guarda um "snapshot" do estado do overwrite antes de mexer, para que
 * o unlock restaure exatamente o que existia — inclusive se o @everyone nao
 * tinha overwrite nenhum naquele canal.
 *
 * Snapshot de canal:
 *   { type: 'channel', targetId, existed, allow, deny, at, by }
 * Snapshot de thread:
 *   { type: 'thread', locked, at, by }
 */

const LOCK_DENY = {
  SendMessages: false,
  SendMessagesInThreads: false,
};

export async function lockChannel(channel, { role = null, reason, by }) {
  const target = role ?? channel.guild.roles.everyone;

  if (channel.isThread()) {
    const snapshot = {
      type: 'thread',
      locked: channel.locked,
      at: Date.now(),
      by: by.id,
    };
    await channel.setLocked(true, reason);
    return snapshot;
  }

  const existing = channel.permissionOverwrites.cache.get(target.id);
  const snapshot = {
    type: 'channel',
    targetId: target.id,
    existed: Boolean(existing),
    allow: existing ? existing.allow.bitfield.toString() : '0',
    deny: existing ? existing.deny.bitfield.toString() : '0',
    at: Date.now(),
    by: by.id,
  };

  await channel.permissionOverwrites.edit(target, LOCK_DENY, { reason });
  return snapshot;
}

export async function unlockChannel(channel, snapshot, { reason } = {}) {
  if (snapshot.type === 'thread') {
    await channel.setLocked(false, reason);
    return;
  }

  const target =
    channel.guild.roles.cache.get(snapshot.targetId) ??
    (await channel.guild.roles.fetch(snapshot.targetId).catch(() => null)) ??
    channel.guild.members.cache.get(snapshot.targetId) ??
    (await channel.guild.members.fetch(snapshot.targetId).catch(() => null));

  if (!target) return;

  if (!snapshot.existed) {
    await channel.permissionOverwrites.delete(target).catch(() => {});
    return;
  }

  // Remove as modificacoes do lock
  await channel.permissionOverwrites.delete(target).catch(() => {});

  // Recria o overwrite com os bitfields exatos de antes do lock.
  const allowBits = new PermissionsBitField(BigInt(snapshot.allow || '0'));
  const denyBits = new PermissionsBitField(BigInt(snapshot.deny || '0'));
  const options = {};
  for (const perm of allowBits.toArray()) options[perm] = true;
  for (const perm of denyBits.toArray()) options[perm] = false;

  if (Object.keys(options).length > 0) {
    await channel.permissionOverwrites.create(target, options, { reason });
  }
}

/** Canais que fazem sentido travar/destravar. */
export function isLockable(channel) {
  return channel && (channel.isTextBased() || channel.isThread());
}
