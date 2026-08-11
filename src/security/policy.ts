import type { AgentTool, IncomingMessage, Risk } from '../types';
export const FORBIDDEN_RISKS: Risk[] = ['delete','share'];
export function requiresApproval(risk: Risk) { return risk === 'write' || risk === 'send' || risk === 'delete' || risk === 'share'; }
export function assertOwner(message: IncomingMessage, ownerId: string) { if (!ownerId || message.userId !== ownerId) throw new Error('Unauthorized owner'); }
export function assertToolAllowed(tool: AgentTool) { if (FORBIDDEN_RISKS.includes(tool.risk)) throw new Error(`Tool risk is disabled: ${tool.risk}`); }
export function redact(value:string) { return value.replace(/(?:AIza|Bearer\s+)[A-Za-z0-9._-]{12,}/g, '[REDACTED]'); }
