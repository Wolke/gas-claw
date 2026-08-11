import { readFile, readdir } from 'node:fs/promises';
const bundle=await readFile('dist/Code.js','utf8');
for(const name of ['doGet','doPost','onMessage','schedulerTick','setupGasClaw','uninstallGasClaw']){
  if(!bundle.includes(`function ${name}(`))throw new Error(`Missing Apps Script entrypoint: ${name}`);
}
const files=(await readdir('articles')).filter(f=>/^day-\d\d\.md$/.test(f));
if(files.length!==30)throw new Error(`Expected 30 full articles, found ${files.length}`);
for(const file of files){const text=await readFile(`articles/${file}`,'utf8');if(text.length<1200)throw new Error(`${file} is too short (${text.length})`);for(const heading of ['## 今天要完成什麼','## 實作','## 驗證','## 安全與限制'])if(!text.includes(heading))throw new Error(`${file} missing ${heading}`)}
console.log(`Verified GAS entrypoints and ${files.length} articles.`);
