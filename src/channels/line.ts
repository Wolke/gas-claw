import type { IncomingMessage } from '../types';
export function parseLineEvent(event:any): IncomingMessage {
  if (event?.type !== 'message' || event.message?.type !== 'text' || event.source?.type !== 'user') throw new Error('Unsupported LINE event');
  return { id:event.webhookEventId, channel:'line', userId:event.source.userId, conversationId:event.source.userId, replyToken:event.replyToken, text:event.message.text.trim(), timestamp:new Date(event.timestamp).toISOString(), eventType:event.type };
}
export function verifyLineSignature(body:string, signature:string, secret:string) { const bytes=Utilities.computeHmacSha256Signature(body, secret); return Utilities.base64Encode(bytes) === signature; }
