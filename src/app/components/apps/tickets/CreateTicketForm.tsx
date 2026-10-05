'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createTicket } from '@/app/actions/tickets'
import CardBox from '../../shared/CardBox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function CreateTicketForm() {
  const router = useRouter()
  const [ticketDate, setTicketDate] = useState(new Date().toISOString().slice(0, 10))
  const [ticketTitle, setTicketTitle] = useState('')
  const [ticketDescription, setTicketDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createTicket({
        title: ticketTitle,
        description: ticketDescription,
        date: ticketDate,
      })
      if (!result.success) {
        setError(result.error)
        return
      }
      router.push('/apps/tickets')
    })
  }

  return (
    <CardBox>
      <h2 className="mb-4 text-lg font-semibold">Create New Ticket</h2>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ticketTitle">Ticket title</Label>
            <Input
              id="ticketTitle"
              maxLength={200}
              required
              value={ticketTitle}
              onChange={(event) => setTicketTitle(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticketDate">Date</Label>
            <Input
              id="ticketDate"
              type="date"
              required
              value={ticketDate}
              onChange={(event) => setTicketDate(event.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ticketDescription">Description</Label>
          <textarea
            id="ticketDescription"
            className="min-h-32 w-full rounded-md border border-border bg-background p-3 text-sm"
            maxLength={5000}
            required
            value={ticketDescription}
            onChange={(event) => setTicketDescription(event.target.value)}
          />
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-3">
          <Button disabled={isPending} type="submit">
            {isPending ? 'Saving...' : 'Save'}
          </Button>
          <Button disabled={isPending} onClick={() => router.push('/apps/tickets')} type="button" variant="outline">
            Cancel
          </Button>
        </div>
      </form>
    </CardBox>
  )
}