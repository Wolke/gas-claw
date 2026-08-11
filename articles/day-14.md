# Day 14｜任務不是一句文字：建立 Task 狀態機

## 今天要完成什麼

提醒與任務不同。提醒是某個時間傳訊；任務有狀態、優先級、期限與專案歸屬。今天建立 `Task`，讓龍蝦不只會「記住一句話」，還能回答有哪些工作正在進行。

狀態定義為 inbox、planned、doing、waiting、done、cancelled。這些狀態足以支援個人專案管理，又不會像大型 issue tracker 一樣複雜。

## 實作

```ts
interface Task {
  id: string;
  title: string;
  status: 'inbox'|'planned'|'doing'|'waiting'|'done'|'cancelled';
  priority: 'low'|'normal'|'high'|'urgent';
  dueAt?: string;
  project?: string;
  sourceChannel: string;
  sourceConversationId: string;
  createdAt: string;
  updatedAt: string;
}
```

本機命令可直接處理：

```text
新增任務：完成週報
列出任務
完成任務 週報
```

「完成任務」使用標題包含搜尋；零筆回覆找不到，多筆則要求更完整名稱，只有唯一匹配才改成 done。這比讓模型自行選一筆安全。

Google Tasks 是外部系統。讀取可自動，建立與完成被標為 write，需要 Approval。`gas-claw` 自己的 Tasks sheet 則視為內部狀態，可以直接修改。

## 動手試試看

連續建立「完成週報」、「完成週報封面」與「聯絡 Amy」三筆任務。輸入「完成任務 週報」時，系統應因匹配兩筆而要求更完整名稱；輸入「完成任務 週報封面」才修改唯一一筆。接著列出任務，確認已完成項目消失，但 Sheet 原始資料仍保留，方便日後週報統計。

還可以手動把一項任務改成 waiting，並在 project 欄填入 gas-claw。晨報應把 waiting 與 overdue 分開呈現，而不是把所有未完成工作視為同一種緊急度。

## 驗證

測試新增後欄位完整、時間為 ISO 8601、預設 priority 是 normal。完成不存在與多筆同名時不應修改任何資料。列出任務時排除 done 和 cancelled。

整合驗收在 Google Chat 新增任務，再從 LINE 列出。因為是單 owner 部署，資料可共用；但回覆與提醒仍回到來源渠道。

## 發布素材

- 聊天 Demo：新增、列出、完成與延後同一筆任務。
- 設計焦點：狀態機、priority、dueAt 與來源追蹤。
- 測試／失敗案例：done 不可無意回到 doing；模糊匹配多筆時要追問。
- 當日 Git tag：`day-14`。下一篇解析時間。

## 安全與限制

模糊匹配不能在多筆時猜測。任務文字也可能包含 prompt injection，但它只作為資料呈現，不可改變 tool policy。

目前 Sheets 寫入是簡化 repository。並行 webhook 可能競爭，因此更新路徑應使用 LockService；若未來支援多人，需換成真正具 transaction 與索引的資料庫。下一篇處理中文時間與提醒。
