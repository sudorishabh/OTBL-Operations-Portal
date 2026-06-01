import { eq } from "drizzle-orm";
import { schema } from "@pkg/db";
import { constants } from "@pkg/utils";
import { router } from "../../trpc";
import { adminProcedure } from "../../middleware";
import { notFound, fromDatabaseError, businessRule } from "../../errors";
import { handleMutation } from "../../helper/typed-handler";
import { proposalSchemas } from "@pkg/schema";

const { proposalTable, clientTable, officeTable } = schema;

export const proposalMutationRouter = router({
  // Admin-only: only a global admin may create a proposal. Office managers and
  // operators are read-only on proposals — they can view those filed under
  // their office but cannot draft, approve, or reject. Forced into the
  // `pending` state; approval is a separate admin-only transition.
  createProposal: adminProcedure
    .input(proposalSchemas.createProposalSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        // Verify client exists
        const client = await ctx.db
          .select()
          .from(clientTable)
          .where(eq(clientTable.id, input.client_id));

        if (client.length === 0) {
          throw notFound("Client", input.client_id, {
            userMessage: "The selected client doesn't exist.",
          });
        }

        // Verify office exists
        const office = await ctx.db
          .select()
          .from(officeTable)
          .where(eq(officeTable.id, input.office_id));

        if (office.length === 0) {
          throw notFound("Office", input.office_id, {
            userMessage: "The selected office doesn't exist.",
          });
        }

        try {
          const result = await ctx.db.insert(proposalTable).values({
            ...input,
            // Force draft state regardless of payload; approval is a
            // separate, manager-only transition.
            status: constants.PROPOSAL_STATUS.PENDING,
          });

          return {
            success: true,
            proposalId: result[0].insertId,
          };
        } catch (error) {
          throw fromDatabaseError(error, "Creating proposal");
        }
      }),
    ),

  // Admin-only: approve a drafted (pending) proposal.
  approveProposal: adminProcedure
    .input(proposalSchemas.approveProposalSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const [proposal] = await ctx.db
          .select()
          .from(proposalTable)
          .where(eq(proposalTable.id, input.proposal_id));

        if (!proposal) {
          throw notFound("Proposal", input.proposal_id);
        }

        if (proposal.status !== constants.PROPOSAL_STATUS.PENDING) {
          throw businessRule(
            `Only pending proposals can be approved (current status: ${proposal.status}).`,
          );
        }

        try {
          await ctx.db
            .update(proposalTable)
            .set({ status: constants.PROPOSAL_STATUS.APPROVED })
            .where(eq(proposalTable.id, input.proposal_id));

          return { success: true };
        } catch (error) {
          throw fromDatabaseError(error, "Approving proposal");
        }
      }),
    ),

  // Admin-only: reject a drafted (pending) proposal.
  rejectProposal: adminProcedure
    .input(proposalSchemas.rejectProposalSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const [proposal] = await ctx.db
          .select()
          .from(proposalTable)
          .where(eq(proposalTable.id, input.proposal_id));

        if (!proposal) {
          throw notFound("Proposal", input.proposal_id);
        }

        if (proposal.status !== constants.PROPOSAL_STATUS.PENDING) {
          throw businessRule(
            `Only pending proposals can be rejected (current status: ${proposal.status}).`,
          );
        }

        try {
          await ctx.db
            .update(proposalTable)
            .set({ status: constants.PROPOSAL_STATUS.REJECTED })
            .where(eq(proposalTable.id, input.proposal_id));

          return { success: true };
        } catch (error) {
          throw fromDatabaseError(error, "Rejecting proposal");
        }
      }),
    ),
});
