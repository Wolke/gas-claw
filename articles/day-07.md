# Day 7｜初始化資料庫、觸發器與秘密設定

## 今天要完成什麼

程式推上 Apps Script 不等於可用。今天完成第一次啟動：建立 Sheets 資料庫、安裝每分鐘 scheduler trigger，並把 Gemini 與聊天渠道設定放進 Script Properties。

安裝流程必須可重跑。使用者很可能第一次授權失敗、關掉視窗後再試；如果每次執行都新增 spreadsheet 和 trigger，十分鐘後就會得到一堆幽靈資源。

## 實作

`setupGasClaw()` 先檢查 `DATABASE_SPREADSHEET_ID`。若既有 ID 能打開，就重用；無效才建立新 spreadsheet。資料表包括：

```text
Tasks       任務與狀態
Jobs        提醒、晨報與週期工作
Approvals   等待核准的工具操作
Memory      個人與專案偏好
Runs        執行摘要與錯誤
```

trigger 也採先刪除同名 handler 再建立的方式：

```ts
ScriptApp.getProjectTriggers()
  .filter(t => t.getHandlerFunction() === 'schedulerTick')
  .forEach(t => ScriptApp.deleteTrigger(t));

ScriptApp.newTrigger('schedulerTick')
  .timeBased()
  .everyMinutes(1)
  .create();
```

秘密在 Apps Script「專案設定 → 指令碼屬性」填入：

```text
GEMINI_API_KEY
GEMINI_MODEL
LINE_OWNER_ID
LINE_CHANNEL_ACCESS_TOKEN
LINE_WEBHOOK_TOKEN
```

不要把 Key 貼在 `Code.gs` 或 Sheet 儲存格。`configureGasClaw(config)` 可供開發測試，但一般讀者應使用 Properties UI，避免秘密留在編輯器或執行參數歷史。

## 驗證

第一次執行 `setupGasClaw()` 後，確認：

1. Drive 中只有一份 `gas-claw database`。
2. 五張 sheet 標題正確且第一列凍結。
3. 觸發條件頁只有一個 `schedulerTick`。
4. 再執行 setup，database URL 不變、trigger 數仍為一。
5. `doGet` 回傳 `configured: true`。

解除安裝測試執行 `uninstallGasClaw()`：它刪除觸發器與 Script Properties，但刻意保留 spreadsheet，避免誤刪使用者任務。真正刪資料庫需由使用者在 Drive 手動處理。

## 發布素材

- 聊天 Demo：執行 setup 後回傳資料庫 URL，再用 help 檢查 configured 狀態。
- 設計焦點：Properties、Sheets schema 與 minute trigger 一次建立。
- 測試／失敗案例：重跑 setup 不得產生第二個 scheduler trigger。
- 當日 Git tag：`day-07`。下一篇接 Gemini。

## 安全與限制

完整版本會要求 Gmail、Calendar、Drive、Docs、Sheets、Tasks 等 scopes，因此安裝者要先建立標準 Google Cloud 專案、設定 External Testing OAuth audience，並把自己的帳號加入 test users。這是一個一次性的進階安裝步驟，但能讓每個 owner 清楚知道 GAS 取得哪些 Google Workspace 權限。

這些權限很大，所以只適合「每人部署自己的副本」；不要把這個版本架成公開多租戶服務。LINE-first 版本不要求任何 Google Chat scope，但保留完整 Google 生態系工具，這也更符合系列的專案管理主題。

owner ID 是第二道防線。即使別人取得 webhook URL，只要 user ID 不符，Agent 也拒絕執行。LINE 還需要長隨機 webhook token。Properties 不會出現在公開程式碼，但專案擁有者仍能看到，因此不要共享 Apps Script project 的編輯權。下一篇接上 Gemini。
