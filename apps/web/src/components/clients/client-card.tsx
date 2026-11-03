import React from "react";
import { ChevronRight } from "lucide-react";
import { capitalizeEachWord } from "@pkg/utils";
import {
  ClientContactLines,
  ClientCounts,
  ClientLink,
  ClientStatus,
  formatClientLocation,
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
// panels, so it shares their header geometry and the branch row columns.
const ClientCard: React.FC<ClientCardProps> = ({ client }) => {
  const name = capitalizeEachWord(client.name);
  const location = formatClientLocation(client);

  return (
    <ClientLink
      clientId={client.id}
      label={`Open client ${name}`}
      className='grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition-colors duration-150 hover:border-gray-300 focus-visible:ring-2 focus-visible:ring-emerald-500/30 lg:grid-cols-[auto_minmax(0,1.5fr)_minmax(0,1fr)_auto_auto] lg:gap-x-4'>
      <span
        aria-hidden='true'
        className='row-span-3 flex size-9 shrink-0 items-center justify-center self-start rounded-lg bg-gray-100 text-xs font-bold tracking-tight text-gray-600 ring-1 ring-inset ring-gray-200 lg:row-span-1 lg:self-center'>
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

      <ClientContactLines
        client={client}
        className='col-start-2 row-start-2 lg:col-start-3 lg:row-start-1'
      />

      <ClientCounts
        client={client}
        className='col-start-2 row-start-3 lg:col-start-4 lg:row-start-1'
      />

      <ChevronRight
        aria-hidden='true'
        className='col-start-3 row-span-3 row-start-1 size-4 shrink-0 text-gray-300 transition-colors duration-150 group-hover:text-emerald-600 lg:col-start-5 lg:row-span-1'
      />
    </ClientLink>
  );
};

export default ClientCard;
