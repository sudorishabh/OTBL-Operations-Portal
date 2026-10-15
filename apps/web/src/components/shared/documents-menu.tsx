"use client";
import React from "react";
import { FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  documentName,
  openDocument,
  type StoredDocument,
} from "@/lib/documents";

interface Props {
  documents: StoredDocument[];
  // The trigger, e.g. a "View document" button; give it no onClick.
  children: React.ReactNode;
  align?: "start" | "center" | "end";
}

// One document opens straight away; several open a menu to pick from.
const DocumentsMenu = ({ documents, children, align = "end" }: Props) => {
  if (documents.length === 0) return null;

  if (documents.length === 1) {
    return (
      <span
        className='inline-flex'
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openDocument(documents[0]!);
        }}>
        {children}
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <span
          className='inline-flex'
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}>
          {children}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className='w-72'
        onClick={(e) => e.stopPropagation()}>
        <DropdownMenuLabel className='text-xs font-medium text-gray-500'>
          {documents.length} documents
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {documents.map((doc, index) => (
          <DropdownMenuItem
            key={`${doc.url}-${index}`}
            onSelect={() => openDocument(doc)}
            className='cursor-pointer'>
            <FileText className='size-4 shrink-0 text-gray-400' />
            <span
              className='truncate'
              title={documentName(doc, index)}>
              {documentName(doc, index)}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DocumentsMenu;
