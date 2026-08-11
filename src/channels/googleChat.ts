import type { IncomingMessage } from '../types';
export function parseGoogleChatEvent(event: any): IncomingMessage {
  const msg = event?.chat?.messagePayload?.message ?? event?.message;
  const user = msg?.sender ?? event?.user;
  if (!msg?.text || !user?.name) throw new Error('Invalid Google Chat event');
  const spaceType = msg.space?.type ?? event?.space?.type;
  if (spaceType && spaceType !== 'DM') throw new Error('Group conversations are disabled');
  return { id: msg.name ?? event.commonEventObject?.eventId ?? Utilities.getUuid(), channel:'google_chat', userId:user.name, conversationId:msg.space?.name ?? event.space?.name, text:msg.text.trim(), timestamp:msg.createTime ?? new Date().toISOString(), eventType:event.type ?? 'MESSAGE' };
}
export function googleChatResponse(text:string) { return { text }; }
