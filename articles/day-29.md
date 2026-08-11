# Day 29｜配額、逾時、重試與執行紀錄

## 今天要完成什麼

功能正確不代表系統可靠。今天處理 GAS execution limit、Google 服務配額、外部 API 失敗、重試與 Runs 稽核，讓錯誤能被看見而不是默默消失。

每次 Agent run 都應有 ID、channel、conversation、status、summary 與 createdAt；日誌只保存必要摘要，不保存秘密與完整郵件。

## 實作

Scheduler 每批最多十項，只在 claim 時持有 lock，寫入 `running` 與五分鐘 lease 後就釋放；外部推送失敗增加 attempts，三次後 failed，execution 崩潰留下的 running job 則能在 lease 過期後回收。Webhook event ID 先用 CacheService 快速判斷，再以 Runs 的持久 claim 防止快取淘汰後重複處理；approval 狀態機則保護核准寫入。

推送前先把 `deliveryText` 與新的 delivery UUID 寫回 job。LINE push 把 UUID 放進 `X-Line-Retry-Key`；Google Chat messages.create 使用同一個 UUID 作為 `requestId`。若平台已接受訊息，但 GAS 在更新 completed 前逾時，下一次仍用相同 UUID，平台不會建立第二則。週期工作完成一次後清除 UUID，下一個週期才產生新值。

Gemini request 使用 `muteHttpExceptions`，非 2xx 只回報 status code。工具錯誤被捕捉後記錄 run failed，聊天回覆可理解的中文訊息，不回傳 stack trace。

每輪最多六個工具。Runtime 另設四分鐘 soft budget：完成一個工具後若已越線且仍有剩餘 calls，就把原始問題、已完成結果與剩餘工具名稱存成一分鐘後的 `agent_run`，不在快逾時時硬啟動下一項操作。Continuation 只要求處理未完成部分，高風險寫入仍會重新經過 approval。

## 動手試試看

建立故障注入表：錯誤 Gemini key 預期 4xx、無效 LINE token 預期 push 失敗、缺少 Tasks service 預期工具錯誤、鎖被占用預期 tick 安全退出。每一列記錄使用者看到什麼、Runs 保存什麼、是否重試。

接著量測一輪「Calendar 查詢＋Gmail 搜尋」所需時間，確保遠低於 GAS 執行上限。若工具結果太大，應在 tool 層先截斷，而不是等 prompt 爆掉才處理。最後檢查失敗 run 中沒有 URL query key、access token 或完整郵件。

## 驗證

故意使用錯誤 Gemini Key、無效 LINE token、不存在 Calendar event 與缺少 Tasks service，確認每種錯誤都有可定位紀錄。

重試測試確認成功後 attempts 歸零，失敗三次停止；重複 webhook 不新增 Task；同 approval 不執行第二次；第一次收到 5xx、第二次成功時兩次 request 的 delivery UUID 必須完全相同。

## 發布素材

- 聊天 Demo：模擬 LINE push 暫時失敗，重試後只收到一次結果。
- 設計焦點：checkpoint、三次 retry、Runs 與秘密遮罩。
- 測試／失敗案例：Gemini 429、GAS 逾時、scheduler 重跑與永久失敗。
- 當日 Git tag：`day-29`。下一篇做全新帳號驗收。

## 安全與限制

可觀測性不能變成資料外洩。Logs 不記 API URL query、access token、郵件全文與文件全文。錯誤訊息先 redaction 再保存。

Apps Script 配額依帳號類型變化，不能在文章寫死一組數字；部署者應查看官方當期 quotas。下一篇做全新帳號式的最終驗收與 1.0 清單。

可靠性不是「永遠不錯」，而是錯誤時不重複傷害、能定位、能恢復。對 Agent 而言，這比多支援一個工具更重要。

發布前把這份故障注入表放進 `docs/VERIFICATION.md`，記錄測試日期、Apps Script project、deployment version 與結果。如此最後 review 時能區分「由單元測試證明」和「由真實 Google 服務證明」的項目。
