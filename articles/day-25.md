# Day 25｜案例四：自動追蹤尚未回覆的郵件

## 今天要完成什麼

Email Follow-up 解決「寄出後忘了追」。助理搜尋特定 thread、建立回覆草稿，並在指定天數後檢查是否已有新回覆；沒有才提醒 owner。

技能不會自動對外寄送。草稿可以建立，send 必須核准。

## 實作

使用者說：「Amy 三天沒回覆報價就提醒我。」Agent 保存 Gmail query、基準 message 時間與三天後的 ScheduledJob。到期時重新搜尋 thread：若有對方新訊息，job completed 且回報已收到；否則推送提醒並可建立 draft。

若使用者要求寄出，`gmail.sendDraft` 產生 approval，摘要應顯示 to、subject 與 body preview，而不只 draftId。

## 動手試試看

用兩個自己的測試信箱建立 thread。第一組在追蹤期限前由對方回覆，第二組保持未回覆。為兩組各建立 ScheduledJob，將 runAt 設到一分鐘後。Scheduler 執行時應辨識第一組已有新 sender message，不發提醒；第二組才向 owner 推送「尚未回覆」。

接著要求為第二組產生禮貌草稿。檢查內容不要杜撰報價或期限，只能引用 thread 中存在的資訊。要求寄出時，approval summary 顯示收件者、主旨與前幾行。先拒絕一次確認草稿保留，再重新提出並核准給測試信箱。

Run log 應只記 thread 識別與結果，不保存完整郵件本文。重跑 completed job 不得再次提醒或建立第二份草稿。

## 驗證

建立兩個 fixture：一個到期前收到回覆，一個沒有。第一個不得提醒；第二個只提醒一次。重新執行 scheduler 不得產生重複 draft。

拒絕 send approval 時 draft 保留，郵件不寄出；核准後狀態更新，重複 ID 無效。

## 安全與限制

Gmail thread 判斷「對方回覆」不能只看最新日期，還要辨識 sender。第一版工具回傳資料有限，正式技能應補 message metadata。

任何自動寄信都可能造成聲譽傷害，因此本專案堅持 human-in-the-loop。下一篇建立每週專案回顧與 Docs 報告。

這個案例也提醒我們：「沒回覆」需要明確定義。最新訊息日期不夠，必須判斷 sender；自動回覆與退信也不等於真人回覆。第一版的限制要在技能輸出中說明。

為避免測試真的打擾別人，所有寄送驗收使用自己的第二個信箱，主旨加上 `[gas-claw-test]`。完成後保留 execution evidence，但從文章截圖移除完整地址與郵件本文。

最後記錄從建立追蹤到收到提醒的時間線，證明這不是即時聊天回覆，而是持久排程在另一個 execution 中恢復工作。
