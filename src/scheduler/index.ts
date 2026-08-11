import { findJob, rows, updateById } from '../repositories/store';
import { runAgent } from '../agent/runtime';
import type { IncomingMessage, ScheduledJob } from '../types';

const LEASE_MS=5*60*1000;

export function schedulerTick(){
  const due=claimDueJobs();
  due.forEach(processJob);
  return due.length;
}

function claimDueJobs(){
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(5000))return[];
  try{
    const now=new Date(),jobs=rows<ScheduledJob>('Jobs').filter(job=>{
      if(!job.runAt||new Date(job.runAt)>now)return false;
      if(job.status==='active')return true;
      return job.status==='running'&&new Date(String(job.payload?.leaseUntil??0))<=now;
    }).slice(0,10);
    return jobs.map(job=>{
      const payload={...job.payload,leaseUntil:new Date(now.getTime()+LEASE_MS).toISOString()};
      updateById('Jobs',job.id,{status:'running',payload});
      return{...job,status:'running' as const,payload};
    });
  }finally{lock.releaseLock()}
}

function processJob(job:ScheduledJob){
  try{
    let text=String(job.payload?.deliveryText??''),deliveryId=String(job.payload?.deliveryId??'');
    if(!text)text=job.type==='reminder'?String(job.payload?.message??'排程提醒時間到了。'):runScheduledAgent(job);
    if(!deliveryId)deliveryId=Utilities.getUuid();
    if(!job.payload?.deliveryText||!job.payload?.deliveryId){job.payload={...job.payload,deliveryText:text,deliveryId};updateById('Jobs',job.id,{payload:job.payload})}
    if(findJob(job.id)?.status==='paused')return;
    pushLine(job.destination.conversationId,text,deliveryId);
    const next=nextRun(job.recurrence,job.runAt!),payload={...job.payload};delete payload.deliveryText;delete payload.deliveryId;delete payload.leaseUntil;
    updateById('Jobs',job.id,next?{runAt:next,payload,status:'active',attempts:0}:{payload,status:'completed',attempts:0});
  }catch(error){
    const attempts=Number(job.attempts??0)+1;
    updateById('Jobs',job.id,{attempts,status:attempts>=3?'failed':'active'});
    console.error(error);
  }
}

export function nextRun(recurrence:string|undefined,previous:string){const date=new Date(previous);if(recurrence==='daily')date.setUTCDate(date.getUTCDate()+1);else if(recurrence==='weekly')date.setUTCDate(date.getUTCDate()+7);else return undefined;return date.toISOString()}

function assertUuid(value:string){if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))throw new Error('Delivery ID must be a UUID');return value}
function pushLine(to:string,text:string,deliveryId:string){const token=PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN');if(!token)throw new Error('Missing LINE token');const response=UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push',{method:'post',contentType:'application/json',muteHttpExceptions:true,headers:{Authorization:`Bearer ${token}`,'X-Line-Retry-Key':assertUuid(deliveryId)},payload:JSON.stringify({to,messages:[{type:'text',text}]})});const code=response.getResponseCode();if((code<200||code>=300)&&code!==409)throw new Error(`LINE push failed: ${code}`)}
function runScheduledAgent(job:ScheduledJob){const props=PropertiesService.getScriptProperties(),userId=props.getProperty('LINE_OWNER_ID');if(!userId)throw new Error('Missing LINE owner');const defaults:Record<string,string>={daily_brief:'請產生今日簡報：列出今天行程、到期任務與重要未讀郵件。',weekly_review:'請產生本週專案回顧：完成、延期、風險與下週優先事項。',agent_run:'執行排程工作。'};const message:IncomingMessage={id:`job:${job.id}:${job.runAt}`,channel:'line',userId,conversationId:job.destination.conversationId,text:String(job.payload?.prompt??defaults[job.type]),timestamp:new Date().toISOString(),eventType:'scheduled'};return runAgent(message)}
