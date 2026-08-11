# Installation

This guide installs one private gas-claw copy for one Google account. Do not use this release as a shared multi-tenant bot.

## Choose a permission profile

- **Core (recommended):** LINE, Gemini, local tasks, memory and scheduler. It requests external requests, trigger management and one gas-claw Sheets database. This is the promotion-friendly default.
- **Full (optional):** Adds Gmail, Calendar, Drive, Docs, Sheets tools and Google Tasks. It requests sensitive or restricted Workspace scopes and can show Google's unverified-app warning for a personal script.

Start with Core. You can upgrade the same copy to Full later; Apps Script will ask for the additional permissions at that time.

## 1. Build Core and create the Apps Script project

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

If `clasp create` did not produce the intended file, copy `.clasp.json.example` to `.clasp.json`, insert the new script ID, and keep `rootDir` set to `dist`.

## 2. Authorize and initialize

Open the Apps Script project. Choose `setupGasClaw` from the function selector, run it, review the requested Google scopes, and allow access for your own script. A spreadsheet named `gas-claw database` and one minute trigger will be created.

The Core manifest requests external requests, trigger management and Sheets. It deliberately excludes Gmail, Calendar, Drive, Docs and Google Tasks. The LINE-first edition does not require users to create or attach a standard Google Cloud project.

Run setup a second time to verify it is idempotent: the database URL should remain the same and there should still be one scheduler trigger.

## 3. Configure Script Properties

Open **Project Settings → Script Properties**. Add only the channels you use:

| Property | Required | Description |
|---|---:|---|
| `GEMINI_API_KEY` | yes | Gemini Developer API key |
| `GEMINI_MODEL` | no | Default `gemini-2.5-flash` |
| `LINE_OWNER_ID` | yes | Allowed LINE user ID |
| `LINE_CHANNEL_ACCESS_TOKEN` | yes | Reply and push token |
| `LINE_WEBHOOK_TOKEN` | yes | At least 32 random bytes encoded as hex or base64url |
| `WORKSPACE_TOOLS_ENABLED` | no | Leave unset or `false` for Core; set `true` only after deploying Full |

Never put these values in source, Sheets, screenshots, articles, or GitHub Actions.

## 4. Create the LINE channel

In the LINE Developers Console, create a provider and a Messaging API channel. Disable automatic greeting and auto-response messages so they do not compete with gas-claw. Issue a channel access token and copy the bot's Basic ID.

Add the bot as a friend, send one direct message, and obtain your own LINE user ID from the webhook event or the Messaging API console. gas-claw deliberately accepts only `source.type: "user"`; groups and rooms are rejected.

## 5. Deploy the web app and register the webhook

Use **Deploy → New deployment → Web app**. Execute as yourself. LINE needs an endpoint it can reach; choose the audience supported by your account and keep the URL secret. Copy the `/exec` URL.

LINE webhook:

```text
https://script.google.com/macros/s/DEPLOYMENT_ID/exec?token=LINE_WEBHOOK_TOKEN
```

Paste the tokenized `/exec` URL into the LINE Messaging API webhook URL field, press **Verify**, then enable **Use webhook**. Apps Script does not expose LINE's signature header. This direct pure-GAS mode therefore uses the unguessable URL token plus owner allowlist. Rotate the URL token and redeploy if the webhook URL is exposed; use a signature-verifying proxy only if you later move beyond the personal single-owner threat model.

## 6. Smoke test

```text
幫助
新增任務：完成 gas-claw 安裝
列出任務
1 分鐘後提醒我安裝完成
```

Core should answer those deterministic commands without exposing Gmail, Calendar, Drive, Docs or Google Tasks tools to Gemini.

## 7. Optional Full Workspace profile

Review [`appsscript.full.json`](../appsscript.full.json), then build and push the opt-in manifest:

```bash
npm run build:full
npx clasp push
```

Refresh Apps Script, run `setupGasClaw` once, and review the additional Gmail, Calendar, Drive, Docs and Tasks permissions. Set `WORKSPACE_TOOLS_ENABLED=true` only after that authorization succeeds, then create a new web-app deployment version. The feature flag and Full manifest are both required; this prevents a Core installation from advertising tools it cannot execute.

Test one read tool and one approval-gated write:

```text
列出我明天的行程
把「驗收 gas-claw」加入 Google Tasks
```

The second request must remain pending until you reply with its approval command. If Google blocks the Full authorization rather than showing an unverified-app continuation, stay on Core; do not weaken account security settings merely to enable optional tools.

## Upgrade

```bash
git pull
npm ci
npm run check
npm run build
npx clasp push
```

Create a new deployment version after code changes. Keep the database spreadsheet and Script Properties.

## Uninstall

Run `uninstallGasClaw()`. It removes triggers and Script Properties but deliberately retains the database spreadsheet for recovery. Delete that spreadsheet manually only after confirming it is no longer needed.
