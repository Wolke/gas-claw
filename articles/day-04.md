# Day 4｜GAS 龍蝦的完整架構與資料流

## 今天要完成什麼

今天把 `gas-claw` 從一堆 API 名稱整理成可追蹤的系統。好的架構圖不是裝飾，而是回答三個問題：訊息如何進來、誰有權決定動作、執行失敗後狀態放在哪裡。

整體分成 Channel、Agent、Policy、Tool、Repository、Scheduler 六層。Channel 只處理平台格式；Agent 組合上下文並詢問 Gemini；Policy 決定是否允許；Tool 封裝 Workspace 行為；Repository 保存可恢復狀態；Scheduler 負責主動工作。

```text
LINE ─────────> Webhook Adapter ─> Owner/Dedup ─> Agent
                                                │
                       ┌─────────────────────────┼─────────────┐
                       ↓                         ↓             ↓
                    Memory                   Tasks          Skills
                       └──────────────> Gemini Decision <─────┘
                                                ↓
                                        Policy + Registry
                                          ↓            ↓
                                      Execute       Approval
                                          └──── Result ────> Reply
```

## 實作

秘密與業務資料分開保存。Script Properties 只放 Gemini Key、LINE token、owner ID 和 webhook token；Sheets 保存 Tasks、Jobs、Approvals、Memory、Runs。短期事件去重使用 CacheService，寫入競爭由 LockService 控制。

資料庫初始化會建立五張工作表並凍結標題列。再次執行 `setupGasClaw()` 時會重用既有 spreadsheet，而不是每按一次就產生新的資料庫。這種冪等安裝行為很重要，因為使用者常在授權失敗後重新執行。

一次訊息的生命週期是：

1. Adapter 產生 `IncomingMessage`。
2. owner allowlist 驗證 user ID。
3. Cache 檢查 event ID 是否已處理。
4. 先處理確定性本機命令，例如新增任務與提醒。
5. 其他文字才交給 Gemini 產生 `AgentDecision`。
6. Tool Registry 驗證每一個 tool call。
7. read／draft 立即執行；write／send 產生 approval。
8. 任務、排程、記憶候選與 run summary 寫入 Sheets。
9. 將結果回到 LINE conversation。

把常見命令放在 deterministic parser，而不是每次都呼叫模型，有三個優點：回應更快、成本更低、測試更穩定。Gemini 留給跨服務與語意模糊的工作。

## 驗證

架構驗證採「每個邊界都能被否定」的方式：

- LINE 群組或聊天室訊息應被拒絕。
- 非 owner 的 LINE user ID 應被拒絕。
- 同 event ID 第二次應回覆已處理。
- 模型提出不存在的 `shell.exec` 應拋出 unknown tool。
- `calendar.create` 應只建立 Approval，不直接建立活動。
- 排程失敗三次後不再無限重試。

這些不是 UI 截圖能證明的行為，因此必須由測試與實機 execution log 共同確認。

## 發布素材

- 聊天 Demo：從訊息、Gemini decision、approval 到 Calendar 寫入逐步追蹤。
- 設計焦點：信任邊界、資料儲存與主動回報路徑。
- 測試／失敗案例：模型回傳壞 JSON 或超過六次工具呼叫時停止。
- 當日 Git tag：`day-04`。下一篇建立 repo。

## 安全與限制

最大的信任邊界位於 Gemini Decision 與 Tool Registry 之間。模型輸出永遠視為不可信提案；即使 JSON 格式正確，也不能直接執行。輸入驗證、風險標籤與 approval 狀態才是授權來源。

Sheets 很方便，但不是高併發資料庫。單一 owner 的訊息量適合；若要多人團隊使用，就需要 row-level ownership、真正 transaction、索引與更嚴格的 OAuth 隔離，屆時 Firestore 會更合理。第一版刻意不假裝已支援 multi-tenant。下一篇開始建立 repository 與工程骨架。
