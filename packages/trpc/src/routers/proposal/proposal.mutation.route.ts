import { eq } from "drizzle-orm";
import { schema } from "@pkg/db";
import { constants } from "@pkg/utils";
import { router } from "../../trpc";
import { protectedProcedure } from "../../middleware";
import { notFound, fromDatabaseError } from "../../errors";
import { handleMutation } from "../../helper/typed-handler";
import { assertOfficeMember } from "../../helper/office-permissions";
import { proposalSchemas } from "@pkg/schema";

const { proposalTable, clientTable, officeTable } = schema;

export const proposalMutationRouter = router({
  // Drafting a proposal is an office-staff action: any member (manager or
  // operator) of the target office may create one. It is forced into the
  // `pending` state — only the office manager can approve it later.
  createProposal: protectedProcedure
    .input(proposalSchemas.createProposalSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        // Caller must belong to the office this proposal is filed under
        await assertOfficeMember(ctx, input.office_id);

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
});
