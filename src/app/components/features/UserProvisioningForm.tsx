'use client'

import { useActionState } from 'react'
import {
  createAdminPasswordResetLink,
  createAdminUser,
  deleteAdminUser,
  updateAdminUserRole,
  type AdminUserActionState,
} from '@/app/actions/admin-users'

type AdminProfile = {
  id: string
  full_name: string | null
  role: string
}

const initialState: AdminUserActionState = {
  success: false,
  message: '',
}

const roles = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'WAKA', label: 'Waka Kurikulum' },
  { value: 'WALI', label: 'Wali Kelas' },
  { value: 'GURU', label: 'Guru Mata Pelajaran' },
  { value: 'TU', label: 'Tata Usaha' },
] as const

function ActionFeedback({ state }: { state: AdminUserActionState }) {
  if (!state.message) return null

  return (
    <div aria-live="polite" className="space-y-2" role={state.success ? 'status' : 'alert'}>
      <p className={`text-sm ${state.success ? 'text-foreground' : 'text-destructive'}`}>
        {state.message}
      </p>
      {state.resetLink ? (
        <a
          className="break-all text-sm font-medium text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href={state.resetLink}
          rel="noreferrer noopener"
          target="_blank"
        >
          Buka tautan pemulihan
        </a>
      ) : null}
    </div>
  )
}

export function UserManagementActions({ profile }: { profile: AdminProfile }) {
  const [roleState, roleAction, rolePending] = useActionState(
    updateAdminUserRole,
    initialState
  )
  const [resetState, resetAction, resetPending] = useActionState(
    createAdminPasswordResetLink,
    initialState
  )
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteAdminUser,
    initialState
  )

  return (
    <div className="space-y-3">
      <form action={roleAction} className="flex min-w-64 flex-wrap items-center gap-2">
        <input name="userId" type="hidden" value={profile.id} />
        <label className="sr-only" htmlFor={`role-${profile.id}`}>
          Peran untuk {profile.full_name ?? profile.id}
        </label>
        <select
          className="min-h-11 min-w-40 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          defaultValue={profile.role}
          id={`role-${profile.id}`}
          name="role"
        >
          {roles.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
        <button
          className="min-h-11 rounded-md border border-border px-3 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          disabled={rolePending}
          type="submit"
        >
          {rolePending ? 'Menyimpan...' : 'Ubah peran'}
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        <form action={resetAction}>
          <input name="userId" type="hidden" value={profile.id} />
          <button
            className="min-h-11 rounded-md border border-border px-3 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            disabled={resetPending}
            type="submit"
          >
            {resetPending ? 'Membuat tautan...' : 'Buat tautan reset'}
          </button>
        </form>
        <form action={deleteAction}>
          <input name="userId" type="hidden" value={profile.id} />
          <button
            className="min-h-11 rounded-md border border-destructive/50 px-3 text-sm font-medium text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            disabled={deletePending}
            type="submit"
          >
            {deletePending ? 'Menghapus...' : 'Hapus pengguna'}
          </button>
        </form>
      </div>
      <ActionFeedback state={roleState} />
      <ActionFeedback state={resetState} />
      <ActionFeedback state={deleteState} />
    </div>
  )
}

export default function UserProvisioningForm() {
  const [state, formAction, pending] = useActionState(createAdminUser, initialState)

  return (
    <section aria-labelledby="provision-user-title" className="rounded-md border border-border bg-card p-4 sm:p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground" id="provision-user-title">
          Tambah pengguna
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Akun dibuat tanpa kata sandi default.
        </p>
      </div>

      <form action={formAction} className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="grid min-w-0 gap-2 text-sm font-medium text-foreground" htmlFor="new-user-email">
          Email
          <input
            autoComplete="off"
            className="h-11 min-w-0 rounded-md border border-input bg-background px-3 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            id="new-user-email"
            maxLength={254}
            name="email"
            required
            type="email"
          />
        </label>
        <label className="grid min-w-0 gap-2 text-sm font-medium text-foreground" htmlFor="new-user-name">
          Nama lengkap
          <input
            autoComplete="name"
            className="h-11 min-w-0 rounded-md border border-input bg-background px-3 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            id="new-user-name"
            maxLength={160}
            name="fullName"
            required
            type="text"
          />
        </label>
        <label className="grid min-w-0 gap-2 text-sm font-medium text-foreground" htmlFor="new-user-role">
          Peran
          <select
            className="h-11 min-w-0 rounded-md border border-input bg-background px-3 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            defaultValue="GURU"
            id="new-user-role"
            name="role"
          >
            {roles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col justify-end gap-3">
          <button
            className="min-h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            disabled={pending}
            type="submit"
          >
            {pending ? 'Membuat akun...' : 'Buat akun'}
          </button>
          <ActionFeedback state={state} />
        </div>
      </form>
    </section>
  )
}