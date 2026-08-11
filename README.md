# gas-claw 🦞

因為沒錢買新 Mac，所以讓聊天式 AI 專案助理住進 Google Apps Script。

從 LINE 用自然語言交辦工作；Gemini 理解需求，gas-claw 管理任務、記憶與排程，透過受控工具操作 Google Workspace，並在高風險動作前要求核准。電腦關機後，Apps Script trigger 仍可主動提醒。

> Inspired by the chat-first agent experience popularized by OpenClaw. gas-claw is independent: it is not an OpenClaw port and does not claim compatibility.

## Capabilities

- LINE 一對一聊天、即時回覆與排程主動推播。
- Deterministic Chinese commands for tasks, reminders, preferences, help, and completion.
- Gemini JSON decision loop with a six-call ceiling and explicit tool registry.
- Gmail search/drafts/send approval, Calendar read/create/update, Drive search/folder, Docs read/create, and Google Tasks list/create/complete.
- Sheets-backed tasks, schedules, approvals, memory, and run summaries.
- Minute scheduler with lock, retry ceiling, daily/weekly recurrence, and source-channel delivery.
- Single-use approval state bound to its source channel and conversation.
- Six built-in project-management skills: daily brief, task manager, meeting coordinator, minutes-to-tasks, email follow-up, and weekly review.
- Thirty complete Traditional Chinese Ironman articles under [`articles/`](articles/README.md).

## Safety defaults

- One deployment, one owner; group conversations are rejected.
- Read and draft actions may run automatically.
- Write and send actions pause for approval.
- Delete, sharing changes, bulk mail, payments, and arbitrary code execution are unavailable.
- Unknown tools and missing parameters fail before Google APIs are called.
- Webhook events and approvals are deduplicated.
- Secret-like values are redacted from run summaries.
- Messages, mail, and documents are untrusted data and cannot change policy.

## Quick start

Requirements: Node.js 22+, a Google account, `clasp`, a Gemini Developer API key, and a LINE Messaging API channel.

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

Then authorize and run `setupGasClaw`, add Script Properties, and deploy the Web App. The one-time installation uses a standard Google Cloud project so the owner can explicitly authorize the complete Workspace tool set. Follow the complete [installation guide](docs/INSTALL.md).

Smoke test:

```text
幫助
新增任務：完成 gas-claw 安裝
列出任務
1 分鐘後提醒我安裝完成
```

## Development and verification

```bash
npm test          # Vitest
npm run typecheck # strict TypeScript
npm run build     # Apps Script bundle
npm run verify    # GAS entrypoints + all 30 articles
npm run check     # complete gate
```

See the dated [verification record](docs/VERIFICATION.md). Automated and Apps Script upload/discovery checks are complete. Live channel and Workspace-write checks require the deployer's OAuth consent and personal credentials; the record intentionally distinguishes those from mock evidence.

## Architecture

```text
LINE
        ↓
Channel adapter → owner + event dedup
        ↓
deterministic commands / Gemini decision
        ↓
skill catalog → tool registry → risk policy
        ↓              ↓
execute read/draft   pending approval
        ↓              ↓
Sheets state ← scheduler → channel reply/push
```

Read [architecture](docs/ARCHITECTURE.md) and [security](docs/SECURITY.md).

## LINE security limitation

Apps Script web apps do not expose arbitrary request headers to `doPost(e)`, so direct pure-GAS deployments cannot verify LINE's `X-Line-Signature`. This edition uses an unguessable webhook query token, a LINE owner ID allowlist, and event deduplication. Use a signature-verifying Cloud Run or Functions proxy for production/team deployments.

## Related project

[G8N Gemini Workflow Orchestrator](https://github.com/Wolke/G8N-Gemini-Workflow-Orchestrator) is a separate n8n-style visual workflow project. It shares neither runtime nor data formats with gas-claw.

## License

MIT © 2026 Wolke
