import { z } from "zod";
import {
  codeValidator,
  titleValidator,
  longDescriptionValidator,
  positiveIntValidator,
  documentsValidator,
  dateValidator,
  limitValidator,
  pageValidator,
  searchQueryValidator,
} from "../validators";
import { processTypeEnum } from "../work-order/work-order.schema";

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

// A proposal's row is grouped by its work order: none yet, or its status.
export const proposalWorkOrderFilterEnum = z.enum([
  "all",
  "none",
  "pending",
  "completed",
  "cancelled",
]);

export const PROPOSALS_PAGE_SIZE = 50;

export const getProposalsByClientSchema = z.object({
  client_id: positiveIntValidator,
  // The page to load; named for tRPC's infinite queries.
  cursor: pageValidator.optional(),
  limit: limitValidator.unwrap().default(PROPOSALS_PAGE_SIZE),
  // Matches the code or title of the proposal or its work order.
  search: searchQueryValidator,
  workOrder: proposalWorkOrderFilterEnum.default("all"),
  proposalStatus: z
    .enum(["all", "pending", "approved", "rejected"])
    .default("all"),
  process: z.union([z.literal("all"), processTypeEnum]).default("all"),
});

export const getProposalByIdSchema = z.object({
  proposal_id: positiveIntValidator,
});
