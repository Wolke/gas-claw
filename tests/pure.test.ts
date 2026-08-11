import { describe, expect, it } from 'vitest';
import { parseDecision } from '../src/agent/gemini';
import { parseLineEvent } from '../src/channels/line';
import { assertOwner, redact, requiresApproval } from '../src/security/policy';
import { extractTime, parseLocalCommand } from '../src/agent/commands';
import { ToolRegistry } from '../src/tools/registry';
import { findSkill, SKILLS } from '../src/skills/catalog';
import { nextRun } from '../src/scheduler';

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
describe('local commands',()=>{
  const now=new Date('2026-08-11T02:00:00.000Z');
  it('creates tasks',()=>expect(parseLocalCommand('新增任務：完成週報',now)).toMatchObject({kind:'create_task',title:'完成週報'}));
  it('lists tasks',()=>expect(parseLocalCommand('我的任務',now)).toEqual({kind:'list_tasks'}));
  it('completes tasks',()=>expect(parseLocalCommand('完成任務 週報',now)).toEqual({kind:'complete_task',query:'週報'}));
  it('stores preferences',()=>expect(parseLocalCommand('記住 工作時間：九點到六點',now)).toEqual({kind:'remember',key:'工作時間',value:'九點到六點'}));
  it('parses minute reminders',()=>expect(parseLocalCommand('10 分鐘後提醒我開會',now)).toEqual({kind:'reminder',message:'開會',runAt:'2026-08-11T02:10:00.000Z'}));
  it('parses hour reminders',()=>expect(parseLocalCommand('2 小時後提醒我寄信',now)).toEqual({kind:'reminder',message:'寄信',runAt:'2026-08-11T04:00:00.000Z'}));
  it('extracts tomorrow clock time',()=>expect(extractTime('明天下午 3 點 做簡報',now).rest).toBe('做簡報'));
  it('rejects invalid clock time',()=>expect(extractTime('明天 25 點 做簡報',now).at).toBeUndefined());
});
describe('tool registry',()=>{
  it('exposes only explicit tools',()=>{const r=new ToolRegistry();expect(r.get('gmail.search')?.risk).toBe('read');expect(r.get('shell.exec')).toBeUndefined();expect(r.declarations().length).toBeGreaterThanOrEqual(10)});
  it('validates required input',()=>expect(()=>new ToolRegistry().get('calendar.create')!.validate({title:'x'})).toThrow('Missing start'));
});
describe('skills',()=>{
  it('ships six project-management skills',()=>expect(SKILLS).toHaveLength(6));
  it('matches meeting coordination',()=>expect(findSkill('幫我安排會議')?.id).toBe('meeting-coordinator'));
  it('keeps sending behind approval',()=>expect(SKILLS.find(s=>s.id==='email-follow-up')?.approval).toContain('gmail.sendDraft'));
});
describe('scheduler recurrence',()=>{
  it('advances daily jobs',()=>expect(nextRun('daily','2026-08-11T00:00:00.000Z')).toBe('2026-08-12T00:00:00.000Z'));
  it('advances weekly jobs',()=>expect(nextRun('weekly','2026-08-11T00:00:00.000Z')).toBe('2026-08-18T00:00:00.000Z'));
  it('completes one-shot jobs',()=>expect(nextRun(undefined,'2026-08-11T00:00:00.000Z')).toBeUndefined());
});
