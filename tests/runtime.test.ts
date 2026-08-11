import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runAgent } from '../src/agent/runtime';
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
  sheets=Object.fromEntries(Object.entries(headers).map(([k,v])=>[k,new FakeSheet(v)]));properties={DATABASE_SPREADSHEET_ID:'db',LINE_OWNER_ID:'owner'};cache=new Map();uuid=0;
  vi.stubGlobal('PropertiesService',{getScriptProperties:()=>({getProperty:(k:string)=>properties[k]??null})});
  vi.stubGlobal('SpreadsheetApp',{openById:()=>({getSheetByName:(name:string)=>sheets[name]})});
  vi.stubGlobal('CacheService',{getScriptCache:()=>({get:(k:string)=>cache.get(k)??null,put:(k:string,v:string)=>cache.set(k,v)})});
  vi.stubGlobal('Utilities',{getUuid:()=>`uuid-${++uuid}`});
  vi.stubGlobal('LockService',{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})});
});

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
});
