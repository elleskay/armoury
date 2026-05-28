# Armoury roadmap

Spec lives at `apps/web/specs/armoury.yml`. Coverage gate at `apps/web/spec-coverage.md`.

## Current state

- 126 spec requirements (up from 94, reflecting the full original brief)
- ~80 currently covered by tests (~63%)
- Real production deployment on AWS Lambda + CloudFront (`ap-southeast-1`)
- DB migrations now applied as part of deploy.yml

## Honest gap analysis

### Covered with real behavior tests (~70 IDs)
Auth, RBAC, team scoping, template CRUD (create/edit/archive/pause/resume), 5 item kinds (boolean/text/number/dropdown/date_time), submission flow with scoring, issue auto-create + standalone + resolve, dashboard cards + chart, sidebar navigation, theme toggle, em-dash style rule, drafts via localStorage, search, select-all, past checks, skip/unskip checks, network error toast.

### Covered by schema/property-only tests (~12 IDs, "shallow")
- ARM-INVENTORY-001..005 (Pulse) - data model only, no UI
- ARM-PHOTO-001..003 (photo + PDF) - file input + enum, no real upload
- ARM-EMAIL-001/002 - endpoint exists, no actual Resend dispatch
- ARM-EXPORT-001/002 - JSON download, not real ZIP archive
- ARM-AUDIT-001 - only template.archive writes audit; other actions don't
- ARM-ISSUES-010 - webhook code in place, no integration test
- ARM-TEMPLATES-009 / ARM-DASHBOARD-010 - snapshot columns exist, no submission-detail render verifies

These should be replaced with end-to-end tests that prove the feature works under load.

### Not yet built (~32 IDs from brief I expanded the spec to capture)
- **Roles**: Logs IC, Team Admin, HQ/Divisional Lead (3 reqs)
- **Notifications**: Telegram, Logs-IC routing, shift-aware reminders (3 reqs)
- **Invites**: invite codes, TTL, mobile copy, redemption (4 reqs)
- **Checklist variants**: HOTO, vehicle parade, EMS hazmat, MRT shelter (4 reqs)
- **Photo**: real upload + storage + PDF embed (3 reqs)
- **Email**: actual Resend dispatch + content (2 reqs)
- **Export**: real ZIP archive + photo binaries (2 reqs)
- **ILMS**: integration job + failure alerting (2 reqs)
- **Audit**: comprehensive coverage + diff payloads + immutability (3 reqs)
- **Compliance**: rate widget, non-compliant flagging (2 reqs)
- **UX**: error banner, forced-refresh banner, submission-detail tabs, condensed view (4 reqs)

## Sequenced plan to 100%

**Phase 1: Stabilise current 94** (~1 session)
- Fix 3 flaky locator tests (in flight)
- Ensure CI green at 80+/94 baseline

**Phase 2: Audit + Compliance + UX** (~2 sessions)
- ARM-AUDIT-001/002/003: extend audit writes to every admin action, add diff payloads, immutability test
- ARM-COMPLIANCE-001/002: dashboard widget + per-template highlight
- ARM-UX-001/002/003/004: error banner, version-check banner, submission-detail tabs, condensed-view toggle

**Phase 3: Replace shallow with real** (~2 sessions)
- ARM-ISSUES-010 webhook integration test (run a mock HTTP listener)
- ARM-PHOTO-001/002/003: real file upload via S3 or DB blob + image rendering in submission detail
- ARM-EXPORT-001/002: real ZIP archive (jszip)
- ARM-EMAIL-001/002: real Resend dispatch (gated on RESEND_API_KEY in env)

**Phase 4: Roles + Invites + Notifications** (~3 sessions)
- Add roles enum entries (logs_ic, team_admin, hq) + auth.config branches
- Build invite code system (table + UI + redemption)
- Telegram bot integration via tg API + chat ID column on teams

**Phase 5: Checklist variants** (~2 sessions)
- HOTO with shift-transition fields
- Vehicle parade with vehicle-bound history view
- EMS hazmat + MRT shelter as seeded variants

**Phase 6: ILMS + Pulse UI** (~3-5 sessions)
- /admin/inventory pages: items list, transaction history, adjust/stock-take flows
- Scheduled reconcile job hitting a configurable upstream URL
- Failure-to-issue mapping

**Total realistic timeline: 12-15 focused sessions.**

## Style and process constraints

- No em-dashes in any committed artifact (chat, code, docs, UI strings, commit messages)
- No mention of target employers or their products in public repos / commits / docs
- Every admin server action must write an audit_logs entry (ARM-AUDIT-001)
- Every schema change must include a migration committed to db/migrations/, applied via deploy.yml
- Every spec entry must have at least one passing test before merge once the gate flips to strict
