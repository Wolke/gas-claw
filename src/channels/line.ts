import type { IncomingMessage } from '../types';
export function parseLineEvent(event:any): IncomingMessage {
  if (event?.type !== 'message' || event.message?.type !== 'text' || event.source?.type !== 'user') throw new Error('Unsupported LINE event');
  if (!event.webhookEventId || !event.source.userId || !event.replyToken || !event.message.text?.trim() || event.timestamp===undefined || event.timestamp===null || !Number.isFinite(Number(event.timestamp))) throw new Error('Invalid LINE event');
  return { id:event.webhookEventId, channel:'line', userId:event.source.userId, conversationId:event.source.userId, replyToken:event.replyToken, text:event.message.text.trim(), timestamp:new Date(event.timestamp).toISOString(), eventType:event.type };
}
