# Day 11｜Channel Adapter：讓 Agent 不在乎訊息從哪裡來

## 今天要完成什麼

昨天完成兩個入口，今天處理多渠道最容易腐化的地方：不要在 Agent 裡到處寫 `if channel === line`。渠道差異應集中在解析、即時回覆與主動推送三個 adapter 能力，其他模組只讀共同型別。

統一不是把所有平台削成最低功能，而是先定義核心共同語意：誰傳的、在哪段對話、文字是什麼、事件是否唯一、如何回到原處。Cards、postback 等進階能力可以留在可選欄位。

## 實作

`IncomingMessage` 保存 `channel`、`userId`、`conversationId`、`replyToken` 與 `id`。其中 `id` 最重要，因為 LINE 與 Google 都可能重送 webhook；沒有它就無法建立冪等處理。

Agent 不直接呼叫 LINE API，而是產生文字結果。入口根據 channel 選擇 reply 方法；scheduler 則根據 `ScheduledJob.destination` 選擇 push：

```ts
interface ChannelAddress {
  channel: 'google_chat' | 'line';
  conversationId: string;
}
```

錯誤也要正規化。Adapter 對不支援的群組或媒體事件丟出可辨識錯誤；入口記錄錯誤但不把 stack trace 回給外部呼叫者。這能避免 LINE webhook 因單一壞事件讓整批 events 失敗。

## 驗證

建立同一個語意的 Google Chat 與 LINE fixture，確認輸出除了 channel-specific identifier 外一致。再驗證：

- 前後空白會被 trim。
- 群組來源被拒絕。
- webhook event ID 不遺失。
- reply token 只出現在 LINE。
- scheduler destination 能原路送回。

跨渠道的終極驗收是：在 Google Chat 建立提醒時，提醒回 Google Chat；在 LINE 建立時，回 LINE，兩者資料都存在同一個 Jobs schema。

## 安全與限制

不要把 `conversationId` 當成身分驗證。它只代表回覆位置，真正授權必須比對 userId 與 Script Properties 中的 owner。即使是同一個人，Google 與 LINE 也有不同 ID，所以分別設定 allowlist。

第一版不做跨渠道身分合併，例如在 LINE 建立任務後要求 Google Chat 顯示。所有資料屬於同一部署 owner，但回覆仍遵守原始 destination。下一篇開始處理多輪對話與短期上下文。
