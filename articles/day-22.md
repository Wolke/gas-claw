# Day 22｜案例一：每天早上的專案簡報

## 今天要完成什麼

第一套端到端技能是 Daily Brief。每天早上，龍蝦主動整理今日 Calendar、未完成任務及重要未讀郵件，再把三項優先行動送回聊天。

這是 Full profile 範例。Core 也能做只包含本機 Tasks 與 reminders 的簡化晨報；文章中的 Calendar、Gmail 與 Google Tasks 證據只有在讀者明確升級 Full 後才可執行。

這個案例同時驗證 scheduler、三個 read tools、記憶與主動 messaging，卻不包含不可逆寫入，適合作為第一個自動技能。

## 實作

使用者說：

```text
每天早上 8 點傳今天的專案簡報到 LINE
```

Agent 建立 recurrence `daily` 的 ScheduledJob，payload 記錄 skillId `daily-brief`，destination 是目前 LINE user。到期後依序：查今天 Calendar、列出本機與 Google Tasks、搜尋重要未讀郵件，最後依工作時間和優先級產生摘要。

推薦格式：

```text
早安，今天優先處理：
1. 10:00 前確認報價
2. 14:00 專案會議
3. 完成週報初稿

行程：2 場｜到期任務：3 項｜重要未讀：1 封
```

## 動手試試看

在 Calendar 建立上午和下午各一場測試活動，Tasks sheet 放入一筆今天到期、一筆下週到期，再準備一封未讀測試信。建立 daily job 後把 runAt 暫時改成一分鐘後，關閉編輯器等待推播。

收到簡報後逐項比對來源。優先行動不應憑空出現；私人活動只顯示時間；郵件只顯示必要主旨。再查看 Jobs，runAt 應推進一天。立即手動執行 scheduler 不得發第二封。

## 驗證

建立測試 Calendar、兩筆任務與一封符合 query 的郵件，手動將 job runAt 改成過去，執行 schedulerTick。LINE 應收到一則簡報，Jobs 的 runAt 往後一天且 status 仍 active。

重跑同一 tick 不得立即再發；若 LINE API 失敗，attempts 增加，不更新下次日期。

## 發布素材

- 聊天 Demo：早上八點收到行程、到期任務與重要郵件摘要。
- 設計焦點：skill orchestration、短輸出與 quiet hours。
- 測試／失敗案例：任一資料源失敗時標註缺漏，不把整份晨報判定成功。
- 截圖證據：保留觸發時間、三個資料來源摘要與送達原聊天渠道的完整時間線。
- 當日 Git tag：`day-22`。下一篇安排會議。

## 安全與限制

簡報只送 owner，不包含郵件全文或敏感附件。郵件只顯示必要主旨摘要；Calendar 私密活動可只顯示「私人行程」。

GAS trigger 不是精準鬧鐘，八點代表約八點附近。下一篇用核准流程完成會議協調。

如果當天完全沒有行程和任務，技能也應送出簡短「今天沒有已排定事項」，而不是製造工作。主動助理的價值包含知道何時保持安靜。

可以再加一個 quiet-hours 驗收：即使 job 因延遲在深夜被撿到，也先依工作時間決定延後或只記錄，不應突然推送晨報。這項偏好可放在 personal memory，讓 scheduler 與其他技能共用。

每日簡報的輸出也要保持短小，否則使用者很快會把通知靜音。建議預設只顯示三項優先工作，其餘用數量摘要，需要時再追問展開。
