# Quickstart: Validate Guruku Academic Operations

## Prerequisites

- Node.js version compatible with the existing Next.js 16 project.
- Supabase CLI and Docker for local PostgreSQL/Auth development.
- Environment values for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. No service-role key is required for normal application actions.
- Approved school master-data and export templates for integration checks.

## Local Setup

1. Install application dependencies after the implementation adds Supabase SSR, Zod, SheetJS, and test tooling:

   ```sh
   npm install
   ```

2. Start Supabase local services and apply schema migrations:

   ```sh
   supabase start
   supabase db reset
   ```

3. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the ignored local environment file, then start Next.js:

   ```sh
   npm run dev
   ```

## Required Validation

1. **Schema and RLS**: Run `supabase test db`. All exposed tables must deny anonymous access; role/assignment allow and deny cases must pass.
2. **Database integrity**: Verify schedule overlap rejection for insert/update and for simultaneous writes; verify adjacent non-overlapping slots are accepted. Confirm Waka can submit a schedule proposal but cannot mutate a schedule row, and only Administrator can publish an approved non-conflicting proposal.
3. **Attendance alerts**: Create three consecutive Alpa attendance records for a student in scheduled class sessions and verify one scoped notification. Correct one record and verify notification reconciliation plus retained audit history.
4. **Grade rules**: Verify Formatif 35%, Kehadiran 25%, and Sumatif 40%; configure Sumatif/STS/SAS subweights totalling 40%; verify rejected invalid totals, policy version history, and Siswa Atlet full attendance contribution with physical attendance still recorded.
5. **Role journeys**: Use Playwright accounts for all five roles. Verify teachers are assignment-scoped, Walikelas is class-scoped, Waka can read school-wide operational analytics but cannot mutate academic records, and TU can read only validated teacher-attendance aggregates.
6. **Bulk import**: Import a workbook with 1,000 assessment rows. Confirm browser-only file parsing, ten or more serial chunks of at most 100 rows, payload size below 1 MB, no timeout, accurate partial error reporting, idempotent retry, and continued responsiveness of another active user.
7. **Exports**: Compare e-Rapor and TU attendance workbook rows to the approved school templates and source records; verify duplicate rows and out-of-scope records are absent.
8. **Build and browser regression**: Run the configured unit test, end-to-end test, lint, and production build commands. Confirm academic pages render from Server Components and client bundles are limited to interactive islands.

## Expected Result

The database test suite passes, all five role journeys enforce server and RLS boundaries, schedule/attendance triggers behave transactionally, and a 1,000-row import/export cycle completes without timeout, duplicate writes, or unreported rejected rows.