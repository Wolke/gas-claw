# Day 1｜沒錢買新 Mac，所以讓龍蝦住進 Google Apps Script

## 今天要完成什麼

這個系列要做的不是另一個只能回答問題的聊天機器人，而是一位能在聊天視窗接受交辦、記住任務、按時間醒來，並操作 Google Workspace 的個人專案助理。我把它叫做 `gas-claw`：靈感來自 OpenClaw 所代表的「傳一則訊息，Agent 就去工作」體驗，但它不是 OpenClaw 的移植，也不追求指令或外掛相容。

選擇 Google Apps Script 的理由很現實。一般做法需要一台長時間開機的 Mac mini、NAS 或雲端主機；我不想先買硬體，也不想為了 Side Project 維護伺服器。GAS 原本就運行在 Google 雲端，能接受 HTTP request、設定時間觸發器，還能直接呼叫 Gmail、Calendar、Drive、Docs、Sheets。只要 Google 帳號、Gemini API Key，以及一個聊天入口，就能組成最小可用的個人助理。

三十天後，我希望能直接傳送這些句子：

```text
新增任務：星期五前完成鐵人賽簡報
10 分鐘後提醒我進會議室
找出明天下午的空檔，安排一場 30 分鐘會議
整理這份會議記錄，把待辦列出來
每天早上八點傳今天的行程與任務給我
```

其中查詢、摘要、建立草稿可以自動完成；寄信、建立邀請或修改外部資料，必須先在聊天中確認。

## 實作

第一天先建立公開 repository，而不是急著串 API。專案採 MIT License，核心程式使用 TypeScript，透過 esbuild 打包成 Apps Script 能執行的單一 `Code.js`。開發流程是：

```bash
git clone https://github.com/Wolke/gas-claw.git
cd gas-claw
npm install
npm run check
```

`npm run check` 依序執行型別檢查、Vitest、bundle 建置及成果驗證。這個順序很重要：TypeScript 能避免資料結構漂移，測試保護純邏輯，bundle 則確認 Apps Script 最後實際收到的檔案。

產品的最小資料流如下：

```text
Google Chat／LINE → Channel Adapter → Agent → Policy → Workspace Tool
                                      ↓
                           Task／Memory／Schedule
```

這裡刻意沒有視覺化流程圖編輯器。使用者的主要介面就是文字；系統內部才有明確的資料格式、工具白名單與狀態機。

## 驗證

今天的驗收不是「README 看起來很完整」，而是乾淨環境能完成：

```bash
npm ci
npm run check
```

GitHub Actions 也會在每次 push 重跑相同步驟，並掃描疑似 API Key。文章本身同樣進入驗證範圍：Day 1 到 Day 30 必須全部存在，而且每篇都要包含實作、驗證與限制，才允許發布。

## 發布素材

- 聊天 Demo：「明天早上提醒我整理提案」，建立任務與提醒後關掉電腦。
- 設計焦點：渠道、Agent、工具政策與排程分層。
- 測試／失敗案例：重送 webhook 不得重複建檔；缺 owner 時必須拒絕。
- 當日 Git tag：`day-01`。下一篇比較聊天 Agent 與 n8n。

## 安全與限制

GAS 並不是免費的無限伺服器。它有執行時間、每日服務配額與觸發器限制；也沒有任意 request header，因此 LINE 官方簽章不能在純 GAS endpoint 直接驗證。這個系列不隱藏限制：LINE 版本會使用難以猜測的 webhook token 加上 owner ID 白名單；若需要密碼學等級的簽章驗證，就必須在前面增加 Cloud Run 或 Functions proxy。

第一版也只支援單一 owner。這不是偷懶，而是避免把個人 OAuth 權限錯誤地擴張成多人服務。下一篇會釐清聊天式 Agent 與 n8n 工作流工具到底差在哪裡。
