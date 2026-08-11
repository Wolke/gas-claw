# Verification record

Last updated: 2026-08-11 (Asia/Taipei)

## Automated evidence

Command: `npm run check`

- TypeScript strict typecheck: passed.
- Vitest: 70 tests passed across pure logic, the LINE Web App entrypoint, and a mocked Apps Script runtime.
- LINE webhook scenarios: wrong URL token, invalid payload, unsupported group event, missing channel token, valid direct reply, stable event ID, owner rejection, and persistent webhook deduplication.
- Runtime scenarios: task create/list/complete, reminders, memory update, and single-owner destination enforcement.
- Security scenarios: unknown tool rejection, risk approval classification, secret redaction, group rejection, generic malformed-JSON errors, and an injected Docs body that can affect reply text but cannot start a second tool decision.
- Scheduler scenarios: one-shot, daily and weekly recurrence, expired-lease recovery, and scheduled Agent execution after releasing the claim lock.
- Delivery idempotency: persistent webhook claims, LINE `X-Line-Retry-Key`, retry-key conflict, and ambiguous-failure reuse.
- Approval lifecycle: approve, reject, expire, conversation mismatch, duplicate approval, and at-most-once execution.
- Model mutation validation: task states, schedule destinations, recurrence, memory scopes, field lengths and tool input types.
- Conversation compaction: sessions over eight messages archive a redacted summary to a private Drive file and shrink the cache to three messages.
- Log minimization: document text, email bodies, tool payloads, sheet values and long strings are omitted or truncated before entering Runs.
- Gemini decision validation: malformed object and array shapes are rejected.
- Delivery safety: scheduled Agent output is checkpointed before LINE push, so retry does not repeat Agent work.
- Execution budget: after four minutes the Agent checkpoints completed results and remaining tool names into a one-minute continuation job instead of starting another tool.
- Bundle: built by esbuild without Google Chat code or scope.
- Artifact verifier: six Apps Script entrypoints detected.
- Article verifier: 30 article files, each over 1,400 characters with implementation, verification, publication material, safety, matching day tag, and next-day preview.

## Real Apps Script evidence

Test project: `gas-claw-e2e-20260811`

- `clasp create`: passed; standalone project created.
- `clasp push`: passed; Apps Script accepted the LINE-only manifest and bundle.
- Advanced Google Tasks service: accepted by Apps Script.
- Static entrypoint discovery: passed; the LINE-only build exposes `doGet`, `doPost`, `schedulerTick`, `setupGasClaw`, `configureGasClaw`, and `uninstallGasClaw`.
- The manifest no longer requests `chat.bot` or `chat.messages.create`; installation does not require a user-created standard Cloud project, Chat API, OAuth test-user list, or Chat App configuration.
- Deployment versions 11–13: created successfully; version 13 is the current audited `gas-claw 0.3.0 LINE-only` candidate with all Chat code removed from tools and scheduler.

## Awaiting owner authorization and LINE credentials

Apps Script must still ask the owner to authorize Gmail, Calendar, Drive, Docs, Sheets and Google Tasks because those are the product's Workspace capabilities. This is the ordinary authorization prompt for the owner's own script copy, not a separately configured OAuth consent application. The automation does not grant persistent access to private Workspace data on the owner's behalf.

Real LINE delivery additionally requires the owner's personal `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_OWNER_ID`, and a high-entropy `LINE_WEBHOOK_TOKEN`. These values must stay in Script Properties and must not be committed, printed in CI, or pasted into an article.

These items must not be reported as production-verified until the checklist below has evidence:

- [ ] `setupGasClaw()` completes and returns a database URL.
- [ ] `/exec` returns `{status:"ok", configured:true}`.
- [ ] LINE owner receives help, task creation, task listing and a scheduled push.
- [ ] A wrong webhook token and a non-owner LINE user produce no Workspace action.
- [ ] Calendar write remains absent before approval and appears once after approval.
- [ ] Gmail draft is created without sending; send occurs once after approval.
- [ ] Drive/Docs read works with a test document containing injection text.
- [ ] Google Tasks create occurs exactly once after approval.

## Known residual limitations

- Apps Script Web Apps do not expose LINE's `X-Line-Signature` header. The personal edition uses an unguessable webhook URL token, a LINE owner allowlist and persistent event deduplication; it is not a multi-tenant webhook gateway.
- Single owner only; LINE groups and rooms are rejected.
- Apps Script triggers are not second-precise.
- Sheets storage is appropriate for a personal assistant, not high-concurrency tenancy.
