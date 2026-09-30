import { Events } from 'discord.js';
import { handleMessage } from '../lib/messageHandler.js';

export const name = Events.MessageCreate;
export const execute = handleMessage;
