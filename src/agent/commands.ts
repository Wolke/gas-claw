import type { IncomingMessage, ScheduledJob, Task } from '../types';

export type LocalCommand =
  | { kind:'help' }
  | { kind:'list_tasks' }
  | { kind:'complete_task'; query:string }
  | { kind:'create_task'; title:string; dueAt?:string }
  | { kind:'reminder'; message:string; runAt:string }
  | { kind:'remember'; key:string; value:string }
  | { kind:'forget'; key:string };

export function parseLocalCommand(text:string,now=new Date(),timeZone='Asia/Taipei'):LocalCommand|undefined {
  const value=text.trim();
  if(/^(help|幫助|說明|你會什麼)[？?]?$/.test(value))return{kind:'help'};
  if(/^(任務|待辦|列出任務|我的任務)[？?]?$/.test(value))return{kind:'list_tasks'};
  let m=value.match(/^(?:完成|做完)\s*(?:任務\s*)?(.+)$/);if(m)return{kind:'complete_task',query:m[1].trim()};
  m=value.match(/^(?:記住|請記住)\s*([^：:]+)[：:]\s*(.+)$/);if(m)return{kind:'remember',key:m[1].trim(),value:m[2].trim()};
  m=value.match(/^(?:忘記|刪除記憶)\s*(.+)$/);if(m)return{kind:'forget',key:m[1].trim()};
  m=value.match(/^(?:新增|建立|加一個)?\s*(?:任務|待辦)[：:\s]+(.+)$/);if(m){const parsed=extractTime(m[1],now,timeZone);return{kind:'create_task',title:parsed.rest,dueAt:parsed.at?.toISOString()}}
  m=value.match(/^(.+?)(?:提醒我|提醒)\s*(.+)$/);if(m){const parsed=extractTime(m[1],now,timeZone);if(parsed.at)return{kind:'reminder',message:m[2].trim(),runAt:parsed.at.toISOString()}}
  return undefined;
}

export function extractTime(text:string,now=new Date(),timeZone='Asia/Taipei'){let at:Date|undefined,rest=text.trim(),m;
  if((m=rest.match(/(\d+)\s*分鐘後/))){at=new Date(now.getTime()+Number(m[1])*60000);rest=rest.replace(m[0],'')}
  else if((m=rest.match(/(\d+)\s*小時後/))){at=new Date(now.getTime()+Number(m[1])*3600000);rest=rest.replace(m[0],'')}
  else if((m=rest.match(/明天(?:\s*(上午|下午|晚上))?\s*(\d{1,2})(?::(\d{2}))?\s*點?/))){let h=Number(m[2]),minute=Number(m[3]??0);if(h>23||minute>59)return{at:undefined,rest};if(m[1]&&m[1]!=='上午'&&h<12)h+=12;const parts=zonedParts(now,timeZone);at=fromZoned(parts.year,parts.month,parts.day+1,h,minute,timeZone);rest=rest.replace(m[0],'')}
  return{at,rest:rest.trim().replace(/^[，,\s]+|[，,\s]+$/g,'')};
}

function zonedParts(date:Date,timeZone:string){const values=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));return values as{year:number;month:number;day:number;hour:number;minute:number;second:number}}
function fromZoned(year:number,month:number,day:number,hour:number,minute:number,timeZone:string){const target=Date.UTC(year,month-1,day,hour,minute,0);let guess=target;for(let i=0;i<3;i++){const p=zonedParts(new Date(guess),timeZone),represented=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second);guess=target-(represented-guess)}return new Date(guess)}

export function makeTask(title:string,message:IncomingMessage,dueAt?:string,now=new Date()):Task {const iso=now.toISOString();return{id:Utilities.getUuid(),title,status:'inbox',priority:'normal',dueAt,sourceChannel:message.channel,sourceConversationId:message.conversationId,createdAt:iso,updatedAt:iso}}
export function makeReminder(messageText:string,runAt:string,message:IncomingMessage):ScheduledJob{return{id:Utilities.getUuid(),type:'reminder',runAt,payload:{message:messageText},destination:{channel:message.channel,conversationId:message.conversationId},status:'active',attempts:0}}
