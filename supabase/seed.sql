-- E2E fixture rows are provisioned by scripts/setup-e2e.js after Supabase Auth
-- creates the test identity. Keep reset-time seed SQL free of GoTrue and E2E data.
-- supabase/seed.sql
-- Entry point tunggal yang memanggil modul seed secara sekuensial
\ir seed/01_roles_permissions.sql
\ir seed/02_academic_periods.sql
\ir seed/03_dummy_users.sql
\ir seed/04_dummy_schedules.sql