# Verification record

Last updated: 2026-08-11 (Asia/Taipei)

## Automated evidence

Command: `npm run check`

- TypeScript strict typecheck: passed.
- Vitest: 70 tests passed across pure logic and a mocked Apps Script runtime.
- Runtime scenarios: owner rejection, task create/list/complete, webhook deduplication, reminders, memory update.
- Security scenarios: unknown tool rejection, risk approval classification, secret redaction, constant-time LINE signature comparison, LINE group rejection, and an injected Docs body that can affect reply text but cannot start a second tool decision.
- Scheduler scenarios: one-shot, daily and weekly recurrence, expired-lease recovery, and scheduled Agent execution after releasing the claim lock.
- Delivery idempotency: persistent webhook claims, LINE `X-Line-Retry-Key`, Google Chat `requestId`, retry-key conflict, and ambiguous-failure reuse.
- Approval lifecycle: approve, reject, expire, source mismatch and duplicate approval.
- Model mutation validation: task states, schedule destinations, recurrence, memory scopes, field lengths and tool input types.
- Conversation compaction: sessions over eight messages archive a redacted summary to a private Drive file and shrink the cache to three messages.
- Log minimization: document text, email bodies, tool payloads, sheet values and long strings are omitted or truncated before entering Runs.
- Gemini decision validation: malformed object and array shapes are rejected.
- Delivery safety: scheduled Agent output is checkpointed before channel push, so retry does not repeat Agent work.
- Execution budget: after four minutes the Agent checkpoints completed results and remaining tool names into a one-minute continuation job instead of starting another tool.
- Bundle: built by esbuild.
- Artifact verifier: seven Apps Script entrypoints detected.
- Article verifier: 30 article files, each over 1,400 characters with implementation, verification, publication material, safety, matching day tag, and next-day preview.

## Real Apps Script evidence

Test project: `gas-claw-e2e-20260811`

- OAuth manifest uses `chat.messages.create` for the user-credential flow used by `ScriptApp.getOAuthToken()`. The earlier `chat.bot` scope was rejected with `invalid_scope` because Google supports it only for service-account app authentication.
- Manifest scope audit includes the explicit `documents` scope required by `DocumentApp.create` and `DocumentApp.openById`; Drive scope alone is not treated as proof of Docs authorization.
- `clasp create`: passed; standalone project created.
- `clasp push`: passed; manifest and bundle accepted.
- Advanced Google Tasks service: visible in Apps Script editor.
- Static entrypoint discovery: passed after build shim fix; Apps Script function selector displays `doGet` and the other top-level handlers.
- Deployment versions 1–9: created successfully; version 9 contains the current audited `0.2.0` bundle, complete Workspace scope set, scheduler leases, execution checkpoints and log minimization.

## Awaiting account consent

The final live execution, database initialization, public `/exec` health response, Google Chat delivery, LINE delivery, and real Workspace write approval require the project owner to accept the Apps Script OAuth consent prompt and provide personal Gemini/LINE credentials. Automated browser attempts reached the corrected consent prompt but did not accept it because granting persistent access requires explicit user confirmation. Before consent, the version 9 `/exec` endpoint correctly remains inaccessible with HTTP 403. Apps Script Execution API cannot remove this handoff: Google requires a shared standard Cloud project and an OAuth token covering every script scope.

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
