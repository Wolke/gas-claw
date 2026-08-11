# Day 9｜建立 LINE Messaging API 頻道

## 今天要完成什麼

`gas-claw` 改以 LINE 為唯一聊天入口。這不是單純換一個 Logo，而是降低開源使用者的安裝門檻：每個人不必另外建立標準 Google Cloud 專案、設定 OAuth 測試使用者或註冊 Google Chat App，只要準備自己的 Apps Script、Gemini Key 與 LINE Messaging API channel。

今天先完成 LINE Developers Console 的頻道與三個必要值：owner user ID、channel access token、webhook URL secret。第一版只服務部署者本人，而且只接受一對一文字訊息。群組、聊天室、圖片、貼圖與檔案全部拒絕，避免私人 Workspace 資料被帶進多人對話。

## 實作

在 LINE Developers Console 建立 Provider 與 Messaging API channel，關閉 Greeting message 和 Auto-response messages，否則 LINE 官方回覆會與 Agent 回覆同時出現。發行 channel access token，將它保存成 Apps Script 的 `LINE_CHANNEL_ACCESS_TOKEN`，不能寫進 repository 或試算表。

Webhook URL 不是裸露的 `/exec`，而是加入至少 32 bytes 隨機值：

```text
https://script.google.com/macros/s/DEPLOYMENT_ID/exec?token=RANDOM_SECRET
```

隨機值保存為 `LINE_WEBHOOK_TOKEN`。部署 Web App 時選擇由部署者身分執行，並使用帳號允許 LINE 呼叫的存取範圍。將 URL 貼到 Messaging API 的 Webhook URL，按 Verify 成功後才開啟 Use webhook。

owner ID 必須是 LINE webhook 事件內的 `source.userId`，不是 Basic ID、Provider ID 或 Channel ID。先傳一則測試訊息，從 Apps Script execution log 的安全摘要取得 user ID，再放進 `LINE_OWNER_ID`。設定完成後刪除含原始 payload 的臨時除錯紀錄。

## 驗證

驗收不只看 LINE Console 顯示綠色：

1. Webhook Verify 得到成功。
2. LINE 傳送「幫助」，Apps Script 出現一次 execution。
3. 回覆只有 gas-claw 一則，不包含 LINE 自動回覆。
4. 用錯誤 query token 呼叫 `/exec`，得到 `invalid webhook token`。
5. 從非 owner 帳號傳訊，不建立 Task、Job 或 Run completed 資料。

這組測試將「平台可連線」與「Agent 有授權」分開。Webhook Verify 只能證明網址能呼叫，不能證明 owner allowlist 正確。

## 發布素材

- 聊天 Demo：建立 LINE Bot、加入好友，再私訊「幫助」。
- 設計焦點：LINE-first 讓安裝者不必建立標準 Cloud 專案。
- 測試／失敗案例：自動回覆未關閉、owner ID 填成 Basic ID、token URL 貼錯。
- 當日 Git tag：`day-09`。下一篇實作 webhook adapter 與 reply。

## 安全與限制

Channel access token 能代表 Bot 發訊息，外洩後必須立刻在 LINE Console 重新發行。Webhook token 則保護公開 Apps Script endpoint，建議用密碼管理器產生並保存，不要用專案名稱或生日。

Apps Script 的 `doPost(e)` 無法取得 `X-Line-Signature` header，因此純 GAS 不能完成 LINE 官方 HMAC 驗證。個人版以高熵 URL token、owner ID allowlist、只接受 user source 與事件去重形成替代防線；它適合單人助理，不宣稱等同企業級 webhook gateway。下一篇把真實 LINE event 正規化並回覆。
