"use client";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  Copy,
  Plus,
  Search,
  Trash2,
  Undo2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Form } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Input from "@/components/shared/input";
import { trpc } from "@/lib/trpc";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import { capitalizeEachWord } from "@pkg/utils";
import { clientSchemas, clientTypes } from "@pkg/schema";
import {
  ContactAction,
  ContactFormFields,
  ContactRow,
  EMPTY_CONTACT,
  type ContactFields,
} from "./contact-parts";

// A contact person not saved yet; copies of another client's contact keep
// that contact's id in their key so they can be unpicked.
export type DraftContact = ContactFields & { key: string };

const COPY_LIMIT = 50;

interface Props {
  added: DraftContact[];
  onAddedChange: (contacts: DraftContact[]) => void;
  // When editing: the saved contacts, each of which can be marked for removal.
  saved?: clientTypes.clientUsersType[];
  removedIds?: number[];
  onRemovedIdsChange?: (ids: number[]) => void;
  // Lets a new main client or branch copy contacts saved on other clients.
  allowCopy?: boolean;
}

const copyKey = (contactId: number) => `copy-${contactId}`;

// Picks contacts saved on other clients and main clients to copy.
const CopyContactsPanel = ({
  added,
  onToggle,
}: {
  added: DraftContact[];
  onToggle: (contact: clientTypes.clientUsersType) => void;
}) => {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search.trim(), 300);

  const contactsQuery = trpc.clientQuery.getAllClientContacts.useQuery({
    searchQuery: debouncedSearch,
    sort: "name_asc",
    page: 1,
    limit: COPY_LIMIT,
  });
  const contacts = (contactsQuery.data?.contacts ??
    []) as (clientTypes.clientUsersType & { client_name: string | null })[];
  const total = contactsQuery.data?.pagination.total ?? 0;

  return (
    <div className='overflow-hidden rounded-lg border border-gray-200 bg-gray-50'>
      <div className='border-b border-gray-200 p-3'>
        <Input
          mode='standalone'
          placeholder='Search contacts by name, email or client...'
          value={search}
          onChange={setSearch}
          inputIcon={Search}
          className='w-full bg-white'
        />
      </div>
      <div className='max-h-64 space-y-1.5 overflow-y-auto p-3'>
        {contactsQuery.isLoading ? (
          <p className='py-6 text-center text-sm text-gray-500'>
            Loading contacts...
          </p>
        ) : contacts.length === 0 ? (
          <p className='py-6 text-center text-sm text-gray-500'>
            No contacts found.
          </p>
        ) : (
          contacts.map((contact) => {
            const isPicked = added.some(
              (draft) => draft.key === copyKey(contact.id),
            );
            return (
              <button
                key={contact.id}
                type='button'
                onClick={() => onToggle(contact)}
                aria-pressed={isPicked}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-3 rounded-md border bg-white px-3 py-2 text-left transition-colors",
                  isPicked
                    ? "border-emerald-500 bg-emerald-50/60"
                    : "border-gray-200 hover:border-emerald-300",
                )}>
                <span className='min-w-0 flex-1'>
                  <span className='block truncate text-sm font-medium text-gray-900'>
                    {capitalizeEachWord(contact.name)}
                  </span>
                  <span className='block truncate text-xs text-gray-500'>
                    {contact.email}
                    {contact.client_name &&
                      ` · ${capitalizeEachWord(contact.client_name)}`}
                  </span>
                </span>
                {isPicked ? (
                  <CheckCircle2 className='size-4 shrink-0 text-emerald-600' />
                ) : (
                  <span className='size-4 shrink-0 rounded-full border border-gray-300' />
                )}
              </button>
            );
          })
        )}
      </div>
      {total > contacts.length && (
        <p className='border-t border-gray-200 px-3 py-2 text-xs text-gray-500'>
          Showing {contacts.length} of {total.toLocaleString("en-IN")}. Search
          to find others.
        </p>
      )}
    </div>
  );
};

