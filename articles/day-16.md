# Day 16｜關掉電腦後仍會工作：Scheduler 與主動推送

## 今天要完成什麼

聊天機器人通常只在收到訊息後回覆；個人助理則必須在時間到了主動出現。今天完成 Apps Script minute trigger、到期工作查詢、LINE push 與重試策略。

「每分鐘觸發」不是每個任務各建一個 trigger。Apps Script trigger 數量有限，管理大量 trigger 也困難。`gas-claw` 只保留一個 scheduler trigger，再從 Jobs sheet 找到期項目。

## 實作

`schedulerTick()` 先取得 script lock，五秒內拿不到就退出。它選最多十筆 `active` 且 `runAt <= now` 的工作，改成 `running` 並寫入五分鐘 lease，接著立刻釋放 lock。Gemini 與 channel push 都在 lock 外執行，避免 scheduled agent 再進 repository 時與自己死鎖；execution 中斷留下的 job 可在 lease 過期後回收。

單次 reminder 發送成功後改為 completed。recurrence 為 daily 或 weekly 時，分別增加一天或七天並保持 active。發送失敗增加 attempts；第三次後轉為 failed，避免每分鐘無限轟炸 API。

LINE 主動訊息使用 push endpoint；destination 在建立 job 時保存 owner conversationId，推播以 `X-Line-Retry-Key` 防止模糊失敗後重複送出。

## 動手試試看

在 Jobs sheet 建立三筆資料：一筆已到期 one-shot、一筆 daily、一筆尚未到期。執行 tick 後，第一筆應 completed，第二筆 runAt 增加一天，第三筆完全不變。再立即執行一次，沒有任何訊息應重複送出。

為了測錯誤路徑，可以暫時填入不存在的 destination。每次失敗只能增加 attempts，不可把 job 誤標 completed；第三次才 failed。修正 destination 後若要重試，必須由 owner 明確把狀態改回 active。

## 驗證

純函式 `nextRun` 測試 daily、weekly 與 one-shot。整合測試建立一分鐘後提醒，關閉開發電腦，等待 LINE 或 Chat 主動收到訊息；Jobs row 必須同步改成 completed。

再刻意放入錯誤 destination，執行三次 tick，確認 attempts 由一到三且最後為 failed。重複執行 completed job 不得再推送。

## 發布素材

- 聊天 Demo：建立一分鐘後提醒，關掉電腦後由 LINE 收到 push。
- 設計焦點：到期挑選、lease、retry、recurrence 與 destination。
- 測試／失敗案例：同一 tick 重跑不得重複執行 agent work。
- 當日 Git tag：`day-16`。下一篇建立 Tool Registry。

## 安全與限制

排程推送只允許送回 owner 的既有 destination，不接受 Gemini 任意指定陌生 user ID。大量通知也可能觸發 LINE 或 Chat 配額，因此每次 tick 有上限。

Apps Script 時間 trigger 不保證整點零秒執行，適合提醒與晨報，不適合交易或醫療警報。LINE push 需要有效 channel access token，並受官方訊息方案與 API 配額約束。下一篇進入 Workspace tool calling。
