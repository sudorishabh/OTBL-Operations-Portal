import React from "react";
import { ChevronRight } from "lucide-react";
import { capitalizeEachWord } from "@pkg/utils";
import { cn } from "@/lib/utils";
import {
  ClientContactLines,
  ClientCounts,
  ClientLink,
  ClientStatus,
  ContactsButton,
  formatClientLocation,
  LIST_SUBGRID,
  type ClientListItem,
} from "./client-list-parts";

interface ClientCardProps {
  client: ClientListItem;
}

// Two-letter monogram, used as the visual anchor for each card.
const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter((word) => /[a-z0-9]/i.test(word))
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "?";

// A client without a main client. It sits at the same level as the main client
// panels, so it is laid out like their headers: name and address, phone and
// email, then its counts, contacts and the way into its page.
const ClientCard: React.FC<ClientCardProps> = ({ client }) => {
  const name = capitalizeEachWord(client.name);
  const location = formatClientLocation(client);

  return (
    <ClientLink
      clientId={client.id}
      label={`Open client ${name}`}
      className={cn(
        "grid grid-cols-1 items-center gap-y-2 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition-colors duration-150 hover:border-gray-300 focus-visible:ring-2 focus-visible:ring-emerald-500/30",
        LIST_SUBGRID,
      )}>
      <div className='flex min-w-0 items-center gap-3'>
        <span
          aria-hidden='true'
          className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold tracking-tight text-gray-600 ring-1 ring-inset ring-gray-200'>
          {getInitials(client.name)}
        </span>
        <div className='min-w-0'>
          <div className='flex items-center gap-2'>
            <span
              className='truncate text-[15px] font-semibold tracking-tight text-gray-900'
              title={name}>
              {client.name.toUpperCase()}
            </span>
            <ClientStatus status={client.status} />
          </div>
          <p
            className='mt-0.5 truncate text-xs text-gray-500'
            title={location}>
            {location || "No address added"}
          </p>
        </div>
      </div>

      <ClientContactLines
        client={client}
        className='pl-12 lg:pl-0'
      />

      <div className='flex flex-wrap items-center gap-x-4 gap-y-2 pl-12 lg:justify-end lg:pl-0'>
        <ClientCounts client={client} />
        <div className='ml-auto flex items-center gap-3 lg:ml-0'>
          <ContactsButton
            owner={{ clientId: client.id }}
            ownerName={client.name}
            count={client.contacts_count}
          />
          <ChevronRight
            aria-hidden='true'
            className='size-4 shrink-0 text-gray-300 transition-colors duration-150 group-hover:text-emerald-600'
          />
        </div>
      </div>
    </ClientLink>
  );
};

export default ClientCard;
