# gas-claw 🦞

因為沒錢買新 Mac，所以讓一隻聊天式 AI 專案助理住進 Google Apps Script。

Send work requests from Google Chat or LINE. Gemini interprets them, manages tasks and schedules, uses Google Workspace tools, asks before risky actions, and reports back without a computer running at home.

> Inspired by the chat-first agent experience popularized by OpenClaw. This project is independent and is not an OpenClaw port or compatible implementation.

## Current status

`0.1.0` is an early scaffold. It includes channel normalization, a Gemini JSON decision loop, owner enforcement, webhook deduplication, Sheets-backed repositories, a minute scheduler, and initial Gmail, Calendar, Drive, Docs, and Google Tasks tools. Approval persistence exists; interactive approval execution and several production-hardening items remain on the roadmap.

## Quick start

Requirements: Node.js 22, a Google account, `clasp`, a Gemini API key, and optionally a LINE Messaging API channel.

```bash
npm install
npm run check
npx clasp login
npx clasp create --type standalone --title gas-claw
cp .clasp.json.example .clasp.json
# Put the scriptId returned by clasp into .clasp.json
npm run build
npx clasp push
```

In Apps Script Project Settings, select a standard Google Cloud project and enable the Google Tasks advanced service. Run `setupGasClaw()` once and authorize the requested scopes.

Set these Script Properties:

| Property | Required | Purpose |
|---|---:|---|
| `GEMINI_API_KEY` | yes | Gemini Developer API |
| `GEMINI_MODEL` | no | Defaults to `gemini-2.5-flash` |
| `GOOGLE_CHAT_OWNER_ID` | for Chat | Allowed `users/...` identifier |
| `LINE_OWNER_ID` | for LINE | Allowed LINE user ID |
| `LINE_CHANNEL_ACCESS_TOKEN` | for LINE | Reply and push messages |
| `LINE_WEBHOOK_TOKEN` | for LINE | Random secret in webhook URL |

Deploy as a web app executing as yourself. For LINE, configure the webhook as:

```text
https://script.google.com/macros/s/DEPLOYMENT_ID/exec?token=LONG_RANDOM_VALUE
```

See [architecture](docs/ARCHITECTURE.md) and [security](docs/SECURITY.md), especially the documented LINE signature limitation.

## Safety defaults

- Single-owner allowlist.
- Read and draft tools can execute automatically.
- External writes and sends become pending approvals.
- Delete/share tools and arbitrary code execution are disabled.
- Secrets are redacted from run summaries.
- Webhook events are deduplicated.

## Development

```bash
npm test
npm run build
```

## Ironman series

The proposed 30-day Build on Google AI project-management track is in [articles/README.md](articles/README.md).

## Related project

[G8N Gemini Workflow Orchestrator](https://github.com/Wolke/G8N-Gemini-Workflow-Orchestrator) is a separate n8n-style visual workflow project. It does not share runtime or data formats with gas-claw.

## License

MIT
