"use client";
import React from "react";
import { useFormContext } from "react-hook-form";
import { Briefcase, Mail, Phone, Tag } from "lucide-react";
import Input from "@/components/shared/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { capitalizeEachWord } from "@pkg/utils";
import { clientTypes } from "@pkg/schema";

// Building blocks for the contact persons of main clients and branches.

export type ContactFields = clientTypes.clientContactFieldsInput;

type SavedContact = {
  name: string;
  designation?: string | null;
  contact_number: string;
  email: string;
  contact_type?: string | null;
};

export const EMPTY_CONTACT: ContactFields = {
  name: "",
  designation: "",
  contact_number: "",
  email: "",
  contact_type: "",
};

// Blank optional fields are left out rather than saved empty.
export const toContactInput = ({
  designation,
  contact_type,
  ...contact
}: ContactFields): ContactFields => ({
  ...contact,
  designation: designation?.trim() || undefined,
  contact_type: contact_type?.trim() || undefined,
});

// A saved contact's values, as the contact form holds them.
export const toContactForm = (contact: SavedContact): ContactFields => ({
  name: contact.name,
  designation: contact.designation ?? "",
  contact_number: contact.contact_number,
  email: contact.email,
  contact_type: contact.contact_type ?? "",
});

// One contact person's fields, read from the surrounding <Form>.
export const ContactFormFields = ({ isWhiteBg }: { isWhiteBg?: boolean }) => {
  const { control } = useFormContext<ContactFields>();

  return (
    <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
      <Input
        control={control}
        fieldName='name'
        Label='Name'
        placeholder='Contact name'
        isWhiteBg={isWhiteBg}
      />
      <Input
        control={control}
        fieldName='designation'
        Label='Designation'
        placeholder='Manager, Engineer, etc.'
        inputIcon={Briefcase}
        optional
        isWhiteBg={isWhiteBg}
      />
      <Input
        control={control}
        fieldName='email'
        Label='Email'
        placeholder='contact@example.com'
        inputIcon={Mail}
        isWhiteBg={isWhiteBg}
      />
      <Input
        control={control}
        fieldName='contact_number'
        Label='Phone'
        placeholder='98765 43210 or 011-23456789'
        inputIcon={Phone}
        isWhiteBg={isWhiteBg}
      />
      <div className='md:col-span-2'>
        <Input
          control={control}
          fieldName='contact_type'
          Label='Contact Type'
          placeholder='Primary, Billing, Technical, etc.'
          inputIcon={Tag}
          optional
          isWhiteBg={isWhiteBg}
        />
      </div>
    </div>
  );
};

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "?";

// A contact person: who they are and how to reach them, with any actions on
// the right. A struck-out row is one about to be removed.
export const ContactRow = ({
  contact,
  badge,
  isRemoved,
  actions,
}: {
  contact: SavedContact;
  badge?: React.ReactNode;
  isRemoved?: boolean;
  actions?: React.ReactNode;
}) => (
  <div
    className={cn(
      "flex items-center gap-3 rounded-lg border bg-white p-3",
      isRemoved ? "border-red-200 bg-red-50/60" : "border-gray-200",
    )}>
    <span
      aria-hidden='true'
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1 ring-inset",
        isRemoved
          ? "bg-white text-gray-400 ring-gray-200"
          : "bg-emerald-50 text-emerald-700 ring-emerald-100",
      )}>
      {getInitials(contact.name)}
    </span>

    <div className={cn("min-w-0 flex-1", isRemoved && "opacity-60")}>
      <div className='flex flex-wrap items-center gap-x-2 gap-y-0.5'>
        <span
          className={cn(
            "truncate text-sm font-medium text-gray-900",
            isRemoved && "line-through",
          )}>
          {capitalizeEachWord(contact.name)}
        </span>
        {contact.contact_type && (
          <Badge
            variant='outline'
            className='text-[11px] font-normal text-gray-600'>
            {contact.contact_type}
          </Badge>
        )}
        {badge}
      </div>
      {contact.designation && (
        <p className='truncate text-xs text-gray-500'>{contact.designation}</p>
      )}
      <div className='mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500'>
        <a
          href={`mailto:${contact.email}`}
          title={contact.email}
          className='inline-flex min-w-0 items-center gap-1 hover:text-emerald-700'>
          <Mail className='size-3 shrink-0 text-gray-400' />
          <span className='truncate'>{contact.email}</span>
        </a>
        <a
          href={`tel:${contact.contact_number}`}
          className='inline-flex items-center gap-1 hover:text-emerald-700'>
          <Phone className='size-3 shrink-0 text-gray-400' />
          {contact.contact_number}
        </a>
      </div>
    </div>

    {actions && (
      <div className='flex shrink-0 items-center gap-1'>{actions}</div>
    )}
  </div>
);

// A small icon button for a contact row's actions.
export const ContactAction = ({
  label,
  icon: Icon,
  onClick,
  disabled,
  tone = "default",
}: {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}) => (
  <button
    type='button'
    title={label}
    aria-label={label}
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "flex size-8 cursor-pointer items-center justify-center rounded-md text-gray-500 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50",
      tone === "danger"
        ? "hover:bg-red-50 hover:text-red-600"
        : "hover:bg-gray-100 hover:text-gray-800",
    )}>
    <Icon className='size-4' />
  </button>
);
