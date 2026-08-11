# Day 10｜讓 LINE 成為第二個聊天入口

## 今天要完成什麼

Google Chat 適合 Workspace 工作，但台灣日常更常開 LINE。今天加入 LINE Messaging API，證明 Agent 核心不依賴單一聊天平台。

LINE webhook 會一次送來 `events` 陣列，每個事件帶有 `webhookEventId`、source、replyToken 與 message。第一版只處理一對一文字訊息；圖片、貼圖、群組與聊天室先拒絕。

## 實作

Adapter 驗證事件類型：

```ts
if (
  event.type !== 'message' ||
  event.message.type !== 'text' ||
  event.source.type !== 'user'
) throw new Error('Unsupported LINE event');
```

正規化後，`source.userId` 同時成為 userId 與 conversationId，`webhookEventId` 作為去重鍵。Agent 完成後，若 reply token 仍有效就呼叫：

```text
POST https://api.line.me/v2/bot/message/reply
Authorization: Bearer LINE_CHANNEL_ACCESS_TOKEN
```

Scheduler 主動提醒不能使用一次性的 reply token，因此改呼叫 push endpoint，destination 保存 owner 的 LINE user ID。

Webhook URL 使用長隨機 token：

```text
https://script.google.com/macros/s/DEPLOYMENT_ID/exec?token=RANDOM_SECRET
```

Apps Script `doPost(e)` 先比對 query token，再解析 events，最後仍由 Agent 比對 `LINE_OWNER_ID`。

## 驗證

單元測試確認直接文字訊息能轉成 `IncomingMessage`，group source、非文字與缺少 ID 都不得進入 Agent。整合測試使用固定 payload 呼叫 Web App：錯誤 token 應回 `invalid webhook token`；正確 token 才處理事件。

實際 LINE 驗收依序傳：

```text
幫助
新增任務：完成 LINE 測試
1 分鐘後提醒我驗收推播
```

第三個情境必須在 reply token 失效後，由 scheduler 使用 push API 主動送回，才算證明「不是只有聊天回聲」。

## 發布素材

- 聊天 Demo：LINE 私訊建立任務，立即用 reply token 回覆。
- 設計焦點：reply 與 push 的不同生命週期。
- 測試／失敗案例：錯誤 webhook token、群組來源與重送事件皆拒絕。
- 當日 Git tag：`day-10`。下一篇統一渠道。

## 安全與限制

LINE 官方要求驗證 `X-Line-Signature`，但 Apps Script Web App 的事件物件不提供任意 HTTP request header，因此純 GAS 無法取得該值。`Utilities.computeHmacSha256Signature` 即使會算也沒有輸入 signature 可以比對。

本專案選擇誠實標註，而不是宣稱已驗證：個人版用高熵 URL token、owner ID allowlist、event dedup 與最小功能降低風險。需要正式營運時，應在 GAS 前增加 Cloud Run／Functions proxy 驗證 signature，再轉送已驗證事件。這會讓架構不再是「純 GAS」，所以列為選用強化。下一篇統一兩個渠道的行為。
