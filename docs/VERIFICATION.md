# Verification record

Last updated: 2026-08-11 (Asia/Taipei)

## Automated evidence

Command: `npm run check`

- TypeScript strict typecheck: passed.
- Vitest: 31 tests passed across pure logic and a mocked Apps Script runtime.
- Runtime scenarios: owner rejection, task create/list/complete, webhook deduplication, reminders, memory update.
- Security scenarios: unknown tool rejection, risk approval classification, secret redaction, LINE group rejection.
- Scheduler scenarios: one-shot, daily and weekly recurrence.
- Gemini decision validation: malformed object and array shapes are rejected.
- Delivery safety: scheduled Agent output is checkpointed before channel push, so retry does not repeat Agent work.
- Bundle: built by esbuild.
- Artifact verifier: seven Apps Script entrypoints detected.
- Article verifier: 30 article files, each over 1,200 characters with implementation, verification, and safety sections.

## Real Apps Script evidence

Test project: `gas-claw-e2e-20260811`

- OAuth manifest uses `chat.messages.create` for the user-credential flow used by `ScriptApp.getOAuthToken()`. The earlier `chat.bot` scope was rejected with `invalid_scope` because Google supports it only for service-account app authentication.
- `clasp create`: passed; standalone project created.
- `clasp push`: passed; manifest and bundle accepted.
- Advanced Google Tasks service: visible in Apps Script editor.
- Static entrypoint discovery: passed after build shim fix; Apps Script function selector displays `doGet` and the other top-level handlers.
- Deployment versions 1–4: created successfully; version 4 contains the current `0.2.0` bundle.

## Awaiting account consent

The final live execution, database initialization, public `/exec` health response, Google Chat delivery, LINE delivery, and real Workspace write approval require the project owner to accept the Apps Script OAuth consent prompt and provide personal Gemini/LINE credentials. Automated browser attempts reached the consent prompt but did not accept it because granting persistent access requires explicit user confirmation. Before consent, the version 4 `/exec` endpoint correctly remains inaccessible with HTTP 403.

These items must not be reported as production-verified until the checklist below has evidence:

- [ ] `setupGasClaw()` completes and returns a database URL.
- [ ] `/exec` returns `{status:"ok", configured:true}`.
- [ ] Google Chat owner receives help and task responses.
- [ ] LINE owner receives reply and scheduled push.
- [ ] Calendar write remains absent before approval and appears once after approval.
- [ ] Gmail draft is created without sending; send occurs once after approval.
- [ ] Drive/Docs read works with a test document containing injection text.
- [ ] Google Tasks create occurs exactly once after approval.

## Known residual limitations

- Direct LINE-to-GAS deployment cannot inspect `X-Line-Signature`.
- Single owner only; group conversations are rejected.
- Apps Script triggers are not second-precise.
- Sheets storage is appropriate for a personal assistant, not high-concurrency tenancy.
