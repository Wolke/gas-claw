# Day 27｜聊天內人工核准：讓 AI 停在正確的位置

## 今天要完成什麼

Human-in-the-loop 不是多一個「確定嗎」視窗，而是一個可恢復、不可重複使用、有來源約束的狀態機。今天完整處理 pending、executing、approved、rejected、expired 與 failed。

Approval 保存 tool call，而不是模型產生的任意文字。核准時重新從 registry 取得工具與驗證參數，確保程式版本與政策仍有效。

## 實作

```ts
interface ApprovalRequest {
  id: string;
  action: ToolCall;
  summary: string;
  risk: 'write'|'send'|'delete'|'share';
  expiresAt: string;
  status: 'pending'|'executing'|'approved'|'rejected'|'expired'|'failed';
  channel: Channel;
  conversationId: string;
}
```

使用者回覆「核准 ID」或「拒絕 ID」。Runtime 檢查狀態、到期時間、channel 與 conversationId；真正呼叫工具前先把狀態改為 executing，完成後才改 approved，失敗則改 failed。第二次使用相同 ID 會被拒絕，因此併發點擊不會重放外部動作。

Google Chat Cards 與 LINE postback 未來都可轉成相同文字命令或 action payload，因此核心狀態不依賴 UI。

## 動手試試看

分別建立 `calendar.create`、`tasks.create` 與 `gmail.sendDraft` 三種 approval。確認摘要內容足以判斷影響，再依序測核准、拒絕和過期。把一個 Google Chat approval ID 複製到 LINE 使用，必須因 channel／conversation 不符而拒絕。

最後對同一 ID 快速送出兩次核准。即使 webhook 併發，外部副作用也只能發生一次；正式實作應在狀態更新周圍使用 lock，並以 approval ID 作為冪等鍵。

## 驗證

測試矩陣包括核准、拒絕、過期、錯誤渠道、錯誤 conversation、未知工具與重複點擊。Calendar／Tasks／sendDraft 各跑一次端到端驗證。

最重要的 assertion：pending 階段外部服務完全沒有副作用；approved 只產生一次副作用。

## 安全與限制

Approval summary 必須讓人看得懂真正影響，不能只顯示工具名稱。寄信要顯示收件者與本文摘要，Calendar 要顯示時間，Docs 要顯示標題。

第一版文字 ID 較不方便，但比尚未完成的按鈕可靠。後續 Cards 只是呈現層。下一篇用 prompt injection 實際攻擊系統。

核准的 UX 應該讓人容易說「不」。如果 summary 太模糊、按鈕只有醒目的核准，使用者會養成無腦點擊。安全不只在後端 policy，也在資訊呈現。
