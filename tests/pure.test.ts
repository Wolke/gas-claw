import { describe, expect, it } from 'vitest';
import { parseDecision } from '../src/agent/gemini';
import { parseLineEvent } from '../src/channels/line';
import { assertOwner, redact, requiresApproval } from '../src/security/policy';

describe('agent decision',()=>{
  it('fills optional collections',()=>expect(parseDecision('{"response":"ok"}')).toEqual({response:'ok',toolCalls:[],taskChanges:[],scheduleChanges:[],memoryCandidates:[]}));
  it('accepts fenced json',()=>expect(parseDecision('```json\n{"toolCalls":[]}\n```').toolCalls).toEqual([]));
});
describe('LINE adapter',()=>{
  it('normalizes a direct text message',()=>expect(parseLineEvent({type:'message',webhookEventId:'e1',timestamp:0,replyToken:'r',source:{type:'user',userId:'u'},message:{type:'text',text:' hi '}})).toMatchObject({id:'e1',channel:'line',userId:'u',text:'hi'}));
  it('rejects groups',()=>expect(()=>parseLineEvent({type:'message',source:{type:'group'},message:{type:'text',text:'x'}})).toThrow());
});
describe('policy',()=>{
  it('requires approval for external writes',()=>{expect(requiresApproval('read')).toBe(false);expect(requiresApproval('send')).toBe(true)});
  it('enforces owner',()=>expect(()=>assertOwner({userId:'x'} as any,'y')).toThrow('Unauthorized'));
  it('redacts secrets',()=>expect(redact('Bearer abcdefghijklmnop')).toBe('[REDACTED]'));
});
