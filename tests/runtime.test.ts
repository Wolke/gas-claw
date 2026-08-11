import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runAgent } from '../src/agent/runtime';
import { schedulerTick } from '../src/scheduler';
import type { IncomingMessage } from '../src/types';

class FakeSheet {
  values:any[][];
  constructor(headers:string[]){this.values=[headers]}
  appendRow(row:any[]){this.values.push(row)}
  getDataRange(){return{getValues:()=>this.values.map(r=>[...r])}}
  getRange(row:number,col:number){return{setValue:(value:any)=>{this.values[row-1][col-1]=value},setValues:(values:any[][])=>{values[0].forEach((v,i)=>this.values[row-1][col-1+i]=v)}}}
}

const headers={
  Tasks:['id','title','status','priority','dueAt','project','sourceChannel','sourceConversationId','createdAt','updatedAt'],
  Jobs:['id','type','runAt','recurrence','payload','destination','status','attempts'],
  Approvals:['id','action','summary','risk','expiresAt','status','channel','conversationId'],
  Memory:['key','value','scope','updatedAt'],
  Runs:['id','channel','conversationId','status','summary','createdAt']
};
let sheets:Record<string,FakeSheet>,properties:Record<string,string>,cache:Map<string,string>,uuid=0;
function message(text:string,id=`m-${++uuid}`):IncomingMessage{return{id,channel:'line',userId:'owner',conversationId:'owner',replyToken:'r',text,timestamp:new Date().toISOString(),eventType:'message'}}

beforeEach(()=>{
  sheets=Object.fromEntries(Object.entries(headers).map(([k,v])=>[k,new FakeSheet(v)]));properties={DATABASE_SPREADSHEET_ID:'db',LINE_OWNER_ID:'owner',GOOGLE_CHAT_OWNER_ID:'users/owner',LINE_CHANNEL_ACCESS_TOKEN:'test-token'};cache=new Map();uuid=0;
  vi.stubGlobal('PropertiesService',{getScriptProperties:()=>({getProperty:(k:string)=>properties[k]??null})});
  vi.stubGlobal('SpreadsheetApp',{openById:()=>({getSheetByName:(name:string)=>sheets[name]})});
  vi.stubGlobal('CacheService',{getScriptCache:()=>({get:(k:string)=>cache.get(k)??null,put:(k:string,v:string)=>cache.set(k,v)})});
  vi.stubGlobal('Utilities',{getUuid:()=>`00000000-0000-4000-8000-${String(++uuid).padStart(12,'0')}`});
  vi.stubGlobal('LockService',{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})});
});

function mockGemini(decision:Record<string,unknown>){properties.GEMINI_API_KEY='test-key';const fetch=vi.fn(()=>({getResponseCode:()=>200,getContentText:()=>JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(decision)}]}}]})}));vi.stubGlobal('UrlFetchApp',{fetch});return fetch}

