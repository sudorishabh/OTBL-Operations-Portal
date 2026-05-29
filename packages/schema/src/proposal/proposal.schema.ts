import { z } from "zod";
import {
  codeValidator,
  titleValidator,
  longDescriptionValidator,
  positiveIntValidator,
  documentKeyValidator,
  dateValidator,
  pageValidator,
  limitValidator,
  searchQueryValidator,
} from "../validators";

// Base schemas

export const baseProposalSchema = z.object({
  code: codeValidator,
  title: titleValidator,
  description: longDescriptionValidator,
  document_key: documentKeyValidator,
  office_id: positiveIntValidator,
  proposal_submission_date: dateValidator,
});

// Mutation Schemas

export const createProposalSchema = baseProposalSchema.extend({
  client_id: positiveIntValidator,
});

export const updateProposalSchema = createProposalSchema.extend({
  proposal_id: positiveIntValidator,
});

// Manager-only decision schemas (approve / reject a drafted proposal)
export const approveProposalSchema = z.object({
  proposal_id: positiveIntValidator,
});

export const rejectProposalSchema = z.object({
  proposal_id: positiveIntValidator,
});

// Query Schemas

export const getProposalsByClientSchema = z.object({
  client_id: positiveIntValidator,
  limit: limitValidator.optional(),
});

export const getProposalsByClientPaginatedSchema = z.object({
  client_id: positiveIntValidator,
  page: pageValidator,
  limit: limitValidator,
  searchQuery: searchQueryValidator,
});

export const getProposalByIdSchema = z.object({
  proposal_id: positiveIntValidator,
});
