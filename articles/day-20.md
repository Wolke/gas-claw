# Day 20｜串接 Gmail：搜尋、建立草稿，但不擅自寄信

## 今天要完成什麼

郵件是最容易造成真實傷害的工具。今天讓 Agent 能搜尋 thread、整理主旨與建立 draft；真正寄出需要明確核准。

建立草稿被標為 draft risk，可以自動執行，因為草稿不會送到外部；`gmail.sendDraft` 是 send risk，永遠進 Approval。

Gmail 是最敏感的能力，也最可能觸發 unverified-app 警告。個人部署使用自己的標準 Cloud 專案與 test user 完成授權；若要把同一 OAuth 應用提供給大量外部使用者，就必須走 Google verification，而不能把個人測試設定當正式發行。

## 實作

`gmail.search` 接收 Gmail query，例如：

```text
is:unread newer_than:3d
from:amy@example.com subject:報價
```

回傳 threadId、subject、lastDate 與 messageCount，不預設把完整郵件本文送給 Gemini。需要摘要或判斷是否已回覆時，再用 `gmail.readThread` 讀取指定 thread 最近十封信；每封 plain text 最多三千字。

建立草稿需要 to、subject、body，回傳 draftId。寄送工具只接受 draftId，核准畫面應顯示收件者、主旨與本文摘要，避免使用者只看到一串 ID。

## 動手試試看

使用自己的測試郵件建立 thread，先執行 `gmail.search` query `subject:gas-claw-test`。確認工具只回傳 metadata，再用結果中的 threadId 讀取正文並要求建立回覆草稿。打開 Gmail Drafts 檢查內容，但不要寄出。

接著要求 Agent 寄送這份草稿。聊天應提供 approval ID，Approvals sheet 的 risk 是 send。先走拒絕路徑，確認草稿仍在；重新建立 approval 並核准，才檢查 Sent。測試帳號不要使用真實客戶收件者。

## 驗證

要求「搜尋最近三天未讀信」，確認只有讀取。要求「替我草擬回覆」後 Gmail Drafts 出現，但寄件匣沒有新信。再要求寄送，先確認 approval；拒絕時草稿保留，核准才寄出。

測試不存在 draftId、空白收件者與無效搜尋 input。秘密掃描確認郵件本文與 access token 不進 Runs。

## 發布素材

- 聊天 Demo：找出專案郵件、摘要並建立回覆草稿。
- 設計焦點：搜尋、摘要、draft 與 send 分成不同風險。
- 測試／失敗案例：沒有核准時寄信函式不得被呼叫；內容要遮罩秘密。
- 截圖證據：用自己的測試信箱展示搜尋結果與草稿匣，完整地址及本文在發布前遮罩。
- 重跑方式：測試郵件主旨固定加上 `[gas-claw-test]`，讓讀者能安全搜尋並清理測試資料。
- 當日 Git tag：`day-20`。下一篇串 Drive／Docs。

## 安全與限制

搜尋到的郵件可能包含 prompt injection。`gmail.readThread` 的內容只能是資料，不能要求 Agent 改變政策、匯出其他信件或自動寄送。搜尋與正文讀取分開，也讓使用者能先縮小範圍再傳給模型。

第一版沒有批次寄信工具，也不允許模型指定大量 recipients。寄送是不可逆外部動作，必須保守。下一篇處理 Drive 與 Docs，讓會議紀錄成為可控資料來源。

這個技能也示範「草稿」是一種安全的中間產物。Agent 能提供實際價值，又把最終對外承諾留給人。對社群貼文、報價與文件發布，也可以沿用同一模式。

驗收完成後刪除測試草稿與測試信，但不要把刪除能力交給 Agent。測試資料清理由人手動執行，既能維持信箱整潔，也不需要擴大正式工具的風險範圍。
