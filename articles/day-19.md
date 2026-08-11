# Day 19｜串接 Calendar：找空檔、建立與修改會議

## 今天要完成什麼

會議安排是專案助理最具體的價值。今天加入列出時段、建立活動與修改活動。查詢自動，寫入必須核准。

第一版用預設 Calendar，不處理跨組織 FreeBusy API。Agent 先讀取指定區間事件，再依工作時間提出空檔；使用者選定後才提出 `calendar.create`。

## 實作

`calendar.list` 需要 start、end，回傳 id、title、start、end，不送出不必要的完整描述。`calendar.create` 需要 title、start、end，可帶 description。`calendar.update` 至少需要 eventId，title 或新時間為選填。

會議 skill 的規則是：

1. 日期或時區不明先追問。
2. 只在記憶的工作時間內找空檔。
3. 最多提出三個選項。
4. 未核准前不得建立或修改。

## 動手試試看

先在測試行事曆建立 14:00–15:00 與 16:00–16:30 兩場活動，再問「明天下午找 30 分鐘」。把 `calendar.list` 結果畫成時間軸，確認 Agent 不會提出重疊選項。選定 15:00 後，查看 Approvals sheet 應包含標題、開始與結束時間。

故意把 end 設成 start 之前，validator 應拒絕。再用不存在的 event ID 測 update，錯誤應回到聊天並留下 failed run，而不是讓整個 scheduler 卡住。

## 驗證

先建立測試 Calendar event，再要求查詢同區間，確認 list 能看到。接著要求安排新會議：approval 出現時 Calendar 不變；核准後活動出現且時間正確。

測試 start 晚於 end、無效 ISO date、找不到 eventId 都應失敗。重複核准不得建立第二個活動。

## 發布素材

- 聊天 Demo：查詢下週空檔，選擇後核准建立測試行程。
- 設計焦點：read 與 write 工具分離，時間一律帶 timezone。
- 測試／失敗案例：結束早於開始、衝突與重複核准都不能寫入。
- 截圖證據：核准前後各截一次 Calendar，證明寫入只發生在 owner 明確同意之後。
- 當日 Git tag：`day-19`。下一篇串 Gmail。

## 安全與限制

Calendar 標題與描述可能包含私人資訊，run log 只記工具摘要。邀請外部 attendees 比單純建立個人 event 風險更高，第一版尚未提供 attendees 參數。

`CalendarApp.getEventById` 對重複活動與非預設 Calendar 有額外細節，本系列先限制單一預設行事曆。下一篇串 Gmail 搜尋、草稿與寄送核准。

若未來加入 attendees，應新增更高風險的 `calendar.invite` 工具，而不是悄悄擴大現有 create。工具粒度清楚，核准摘要才不會隱藏對外通知。

今天完成後，把可重現測試活動全部放在獨立測試日期並清楚命名，避免污染真實行程。文章截圖應遮住私人活動標題，只保留測試區間與核准流程。這也是公開技術文章容易忽略的資料衛生。
