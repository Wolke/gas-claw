# Day 12｜多輪對話與短期 Session

## 今天要完成什麼

真正的助理不能每句話都失憶。使用者可能先說「找明天下午的空檔」，看到選項後只回「第二個」，系統必須知道第二個指的是什麼。今天設計短期 session，同時控制 prompt 長度與隱私。

Session 與長期記憶不同。Session 保存最近幾輪訊息與工具結果，目的是完成當前工作；Memory 保存經使用者確認、未來仍有價值的偏好。把所有聊天永久保存既昂貴又危險。

## 實作

每個 session key 由 channel 與 conversationId 組成。短期資料先放 CacheService，必要摘要寫入 Sheets 或 Drive。結構可包含：

```ts
interface SessionState {
  messages: Array<{ role:'user'|'assistant'; text:string }>;
  pendingChoice?: Record<string, unknown>;
  updatedAt: string;
}
```

送給 Gemini 前，只取最近 N 輪，加上一段舊內容摘要。工具的原始大量結果不直接保留，例如郵件全文改成 message ID、主旨與必要摘要。

每次成功回覆後更新 session；若 24 小時沒有活動就讓 Cache 自動過期。待核准要求不依賴 Cache，而是寫入 Approvals，因為使用者可能隔天才回覆。

## 動手試試看

可以先不接 Gemini，用假的 session repository 練習。第一輪寫入三個候選時間與 `pendingChoice.type = meeting-slot`；第二輪輸入「第二個」，resolver 先檢查候選仍在有效期，再取 index 1。輸入「第四個」或候選已過期，都只能回覆「請重新選擇」，不能讓陣列越界或沿用舊資料。

另一個必要練習是摘要。準備十輪對話，只保留最近四輪，把前六輪轉成「使用者正在安排發布會，已排除週一」這種不含敏感細節的摘要。比較送給模型的字數，確認 prompt 不會隨聊天永久成長。

## 驗證

測試兩輪情境：第一輪產生三個時間選項，第二輪「第二個」能引用 pendingChoice。Cache 過期後則應要求使用者重新說明，而不是猜測。

還要測試 prompt budget：塞入超長文件時，session builder 只保留指定上限；工具結果中若有 API Key pattern，進入 run log 前必須 redaction。

## 安全與限制

聊天歷史可能包含客戶資料、郵件摘要或私人行程。短期 session 不應變成永久監控紀錄；預設只留完成任務所需內容。Run log 只保存摘要與狀態，不保存完整郵件本文。

第一版以 CacheService 為主，無法保證 cache 永不提前淘汰。因此關鍵狀態——任務、排程、核准——全部另存 Sheets。下一篇把真正值得留下的資訊轉為長期記憶。
