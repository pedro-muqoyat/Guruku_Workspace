const { readFile } = require('node:fs/promises')
const path = require('node:path')
const { Client } = require('pg')
const { loadEnvConfig } = require('@next/env')
const { performance } = require('node:perf_hooks')

loadEnvConfig(process.cwd())

const databaseUrl = process.env.SUPABASE_DB_URL
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const migrationPath = path.join(
  process.cwd(),
  'supabase/migrations/202609300002_total_jp_dashboard_views.sql'
)

function fail(message, exitCode = 2) {
  console.error(message)
  process.exitCode = exitCode
}

async function main() {
  if (!databaseUrl || !supabaseUrl) {
    fail(
      'Set SUPABASE_DB_URL to the staging PostgreSQL connection string. This script does not fall back to anon or service-role keys.'
    )
    return
  }

  let databaseHost
  let expectedProjectRef
  try {
    databaseHost = new URL(databaseUrl).hostname
    expectedProjectRef = new URL(supabaseUrl).hostname.split('.')[0]
  } catch {
    fail('Database or Supabase URL is invalid.')
    return
  }

  const confirmedProjectRef = process.env.SUPABASE_DB_PROJECT_REF
  if (
    !databaseHost.includes(expectedProjectRef) &&
    confirmedProjectRef !== expectedProjectRef
  ) {
    fail(
      'Database host does not identify the configured Supabase project. Set SUPABASE_DB_PROJECT_REF only after confirming the pooler target.'
    )
    return
  }

  const migrationSql = await readFile(migrationPath, 'utf8')
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: true },
    connectionTimeoutMillis: 10000,
    application_name: 'guruku-dashboard-migration-validation',
  })

  const startedAt = performance.now()
  try {
    await client.connect()
    await client.query(migrationSql)

    const columnsResult = await client.query(
      `SELECT table_name, column_name, data_type, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND (table_name, column_name) IN (
           ('schedules', 'total_jp'),
           ('class_sessions', 'total_jp')
         )
       ORDER BY table_name`
    )
    const verifiedColumns = new Set(
      columnsResult.rows.map((row) => `${row.table_name}.${row.column_name}`)
    )

    const viewsResult = await client.query(
      `SELECT schemaname, matviewname
       FROM pg_matviews
       WHERE schemaname = 'private'
         AND matviewname = 'mv_teacher_daily_attendance'`
    )

    const cronResult = await client.query(
      `SELECT jobname, schedule
       FROM cron.job
       WHERE jobname = 'refresh-teacher-daily-attendance'`
    )

    const passed =
      verifiedColumns.has('schedules.total_jp') &&
      verifiedColumns.has('class_sessions.total_jp') &&
      viewsResult.rowCount === 1 &&
      cronResult.rowCount === 1

    console.log('PostgreSQL migration validation', {
      status: passed ? '200 OK' : 'FAILED',
      columns: Array.from(verifiedColumns),
      teacherDailyViewCreated: viewsResult.rowCount === 1,
      teacherRefreshCronCreated: cronResult.rowCount === 1,
      responseMs: Number((performance.now() - startedAt).toFixed(1)),
    })

    if (!passed) process.exitCode = 1
  } catch (error) {
    const databaseError = error instanceof Error ? error : new Error('Unknown database error.')
    console.error('PostgreSQL migration validation failed.', {
      code: 'code' in databaseError ? databaseError.code : undefined,
      message: databaseError.message,
      responseMs: Number((performance.now() - startedAt).toFixed(1)),
    })
    process.exitCode = 1
  } finally {
    await client.end().catch(() => undefined)
  }
}

main().catch(() => {
  fail('Migration runner failed before connecting to PostgreSQL.', 1)
})