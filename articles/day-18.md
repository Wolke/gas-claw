# Day 18｜串接 Google Tasks：讓聊天待辦進入 Google 生態系

## 今天要完成什麼

`gas-claw` 自己有 Tasks sheet，但很多人已使用 Google Tasks。今天透過 Apps Script Advanced Service 列出、建立與完成待辦，並保留外部寫入核准。

Advanced Service 必須同時在 manifest 宣告、Apps Script 專案服務清單啟用，有些帳號還需在對應 Cloud project 啟用 Tasks API。

## 實作

manifest：

```json
{
  "userSymbol": "Tasks",
  "serviceId": "tasks",
  "version": "v1"
}
```

工具分成 `tasks.list`、`tasks.create` 與 `tasks.complete`。List 是 read，可直接回傳；create 與 complete 是 write，模型提出後先保存 ApprovalRequest。使用者核准時 runtime 重新取得工具、再次驗證 input，才呼叫 `Tasks.Tasks.insert` 或 `Tasks.Tasks.patch`。完成工具必須帶合法 task ID，不能用模糊標題直接猜一筆。

這個「核准時重新驗證」很重要，不能保存一段任意 callback 等隔天執行。Approval 只保存工具名稱與 JSON input。

## 動手試試看

先在 Apps Script 左側服務清單確認 Tasks 已出現；使用預設 Cloud project 時，Apps Script 會隨 Advanced Service 設定管理對應 API。傳送「列出我的 Google Tasks」，確認 read 工具能直接回覆。接著要求新增「驗證 Advanced Service」，在 Approvals sheet 找到 pending row；核准前打開 Google Tasks 應完全沒有新項目。

核准後比對回傳 task ID 與 Google Tasks UI。再要求完成這筆 Google Task，確認第二次核准前狀態仍未改變，核准後才出現在已完成清單。複製同一核准命令重送，預期只得到「找不到有效的待核准操作」。這一步驗證一次性，而不只是 API 串接成功。

## 驗證

在 LINE 傳「把『整理提案』加入 Google Tasks」。預期先收到 approval ID，而 Google Tasks 尚未出現。回覆核准後才新增；重複回覆同 ID 應顯示無有效待核准操作，不能新增第二筆。

拒絕流程也要測：Approval 狀態改 rejected，Tasks 不變。過期 ID 改 expired。建立與完成各自有獨立 approval，不能用核准建立的 ID 順便完成。

## 發布素材

- 聊天 Demo：「把買測試網域加到 Google Tasks」。
- 設計焦點：內部 Task Store 與 Google Tasks 是兩個明確資料源。
- 測試／失敗案例：create／complete 都需核准，重試以 idempotency key 防止重複。
- 當日 Git tag：`day-18`。下一篇串 Calendar。

## 安全與限制

內部 task 與 Google Tasks 是兩套資料來源。第一版不自動雙向同步，以免產生衝突與重複；使用者必須說明要建立本機任務或 Google Tasks。

Advanced Service 的型別與 API 回傳可能包含分頁；第一版 list 僅適合個人少量任務。大量資料需實作 pageToken。下一篇處理 Calendar 與會議安排。

今天的成果是把內部任務與 Google Tasks 的界線說清楚：前者是 Agent 自己的工作記憶，後者是使用者既有 Google 工具。兩者可以並存，但不能在沒有同步策略時假裝是同一份資料。
