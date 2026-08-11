import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const files=execFileSync('git',['ls-files','-z']).toString().split('\0').filter(Boolean).filter(f=>f!=='package-lock.json');
const patterns=[/AIza[0-9A-Za-z_-]{20,}/g,/LINE_CHANNEL_ACCESS_TOKEN\s*[:=]\s*['"][0-9A-Za-z._+/=-]{20,}/g];
const findings=[];
for(const file of files){const text=readFileSync(file,'utf8');for(const pattern of patterns){for(const match of text.matchAll(pattern)){findings.push(`${file}:${text.slice(0,match.index).split('\n').length}: ${match[0].slice(0,24)}…`)}}}
if(findings.length){console.error(findings.join('\n'));process.exit(1)}
console.log(`Secret scan passed for ${files.length} tracked files.`);
