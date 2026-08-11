# Day 9｜讓龍蝦住進 Google Chat

## 今天要完成什麼

Google Chat 是 `gas-claw` 的主要入口，因為它與 Google Workspace 同一個帳號環境。今天處理私訊事件、正規化使用者與 space，並把 Agent 回覆送回對話。

第一版只接受 direct message。Space 多人訊息牽涉成員權限、mention 規則與共享記憶；在沒有 row-level ownership 前，不應假裝已安全支援。

## 實作

Google Chat 事件在不同整合模式下可能將 message 放在 `chat.messagePayload.message` 或頂層 `message`。Adapter 同時處理兩種形狀，再輸出共同格式：

```ts
const msg = event.chat?.messagePayload?.message ?? event.message;
const user = msg.sender ?? event.user;

return {
  id: msg.name ?? event.commonEventObject?.eventId,
  channel: 'google_chat',
  userId: user.name,
  conversationId: msg.space.name,
  text: msg.text.trim(),
  timestamp: msg.createTime,
  eventType: event.type ?? 'MESSAGE'
};
```

若 `space.type` 存在且不是 `DM`，直接拒絕。進入 Agent 後還會比對 `GOOGLE_CHAT_OWNER_ID`。正式 Google Chat Apps Script integration 使用 `onMessage(event)`；若使用 Web App HTTP endpoint，則 `doPost` 另外要求 `GOOGLE_CHAT_WEBHOOK_TOKEN` query parameter。

回覆目前採最通用的 `{ text }`。核准在第一版可用文字命令完成：

```text
核准 550e8400-e29b-41d4-a716-446655440000
拒絕 550e8400-e29b-41d4-a716-446655440000
```

後續可再用 Google Chat Cards 改善按鈕體驗，但文字協定先確保跨渠道一致。

## 驗證

Adapter 測試建立三種事件：合法 DM、缺少 text、Space 訊息。合法事件必須保留 message ID 作為 dedup key；後兩者應失敗。

實際 Chat App 驗收：

1. 傳「幫助」，得到能力與範例。
2. 傳「新增任務：測試 Google Chat」，得到建立成功。
3. 重送相同 event 時，不新增第二筆。
4. 非 owner 帳號傳訊時，execution log 顯示 unauthorized，且不產生資料。

## 安全與限制

`onMessage` 是 Google Chat 平台觸發的信任入口；公開 `doPost` 則必須有額外 token，否則攻擊者只要猜到 owner ID 就可能偽造 payload。兩條入口不能混為一談。

目前實作以 `ScriptApp.getOAuthToken()` 取得部署者的使用者憑證，因此 Chat API 主動推送使用 `chat.messages.create` scope；`chat.bot` 僅能搭配服務帳戶的應用程式驗證，放進使用者 OAuth 會得到 `invalid_scope`。個人 consumer Google 帳號與 Workspace 管理網域的設定頁可能不同；部署者仍需依帳號管理政策啟用 Chat API。下一篇加入 LINE。
