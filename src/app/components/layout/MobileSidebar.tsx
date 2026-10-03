'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

export default function MobileSidebar({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button aria-label="Buka navigasi" className="lg:hidden" size="icon" variant="ghost">
          <Menu aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent aria-describedby={undefined} className="w-[min(18rem,85vw)] p-0" side="left">
        <SheetTitle className="sr-only">Navigasi utama</SheetTitle>
        <SheetClose asChild>
          <Button
            aria-label="Tutup navigasi"
            className="absolute right-3 top-3 z-10"
            size="icon"
            variant="ghost"
          >
            <X aria-hidden="true" />
          </Button>
        </SheetClose>
        {children}
      </SheetContent>
    </Sheet>
  )
}