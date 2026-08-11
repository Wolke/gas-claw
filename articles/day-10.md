# Day 10｜讓龍蝦住進 LINE

## 今天要完成什麼

昨天建立 LINE channel，今天完成真正的訊息路徑：LINE webhook 呼叫 Apps Script Web App，`doPost` 驗證 URL token，adapter 只接受一對一文字訊息，Agent 完成工作後使用 reply token 回覆。

LINE webhook 一次可能帶多個 events。入口不能因其中一個貼圖或壞事件讓整批回傳 500，也不能把外部錯誤 stack trace 傳回平台。因此每個事件獨立處理、獨立記錄最小錯誤，HTTP 層仍快速回覆 JSON。

## 實作

Adapter 驗證事件類型與穩定識別碼：

```ts
if (
  event.type !== 'message' ||
  event.message?.type !== 'text' ||
  event.source?.type !== 'user'
) throw new Error('Unsupported LINE event');

if (!event.webhookEventId || !event.source.userId || !event.replyToken) {
  throw new Error('Invalid LINE event');
}
```

正規化後的 `IncomingMessage` 固定 `channel: 'line'`，以 `webhookEventId` 作為事件去重鍵；`source.userId` 同時是 owner 身分與回覆 conversation，timestamp 轉成 ISO 字串。文字會 trim，空訊息不能進 Agent。

Agent 回傳文字後呼叫：

```text
POST https://api.line.me/v2/bot/message/reply
Authorization: Bearer LINE_CHANNEL_ACCESS_TOKEN
```

reply token 只能用一次而且有效時間短，因此所有同步工作都應迅速完成。需要等待的工作不能保留 reply token，必須建立 `ScheduledJob`，稍後由 push API 主動回報。

入口會先檢查 `LINE_WEBHOOK_TOKEN`，再確認 payload 有 `events` array。每個事件進入 Agent 後仍比對 `LINE_OWNER_ID`，所以知道 URL 的人也不能以其他 LINE 帳號操作 Gmail 或 Calendar。

## 驗證

單元測試包含合法文字、群組 source、缺少 webhookEventId、無效 timestamp 與非文字訊息。整合驗收依序傳：

```text
幫助
新增任務：完成 LINE 實機測試
列出任務
```

預期第一則顯示能力，第二則只新增一筆 Task，第三則列出同一標題。將同一 webhook fixture 重送兩次時，Runs 的 persistent claim 必須阻止第二次寫入；不能只依賴可能被淘汰的 CacheService。

再測一個不支援的貼圖事件：Webhook HTTP 仍回成功，但 Apps Script log 只記錄安全錯誤，Sheets 不應產生任務或記憶。

## 發布素材

- 聊天 Demo：LINE 私訊建立任務並立即收到 reply。
- 設計焦點：query secret、owner allowlist、event normalization、reply token。
- 測試／失敗案例：群組、貼圖、缺 event ID 與 webhook 重送。
- 當日 Git tag：`day-10`。下一篇處理 LINE webhook 的安全與冪等。

## 安全與限制

LINE 訊息、郵件與文件內容全部是不可信資料。文字可以要求 Agent 做事，但不能改寫 system policy、加入未知工具或跳過 approval。錯誤回覆不能包含 channel token、Gemini Key、完整 payload 或 stack trace。

同步 webhook 仍受 Apps Script execution time 影響。Gemini 或 Workspace API 過慢時，可靠做法是保存 checkpoint 並用 LINE push 完成，而不是重複使用過期 reply token。下一篇將 event claim、重試鍵與主動推播串成完整可靠性模型。
