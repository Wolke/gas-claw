# Day 11｜LINE Webhook 的安全與冪等

## 今天要完成什麼

LINE 可能因網路逾時重送 webhook，Apps Script 也可能在外部服務完成後、更新 Sheet 前中斷。如果只追求「正常時會回覆」，很容易得到重複任務、重複提醒甚至重複寄信。今天建立 LINE-first 版本的三層防線：入口密鑰、owner 驗證與事件／推播冪等。

這一版不再保留抽象的多渠道分支。`Channel` 型別只有 `'line'`，scheduler 也只會呼叫 LINE push。移除未使用的平台不只是簡化文件，也讓安全測試能聚焦在唯一真實入口。

## 實作

收到事件後先用 CacheService 做快速檢查，再在 Runs sheet 建立持久 claim：

```text
event:line:{webhookEventId}
```

claim 寫入受到 Script Lock 保護。兩個同時到達的 execution 只有一個能建立 row；另一個回覆「這則訊息已處理」。Cache 被清除後，Sheet claim 仍能防止舊事件再次執行。

排程推播使用 LINE 的 `X-Line-Retry-Key`。Scheduler 在呼叫 push API 前先產生 UUID，連同 `deliveryText` 寫回 job；如果呼叫結果不明，下一次重試沿用相同 UUID。LINE 回 409 代表相同 retry key 已被接受，gas-claw 將該次工作視為已送達，不再建立第二則訊息。

approval 也需要冪等。狀態由 pending 原子切換成 executing，成功後才是 approved；同一 approval ID 第二次核准會被拒絕。核准必須來自原本的 LINE conversation，不能把 ID 複製到另一個 user context 使用。

## 驗證

可靠性測試涵蓋：

- 同一 webhookEventId 連續送兩次，只新增一筆 Task。
- 清除 Cache 後重送，persistent claim 仍阻擋。
- LINE push 第一次回 500、第二次成功，兩次 header 使用同一 retry key。
- LINE 回 409 時 job 完成，而不是進入無限重試。
- 三次真正失敗後 job 進入 failed。
- 同一 approval ID 第二次核准不重複建立 Calendar event。

實機測試可建立「1 分鐘後提醒我測試冪等」，在 Apps Script execution 中模擬一次失敗，再確認 LINE 最終只有一則推播且 Jobs attempts／status 正確。

## 發布素材

- 聊天 Demo：重送相同事件與排程推播，畫面仍只有一個結果。
- 設計焦點：persistent event claim、delivery checkpoint 與 LINE retry key。
- 測試／失敗案例：快取淘汰、HTTP 500、409 conflict 與 execution 中斷。
- 當日 Git tag：`day-11`。下一篇加入多輪 Session。

## 安全與限制

URL secret 不是 LINE 官方簽章的同義詞。Apps Script Web App 不提供任意 request header，無法讀取 `X-Line-Signature`；因此本版安全邊界只適合單一 owner 個人部署。secret 一旦出現在截圖、log 或文章必須旋轉。

冪等也不能保證所有第三方寫入絕對 exactly-once。對 Gmail、Calendar 與 Tasks，gas-claw 同時使用 approval 狀態與輸入中的穩定業務鍵縮小模糊失敗區間。高風險大量操作仍被禁止。下一篇處理短期對話記憶，讓 LINE 不再只有單句命令。
