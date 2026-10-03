import { LogOut } from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import MobileSidebar from './MobileSidebar'
import Sidebar from './Sidebar'

export default function Topbar() {
  return (
    <header className="z-10 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <MobileSidebar>
          <Sidebar />
        </MobileSidebar>
        <p className="truncate text-sm font-medium text-muted-foreground">Ruang kerja akademik</p>
      </div>

      <form action={signOut}>
        <Button className="min-h-11 gap-2" type="submit" variant="outline">
          <LogOut aria-hidden="true" className="size-4" />
          <span>Logout</span>
        </Button>
      </form>
    </header>
  )
}