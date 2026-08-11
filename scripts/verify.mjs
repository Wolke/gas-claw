import { readFile, readdir } from 'node:fs/promises';
const bundle=await readFile('dist/Code.js','utf8');
const manifest=JSON.parse(await readFile('appsscript.json','utf8'));
for(const scope of ['script.external_request','script.scriptapp','spreadsheets','gmail.modify','calendar','drive','documents','tasks'].map(s=>`https://www.googleapis.com/auth/${s}`))
  if(!manifest.oauthScopes?.includes(scope))throw new Error(`Missing OAuth scope: ${scope}`);
if(!manifest.dependencies?.enabledAdvancedServices?.some(s=>s.serviceId==='tasks'&&s.version==='v1'))throw new Error('Google Tasks advanced service is not enabled');
if(manifest.webapp?.executeAs!=='USER_DEPLOYING'||manifest.webapp?.access!=='ANYONE_ANONYMOUS')throw new Error('Unexpected web app security configuration');
for(const name of ['doGet','doPost','schedulerTick','setupGasClaw','configureGasClaw','uninstallGasClaw']){
  if(!bundle.includes(`function ${name}(`))throw new Error(`Missing Apps Script entrypoint: ${name}`);
}
const files=(await readdir('articles')).filter(f=>/^day-\d\d\.md$/.test(f));
if(files.length!==30)throw new Error(`Expected 30 full articles, found ${files.length}`);
for(const file of files){
  const text=await readFile(`articles/${file}`,'utf8');
  if(text.length<1400)throw new Error(`${file} is too short (${text.length})`);
  for(const heading of ['## 今天要完成什麼','## 實作','## 驗證','## 發布素材','## 安全與限制'])
    if(!text.includes(heading))throw new Error(`${file} missing ${heading}`);
  for(const marker of ['聊天 Demo','設計焦點','測試／失敗案例','當日 Git tag'])
    if(!text.includes(marker))throw new Error(`${file} missing ${marker}`);
  const day=file.slice(4,6);
  if(!text.includes(`day-${day}`))throw new Error(`${file} missing matching day tag`);
  if(day!=='30'&&!text.includes('下一篇'))throw new Error(`${file} missing next-day preview`);
}
console.log(`Verified GAS entrypoints and ${files.length} articles.`);
