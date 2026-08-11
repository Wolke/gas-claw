# Day 3｜Apps Script 真的能代替常駐主機嗎？

## 今天要完成什麼

「不買 Mac」不代表 Apps Script 完全等同一台伺服器。今天要拆解 GAS 能做什麼、不能做什麼，以及 `gas-claw` 如何利用事件驅動架構避開常駐程序的需求。

傳統 Agent Gateway 會一直監聽聊天連線、維護記憶並跑 cron。GAS 沒有永遠不結束的 process，但它有三種喚醒方式：Web App 的 `doPost`、Google Chat 的 `onMessage`，以及時間驅動 trigger。每一次喚醒都是短生命週期執行；狀態則放在 Sheets、Properties、Cache 和 Drive。換句話說，我們不讓程式「一直醒著」，而是確保它隨時能從持久狀態恢復。

這種設計很像無伺服器函式：平常沒有程序，收到事件才執行。對個人專案助理而言，多數工作都是訊息、提醒、晨報或每週回顧，不需要毫秒級常駐連線，因此相當合適。

## 實作

`gas-claw` 定義七個 Apps Script 頂層入口：

```js
function doGet(e) { /* health check */ }
function doPost(e) { /* LINE or HTTP Chat webhook */ }
function onMessage(e) { /* Google Chat app event */ }
function schedulerTick() { /* due jobs */ }
function setupGasClaw() { /* database and trigger */ }
function configureGasClaw(config) { /* script properties */ }
function uninstallGasClaw() { /* remove triggers and secrets */ }
```

這些函式必須是靜態的頂層 declaration。最初我用 `Object.assign(globalThis, bundle)` 匯出，Node 測試與 bundle 都通過，但 Apps Script 編輯器顯示「沒有函式」，部署後也無法正常路由。解法是在 build footer 產生明確 shims。這是「在本機看似正確、上 GAS 才失敗」的典型案例，也說明實機驗證不可省略。

Scheduler 由安裝函式建立：

```ts
ScriptApp.newTrigger('schedulerTick')
  .timeBased()
  .everyMinutes(1)
  .create();
```

每次最多讀取十項到期工作，使用 LockService 防止重疊執行。單次任務完成後標成 `completed`；每日與每週任務則計算下一個 `runAt`。

## 驗證

本機 verifier 會檢查 bundle 尾端是否真的存在所有入口，而不是只檢查 TypeScript export：

```bash
npm run build
npm run verify
```

實機驗收則將 `dist/Code.js` 和 manifest 推送到專用 Apps Script project，重新載入編輯器後確認函式下拉選單能看到 `doGet`。這一步曾直接抓到 global export 問題。

完整測試還包括：同一 webhook event ID 只能處理一次、scheduler 重跑不能重複推送、失敗三次後必須轉為 `failed`。

## 發布素材

- 聊天 Demo：建立一分鐘後提醒並關閉本機開發環境。
- 設計焦點：觸發器取代常駐 process，checkpoint 取代長時間執行。
- 測試／失敗案例：模擬逾時與 trigger 延遲，說明 GAS 不適用秒級任務。
- 當日 Git tag：`day-03`。下一篇畫完整資料流。

## 安全與限制

GAS 的限制包括單次執行時間、觸發器精度、每日 UrlFetch／Gmail 等配額，以及冷啟動延遲。因此 `gas-claw` 不適合長時間影音處理、即時串流或大量多人服務。排程「每分鐘」也不保證秒級準時。

此外，Apps Script Web App 不會把任意 HTTP header 交給 `doPost(e)`，所以 LINE 的 `X-Line-Signature` 無法在純 GAS 中驗證。這不是用程式技巧能修掉的限制。個人版以長隨機 URL token、owner ID 與事件去重降低風險；企業部署應增加能驗證簽章的 proxy。下一篇會把所有元件組成完整架構。
