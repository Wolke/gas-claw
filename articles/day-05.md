# Day 5｜建立全新的 gas-claw repository

## 今天要完成什麼

`gas-claw` 不是舊 G8N 視覺工作流專案的下一版，而是一個全新的產品。今天建立獨立 repository、License、目錄與 CI，讓聊天式 Agent 不必背負 n8n clone 的資料格式與相容性。

分開 repository 的理由不是程式潔癖，而是產品中心完全不同。舊專案的核心物件是 node、edge 與 workflow；新專案的核心物件是 message、session、task、schedule、approval 與 skill。強行共用 schema 只會讓名稱相同、語意不同的抽象混在一起。

## 實作

建立專案後先放最少但完整的工程檔案：

```text
src/channels       聊天平台轉接
src/agent          命令解析與 Gemini agent loop
src/tools          Workspace 工具白名單
src/skills         六套專案管理技能
src/repositories   Sheets、Properties、Cache 狀態
src/scheduler      到期工作與主動訊息
src/security       owner、risk、redaction
src/setup          安裝與解除安裝
src/entrypoints    由 bundle shim 暴露給 GAS
tests              純邏輯與 mock 測試
articles           30 天正文
docs               架構、安全、安裝與驗收
```

初始化命令如下：

```bash
npm init
npm install -D typescript esbuild vitest @types/google-apps-script
git init -b main
```

License 選 MIT，讓讀者能複製、修改與商用，同時保留作者與免責文字。`.gitignore` 排除 `.clasp.json`，因為其中包含個人的 Apps Script project ID；也排除 `dist` 與任何 `.env`。

CI 使用 Node 22，依序執行 `npm ci`、`npm run check` 與秘密掃描。`main` 必須隨時能 build，開發工作則放在 `codex/` 前綴分支。

README 要在最前面說清楚三件事：這是單一 owner 個人助理、受 OpenClaw 體驗啟發但非移植、LINE 純 GAS 版無法驗證 signature header。限制寫得越早，後面越不會變成誤導式教學。

## 驗證

新 repository 的第一個 gate：

```bash
npm ci
npm run typecheck
npm test
npm run build
git grep -n "AIza"
```

GitHub Actions 也必須在乾淨 runner 通過，而不是依賴作者電腦已安裝的全域套件。最後檢查 repository 是 Public、預設分支為 `main`，License 能被 GitHub 正確辨識。

此外，舊 repository 不應出現任何新檔案或修改；新 README 只透過 Related project 連回舊專案。這證明兩者是兄弟產品，不是假裝相容的版本升級。

## 安全與限制

公開 repository 最常見的事故不是演算法，而是把 API Key、LINE access token 或 `.clasp.json` 推上去。除了 `.gitignore`，CI 還要用 pattern 掃描疑似 Gemini Key 與硬編碼 token。真正的秘密只存在每位部署者自己的 Script Properties。

Git 歷史一旦公開，就不能假設刪除檔案等於刪除秘密。若誤提交，正確順序是先撤銷／輪替 token，再清理歷史。下一篇會處理 TypeScript 如何可靠地變成 Apps Script 看得懂的程式。
