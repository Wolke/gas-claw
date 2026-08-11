# Security model

- Deploy one copy per owner; do not use this release as a multi-tenant service.
- Store secrets only in Script Properties.
- Keep the web app URL and LINE webhook token private.
- Read and draft operations may run automatically. Writes and sends require approval.
- Delete, sharing changes, bulk mail, payments, and arbitrary code execution are disabled.
- Treat messages, mail, and documents as untrusted content.
- Review Apps Script executions and the `Runs` sheet regularly.
- `uninstallGasClaw()` removes triggers and properties but deliberately retains the database for recovery.
