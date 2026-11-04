import { z } from "zod";
import {
  codeValidator,
  titleValidator,
  longDescriptionValidator,
  positiveIntValidator,
  documentsValidator,
  dateValidator,
} from "../validators";

export const baseProposalSchema = z.object({
  code: codeValidator,
  title: titleValidator,
  description: longDescriptionValidator,
  documents: documentsValidator,
  office_id: positiveIntValidator,
  proposal_submission_date: dateValidator,
});

export const createProposalSchema = baseProposalSchema.extend({
  client_id: positiveIntValidator,
});

// A proposal stays with its client, so only its own details are edited.
export const updateProposalSchema = baseProposalSchema.extend({
  proposal_id: positiveIntValidator,
});

export const approveProposalSchema = z.object({
  proposal_id: positiveIntValidator,
});

export const rejectProposalSchema = z.object({
  proposal_id: positiveIntValidator,
});

export const getProposalsByClientSchema = z.object({
  client_id: positiveIntValidator,
});

export const getProposalByIdSchema = z.object({
  proposal_id: positiveIntValidator,
});
