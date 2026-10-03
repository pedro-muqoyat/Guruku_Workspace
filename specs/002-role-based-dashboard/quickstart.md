# Quickstart: Role-Based Dashboard Validation

This guide is the implementation acceptance path. It assumes the planned migrations, role fixtures, and role-matrix E2E script have been added; it does not imply those artifacts already exist.

## Prerequisites

- Docker and the Supabase CLI are available; local Supabase services are running.
- `.env.local` contains local Supabase URL, anon/publishable key, service key for fixture provisioning only, database URL, and E2E credentials for each tested staff role plus MURID.
- The canonical academic-period/assessment model and validated teacher-status source are available to seed fixtures.

## Reset and Provision

```sh
supabase db reset
node scripts/setup-e2e.js
```

Expected: migrations apply cleanly; fixtures include multiple teachers/classes, all status states, a Walikelas assignment plus an unassigned class, multiple Guru schedules, daily attendance/score data, and two comparable academic periods. Setup reports no service or migration errors.

## Static and Database Validation

```sh
npx tsc --noEmit
npm run build
supabase test db
```

Expected: typecheck and production build pass; pgTAP proves the allowed and denied RPC/RLS matrix, especially that TU cannot directly read student tables while its macro RPC succeeds.

## Authenticated E2E Validation

Start the app in one terminal:

```sh
npm run dev
```

Then run the existing dashboard RPC E2E plus its planned role-matrix expansion:

```sh
E2E_BASE_URL=http://127.0.0.1:3000 node test-dashboard-rpc.js
node scripts/test-dashboard-role-matrix.js
```

Expected: ADMIN/WAKA/TU receive only macro DTOs; TU receives no student data; Walikelas sees all and only assigned classes; Guru sees all and only assigned schedule/subject data; MURID and unknown roles receive 403; malformed payloads return 400; query failures return a safe 500 without throwing or exposing SQL details.

## Browser, Mobile, and Accessibility Checks

Verify role views at 320, 390, 768, 1024, and 1440 pixel widths. Confirm the document has no horizontal overflow, 5+ column tables scroll only in their own container, and the identity column remains sticky. Keyboard-scroll the table container; with a screen reader, confirm list items, table row/column headers, status names, trend names, empty states, and error states are announced. Inspect initial HTML/hydration for `LocalTime`: the initial output must be stable, timezone formatting must use the configured school timezone, and its update must not shift surrounding layout.

Record first-shell timing, each widget completion time, and CLS for fallback-to-content replacement. The shell must not wait for widget queries; do not report literal 0 ms. The target for widget replacement CLS is 0.00; investigate any measured shift before acceptance.