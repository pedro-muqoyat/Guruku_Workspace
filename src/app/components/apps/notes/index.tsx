'use client'

import { useState, useTransition } from 'react'
import CardBox from '@/app/components/shared/CardBox'
import NotesSidebar from '@/app/components/apps/notes/NotesSidebar'
import NoteContent from '@/app/components/apps/notes/NoteContent'
import { Icon } from '@iconify/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { NotesType } from '@/app/(DashboardLayout)/types/apps/notes'
import AddNotes from './AddNotes'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { createNote, deleteNote, updateNote } from '@/app/actions/notes'

interface ColorType {
  id: number
  disp: string
  lineColor?: string
}

const NotesApp = ({
  initialNotes,
  initialSelectedNoteId,
}: {
  initialNotes: NotesType[]
  initialSelectedNoteId: string | null
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [notes, setNotes] = useState<NotesType[]>(initialNotes)
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(initialSelectedNoteId)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const location = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleClose = () => setIsOpen(false)

  const selectNote = (id: string) => {
    setSelectedNoteId(id)
    const params = new URLSearchParams(searchParams.toString())
    params.set('noteId', id)
    router.replace(`${location}?${params.toString()}`, { scroll: false })
  }

  const colorVariation: ColorType[] = [
    { id: 1, lineColor: 'warning', disp: 'warning' },
    { id: 2, lineColor: 'primary', disp: 'primary' },
    { id: 3, lineColor: 'error', disp: 'error' },
    { id: 4, lineColor: 'success', disp: 'success' },
    { id: 5, lineColor: 'secondary', disp: 'secondary' },
  ]

  const handleUpdateNote = (id: string, title: string, color: string) => {
    const previousNotes = notes
    setNotes((current) => current.map((note) => note.id === id ? { ...note, title, color } : note))
    startTransition(async () => {
      const result = await updateNote(id, { title, color })
      if (!result.success) {
        setNotes(previousNotes)
        setError(result.error)
      }
    })
  }

  const addNote = async (note: { title: string; color: string }) => {
    startTransition(async () => {
      const result = await createNote(note)
      if (!result.success) {
        setError(result.error)
        return
      }
      setNotes((current) => [result.data, ...current])
      selectNote(result.data.id)
    })
  }

  const handleDeleteNote = (id: string) => {
    const previousNotes = notes
    const previousSelected = selectedNoteId
    setNotes((current) => current.filter((note) => note.id !== id))
    if (selectedNoteId === id) setSelectedNoteId(null)
    startTransition(async () => {
      const result = await deleteNote(id)
      if (!result.success) {
        setNotes(previousNotes)
        setSelectedNoteId(previousSelected)
        setError(result.error)
      }
    })
  }

  return (
    <CardBox className='p-0 overflow-hidden'>
      <div className='flex'>
        {/* Sidebar */}
        <div>
          <Sheet open={isOpen} onOpenChange={handleClose}>
            <SheetContent
              side='left'
              className='max-w-[320px] sm:max-w-[320px] w-full h-full lg:hidden block'
            >
              <NotesSidebar
                notes={notes}
                loading={isPending}
                onSelectNote={selectNote}
                onDeleteNote={handleDeleteNote}
              />
            </SheetContent>
          </Sheet>
          <div className='max-w-[320px] h-auto lg:block hidden'>
            <NotesSidebar
              notes={notes}
              loading={isPending}
              onSelectNote={selectNote}
              onDeleteNote={handleDeleteNote}
            />
          </div>
        </div>

        {/* Content */}
        <div className='w-full'>
          <div className='flex justify-between items-center border-b border-ld py-4 px-6'>
            <div className='flex gap-3 items-center'>
              <Button
                color={'lightprimary'}
                onClick={() => setIsOpen(true)}
                className='btn-circle p-0 lg:!hidden flex'
              >
                <Icon icon='tabler:menu-2' height={18} />
              </Button>
              <h6 className='text-base'>Edit Note</h6>
            </div>
            <AddNotes colors={colorVariation} addNote={addNote} />
          </div>

              <NoteContent
            note={notes.find(n => n.id === selectedNoteId) || null}
                updateNote={handleUpdateNote}
                isPending={isPending}
          />
              {error && <p role="alert" className="px-6 py-3 text-sm text-destructive">{error}</p>}
        </div>
      </div>
    </CardBox>
  )
}

export default NotesApp
