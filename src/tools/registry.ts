import type { AgentContext, AgentTool } from '../types';
const required=(input:unknown, fields:string[])=>{ if(!input||typeof input!=='object')throw new Error('Input must be an object'); const o=input as Record<string,unknown>; fields.forEach(f=>{if(o[f]===undefined||o[f]==='')throw new Error(`Missing ${f}`)}); return o };
const tools:AgentTool[]=[
 {name:'gmail.search',description:'Search Gmail messages',risk:'read',validate:i=>required(i,['query']),execute:i=>GmailApp.search(String(i.query),0,10).map(t=>({subject:t.getFirstMessageSubject(),lastDate:t.getLastMessageDate().toISOString(),messageCount:t.getMessageCount()}))},
 {name:'gmail.createDraft',description:'Create an email draft',risk:'draft',validate:i=>required(i,['to','subject','body']),execute:i=>({draftId:GmailApp.createDraft(String(i.to),String(i.subject),String(i.body)).getId()})},
 {name:'calendar.list',description:'List calendar events',risk:'read',validate:i=>required(i,['start','end']),execute:i=>CalendarApp.getDefaultCalendar().getEvents(new Date(String(i.start)),new Date(String(i.end))).map(e=>({id:e.getId(),title:e.getTitle(),start:e.getStartTime().toISOString(),end:e.getEndTime().toISOString()}))},
 {name:'calendar.create',description:'Create calendar event',risk:'write',validate:i=>required(i,['title','start','end']),execute:i=>({eventId:CalendarApp.getDefaultCalendar().createEvent(String(i.title),new Date(String(i.start)),new Date(String(i.end)),{description:String(i.description??'')}).getId()})},
 {name:'drive.search',description:'Search Drive files',risk:'read',validate:i=>required(i,['name']),execute:i=>{const fs=DriveApp.getFilesByName(String(i.name)),out=[];while(fs.hasNext()&&out.length<10){const f=fs.next();out.push({id:f.getId(),name:f.getName(),url:f.getUrl()})}return out}},
 {name:'docs.read',description:'Read a Google Doc',risk:'read',validate:i=>required(i,['documentId']),execute:i=>({text:DocumentApp.openById(String(i.documentId)).getBody().getText().slice(0,30000)})},
 {name:'tasks.list',description:'List Google Tasks',risk:'read',validate:i=>(i??{}) as Record<string,unknown>,execute:()=>Tasks.Tasks?.list('@default')},
 {name:'tasks.create',description:'Create Google Task',risk:'write',validate:i=>required(i,['title']),execute:i=>Tasks.Tasks?.insert({title:String(i.title),notes:String(i.notes??''),due:i.due?String(i.due):undefined},'@default')}
];
export class ToolRegistry { private map=new Map(tools.map(t=>[t.name,t])); get(name:string){return this.map.get(name)}; declarations(){return tools.map(t=>({name:t.name,description:t.description,risk:t.risk}))} }