describe('runtime deterministic path',()=>{
  it('rejects non-owner messages',()=>expect(()=>runAgent({...message('幫助'),userId:'attacker'})).toThrow('Unauthorized owner'));
  it('creates and lists a task without calling Gemini',()=>{
    expect(runAgent(message('新增任務：完成實機測試'))).toBe('已建立任務：完成實機測試');
    expect(sheets.Tasks.values).toHaveLength(2);
    expect(runAgent(message('列出任務'))).toContain('完成實機測試');
  });
  it('completes a unique task',()=>{
    runAgent(message('新增任務：寫完文章'));
    expect(runAgent(message('完成任務 寫完文章'))).toBe('已完成：寫完文章');
    expect(sheets.Tasks.values[1][2]).toBe('done');
  });
  it('deduplicates webhook events',()=>{
    const event=message('新增任務：只建立一次','same-event');
    runAgent(event);
    expect(runAgent(event)).toBe('這則訊息已處理。');
    expect(sheets.Tasks.values).toHaveLength(2);
  });
  it('deduplicates events persistently after cache eviction',()=>{const event=message('新增任務：跨快取去重','persistent-event');runAgent(event);cache.clear();expect(runAgent(event)).toBe('這則訊息已處理。');expect(sheets.Tasks.values).toHaveLength(2)});
  it('creates a scheduled reminder',()=>{
    expect(runAgent(message('10 分鐘後提醒我驗收'))).toContain('已設定提醒');
    expect(sheets.Jobs.values).toHaveLength(2);
    expect(sheets.Jobs.values[1][6]).toBe('active');
  });
  it('stores and reuses memory rows',()=>{
    runAgent(message('記住 工作時間：九點到六點'));
    runAgent(message('記住 工作時間：十點到七點'));
    expect(sheets.Memory.values).toHaveLength(2);
    expect(sheets.Memory.values[1][1]).toBe('十點到七點');
  });
  it('forces model-created jobs back to the current owner destination',()=>{
    mockGemini({response:'排好了',toolCalls:[],taskChanges:[],memoryCandidates:[],scheduleChanges:[{action:'create',job:{type:'agent_run',runAt:'2026-08-12T02:00:00.000Z',payload:{prompt:'test'},destination:{channel:'line',conversationId:'attacker'}}}]});
    expect(runAgent(message('建立複雜排程'))).toBe('排好了');
    expect(sheets.Jobs.values[1][5]).toBe(JSON.stringify({channel:'line',conversationId:'owner'}));
  });
  it('applies model-requested pause changes',()=>{
    sheets.Jobs.appendRow(['job-1','reminder','2026-08-12T02:00:00.000Z','',JSON.stringify({message:'x'}),JSON.stringify({channel:'line',conversationId:'owner'}),'active',0]);
    mockGemini({response:'已暫停',toolCalls:[],taskChanges:[],memoryCandidates:[],scheduleChanges:[{action:'pause',job:{id:'job-1'}}]});
    runAgent(message('暫停那個排程'));
    expect(sheets.Jobs.values[1][6]).toBe('paused');
  });
});

describe('approval lifecycle',()=>{
  function requestCalendarApproval(){mockGemini({response:'準備建立',taskChanges:[],scheduleChanges:[],memoryCandidates:[],toolCalls:[{id:'call-1',name:'calendar.create',input:{title:'測試會議',start:'2026-08-12T02:00:00.000Z',end:'2026-08-12T03:00:00.000Z'}}]});const reply=runAgent(message('幫我建立測試會議'));const id=reply.match(/[0-9a-f-]{36}/)?.[0];expect(id).toBeTruthy();return id!}
  it('executes an approved write exactly once',()=>{
    const id=requestCalendarApproval(),createEvent=vi.fn(()=>({getId:()=> 'event-1'}));vi.stubGlobal('CalendarApp',{getDefaultCalendar:()=>({createEvent})});
    expect(runAgent(message(`核准 ${id}`))).toContain('已核准並完成');
    expect(runAgent(message(`核准 ${id}`))).toBe('找不到有效的待核准操作。');
    expect(createEvent).toHaveBeenCalledTimes(1);expect(sheets.Approvals.values[1][5]).toBe('approved');
  });
  it('rejects without executing',()=>{const id=requestCalendarApproval(),createEvent=vi.fn();vi.stubGlobal('CalendarApp',{getDefaultCalendar:()=>({createEvent})});expect(runAgent(message(`拒絕 ${id}`))).toBe('已拒絕這項操作。');expect(createEvent).not.toHaveBeenCalled();expect(sheets.Approvals.values[1][5]).toBe('rejected')});
  it('expires stale approvals',()=>{const id=requestCalendarApproval();sheets.Approvals.values[1][4]='2020-01-01T00:00:00.000Z';expect(runAgent(message(`核准 ${id}`))).toBe('這項核准已過期。');expect(sheets.Approvals.values[1][5]).toBe('expired')});
  it('rejects approval from another conversation',()=>{const id=requestCalendarApproval();expect(runAgent({...message(`核准 ${id}`),channel:'google_chat',userId:'users/owner',conversationId:'spaces/other'})).toBe('核准來源不符。')});
});