// The contact persons section of the main client and branch forms. Changes
// stay here until the whole form is saved.
const ContactPersonsField = ({
  added,
  onAddedChange,
  saved = [],
  removedIds = [],
  onRemovedIdsChange,
  allowCopy,
}: Props) => {
  const [panel, setPanel] = useState<"none" | "new" | "copy">("none");

  const contactForm = useForm<ContactFields>({
    resolver: zodResolver(clientSchemas.clientContactFieldsSchema),
    defaultValues: EMPTY_CONTACT,
  });

  const closeNewContact = () => {
    contactForm.reset(EMPTY_CONTACT);
    setPanel("none");
  };

  const addContact = contactForm.handleSubmit((values) => {
    onAddedChange([...added, { ...values, key: `new-${Date.now()}` }]);
    closeNewContact();
  });

  const toggleCopy = (contact: clientTypes.clientUsersType) => {
    const key = copyKey(contact.id);
    if (added.some((draft) => draft.key === key)) {
      onAddedChange(added.filter((draft) => draft.key !== key));
      return;
    }
    onAddedChange([
      ...added,
      {
        key,
        name: contact.name,
        designation: contact.designation ?? "",
        contact_number: contact.contact_number,
        email: contact.email,
        contact_type: contact.contact_type ?? "",
      },
    ]);
  };

  const toggleRemoved = (contactId: number) =>
    onRemovedIdsChange?.(
      removedIds.includes(contactId)
        ? removedIds.filter((id) => id !== contactId)
        : [...removedIds, contactId],
    );

  const count = saved.length - removedIds.length + added.length;

  return (
    <section className='space-y-3'>
      <div className='flex flex-wrap items-center justify-between gap-2 border-b pb-2'>
        <div className='flex items-center gap-2'>
          <Users className='size-4 text-emerald-700' />
          <h3 className='text-base font-semibold text-gray-800'>
            Contact Persons
          </h3>
          <Badge
            variant='secondary'
            className='rounded-full tabular-nums'>
            {count}
          </Badge>
        </div>
        <div className='flex gap-2'>
          {allowCopy && (
            <Button
              type='button'
              size='sm'
              variant={panel === "copy" ? "secondary" : "outline"}
              onClick={() => setPanel(panel === "copy" ? "none" : "copy")}>
              <Copy className='size-3.5' />
              Copy existing
            </Button>
          )}
          <Button
            type='button'
            size='sm'
            variant={panel === "new" ? "secondary" : "outline"}
            onClick={() =>
              panel === "new" ? closeNewContact() : setPanel("new")
            }>
            <UserPlus className='size-3.5' />
            Add new
          </Button>
        </div>
      </div>

      {panel === "new" && (
        <Form {...contactForm}>
          {/* Inside the main form, Enter adds this contact instead of saving. */}
          <div
            className='space-y-3 rounded-lg bg-gray-50 p-4 ring-1 ring-inset ring-gray-200'
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                (event.target as HTMLElement).tagName === "INPUT"
              ) {
                event.preventDefault();
                addContact();
              }
            }}>
            <ContactFormFields isWhiteBg />
            <div className='flex justify-end gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={closeNewContact}>
                Cancel
              </Button>
              <Button
                type='button'
                size='sm'
                onClick={addContact}
                className='bg-[#035864] hover:bg-[#035864]/90'>
                <Plus className='size-3.5' />
                Add contact
              </Button>
            </div>
          </div>
        </Form>
      )}

      {panel === "copy" && (
        <CopyContactsPanel
          added={added}
          onToggle={toggleCopy}
        />
      )}

      {saved.length === 0 && added.length === 0 ? (
        <p className='py-2 text-sm text-gray-500'>
          No contact persons yet. Add one now or later.
        </p>
      ) : (
        <div className='space-y-2'>
          {saved.map((contact) => {
            const isRemoved = removedIds.includes(contact.id);
            return (
              <ContactRow
                key={contact.id}
                contact={contact}
                isRemoved={isRemoved}
                badge={
                  isRemoved && (
                    <span className='text-[11px] font-medium text-red-600'>
                      Removed on save
                    </span>
                  )
                }
                actions={
                  onRemovedIdsChange && (
                    <ContactAction
                      label={
                        isRemoved
                          ? `Keep ${contact.name}`
                          : `Remove ${contact.name}`
                      }
                      icon={isRemoved ? Undo2 : Trash2}
                      tone={isRemoved ? "default" : "danger"}
                      onClick={() => toggleRemoved(contact.id)}
                    />
                  )
                }
              />
            );
          })}
          {added.map((contact) => (
            <ContactRow
              key={contact.key}
              contact={contact}
              badge={
                <span className='text-[11px] font-medium text-emerald-700'>
                  New
                </span>
              }
              actions={
                <ContactAction
                  label={`Remove ${contact.name}`}
                  icon={X}
                  onClick={() =>
                    onAddedChange(
                      added.filter((draft) => draft.key !== contact.key),
                    )
                  }
                />
              }
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default ContactPersonsField;
