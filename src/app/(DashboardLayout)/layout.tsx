import type { ReactNode } from 'react'
import Sidebar from '@/app/components/layout/Sidebar'
import Topbar from '@/app/components/layout/Topbar'

export const dynamic = 'force-dynamic'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh min-h-dvh w-full overflow-hidden bg-background">
      <div className="hidden h-full w-64 shrink-0 lg:block">
        <Sidebar />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar />
        <main
          aria-label="Konten utama"
          className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain"
        >
          <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
