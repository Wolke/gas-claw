# Day 8｜接上 Gemini：最小但受控的 Agent Loop

## 今天要完成什麼

今天讓文字不只匹配固定命令，而能理解跨服務需求。重點不是「把 prompt 丟給 Gemini」，而是要求模型輸出可驗證的 `AgentDecision`，再由程式決定能不能執行。

如果模型直接回覆自然語言：「我已經幫你寄信」，系統無法判斷它是真的做了、只是聲稱做了，還是缺少收件者。因此所有行動必須是結構化資料。

## 實作

Gemini request 指定 JSON response MIME type：

```ts
const payload = {
  contents: [{ role: 'user', parts: [{ text: prompt }] }],
  generationConfig: { responseMimeType: 'application/json' }
};
```

Prompt 包含技能目錄、可用工具、未完成任務、長期記憶、目前時間與使用者訊息，並要求固定欄位：

```json
{
  "response": "我先替你找明天下午的空檔。",
  "toolCalls": [
    {"id":"call-1","name":"calendar.list","input":{"start":"...","end":"..."}}
  ],
  "taskChanges": [],
  "scheduleChanges": [],
  "memoryCandidates": []
}
```

程式解析後逐項檢查：tool call 不得超過六次、名稱必須存在 registry、input 必須通過工具自己的 validator。read 與 draft 工具可執行；write 和 send 轉成 ApprovalRequest。模型沒有任何方法修改 `risk`。

簡單命令不必花模型費用。「新增任務」、「列出任務」、「10 分鐘後提醒我」先由 deterministic parser 處理；只有無法確定的自然語言才進 Gemini。

## 驗證

單元測試至少覆蓋：

- 純 JSON 與 markdown code fence 都能解析。
- 缺少陣列欄位時補成空陣列。
- 非 JSON 回覆明確失敗，不默默當成成功。
- 不存在的工具被拒絕。
- 超過六個 tool calls 被拒絕。
- `calendar.create` 只產生 approval。
- 疑似 API Key 在 run summary 變成 `[REDACTED]`。

實機測試則先用不需 Workspace 寫入的問題，例如「幫我說明今天有哪些能力」，確認 Gemini endpoint 回應及 Apps Script execution log 沒有 401、403 或 JSON parse error。

## 發布素材

- 聊天 Demo：「列出今天工作」轉成合法的結構化 decision。
- 設計焦點：JSON schema、資料邊界與最多六次 tool calls。
- 測試／失敗案例：markdown fence、缺欄位與未知工具都不能執行。
- 當日 Git tag：`day-08`。下一篇建立 LINE Messaging API 頻道。

## 安全與限制

Gemini API Key 放在 URL query 是 Developer API 的標準呼叫方式，但錯誤訊息與日誌不能包含完整 URL。程式只記錄 HTTP status，不輸出 key 或 response header。

結構化輸出不是安全沙箱。模型仍可能輸出危險參數，因此 registry 與 approval 才是執行邊界。文件、郵件與使用者文字都標為 untrusted content，不能修改 system policy。下一篇將建立主要入口 LINE。
