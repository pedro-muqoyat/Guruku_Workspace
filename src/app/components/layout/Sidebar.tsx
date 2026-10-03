import Link from 'next/link'
import {
  BookOpenCheck,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  NotebookTabs,
  TableProperties,
  UsersRound,
} from 'lucide-react'

const navigation = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/apps/attendance', label: 'Absensi', icon: ClipboardList },
  { href: '/apps/grades', label: 'Penilaian', icon: BookOpenCheck },
  { href: '/apps/rapor', label: 'Raport', icon: FileText },
  { href: '/utilities/data-ingestion', label: 'Impor Data', icon: FileSpreadsheet },
  { href: '/apps/notes', label: 'Catatan', icon: NotebookTabs },
  { href: '/user-profile', label: 'Profil', icon: UsersRound },
  { href: '/utilities/table', label: 'Tabel', icon: TableProperties },
]

export default function Sidebar() {
  return (
    <aside aria-label="Sidebar" className="flex h-full min-h-0 flex-col border-r border-border bg-sidebar">
      <div className="flex h-16 shrink-0 items-center border-b border-border px-6">
        <Link className="text-lg font-semibold text-foreground" href="/">
          Guruku
        </Link>
      </div>

      <nav aria-label="Navigasi utama" className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
        <ul className="space-y-1">
          {navigation.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                className="flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href={href}
              >
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                <span>{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}