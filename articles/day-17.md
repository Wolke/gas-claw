# Day 17｜Tool Calling：模型只能提案，程式才有執行權

## 今天要完成什麼

今天建立 Tool Registry。它是 Agent 最重要的安全邊界：Gemini 知道有哪些工具、需要哪些參數，但不能自己新增工具或修改風險。

如果用巨大 switch 處理字串，很快會散落驗證與權限判斷。每個工具應同時宣告 name、description、risk、validate 與 execute。

## 實作

```ts
interface AgentTool {
  name: string;
  description: string;
  risk: 'read'|'draft'|'write'|'send'|'delete'|'share';
  validate(input: unknown): Record<string, unknown>;
  execute(input: Record<string, unknown>, context: AgentContext): unknown;
}
```

Registry 只向模型提供名稱、說明和風險，不暴露實作。執行流程先 `get(name)`，再 `assertToolAllowed`、`validate`，最後依 risk 執行或排入 Approval。

目前 delete 和 share 風險完全禁用；write 與 send 等待確認；read 與 draft 可直接跑。每輪最多六個 tool calls，避免模型陷入迴圈或消耗配額。

## 動手試試看

先直接呼叫 registry 的 declarations，確認模型只看到必要 metadata。接著模擬三個 decision：`gmail.search` 應立即執行，`calendar.create` 應產生 pending approval，`shell.exec` 應在任何 Google service 被呼叫前失敗。

再測一個看似合法但缺參數的 Calendar call。Validator 應指出 `Missing start`，而不是把 `undefined` 交給 `new Date`。這類負面測試比成功路徑更能證明 registry 是安全邊界。

## 驗證

測試 registry 至少有十個明確工具，`shell.exec` 必須是 undefined。Calendar 建立缺少 start 時應在呼叫 Google API 前報錯。風險測試確認 read 不需核准，send 必須核准，delete 即使有工具也會被 policy 禁止。

Agent 測試餵入假的決策，確認工具結果寫入 Runs，API Key pattern 被遮罩；模型宣稱成功但沒有 tool result 時不得記成外部操作完成。

### 2026 年的新選項：Google Workspace MCP

Google 在 Developer Preview 提供 Gmail、Drive、Docs、Sheets、Slides、Calendar、Chat 與 People 的遠端 MCP server。它把 `gmail.search_threads`、`drive.read_file_content`、`calendar.create_event` 等操作包成標準 MCP tools，很適合 Antigravity、Claude 或其他具備 MCP client 的 Agent。

`gas-claw` v1 沒有把它設為必要依賴。原因不是 MCP 不好，而是產品邊界不同：Workspace MCP 需要 Google Cloud project、啟用各產品與 MCP API、建立 OAuth client，並由外部 MCP client 分別完成驗證；它目前也沒有 Google Tasks。若把它變成唯一工具層，使用者就無法只複製一份 Apps Script 在三十分鐘內完成部署。

因此 registry 保留實作抽象，未來可以讓同一個工具宣告選擇兩種 adapter：預設用 Apps Script service／REST API，實驗模式則轉送官方 Workspace MCP。Agent、核准、排程、LINE adapter 與 audit log 都不需要因此重寫。官方文件：<https://developers.google.com/workspace/guides/configure-mcp-servers>。

## 發布素材

- 聊天 Demo：搜尋 Gmail 直接執行，Calendar create 則停在核准。
- 設計焦點：原生 GAS tool adapter 與未來 Workspace MCP adapter 分離。
- 測試／失敗案例：`shell.exec`、錯誤參數與超量 tool calls 全部拒絕。
- 當日 Git tag：`day-17`。下一篇串 Google Tasks。

## 安全與限制

工具 description 不是權限。唯一權限來源是程式裡的 risk 與 policy。即使 prompt 被 injection 改寫，模型仍拿不到 registry 以外的能力。

工具回傳的文件與郵件仍是不可信內容；送回 Gemini 做摘要時要加資料邊界，不能讓結果成為新 system instruction。下一篇先串 Google Tasks。
