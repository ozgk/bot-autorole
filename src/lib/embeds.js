import { EmbedBuilder } from 'discord.js';

export const BRAND = {
  name: 'Panela Bot',
  primary: 0x5865f2,
  success: 0x57f287,
  warning: 0xfee75c,
  danger: 0xed4245,
};

export function embed({ title, description, color = BRAND.primary, fields, footer } = {}) {
  const builder = new EmbedBuilder().setColor(color).setFooter({ text: footer ?? BRAND.name });
  if (title) builder.setTitle(title);
  if (description) builder.setDescription(description);
  if (fields?.length) builder.addFields(fields);
  return builder;
}

export const infoEmbed = (description, title) => embed({ description, title });

export const okEmbed = (description, title) => embed({ description, title, color: BRAND.success });

export const warnEmbed = (description, title) => embed({ description, title, color: BRAND.warning });

export const errEmbed = (description, title) => embed({ description, title, color: BRAND.danger });

/** Corta textos longos para nao estourar o limite de 4096 caracteres do embed. */
export function truncate(text, max = 1000) {
  const value = String(text ?? '');
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

/** Formata uma lista de itens como lista com marcadores, com aviso se estiver vazia. */
export function bulletList(items, emptyText = '*nada aqui ainda*') {
  if (!items.length) return emptyText;
  return items.map((item) => `- ${item}`).join('\n');
}