describe('scheduler runtime',()=>{
  const destination=JSON.stringify({channel:'line',conversationId:'owner'});
  const jobId='123e4567-e89b-42d3-a456-426614174000';
  it('delivers and completes a one-shot reminder with a UUID retry key',()=>{sheets.Jobs.appendRow([jobId,'reminder','2020-01-01T00:00:00.000Z','',JSON.stringify({message:'到期'}),destination,'active',0]);const fetch=vi.fn((..._args:any[])=>({getResponseCode:()=>200}));vi.stubGlobal('UrlFetchApp',{fetch});expect(schedulerTick()).toBe(1);expect(fetch).toHaveBeenCalledTimes(1);expect(fetch.mock.calls[0]![1].headers['X-Line-Retry-Key']).toMatch(/^[0-9a-f-]{36}$/);expect(sheets.Jobs.values[1][6]).toBe('completed');expect(sheets.Jobs.values[1][7]).toBe(0)});
  it('treats a LINE retry-key conflict as already delivered',()=>{sheets.Jobs.appendRow([jobId,'reminder','2020-01-01T00:00:00.000Z','',JSON.stringify({message:'已送達'}),destination,'active',1]);vi.stubGlobal('UrlFetchApp',{fetch:vi.fn(()=>({getResponseCode:()=>409}))});schedulerTick();expect(sheets.Jobs.values[1][6]).toBe('completed')});
  it('uses a stable Google Chat requestId',()=>{sheets.Jobs.appendRow([jobId,'reminder','2020-01-01T00:00:00.000Z','',JSON.stringify({message:'Chat 提醒'}),JSON.stringify({channel:'google_chat',conversationId:'spaces/test'}),'active',0]);vi.stubGlobal('ScriptApp',{getOAuthToken:()=> 'oauth'});const fetch=vi.fn((..._args:any[])=>({getResponseCode:()=>200}));vi.stubGlobal('UrlFetchApp',{fetch});schedulerTick();expect(fetch.mock.calls[0]![0]).toMatch(/messages\?requestId=[0-9a-f-]{36}$/);expect(fetch.mock.calls[0]![1].headers.Authorization).toBe('Bearer oauth')});
  it('advances a recurring reminder',()=>{sheets.Jobs.appendRow([jobId,'reminder','2020-01-01T00:00:00.000Z','daily',JSON.stringify({message:'每日'}),destination,'active',0]);vi.stubGlobal('UrlFetchApp',{fetch:vi.fn(()=>({getResponseCode:()=>200}))});schedulerTick();expect(sheets.Jobs.values[1][2]).toBe('2020-01-02T00:00:00.000Z');expect(sheets.Jobs.values[1][6]).toBe('active')});
  it('reuses the same retry key after an ambiguous delivery failure',()=>{sheets.Jobs.appendRow([jobId,'reminder','2020-01-01T00:00:00.000Z','',JSON.stringify({message:'重試'}),destination,'active',0]);vi.spyOn(console,'error').mockImplementation(()=>{});const fetch=vi.fn((..._args:any[])=>({getResponseCode:()=>fetch.mock.calls.length===1?500:200}));vi.stubGlobal('UrlFetchApp',{fetch});schedulerTick();schedulerTick();expect(fetch.mock.calls[0]![1].headers['X-Line-Retry-Key']).toBe(fetch.mock.calls[1]![1].headers['X-Line-Retry-Key']);expect(sheets.Jobs.values[1][6]).toBe('completed')});
  it('fails after three delivery attempts',()=>{sheets.Jobs.appendRow([jobId,'reminder','2020-01-01T00:00:00.000Z','',JSON.stringify({message:'失敗'}),destination,'active',0]);vi.spyOn(console,'error').mockImplementation(()=>{});vi.stubGlobal('UrlFetchApp',{fetch:vi.fn(()=>{throw new Error('LINE unavailable')})});expect(schedulerTick()).toBe(1);expect(schedulerTick()).toBe(1);expect(schedulerTick()).toBe(1);expect(sheets.Jobs.values[1][7]).toBe(3);expect(sheets.Jobs.values[1][6]).toBe('failed')});
});
