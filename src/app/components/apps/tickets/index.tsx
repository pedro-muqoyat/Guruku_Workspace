import CardBox from '@/app/components/shared/CardBox'
import { getOwnedTickets } from '@/lib/template-apps/data'
import TicketsClient from './TicketsClient'

export default async function TicketsApp() {
  const tickets = await getOwnedTickets()

  return (
    <CardBox>
      <TicketsClient initialTickets={tickets} />
    </CardBox>
  )
}