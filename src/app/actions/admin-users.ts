'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin-client'

export type AdminUserActionState = {
  success: boolean
  message: string
  resetLink?: string
}

type AdminIdentityResult =
  | { success: true; userId: string }
  | { success: false }

const initialError: AdminUserActionState = {
  success: false,
  message: 'Permintaan tidak dapat diproses.',
}

const roleSchema = z.enum(['ADMIN', 'WAKA', 'WALI', 'GURU', 'TU'])

const createUserSchema = z.object({
  email: z.string().trim().email().max(254),
  fullName: z.string().trim().min(1).max(160),
  role: roleSchema,
})

const targetUserSchema = z.object({
  userId: z.string().uuid(),
})

async function verifyAdmin(): Promise<AdminIdentityResult> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) return { success: false }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || profile?.role.trim().toUpperCase() !== 'ADMIN') {
      return { success: false }
    }

    return { success: true, userId: user.id }
  } catch {
    return { success: false }
  }
}

function getFormString(formData: FormData, name: string) {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

function safeActionError(): AdminUserActionState {
  return initialError
}

export async function createAdminUser(
  _previousState: AdminUserActionState,
  formData: FormData
): Promise<AdminUserActionState> {
  const parsed = createUserSchema.safeParse({
    email: getFormString(formData, 'email'),
    fullName: getFormString(formData, 'fullName'),
    role: getFormString(formData, 'role'),
  })

  if (!parsed.success) {
    return { success: false, message: 'Periksa email, nama, dan peran pengguna.' }
  }

  const authorization = await verifyAdmin()
  if (!authorization.success) {
    return { success: false, message: 'Anda tidak memiliki akses untuk mengelola pengguna.' }
  }

  let userId: string | null = null

  try {
    const admin = createSupabaseAdminClient()
    const { data, error } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      email_confirm: true,
      user_metadata: { full_name: parsed.data.fullName },
    })

    if (error || !data.user) {
      return { success: false, message: 'Akun tidak dapat dibuat. Periksa email atau coba lagi.' }
    }

    userId = data.user.id
    const { error: profileError } = await admin
      .from('user_profiles')
      .upsert(
        {
          id: userId,
          full_name: parsed.data.fullName,
          role: parsed.data.role,
        },
        { onConflict: 'id' }
      )

    if (profileError) {
      const { error: rollbackError } = await admin.auth.admin.deleteUser(userId)
      if (rollbackError) {
        console.error('Admin user profile provisioning rollback failed.')
      }
      return { success: false, message: 'Profil pengguna gagal dibuat; akun baru dibatalkan.' }
    }

    revalidatePath('/apps/admin/users')
    return { success: true, message: 'Pengguna berhasil dibuat tanpa kata sandi default.' }
  } catch {
    if (userId) {
      try {
        const admin = createSupabaseAdminClient()
        const { error } = await admin.auth.admin.deleteUser(userId)
        if (error) console.error('Admin user creation rollback failed.')
      } catch {
        console.error('Admin user creation rollback failed.')
      }
    }
    return safeActionError()
  }
}

export async function updateAdminUserRole(
  _previousState: AdminUserActionState,
  formData: FormData
): Promise<AdminUserActionState> {
  const target = targetUserSchema.safeParse({
    userId: getFormString(formData, 'userId'),
  })
  const role = roleSchema.safeParse(getFormString(formData, 'role'))

  if (!target.success || !role.success) {
    return { success: false, message: 'Data pengguna atau peran tidak valid.' }
  }

  const authorization = await verifyAdmin()
  if (!authorization.success) {
    return { success: false, message: 'Anda tidak memiliki akses untuk mengelola pengguna.' }
  }
  if (authorization.userId === target.data.userId) {
    return { success: false, message: 'Peran akun yang sedang digunakan tidak dapat diubah.' }
  }

  try {
    const admin = createSupabaseAdminClient()
    const { data, error } = await admin
      .from('user_profiles')
      .update({ role: role.data })
      .eq('id', target.data.userId)
      .select('id')
      .maybeSingle()

    if (error || !data) {
      return { success: false, message: 'Peran pengguna tidak dapat diperbarui.' }
    }

    revalidatePath('/apps/admin/users')
    return { success: true, message: 'Peran pengguna diperbarui.' }
  } catch {
    return safeActionError()
  }
}

export async function deleteAdminUser(
  _previousState: AdminUserActionState,
  formData: FormData
): Promise<AdminUserActionState> {
  const target = targetUserSchema.safeParse({
    userId: getFormString(formData, 'userId'),
  })
  if (!target.success) return { success: false, message: 'ID pengguna tidak valid.' }

  const authorization = await verifyAdmin()
  if (!authorization.success) {
    return { success: false, message: 'Anda tidak memiliki akses untuk mengelola pengguna.' }
  }
  if (authorization.userId === target.data.userId) {
    return { success: false, message: 'Akun yang sedang digunakan tidak dapat dihapus.' }
  }

  try {
    const admin = createSupabaseAdminClient()
    const { error } = await admin.auth.admin.deleteUser(target.data.userId)
    if (error) {
      return { success: false, message: 'Pengguna tidak dapat dihapus.' }
    }

    revalidatePath('/apps/admin/users')
    return { success: true, message: 'Pengguna dihapus.' }
  } catch {
    return safeActionError()
  }
}

export async function createAdminPasswordResetLink(
  _previousState: AdminUserActionState,
  formData: FormData
): Promise<AdminUserActionState> {
  const target = targetUserSchema.safeParse({
    userId: getFormString(formData, 'userId'),
  })
  if (!target.success) return { success: false, message: 'ID pengguna tidak valid.' }

  const authorization = await verifyAdmin()
  if (!authorization.success) {
    return { success: false, message: 'Anda tidak memiliki akses untuk mengelola pengguna.' }
  }

  try {
    const admin = createSupabaseAdminClient()
    const { data: userResult, error: userError } = await admin.auth.admin.getUserById(
      target.data.userId
    )
    const email = userResult.user?.email

    if (userError || !email) {
      return { success: false, message: 'Tautan pemulihan tidak dapat dibuat.' }
    }

    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
    })

    if (error || !data.properties.action_link) {
      return { success: false, message: 'Tautan pemulihan tidak dapat dibuat.' }
    }

    return {
      success: true,
      message: 'Tautan pemulihan dibuat. Bagikan secara aman kepada pengguna.',
      resetLink: data.properties.action_link,
    }
  } catch {
    return safeActionError()
  }
}