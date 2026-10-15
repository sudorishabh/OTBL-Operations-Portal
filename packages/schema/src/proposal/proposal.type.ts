import z from "zod";
import * as proposalSchema from "./proposal.schema";
import { workOrderType } from "../work-order/work-order.type";
import type { StoredDocument } from "../validators";

export type BaseProposalInput = z.infer<
  typeof proposalSchema.baseProposalSchema
>;
export type createProposalType = z.infer<
  typeof proposalSchema.createProposalSchema
>;
export type updateProposalType = z.infer<
  typeof proposalSchema.updateProposalSchema
>;

export type proposalType = {
  client_id: number;
  id: number;
  office_id: number;
  code: string;
  title: string;
  documents: StoredDocument[] | null;
  description: string | null;
  proposal_submission_date: string;
  status: "approved" | "rejected" | "pending";
  created_by: number | null;
  created_at: string;
  updated_at: string;
};

export type getProposalsByClientReturnType = {
  proposal: proposalType;
  workOrder: workOrderType | null;
};
