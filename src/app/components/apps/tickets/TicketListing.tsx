"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Icon } from "@iconify/react";
import { TicketType } from "@/app/(DashboardLayout)/types/ticket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface TicketListingProps {
  tickets: TicketType[];
  deleteTicket: (id: string) => void;
  searchTickets: (term: string) => void;
  ticketSearch: string;
  filter: string;
  isPending: boolean;
}

const TicketListing: React.FC<TicketListingProps> = ({
  tickets,
  deleteTicket,
  searchTickets,
  ticketSearch,
  filter,
  isPending,
}) => {
  const router = useRouter();

  const getVisibleTickets = (
    tickets: TicketType[],
    filter: string,
    ticketSearch: string
  ) => {
    const lowerSearch = ticketSearch.toLowerCase();

    return tickets.filter(
      (ticket) =>
        (filter === "total_tickets" || ticket.status === filter) &&
        ticket.ticket_title.toLowerCase().includes(lowerSearch)
    );
  };

  const visibleTickets = getVisibleTickets(tickets, filter, ticketSearch);

  const ticketBadge = (ticket: TicketType) => {
    switch (ticket.status) {
      case "Open":
        return "lightSuccess";
      case "Closed":
        return "lightError";
      case "Pending":
        return "lightWarning";
      default:
        return "default";
    }
  };

  return (
    <div className="my-6">
      <div className="flex justify-between items-center mb-4 gap-4">
        <Button
          onClick={() => router.push("/apps/tickets/create")}
          className="rounded-md whitespace-nowrap"
        >
          Create Ticket
        </Button>

        <div className="relative sm:max-w-60 max-w-full w-full">
          <Icon
            icon="tabler:search"
            height={18}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <Input
            type="text"
            className="pl-8"
            onChange={(e) => searchTickets(e.target.value)}
            placeholder="Search"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Id</TableHead>
              <TableHead>Ticket</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-end">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleTickets.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Belum ada tiket untuk filter ini.</TableCell></TableRow>
            ) : visibleTickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell className="font-mono text-xs">{ticket.id.slice(0, 8)}</TableCell>

                <TableCell className="max-w-md">
                  <h6 className="text-base truncate">{ticket.ticket_title}</h6>
                  <p className="text-sm text-muted-foreground truncate">
                    {ticket.ticket_description}
                  </p>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar><AvatarFallback>{ticket.owner_name.charAt(0)}</AvatarFallback></Avatar>
                    <h6 className="text-base">{ticket.owner_name}</h6>
                  </div>
                </TableCell>

                <TableCell>
                  <Badge variant={`${ticketBadge(ticket)}`} className="rounded-md">
                    {ticket.status}
                  </Badge>
                </TableCell>

                <TableCell>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(ticket.ticket_date), "E, MMM d")}
                  </p>
                </TableCell>

                <TableCell className="text-end">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:text-red-600"
                          aria-label="Delete ticket"
                          disabled={isPending}
                          onClick={() => deleteTicket(ticket.id)}
                        >
                          <Icon icon="tabler:trash" height="18" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Delete Ticket</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default TicketListing;
