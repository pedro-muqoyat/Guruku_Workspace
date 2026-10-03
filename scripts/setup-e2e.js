// 1. Injeksi Environment Absolut di Lapisan Teratas
const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());

const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
const fixtures = require('./e2e-fixtures');

/**
 * Validasi URL untuk memastikan eksekusi tidak membocorkan kredensial ke server produksi.
 * @param {string} value 
 * @param {string} name 
 * @returns {URL}
 */
function requireLocalUrl(value, name) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`[FAIL-FAST] ${name} hilang atau tidak valid.`);
  }

  if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
    throw new Error(`[SECURITY BREACH] ${name} WAJIB diarahkan ke localhost.`);
  }

  return url;
}

/**
 * Idempotent Auth Provisioning via Supabase Admin API
 */
async function ensureAuthUser(admin, email, password) {
  // Percobaan pembuatan pengguna baru (Cold Start)
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fixtures.fullName },
  });

  if (!error && data?.user) return data.user;

  // Fallback Idempotency: Jika pengguna sudah ada (Warm Start)
  const { data: listedUsers, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    throw new Error(`Admin provisioning gagal (${error?.code ?? 'UNKNOWN'}); Resolusi list gagal (${listError.code}).`);
  }

  const existingUser = listedUsers.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (!existingUser) {
    throw new Error(`Kredensial E2E tidak ditemukan di mesin GoTrue (${error?.code ?? 'UNKNOWN'}).`);
  }

  // Pembaruan kredensial paksa untuk memastikan state bersih
  const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(
    existingUser.id,
    {
      password,
      email_confirm: true,
      user_metadata: { full_name: fixtures.fullName },
    }
  );

  if (updateError || !updated?.user) {
    throw new Error(`Gagal mereset pengguna Auth E2E (${updateError?.code ?? 'UNKNOWN'}).`);
  }

  return updated.user;
}

/**
 * Generic Upsert untuk Isolasi Logika Relasional
 */
async function upsert(admin, table, values, onConflict = 'id') {
  const { error } = await admin.from(table).upsert(values, { onConflict });
  if (error) {
    throw new Error(`Kegagalan injeksi [${table}]: SQLSTATE ${error.code} - ${error.message}`);
  }
}

/**
 * Runner Infrastruktur Utama
 */
async function main() {
  // Injeksi Kredensial Level Fungsi untuk mencegah kebocoran memori awal
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  const studentEmail = process.env.E2E_STUDENT_EMAIL;
  const studentPassword = process.env.E2E_STUDENT_PASSWORD;
  const databaseUrl = process.env.SUPABASE_DB_URL;

  if (!supabaseUrl || !serviceRoleKey || !email || !password || !databaseUrl) {
    throw new Error(
      '[FATAL] Kredensial lingkungan (ENV) tidak lengkap. Hentikan eksekusi CI/CD.'
    );
  }

  // Audit Keamanan: Pastikan URL menunjuk ke ekosistem lokal
  requireLocalUrl(supabaseUrl, 'NEXT_PUBLIC_SUPABASE_URL');
  requireLocalUrl(databaseUrl, 'SUPABASE_DB_URL');

  // Inisialisasi Admin Client (Service Role Bypass)
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  console.log('[-] Memulai injeksi identitas GoTrue...');
  const authUser = await ensureAuthUser(admin, email, password);

  const studentAuthUser = studentEmail && studentPassword
    ? await ensureAuthUser(admin, studentEmail, studentPassword)
    : null;

  // Optimasi O(1) Date Parsing (Menghindari Intl.DateTimeFormat overhead)
  const dateObj = new Date();
  const currentDate = dateObj.toJSON().slice(0, 10); // Format YYYY-MM-DD absolut
  const weekday = dateObj.getDay(); // Rentang native 0-6

  console.log('[-] Menulis relasi PostgreSQL...');
  // Eksekusi data secara berurutan untuk mematuhi aturan Foreign Key
  await upsert(admin, 'classes', {
    id: fixtures.classId,
    name: fixtures.className,
  });
  await upsert(admin, 'subjects', {
    id: fixtures.subjectId,
    name: fixtures.subjectName,
  });
  await upsert(admin, 'user_profiles', {
    id: authUser.id,
    full_name: fixtures.fullName,
    role: fixtures.role,
  });
  await upsert(admin, 'schedules', {
    id: fixtures.scheduleId,
    class_id: fixtures.classId,
    guru_id: authUser.id,
    subject_id: fixtures.subjectId,
    day_of_week: weekday,
    start_time: '08:00:00',
    end_time: '10:00:00',
    total_jp: 2,
  });
  await upsert(admin, 'students', {
    id: fixtures.studentId,
    class_id: fixtures.classId,
    status_siswa: 'Reguler',
  });

  if (studentAuthUser) {
    await upsert(admin, 'user_profiles', {
      id: studentAuthUser.id,
      full_name: 'Siswa E2E Lokal',
      role: 'MURID',
    });

    await upsert(admin, 'students', {
      id: studentAuthUser.id,
      class_id: fixtures.classId,
      status_siswa: 'Reguler',
    });
  }

  await upsert(admin, 'class_sessions', {
    id: fixtures.sessionId,
    schedule_id: fixtures.scheduleId,
    state: 'completed',
    session_date: currentDate,
    total_jp: 2,
    created_at: dateObj.toISOString(),
  });
  await upsert(
    admin,
    'student_grades',
    {
      id: fixtures.gradeId,
      student_id: fixtures.studentId,
      subject_id: fixtures.subjectId,
      grade_type: 'FORMATIF',
      task_name: 'Nilai E2E Lokal',
      score: 95,
      created_at: dateObj.toISOString(),
    },
    'student_id,subject_id,grade_type,task_name'
  );

  console.log('[-] Menyegarkan Materialized Views (Concurrent I/O)...');
  const database = new Client({
    connectionString: databaseUrl,
    ssl: false,
    connectionTimeoutMillis: 5000,
    application_name: 'guruku-local-e2e-fixture-setup',
  });

  try {
    await database.connect();
    // Paralelisasi I/O untuk mencegah bottleneck
    await Promise.all([
      database.query('REFRESH MATERIALIZED VIEW CONCURRENTLY private.mv_daily_student_rankings'),
      database.query('REFRESH MATERIALIZED VIEW CONCURRENTLY private.mv_teacher_daily_attendance')
    ]);
  } finally {
    await database.end().catch(() => undefined);
  }

  console.log('[✔] Setup Fixture E2E Berhasil.', {
    teacherRole: fixtures.role,
    teacherUserId: authUser.id,
    studentUserId: studentAuthUser ? studentAuthUser.id : null,
    materializedViewsRefreshed: true,
  });
}

// Fail-fast process termination
main().catch((error) => {
  console.error('[X] Setup Fixture E2E Gagal.', {
    message: error instanceof Error ? error.message : 'Unknown setup error.',
  });
  process.exit(1);
});