# Day 30｜從 GitHub 全新部署：最終驗收與 Roadmap

## 今天要完成什麼

最後一天不再加功能，而是用沒有本機快取的流程重新安裝，逐項證明 repository、bundle、Apps Script、資料庫、聊天、排程、工具與文章都能重現。

完成的標準不是作者電腦能跑，而是另一位使用者依 README 在合理時間內得到第一則成功回覆。

## 實作

從乾淨目錄開始：

```bash
git clone https://github.com/Wolke/gas-claw.git
cd gas-claw
npm ci
npm run check
npx clasp login
npx clasp create --type standalone --title gas-claw --rootDir dist
npm run build
npx clasp push
```

接著先以預設 Core manifest 在 Apps Script 設定 Properties、執行 `setupGasClaw()`、授權最低 scopes、部署 Web App，最後設定 LINE webhook。LINE-first Core 不需要標準 Cloud 專案，也不會在第一次安裝要求 Gmail restricted scope。

Core 驗收通過後才執行 `npm run build:full`，檢視新增的 Gmail、Calendar、Drive、Docs、Tasks 權限並重新授權，最後設定 `WORKSPACE_TOOLS_ENABLED=true`。若帳號政策封鎖 Full，Core 驗收仍可獨立成立，但不可把 Workspace 工具標成實機通過。

最低成功路徑是：

```text
幫助
新增任務：完成 gas-claw 驗收
列出任務
1 分鐘後提醒我驗收完成
```

再依序驗證 Calendar approval、Gmail draft、Drive／Docs 讀取與 Google Tasks approval。

## 驗證

最終 gate：TypeScript 無錯、所有測試通過、bundle 有六個 GAS entrypoints、30 篇文章全部超過最低長度且含固定驗證段落、GitHub Actions 綠燈、repository 無秘密。

實機方面，Apps Script 編輯器必須辨識入口；health endpoint 回 status ok；setup 建立五張表與單一 trigger；聊天訊息由 owner 成功處理；scheduler 能在電腦關閉時主動回報。

任何未能以真實憑證驗證的渠道都要在 release notes 明確標示，不用 mock 結果冒充 production success。

## 發布素材

- 聊天 Demo：從 clone、setup 到建立第一個任務，完整錄製三十分鐘驗收。
- 設計焦點：release checklist、已證實項目與殘餘限制分開呈現。
- 測試／失敗案例：全新帳號、空白 Sheets、OAuth 拒絕與重複部署皆納入。
- 當日 Git tag：`day-30`；完成後建立語意化版本 `v1.0.0`。

## 安全與限制

`gas-claw` 1.0 仍是單一 owner 個人版。它不支援多人 tenancy、LINE signature direct verification、任意 skill 安裝、shell、刪除與 Drive 分享修改。這些限制是安全設計的一部分。

Roadmap 可加入 Chat Cards、LINE postback、signature proxy、Firestore multi-user storage、完整 session summary、FreeBusy、多模型與評估資料集。但下一版仍應維持原則：模型負責理解與提案，程式負責權限與執行，人類保留高風險動作的最後決定。

三十天的成果不是一個「什麼都會」的 Agent，而是一隻能從熟悉聊天介面接受交辦、在 Google 生態系可靠工作、而且每一步都能被檢查的開源龍蝦。
