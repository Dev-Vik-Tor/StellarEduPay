# Write API Specification Documentation

Closes #231

## Summary

`docs/api-spec.md` had a partial, inconsistently formatted draft with duplicated sections and missing entire route groups. This PR rewrites it as a complete, accurate API reference derived directly from the route files.

## Changes

### Modified Files

| File | Description |
| ---- | ----------- |
| [`docs/api-spec.md`](docs/api-spec.md) | Full rewrite — all endpoints, request/response schemas, error codes |

## What's Documented

- Schools — 5 endpoints (CRUD + deactivate)
- Students — 8 endpoints including bulk import, payment summary, overdue list; query params for pagination and filtering
- Fee Structures — 4 endpoints
- Payments — 22 endpoints covering instructions, intent, verify, submit, sync, finalize, history, balance, assets, limits, rates, overpayments, suspicious, pending, retry queue, DLQ, receipt, SSE stream, lock/unlock
- Reports — JSON and CSV report with query parameters, dashboard summary
- Disputes — flag, list, get, resolve
- Reminders — trigger, preview, opt-out (all admin-only)
- Retry Queue — stats, health, job management, pause/resume, manual queue
- Health check
- Full error code reference table (17 codes with HTTP status and description)
- Authentication, school context, and idempotency sections

## Acceptance Criteria

- [x] All endpoints documented with request/response examples
- [x] Error cases documented for each endpoint
- [x] Document is accurate and matches the actual implementation
