import { Suspense } from 'react'

import { ClassProgressTable } from '@/app/components/dashboard/ClassProgressTable'
import { TableSkeleton } from '@/app/components/dashboard/TableSkeleton'
import { TeacherAttendanceTable } from '@/app/components/dashboard/TeacherAttendanceTable'
import { TopStudentsTable } from '@/app/components/dashboard/TopStudentsTable'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const homeroomRoles = ['WALI', 'WALIKELAS', 'WALI_KELAS']

function DashboardMessage({ title, message }: { title: string; message: string }) {
  return (
    <section aria-live="polite" className="rounded-xl border bg-card p-6" role="status">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </section>
  )
}

async function DashboardRoleFactory() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return (
      <DashboardMessage
        title="Authentication required"
        message="Sign in to view dashboard data."
      />
    )
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile?.role) {
    return (
      <DashboardMessage
        title="Akses Ditolak"
        message="Peran akun tidak dapat diverifikasi."
      />
    )
  }

  const role = profile.role.toUpperCase()

  if (role === 'TU' || role === 'ADMIN') {
    return (
      <div className="space-y-6">
        <Suspense fallback={<TableSkeleton />}>
          <TeacherAttendanceTable />
        </Suspense>
      </div>
    )
  }

  if (role === 'GURU') {
    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .select('class_id, subject_id')
      .eq('guru_id', user.id)
      .limit(1)
      .maybeSingle()

    if (scheduleError) {
      return (
        <DashboardMessage
          title="Data Tidak Tersedia"
          message="Jadwal mengajar tidak dapat dimuat."
        />
      )
    }

    return (
      <div className="space-y-6">
        <Suspense fallback={<TableSkeleton />}>
          <TeacherAttendanceTable />
        </Suspense>
        {schedule?.class_id ? (
          <Suspense fallback={<TableSkeleton />}>
            <ClassProgressTable classId={schedule.class_id} />
          </Suspense>
        ) : null}
        {schedule?.subject_id ? (
          <Suspense fallback={<TableSkeleton />}>
            <TopStudentsTable subjectId={schedule.subject_id} />
          </Suspense>
        ) : null}
      </div>
    )
  }

  if (homeroomRoles.includes(role)) {
    const { data: assignment, error: assignmentError } = await supabase
      .from('user_roles')
      .select('class_id')
      .eq('user_id', user.id)
      .not('class_id', 'is', null)
      .limit(1)
      .maybeSingle()

    if (assignmentError) {
      return (
        <DashboardMessage
          title="Data Tidak Tersedia"
          message="Penugasan wali kelas tidak dapat dimuat."
        />
      )
    }

    if (!assignment?.class_id) {
      return (
        <DashboardMessage
          title="Tidak Ada Kelas Terampu"
          message="Belum ada kelas yang ditetapkan untuk akun ini."
        />
      )
    }

    const { data: schedule } = await supabase
      .from('schedules')
      .select('subject_id')
      .eq('class_id', assignment.class_id)
      .limit(1)
      .maybeSingle()

    return (
      <div className="space-y-6">
        <Suspense fallback={<TableSkeleton />}>
          <ClassProgressTable classId={assignment.class_id} />
        </Suspense>
        {schedule?.subject_id ? (
          <Suspense fallback={<TableSkeleton />}>
            <TopStudentsTable subjectId={schedule.subject_id} />
          </Suspense>
        ) : null}
      </div>
    )
  }

  if (role === 'WAKA_KURIKULUM') {
    return (
      <DashboardMessage
        title="Executive dashboard belum tersedia"
        message="Akses eksekutif menunggu penyelarasan peran dan data analitik kurikulum."
      />
    )
  }

  return (
    <DashboardMessage
      title="Akses Ditolak"
      message="Tidak ada tampilan dasbor untuk peran akun ini."
    />
  )
}

export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <header className="rounded-xl border bg-card p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Dashboard
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Dashboard</h1>
      </header>
      <Suspense fallback={<TableSkeleton />}>
        <DashboardRoleFactory />
      </Suspense>
    </div>
  )
}
