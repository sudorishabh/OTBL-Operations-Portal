import React from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { useLoadMorePages } from "@/hooks/useLoadMorePages";
import LoadMoreBtn from "@/components/loading/LoadMoreBtn";
import PaginationSummary from "@/components/shared/pagination-summary";
import { useClientManagementContext } from "@/contexts/ClientManagementContext";
import { useIsViewer } from "@/contexts/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Webhook } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import NoFetchData from "@/components/shared/no-fetch-data";
import toast from "react-hot-toast";
import ClientContactsSkeleton from "../skeleton/clients/client-contacts-skeleton";
import Error from "@/components/shared/error";
import { useApiError } from "@/hooks/useApiError";

interface Props {
  tab: string;
}

interface ClientContact {
  id: number;
  name: string;
  email: string;
  contact_number: string;
  designation?: string | null;
  contact_type?: string | null;
  client_id: number;
  client?: {
    id: number;
    name: string;
  };
}

const CONTACTS_PAGE_SIZE = 50;

type ContactsPage = RouterOutputs["clientQuery"]["getAllClientContacts"];

const ClientContactTab = ({ tab }: Props) => {
  const isClientContactTab = tab === "contacts";
  const isViewer = useIsViewer();
  const { contactSearchQuery, contactFilters } = useClientManagementContext();
  const utils = trpc.useUtils();
  const { handleError } = useApiError();

  const queryInput = {
    limit: CONTACTS_PAGE_SIZE,
    searchQuery: contactSearchQuery || undefined,
    clientId: contactFilters.clientId,
  };

  const { pages, loadMore } = useLoadMorePages(queryInput);

  const pageQueries: UseQueryResult<ContactsPage>[] = trpc.useQueries(
    (t: any) =>
      pages.map((page) =>
        t.clientQuery.getAllClientContacts(
          { ...queryInput, page },
          { enabled: isClientContactTab },
        ),
      ),
  );

  const contacts: ClientContact[] = pageQueries.flatMap(
    (query) => query.data?.contacts ?? [],
  );
  const pagination = pageQueries
    .flatMap((query) => query.data?.pagination ?? [])
    .at(-1);
  const failedQuery = pageQueries.find((query) => query.isError);
  const isFetchingMore = pages.length > 1 && !!pageQueries.at(-1)?.isLoading;

  const deleteClientContact =
    trpc.clientMutation.deleteClientContact.useMutation({
      onSuccess: () => {
        toast.success("Contact deleted successfully");
        utils.clientQuery.getAllClientContacts.invalidate();
        utils.clientQuery.getClients.invalidate();
      },
      onError: (error: any) => {
        handleError(error, { showToast: true });
      },
    });

  const handleDeleteContact = (contactId: number, contactName: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete contact "${contactName}"? This action cannot be undone.`,
      )
    ) {
      try {
        deleteClientContact.mutate({ clientContactId: contactId });
      } catch (error) {
        console.error("Error deleting contact:", error);
      }
    }
  };

  const getClientName = (contact: ClientContact) => {
    return contact.client?.name || "Unknown Client";
  };

  if (pageQueries[0]?.isLoading) {
    return <ClientContactsSkeleton />;
  }

  if (failedQuery?.error) {
    return (
      <Error
        variant='default'
        message={failedQuery.error.message}
      />
    );
  }

  const hasContacts = contacts.length > 0;

  if (!hasContacts) {
    return (
      <NoFetchData
        Icon={Webhook}
        title='No Client Contacts Found'
        description='Add a contact to get started'
      />
    );
  }

  return (
    <div className='border rounded-lg bg-white'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='pl-8 text-xs'>Contact Person</TableHead>
            <TableHead className='text-xs'>Email</TableHead>
            <TableHead className='text-xs'>Phone</TableHead>
            <TableHead className='text-xs'>Designation</TableHead>
            <TableHead className='text-xs'>Client</TableHead>
            <TableHead className='text-xs'>Type</TableHead>
            <TableHead className='text-xs text-right'>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow key={contact.id}>
              <TableCell className='text-xs font-medium'>
                {contact.name}
              </TableCell>
              <TableCell className='text-xs'>{contact.email}</TableCell>
              <TableCell className='text-xs'>
                {contact.contact_number}
              </TableCell>
              <TableCell className='text-xs'>
                {contact.designation || "N/A"}
              </TableCell>
              <TableCell className='text-xs'>
                {getClientName(contact)}
              </TableCell>
              <TableCell className='text-xs'>
                {contact.contact_type && (
                  <Badge
                    variant='outline'
                    className='text-xs'>
                    {contact.contact_type}
                  </Badge>
                )}
              </TableCell>
              <TableCell className='text-right'>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant='ghost'
                      className='h-8 w-8 p-0'>
                      <span className='sr-only'>Open menu</span>
                      <MoreHorizontal className='h-4 w-4' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end'>
                    <DropdownMenuItem
                      className='text-destructive'
                      onClick={() =>
                        handleDeleteContact(contact.id, contact.name)
                      }
                      disabled={isViewer || deleteClientContact.isPending}>
                      <Trash2 className='mr-2 h-4 w-4' />
                      Delete Contact
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}

          {pagination?.hasMore && (
            <TableRow>
              <TableCell
                colSpan={7}
                className='text-center'>
                <LoadMoreBtn
                  onClick={loadMore}
                  loading={isFetchingMore}
                />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <PaginationSummary
        shown={contacts.length}
        total={pagination?.total}
        page={pagination?.page}
        totalPages={pagination?.totalPages}
        noun='contacts'
        className='border-t'
      />
    </div>
  );
};

export default ClientContactTab;
