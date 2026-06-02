import { eq } from "drizzle-orm";
import { schema } from "@pkg/db";
import { router } from "../../trpc";
import { adminProcedure } from "../../middleware";
import { clientSchemas } from "@pkg/schema";
import { notFound, fromDatabaseError } from "../../errors";
import { handleMutation } from "../../helper/typed-handler";

const { clientTable, clientContactTable } = schema;

export const clientMutationRouter = router({
  createClient: adminProcedure.input(clientSchemas.createClientSchema).mutation(
    handleMutation(async ({ input, ctx }) => {
      try {
        const result = await ctx.db.insert(clientTable).values(input);

        return {
          success: true,
          clientId: result[0].insertId,
        };
      } catch (error) {
        throw fromDatabaseError(error, "Creating client");
      }
    }),
  ),

  createClientWithContacts: adminProcedure
    .input(clientSchemas.createClientWithContactsSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        try {
          const clientResult = await ctx.db
            .insert(clientTable)
            .values(input.client);
          const clientId = clientResult[0].insertId;

          if (input.contacts && input.contacts.length > 0) {
            const contactsWithClientId = input.contacts.map((contact) => ({
              ...contact,
              client_id: clientId,
            }));

            await ctx.db
              .insert(clientContactTable)
              .values(contactsWithClientId);
          }

          return {
            success: true,
            clientId,
            contactsAdded: input.contacts?.length || 0,
          };
        } catch (error) {
          throw fromDatabaseError(error, "Creating client with contacts");
        }
      }),
    ),

  updateClient: adminProcedure.input(clientSchemas.updateClientSchema).mutation(
    handleMutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;

      const existingClient = await ctx.db
        .select()
        .from(clientTable)
        .where(eq(clientTable.id, id));

      if (existingClient.length === 0) {
        throw notFound("Client", id);
      }

      try {
        await ctx.db
          .update(clientTable)
          .set(rest)
          .where(eq(clientTable.id, id));

        return { success: true };
      } catch (error) {
        throw fromDatabaseError(error, "Updating client");
      }
    }),
  ),

  deleteClient: adminProcedure.input(clientSchemas.deleteClientSchema).mutation(
    handleMutation(async ({ input, ctx }) => {
      const existingClient = await ctx.db
        .select()
        .from(clientTable)
        .where(eq(clientTable.id, input.clientId));

      if (existingClient.length === 0) {
        throw notFound("Client", input.clientId);
      }

      try {
        await ctx.db
          .delete(clientTable)
          .where(eq(clientTable.id, input.clientId));

        return { success: true };
      } catch (error) {
        throw fromDatabaseError(error, "Deleting client");
      }
    }),
  ),

  createClientContact: adminProcedure
    .input(clientSchemas.createClientContactSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const client = await ctx.db
          .select()
          .from(clientTable)
          .where(eq(clientTable.id, input.client_id));

        if (client.length === 0) {
          throw notFound("Client", input.client_id, {
            userMessage: "Cannot add contact: the client doesn't exist.",
          });
        }

        try {
          const result = await ctx.db.insert(clientContactTable).values(input);

          return {
            success: true,
            contactId: result[0].insertId,
          };
        } catch (error) {
          throw fromDatabaseError(error, "Creating client contact");
        }
      }),
    ),

  updateClientContact: adminProcedure
    .input(clientSchemas.updateClientContactSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const { id, ...rest } = input;

        const existingContact = await ctx.db
          .select()
          .from(clientContactTable)
          .where(eq(clientContactTable.id, id));

        if (existingContact.length === 0) {
          throw notFound("Client contact", id);
        }

        try {
          await ctx.db
            .update(clientContactTable)
            .set(rest)
            .where(eq(clientContactTable.id, id));

          return { success: true };
        } catch (error) {
          throw fromDatabaseError(error, "Updating client contact");
        }
      }),
    ),

  deleteClientContact: adminProcedure
    .input(clientSchemas.deleteClientContactSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const existingContact = await ctx.db
          .select()
          .from(clientContactTable)
          .where(eq(clientContactTable.id, input.clientContactId));

        if (existingContact.length === 0) {
          throw notFound("Client contact", input.clientContactId);
        }

        try {
          await ctx.db
            .delete(clientContactTable)
            .where(eq(clientContactTable.id, input.clientContactId));

          return { success: true };
        } catch (error) {
          throw fromDatabaseError(error, "Deleting client contact");
        }
      }),
    ),

  updateClientWithContacts: adminProcedure
    .input(clientSchemas.updateClientWithContactsSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const { clientId, client, contactsToAdd, contactsToRemove } = input;

        const existingClient = await ctx.db
          .select()
          .from(clientTable)
          .where(eq(clientTable.id, clientId));

        if (existingClient.length === 0) {
          throw notFound("Client", clientId);
        }

        try {
          if (Object.keys(client).length > 0) {
            await ctx.db
              .update(clientTable)
              .set(client)
              .where(eq(clientTable.id, clientId));
          }

          if (contactsToRemove && contactsToRemove.length > 0) {
            for (const contactId of contactsToRemove) {
              await ctx.db
                .delete(clientContactTable)
                .where(eq(clientContactTable.id, contactId));
            }
          }

          if (contactsToAdd && contactsToAdd.length > 0) {
            const contactsWithClientId = contactsToAdd.map((contact) => ({
              ...contact,
              client_id: clientId,
            }));

            await ctx.db
              .insert(clientContactTable)
              .values(contactsWithClientId);
          }

          return {
            success: true,
            clientId,
            contactsAdded: contactsToAdd?.length || 0,
            contactsRemoved: contactsToRemove?.length || 0,
          };
        } catch (error) {
          throw fromDatabaseError(error, "Updating client with contacts");
        }
      }),
    ),
});
