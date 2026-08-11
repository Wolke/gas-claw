export type Channel = 'google_chat' | 'line';
export type Risk = 'read' | 'draft' | 'write' | 'send' | 'delete' | 'share';
export interface IncomingMessage { id:string; channel:Channel; userId:string; conversationId:string; replyToken?:string; text:string; timestamp:string; eventType:string }
export interface ToolCall { id:string; name:string; input:Record<string,unknown> }
export interface AgentDecision { response?:string; toolCalls:ToolCall[]; taskChanges:TaskChange[]; scheduleChanges:ScheduleChange[]; memoryCandidates:MemoryCandidate[] }
export interface Task { id:string; title:string; status:'inbox'|'planned'|'doing'|'waiting'|'done'|'cancelled'; priority:'low'|'normal'|'high'|'urgent'; dueAt?:string; project?:string; sourceChannel:string; sourceConversationId:string; createdAt:string; updatedAt:string }
export interface ScheduledJob { id:string; type:'reminder'|'agent_run'|'daily_brief'|'weekly_review'; runAt?:string; recurrence?:string; payload:Record<string,unknown>; destination:{channel:Channel;conversationId:string}; status:'active'|'paused'|'completed'|'failed'; attempts?:number }
export interface TaskChange { action:'create'|'update'; task:Partial<Task>&{title?:string;id?:string} }
export interface ScheduleChange { action:'create'|'pause'; job:Partial<ScheduledJob> }
export interface MemoryCandidate { key:string; value:string; scope:'personal'|'project' }
export interface ApprovalRequest { id:string; action:ToolCall; summary:string; risk:Exclude<Risk,'read'|'draft'>; expiresAt:string; status:'pending'|'approved'|'rejected'|'expired'; channel:Channel; conversationId:string }
export interface AgentContext { message:IncomingMessage; now:string }
export interface AgentTool { name:string; description:string; risk:Risk; validate(input:unknown):Record<string,unknown>; execute(input:Record<string,unknown>, context:AgentContext):unknown }
