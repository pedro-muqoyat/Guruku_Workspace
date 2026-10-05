'use client'

import { useState, useTransition } from 'react'
import { deleteTicket } from '@/app/actions/tickets'
import type { TicketDTO } from '@/lib/template-apps/data'
import TicketFilter from '@/app/components/apps/tickets/TicketFilter'
import TicketListing from '@/app/components/apps/tickets/TicketListing'

export default function TicketsClient({ initialTickets }: { initialTickets: TicketDTO[] }) {
  const [tickets, setTickets] = useState(initialTickets)
  const [filter, setFilter] = useState('total_tickets')
  const [ticketSearch, setTicketSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleDelete = (id: string) => {
    const previousTickets = tickets
    setTickets((current) => current.filter((ticket) => ticket.id !== id))
    startTransition(async () => {
      const result = await deleteTicket(id)
      if (!result.success) {
        setTickets(previousTickets)
        setError(result.error)
      }
    })
  }

  return (
    <>
      {error && <p className="mb-4 text-sm text-destructive" role="alert">{error}</p>}
      <TicketFilter tickets={tickets} setFilter={setFilter} />
      <TicketListing
        tickets={tickets}
        filter={filter}
        ticketSearch={ticketSearch}
        deleteTicket={handleDelete}
        searchTickets={setTicketSearch}
        isPending={isPending}
      />
    </>
  )
}