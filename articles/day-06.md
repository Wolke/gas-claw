# Day 6｜用 clasp、TypeScript 與 esbuild 部署 GAS

## 今天要完成什麼

Apps Script 線上編輯器適合小片段，不適合逐漸長大的 Agent。今天建立可重複的本機開發流程：TypeScript 負責型別，esbuild 負責打包，clasp 負責把產物推送到 Google。

需要特別注意的是，Apps Script 不是 Node.js。它沒有 npm runtime、`process` 或檔案系統；真正執行時只有 V8 與 `SpreadsheetApp`、`GmailApp` 等 Google global service。因此 npm 套件只能用於建置與測試，不能假設所有 Node library 都能被 bundle 後正常執行。

## 實作

安裝工具：

```bash
npm install -D typescript esbuild vitest @types/google-apps-script
npx clasp login
npx clasp create --type standalone --title gas-claw
```

`.clasp.json` 指向 `dist`，確保原始 TypeScript 不會被推上 GAS：

```json
{
  "scriptId": "YOUR_SCRIPT_ID",
  "rootDir": "dist"
}
```

esbuild 使用 IIFE 格式，把模組封裝成 `GasClawBundle`。關鍵是 footer 額外生成靜態入口：

```js
function doGet(e) { return GasClawBundle.GasClaw.doGet(e); }
function doPost(e) { return GasClawBundle.GasClaw.doPost(e); }
function onMessage(e) { return GasClawBundle.GasClaw.onMessage(e); }
function schedulerTick() { return GasClawBundle.GasClaw.schedulerTick(); }
```

單純使用 `Object.assign(globalThis, ...)` 在 JavaScript 語意上可行，但 Apps Script 編輯器與部署器不會把它列為可執行函式。這個問題只有把 bundle 推到真正 GAS 專案後才會看到。

完整流程：

```bash
npm run check
npx clasp push
npx clasp deploy --description "gas-claw test"
```

## 驗證

`scripts/verify.mjs` 直接讀取 `dist/Code.js`，確認 `doGet`、`doPost`、`onMessage`、scheduler、setup 與 uninstall 都有頂層 declaration。接著在 Apps Script 編輯器重新載入，函式下拉選單必須出現 `doGet`。

這是兩層驗證：靜態 verifier 能快速防止 regression；實機編輯器驗證能抓到 GAS 平台特有行為。最後用 web app `/exec` 呼叫 health endpoint，應回傳名稱、版本、狀態及 configured flag。

## 發布素材

- 聊天 Demo：尚未接渠道；展示同一份 TypeScript bundle 被 Apps Script 辨識。
- 設計焦點：esbuild 產出單檔並保留 GAS 頂層入口。
- 測試／失敗案例：若入口被包進 module，函式選單找不到 `doPost`。
- 當日 Git tag：`day-06`。下一篇執行初始化。

## 安全與限制

`.clasp.json` 不應提交，因為每位讀者必須部署自己的副本。`dist` 也不放進 Git，避免 review 時同時看到原始碼與巨大 bundle；CI 每次重建即可。

clasp 登入 token 具有修改 Apps Script 專案的能力，應保存在開發者自己的登入環境，不可放進 repository 或 GitHub Actions。正式自動部署若需要 service account，必須另外設計最小權限，這個個人版不預設開啟。下一篇完成初始化與秘密設定。
