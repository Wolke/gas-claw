# Security model

- Deploy one copy per owner; do not use this release as a multi-tenant service.
- Store secrets only in Script Properties.
- Keep the web app URL and LINE webhook token private.
- Read and draft operations may run automatically. Writes and sends require approval.
- Delete, sharing changes, bulk mail, payments, and arbitrary code execution are disabled.
- Treat messages, mail, and documents as untrusted content.
- Review Apps Script executions and the `Runs` sheet regularly.
- Runs keeps metadata and redacted summaries only; document text, email bodies, tool payloads and sheet values are omitted.
- `uninstallGasClaw()` removes triggers and properties but deliberately retains the database for recovery.

## Idempotency

- Every accepted chat event is claimed persistently in the Runs sheet under a channel/event key; CacheService remains only the fast path.
- Approval status changes under LockService make approved writes at-most-once.
- Scheduled LINE pushes checkpoint a per-delivery UUID and send it as `X-Line-Retry-Key`.
- A recurring job receives a fresh delivery UUID for every occurrence, while retries of one occurrence reuse the same UUID.
