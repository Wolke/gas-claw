# Installation

This guide installs one private gas-claw copy for one Google account. Do not use this release as a shared multi-tenant bot.

## 1. Build and create the Apps Script project

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

## 2. Create and configure a standard Google Cloud project

Create one Google Cloud project for this personal gas-claw copy. In **Google Auth Platform**, configure the app name and support email, choose the External audience in Testing status, accept the Google API Services User Data Policy, and add your own Google account as a test user.

Enable these APIs in that project: Gmail, Google Calendar, Google Drive, Google Docs, Google Sheets and Google Tasks. Record the numeric project number. In Apps Script open **Project Settings → Google Cloud Platform Project → Change project**, enter that number, and confirm. Do this before the first successful authorization; switching projects later revokes prior grants.

This one-time setup is more involved than a low-permission script, but it makes the authorization boundary explicit and supports the series' core promise: one owner-controlled GAS assistant using the complete Google Workspace tool set. It does not require a continuously running server or a separate OAuth client secret.

## 3. Authorize and initialize

Open the Apps Script project. Choose `setupGasClaw` from the function selector, run it, review the requested Google scopes, and allow access for your own script. A spreadsheet named `gas-claw database` and one minute trigger will be created.

The manifest requests external requests, trigger management, Sheets, Gmail, Calendar, Drive, Docs and Google Tasks. Review every permission. The LINE-first edition does not request Google Chat scopes.

Run setup a second time to verify it is idempotent: the database URL should remain the same and there should still be one scheduler trigger.

## 4. Configure Script Properties

Open **Project Settings → Script Properties**. Add only the channels you use:

| Property | Required | Description |
|---|---:|---|
| `GEMINI_API_KEY` | yes | Gemini Developer API key |
| `GEMINI_MODEL` | no | Default `gemini-2.5-flash` |
| `LINE_OWNER_ID` | yes | Allowed LINE user ID |
| `LINE_CHANNEL_ACCESS_TOKEN` | yes | Reply and push token |
| `LINE_WEBHOOK_TOKEN` | yes | At least 32 random bytes encoded as hex or base64url |

Never put these values in source, Sheets, screenshots, articles, or GitHub Actions.

## 5. Create the LINE channel

In the LINE Developers Console, create a provider and a Messaging API channel. Disable automatic greeting and auto-response messages so they do not compete with gas-claw. Issue a channel access token and copy the bot's Basic ID.

Add the bot as a friend, send one direct message, and obtain your own LINE user ID from the webhook event or the Messaging API console. gas-claw deliberately accepts only `source.type: "user"`; groups and rooms are rejected.

## 6. Deploy the web app and register the webhook

Use **Deploy → New deployment → Web app**. Execute as yourself. LINE needs an endpoint it can reach; choose the audience supported by your account and keep the URL secret. Copy the `/exec` URL.

LINE webhook:

```text
https://script.google.com/macros/s/DEPLOYMENT_ID/exec?token=LINE_WEBHOOK_TOKEN
```

Paste the tokenized `/exec` URL into the LINE Messaging API webhook URL field, press **Verify**, then enable **Use webhook**. Apps Script does not expose LINE's signature header. This direct pure-GAS mode therefore uses the unguessable URL token plus owner allowlist. Rotate the URL token and redeploy if the webhook URL is exposed; use a signature-verifying proxy only if you later move beyond the personal single-owner threat model.

## 7. Smoke test

```text
幫助
新增任務：完成 gas-claw 安裝
列出任務
1 分鐘後提醒我安裝完成
```

Test one read tool and one approval-gated write:

```text
列出我明天的行程
把「驗收 gas-claw」加入 Google Tasks
```

The second request must remain pending until you reply with its approval command.

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
