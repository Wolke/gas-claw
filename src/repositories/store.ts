import type { ApprovalRequest, ScheduledJob, Task } from '../types';
const HEADERS={Tasks:['id','title','status','priority','dueAt','project','sourceChannel','sourceConversationId','createdAt','updatedAt'],Jobs:['id','type','runAt','recurrence','payload','destination','status','attempts'],Approvals:['id','action','summary','risk','expiresAt','status','channel','conversationId'],Memory:['key','value','scope','updatedAt'],Runs:['id','channel','conversationId','status','summary','createdAt']};
type SheetName=keyof typeof HEADERS;
function db(){ const id=PropertiesService.getScriptProperties().getProperty('DATABASE_SPREADSHEET_ID'); if(!id) throw new Error('Run setupGasClaw first'); return SpreadsheetApp.openById(id); }
function sheet(name:SheetName){ const s=db().getSheetByName(name); if(!s) throw new Error(`Missing sheet: ${name}`); return s; }
function encode(v:unknown){ return typeof v==='object'&&v!==null?JSON.stringify(v):v??''; }
export function append(name:SheetName,row:object){ const headers=HEADERS[name]; const record=row as Record<string,unknown>; sheet(name).appendRow(headers.map(h=>encode(record[h]))); }
export function rows<T>(name:SheetName):T[]{ const values=sheet(name).getDataRange().getValues(); const headers=values.shift() as string[]; return values.filter(r=>r[0]).map(r=>Object.fromEntries(headers.map((h,i)=>[h,typeof r[i]==='string'&&/^[\[{]/.test(r[i])?safeJson(r[i]):r[i]])) as T); }
export function updateById(name:SheetName,id:string,changes:Record<string,unknown>){const s=sheet(name),values=s.getDataRange().getValues(),headers=values[0] as string[],index=values.findIndex((r,i)=>i>0&&r[0]===id);if(index<1)throw new Error(`${name} row not found: ${id}`);Object.entries(changes).forEach(([key,value])=>{const col=headers.indexOf(key);if(col>=0)s.getRange(index+1,col+1).setValue(encode(value))})}
function safeJson(v:string){try{return JSON.parse(v)}catch{return v}}
export function createTask(task:Task){ append('Tasks',task); }
export function createJob(job:ScheduledJob){ append('Jobs',job); }
export function createApproval(a:ApprovalRequest){ append('Approvals',a); }
export function findApproval(id:string){return rows<ApprovalRequest>('Approvals').find(a=>a.id===id)}
export function recentContext(){ return {tasks:rows<Task>('Tasks').slice(-20), memory:rows('Memory').slice(-30)}; }
export function initializeStore(){ const ss=SpreadsheetApp.create('gas-claw database'); PropertiesService.getScriptProperties().setProperty('DATABASE_SPREADSHEET_ID',ss.getId()); Object.entries(HEADERS).forEach(([name,headers],i)=>{const s=i===0?ss.getSheets()[0].setName(name):ss.insertSheet(name);s.appendRow(headers)}); return ss.getUrl(); }
