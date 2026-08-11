import type { AgentTool, IncomingMessage, Risk } from '../types';
export const FORBIDDEN_RISKS: Risk[] = ['delete','share'];
export function requiresApproval(risk: Risk) { return risk === 'write' || risk === 'send' || risk === 'delete' || risk === 'share'; }
export function assertOwner(message: IncomingMessage, ownerId: string) { if (!ownerId || message.userId !== ownerId) throw new Error('Unauthorized owner'); }
export function assertToolAllowed(tool: AgentTool) { if (FORBIDDEN_RISKS.includes(tool.risk)) throw new Error(`Tool risk is disabled: ${tool.risk}`); }
export function redact(value:string) { return value.replace(/(?:AIza|Bearer\s+)[A-Za-z0-9._-]{12,}/g, '[REDACTED]'); }
const OMIT_KEYS=new Set(['text','plainBody','body','content','values','payload']);
export function sanitizeForLog(value:unknown,key=''):unknown{if(OMIT_KEYS.has(key))return'[CONTENT OMITTED]';if(typeof value==='string')return redact(value.length>500?`${value.slice(0,500)}…`:value);if(Array.isArray(value))return value.slice(0,20).map(item=>sanitizeForLog(item));if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value as Record<string,unknown>).map(([name,item])=>[name,sanitizeForLog(item,name)]));return value}
