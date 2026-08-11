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

## 2. Attach a standard Google Cloud project

Google Chat configuration and the Google Tasks advanced service need a **standard** Google Cloud project. Do this before the first Apps Script authorization:

1. Create a Google Cloud project and note its numeric **project number** (not the project ID).
2. In that project, enable **Google Chat API** and **Google Tasks API**.
3. Configure the OAuth consent screen. For a personal Google account choose the external audience, add yourself as a test user when Google requests it, and review every requested scope. Workspace administrators may restrict the audience or scopes.
4. In Apps Script open **Project Settings → Google Cloud Platform (GCP) Project → Change project**, enter the project number, and confirm.

Apps Script refuses to attach a standard project until its OAuth consent screen is configured. Changing the attached project also revokes authorizations issued through the former project, so attach it before running setup. You do not need to create an OAuth client ID for the Apps Script web app itself.

## 3. Authorize and initialize

Open the Apps Script project. Choose `setupGasClaw` from the function selector, run it, review the requested Google scopes, and allow access for your own script. A spreadsheet named `gas-claw database` and one minute trigger will be created.

The explicit manifest scopes cover external requests, triggers, Sheets, Gmail, Calendar, Drive, Docs, Google Tasks, and user-authenticated Google Chat message creation. Do not replace `chat.messages.create` with `chat.bot`: the latter only supports service-account app authentication and causes `invalid_scope` in this user OAuth flow.

Run setup a second time to verify it is idempotent: the database URL should remain the same and there should still be one scheduler trigger.

## 4. Configure Script Properties

Open **Project Settings → Script Properties**. Add only the channels you use:

| Property | Required | Description |
|---|---:|---|
| `GEMINI_API_KEY` | yes | Gemini Developer API key |
| `GEMINI_MODEL` | no | Default `gemini-2.5-flash` |
| `GOOGLE_CHAT_OWNER_ID` | Chat | Allowed Google Chat `users/...` ID |
| `GOOGLE_CHAT_WEBHOOK_TOKEN` | HTTP Chat | Long random URL token |
| `LINE_OWNER_ID` | LINE | Allowed LINE user ID |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE | Reply and push token |
| `LINE_WEBHOOK_TOKEN` | LINE | Long random URL token |

Never put these values in source, Sheets, screenshots, articles, or GitHub Actions.

## 5. Deploy the web app

Use **Deploy → New deployment → Web app**. Execute as yourself. LINE needs an endpoint it can reach; choose the audience supported by your account and keep the URL secret. Copy the `/exec` URL.

LINE webhook:

```text
https://script.google.com/macros/s/DEPLOYMENT_ID/exec?token=LINE_WEBHOOK_TOKEN
```

Apps Script does not expose LINE's signature header. This direct pure-GAS mode therefore uses the URL token plus owner allowlist. Put a signature-verifying proxy in front of GAS for production or team use.

## 6. Google Chat

In the standard Google Cloud project, open **Google Chat API → Configuration** and configure the Chat app:

- Enable interactive features.
- Select **Apps Script** as the connection setting and enter the Apps Script deployment ID.
- Allow direct messages; the first release deliberately rejects spaces and group messages.
- Limit visibility to your own account while testing.

Save the configuration, add the app to a direct message, and set `GOOGLE_CHAT_OWNER_ID` to the sender resource name (`users/...`) shown in a test event. The Apps Script handler is `onMessage`.

## 7. Smoke test

```text
幫助
新增任務：完成 gas-claw 安裝
列出任務
1 分鐘後提醒我安裝完成
```

Then test one read tool and one approval-gated write:

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
