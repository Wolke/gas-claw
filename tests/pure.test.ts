import { describe, expect, it } from 'vitest';
import { parseDecision } from '../src/agent/gemini';
import { parseLineEvent } from '../src/channels/line';
import { assertOwner, redact, requiresApproval, sanitizeForLog } from '../src/security/policy';
import { extractTime, parseLocalCommand } from '../src/agent/commands';
import { ToolRegistry } from '../src/tools/registry';
import { findSkill, SKILLS } from '../src/skills/catalog';
import { nextRun } from '../src/scheduler';
import { shouldCheckpoint } from '../src/agent/runtime';

describe('agent decision',()=>{
  it('fills optional collections',()=>expect(parseDecision('{"response":"ok"}')).toEqual({response:'ok',toolCalls:[],taskChanges:[],scheduleChanges:[],memoryCandidates:[]}));
  it('accepts fenced json',()=>expect(parseDecision('```json\n{"toolCalls":[]}\n```').toolCalls).toEqual([]));
  it('rejects non-array tool calls',()=>expect(()=>parseDecision('{"toolCalls":"gmail.search"}')).toThrow('must be an array'));
  it('rejects array decisions',()=>expect(()=>parseDecision('[]')).toThrow('must be an object'));
  it('rejects malformed tool calls',()=>expect(()=>parseDecision('{"toolCalls":[{"id":"1","name":"gmail.search","input":"x"}]}')).toThrow('input must be an object'));
  it('enforces the tool-call limit during parsing',()=>expect(()=>parseDecision(JSON.stringify({toolCalls:Array.from({length:7},(_,i)=>({id:String(i),name:'gmail.search',input:{}}))}))).toThrow('Too many tool calls'));
  it('rejects invalid task state',()=>expect(()=>parseDecision('{"taskChanges":[{"action":"update","task":{"id":"1","status":"hacked"}}]}')).toThrow('Invalid task status'));
  it('requires a valid scheduled time',()=>expect(()=>parseDecision('{"scheduleChanges":[{"action":"create","job":{"runAt":"tomorrow","payload":{}}}]}')).toThrow('Invalid job runAt'));
  it('rejects unsupported recurrence',()=>expect(()=>parseDecision('{"scheduleChanges":[{"action":"create","job":{"runAt":"2026-08-12T00:00:00.000Z","recurrence":"hourly","payload":{}}}]}')).toThrow('Invalid job recurrence'));
  it('rejects invalid memory scope',()=>expect(()=>parseDecision('{"memoryCandidates":[{"key":"k","value":"v","scope":"global"}]}')).toThrow('Invalid memory scope'));
});
describe('LINE adapter',()=>{
  it('normalizes a direct text message',()=>expect(parseLineEvent({type:'message',webhookEventId:'e1',timestamp:0,replyToken:'r',source:{type:'user',userId:'u'},message:{type:'text',text:' hi '}})).toMatchObject({id:'e1',channel:'line',userId:'u',text:'hi'}));
  it('rejects groups',()=>expect(()=>parseLineEvent({type:'message',source:{type:'group'},message:{type:'text',text:'x'}})).toThrow());
  it('rejects events without a stable webhook ID',()=>expect(()=>parseLineEvent({type:'message',timestamp:0,replyToken:'r',source:{type:'user',userId:'u'},message:{type:'text',text:'x'}})).toThrow('Invalid LINE event'));
});
describe('policy',()=>{
  it('requires approval for external writes',()=>{expect(requiresApproval('read')).toBe(false);expect(requiresApproval('send')).toBe(true)});
  it('enforces owner',()=>expect(()=>assertOwner({userId:'x'} as any,'y')).toThrow('Unauthorized'));
  it('redacts bearer tokens and Gemini-style keys',()=>{expect(redact('Bearer abcdefghijklmnop')).toBe('[REDACTED]');expect(redact('AI'+'za1234567890abcdefghijklmnop')).toBe('[REDACTED]')});
  it('omits document, email, payload and sheet content from logs',()=>expect(sanitizeForLog({id:'1',plainBody:'private mail',nested:{content:'private doc'},values:[[1]],payload:{token:'secret'}})).toEqual({id:'1',plainBody:'[CONTENT OMITTED]',nested:{content:'[CONTENT OMITTED]'},values:'[CONTENT OMITTED]',payload:'[CONTENT OMITTED]'}));
});
describe('local commands',()=>{
  const now=new Date('2026-08-11T02:00:00.000Z');
  it('creates tasks',()=>expect(parseLocalCommand('新增任務：完成週報',now)).toMatchObject({kind:'create_task',title:'完成週報'}));
  it('lists tasks',()=>expect(parseLocalCommand('我的任務',now)).toEqual({kind:'list_tasks'}));
  it('completes tasks',()=>expect(parseLocalCommand('完成任務 週報',now)).toEqual({kind:'complete_task',query:'週報'}));
  it('stores preferences',()=>expect(parseLocalCommand('記住 工作時間：九點到六點',now)).toEqual({kind:'remember',key:'工作時間',value:'九點到六點'}));
  it('parses minute reminders',()=>expect(parseLocalCommand('10 分鐘後提醒我開會',now)).toEqual({kind:'reminder',message:'開會',runAt:'2026-08-11T02:10:00.000Z'}));
  it('parses hour reminders',()=>expect(parseLocalCommand('2 小時後提醒我寄信',now)).toEqual({kind:'reminder',message:'寄信',runAt:'2026-08-11T04:00:00.000Z'}));
  it('extracts tomorrow clock time in Asia/Taipei',()=>expect(extractTime('明天下午 3 點 做簡報',now)).toMatchObject({rest:'做簡報',at:new Date('2026-08-12T07:00:00.000Z')}));
  it('rejects invalid clock time',()=>expect(extractTime('明天 25 點 做簡報',now).at).toBeUndefined());
});
describe('tool registry',()=>{
  it('exposes only explicit tools',()=>{const r=new ToolRegistry();expect(r.get('gmail.search')?.risk).toBe('read');expect(r.get('sheets.append')?.risk).toBe('write');expect(r.get('messaging.notifyOwner')?.risk).toBe('send');expect(r.get('shell.exec')).toBeUndefined();expect(r.declarations().length).toBeGreaterThanOrEqual(15)});
  it('validates required input',()=>expect(()=>new ToolRegistry().get('calendar.create')!.validate({title:'x'})).toThrow('Missing start'));
  it('rejects reversed calendar periods',()=>expect(()=>new ToolRegistry().get('calendar.create')!.validate({title:'x',start:'2026-08-12T02:00:00Z',end:'2026-08-12T01:00:00Z'})).toThrow('end must be after start'));
  it('rejects malformed email recipients',()=>expect(()=>new ToolRegistry().get('gmail.createDraft')!.validate({to:'not-an-email',subject:'x',body:'y'})).toThrow('Invalid to'));
  it('exposes thread reading as a read-only tool',()=>{const tool=new ToolRegistry().get('gmail.readThread')!;expect(tool.risk).toBe('read');expect(()=>tool.validate({})).toThrow('Missing threadId');expect(tool.validate({threadId:'thread-123'})).toMatchObject({threadId:'thread-123'})});
  it('caps Sheets row width and cell types',()=>{const tool=new ToolRegistry().get('sheets.append')!;expect(()=>tool.validate({spreadsheetId:'abc',sheetName:'S',values:[]})).toThrow('1 to 100');expect(()=>tool.validate({spreadsheetId:'abc',sheetName:'S',values:[{formula:'x'}]})).toThrow('unsupported')});
  it('validates Google Tasks due dates',()=>expect(()=>new ToolRegistry().get('tasks.create')!.validate({title:'x',due:'later'})).toThrow('Invalid due'));
  it('requires a valid Google Task ID before completion',()=>{const tool=new ToolRegistry().get('tasks.complete')!;expect(tool.risk).toBe('write');expect(()=>tool.validate({taskId:'bad/id'})).toThrow('Invalid taskId');expect(tool.validate({taskId:'task_123'})).toMatchObject({taskId:'task_123'})});
});
describe('skills',()=>{
  it('ships six project-management skills',()=>expect(SKILLS).toHaveLength(6));
  it('matches meeting coordination',()=>expect(findSkill('幫我安排會議')?.id).toBe('meeting-coordinator'));
  it('keeps sending behind approval',()=>expect(SKILLS.find(s=>s.id==='email-follow-up')?.approval).toContain('gmail.sendDraft'));
  it('keeps Google Task completion behind approval',()=>expect(SKILLS.find(s=>s.id==='task-manager')?.approval).toContain('tasks.complete'));
});
describe('scheduler recurrence',()=>{
  it('advances daily jobs',()=>expect(nextRun('daily','2026-08-11T00:00:00.000Z')).toBe('2026-08-12T00:00:00.000Z'));
  it('advances weekly jobs',()=>expect(nextRun('weekly','2026-08-11T00:00:00.000Z')).toBe('2026-08-18T00:00:00.000Z'));
  it('completes one-shot jobs',()=>expect(nextRun(undefined,'2026-08-11T00:00:00.000Z')).toBeUndefined());
});
describe('execution budget',()=>{it('checkpoints at the four-minute soft limit',()=>{expect(shouldCheckpoint(0,239999)).toBe(false);expect(shouldCheckpoint(0,240000)).toBe(true)})});
