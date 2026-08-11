import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {runAgent}=vi.hoisted(()=>({runAgent:vi.fn(()=>'LINE 回覆')}));
vi.mock('../src/agent/runtime',()=>({runAgent}));

import { GasClaw } from '../src';

class FakeTextOutput {
  constructor(public value:string){}
  setMimeType(){return this}
}

const validEvent={
  type:'message',
  webhookEventId:'event-1',
  timestamp:0,
  replyToken:'reply-1',
  source:{type:'user',userId:'owner'},
  message:{type:'text',text:'幫助'}
};

function request(payload:unknown,token='webhook-secret'){
  return {postData:{contents:JSON.stringify(payload)},parameter:{token}};
}

describe('LINE webhook entrypoint',()=>{
  let properties:Record<string,string>,fetch:ReturnType<typeof vi.fn>;
  beforeEach(()=>{
    properties={LINE_WEBHOOK_TOKEN:'webhook-secret',LINE_CHANNEL_ACCESS_TOKEN:'line-token'};
    fetch=vi.fn(()=>({getResponseCode:()=>200}));
    runAgent.mockClear();
    vi.stubGlobal('PropertiesService',{getScriptProperties:()=>({getProperty:(key:string)=>properties[key]??null})});
    vi.stubGlobal('ContentService',{MimeType:{JSON:'application/json'},createTextOutput:(value:string)=>new FakeTextOutput(value)});
    vi.stubGlobal('UrlFetchApp',{fetch});
    vi.spyOn(console,'error').mockImplementation(()=>{});
  });
  afterEach(()=>vi.restoreAllMocks());

  it('rejects a wrong webhook URL token before parsing events',()=>{
    const output=GasClaw.doPost(request({events:[validEvent]},'wrong')) as unknown as FakeTextOutput;
    expect(JSON.parse(output.value)).toEqual({error:'invalid webhook token'});
    expect(runAgent).not.toHaveBeenCalled();
  });

  it('rejects payloads without a LINE events array',()=>{
    const output=GasClaw.doPost(request({message:'not LINE'})) as unknown as FakeTextOutput;
    expect(JSON.parse(output.value)).toEqual({error:'invalid LINE webhook'});
  });

  it('returns a generic error for malformed JSON without leaking details',()=>{
    const output=GasClaw.doPost({postData:{contents:'{'},parameter:{token:'webhook-secret'}}) as unknown as FakeTextOutput;
    expect(JSON.parse(output.value)).toEqual({error:'request failed'});
    expect(runAgent).not.toHaveBeenCalled();
  });

  it('ignores unsupported group events without replying',()=>{
    const group={...validEvent,source:{type:'group',groupId:'group-1'}};
    const output=GasClaw.doPost(request({events:[group]})) as unknown as FakeTextOutput;
    expect(JSON.parse(output.value)).toEqual({ok:true});
    expect(runAgent).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not call LINE when the channel access token is missing',()=>{
    delete properties.LINE_CHANNEL_ACCESS_TOKEN;
    const output=GasClaw.doPost(request({events:[validEvent]})) as unknown as FakeTextOutput;
    expect(JSON.parse(output.value)).toEqual({ok:true});
    expect(runAgent).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('replies to a valid direct LINE text event',()=>{
    const output=GasClaw.doPost(request({events:[validEvent]})) as unknown as FakeTextOutput;
    expect(JSON.parse(output.value)).toEqual({ok:true});
    expect(runAgent).toHaveBeenCalledWith(expect.objectContaining({channel:'line',id:'event-1',userId:'owner',text:'幫助'}));
    expect(fetch).toHaveBeenCalledWith('https://api.line.me/v2/bot/message/reply',expect.objectContaining({headers:{Authorization:'Bearer line-token'}}));
    expect(JSON.parse(fetch.mock.calls[0]![1].payload)).toEqual({replyToken:'reply-1',messages:[{type:'text',text:'LINE 回覆'}]});
  });
});
