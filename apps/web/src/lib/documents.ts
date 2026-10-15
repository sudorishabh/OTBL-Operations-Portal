import type { validators } from "@pkg/schema";

export type StoredDocument = validators.StoredDocument;

// A record's `documents` column is a JSON list; tolerate null or bad rows.
export const toDocuments = (value: unknown): StoredDocument[] =>
  Array.isArray(value)
    ? value.filter(
        (doc): doc is StoredDocument =>
          !!doc && typeof doc === "object" && typeof doc.url === "string",
      )
    : [];

export const documentName = (doc: StoredDocument, index: number) =>
  doc.name?.trim() || `Document ${index + 1}`;

export const openDocument = (doc: StoredDocument) =>
  window.open(doc.url, "_blank", "noopener,noreferrer");

// Shape the SharePoint upload hook returns, stored as-is on the record.
export const toStoredDocument = (file: {
  id: string;
  name: string;
  webUrl: string;
}): StoredDocument => ({ url: file.webUrl, id: file.id, name: file.name });
