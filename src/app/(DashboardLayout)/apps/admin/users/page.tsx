import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import UserProvisioningForm, {
  UserManagementActions,
} from '@/app/components/features/UserProvisioningForm'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Manajemen Pengguna',
}

const roleLabels: Record<string, string> = {
  ADMIN: 'Admin',
  WAKA: 'Waka Kurikulum',
  WALI: 'Wali Kelas',
  GURU: 'Guru Mata Pelajaran',
  TU: 'Tata Usaha',
}

export default async function AdminUsersPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) notFound()

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || profile?.role.trim().toUpperCase() !== 'ADMIN') {
    notFound()
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('id, full_name, role')
    .order('full_name', { ascending: true })

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Manajemen pengguna</h1>
        <p className="text-sm text-muted-foreground">
          Kelola identitas dan peran akses aplikasi.
        </p>
      </header>

      <UserProvisioningForm />

      <section aria-labelledby="user-list-title" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground" id="user-list-title">
            Daftar pengguna
          </h2>
          {profiles && !profilesError ? (
            <p className="text-sm text-muted-foreground">
              {profiles.length.toLocaleString('id-ID')} profil
            </p>
          ) : null}
        </div>

        {profilesError ? (
          <p className="rounded-md border border-destructive/40 p-4 text-sm text-destructive" role="status">
            Daftar pengguna tidak dapat dimuat.
          </p>
        ) : !profiles || profiles.length === 0 ? (
          <p className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
            Belum ada profil pengguna.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-muted text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3" scope="col">Nama</th>
                  <th className="px-4 py-3" scope="col">ID pengguna</th>
                  <th className="px-4 py-3" scope="col">Peran dan tindakan</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((userProfile) => (
                  <tr className="border-t border-border align-top" key={userProfile.id}>
                    <th className="max-w-56 px-4 py-4 font-medium text-foreground" scope="row">
                      <span className="block truncate">
                        {userProfile.full_name ?? 'Nama belum diisi'}
                      </span>
                      <span className="mt-1 block text-xs font-normal text-muted-foreground">
                        {roleLabels[userProfile.role] ?? userProfile.role}
                      </span>
                    </th>
                    <td className="px-4 py-4 font-mono text-xs text-muted-foreground">
                      {userProfile.id}
                    </td>
                    <td className="px-4 py-4">
                      <UserManagementActions
                        profile={{
                          id: userProfile.id,
                          full_name: userProfile.full_name,
                          role: userProfile.role,
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  )
}