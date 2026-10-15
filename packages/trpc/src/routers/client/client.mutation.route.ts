import { and, eq, ne } from "drizzle-orm";
import { schema, type Database } from "@pkg/db";
import { router } from "../../trpc";
import { adminProcedure } from "../../middleware";
import { clientSchemas } from "@pkg/schema";
import { notFound, alreadyExists, fromDatabaseError } from "../../errors";
import { handleMutation } from "../../helper/typed-handler";

const { parentClientTable, clientTable, clientContactTable } = schema;

async function assertParentClientNameAvailable(
  db: Database,
  name: string,
  exceptId?: number,
) {
  const [duplicate] = await db
    .select({ id: parentClientTable.id })
    .from(parentClientTable)
    .where(
      exceptId
        ? and(eq(parentClientTable.name, name), ne(parentClientTable.id, exceptId))
        : eq(parentClientTable.name, name),
    )
    .limit(1);

  if (duplicate) {
    throw alreadyExists("Main client", name, {
      userMessage: "A main client with this name already exists.",
    });
  }
}

async function assertParentClientExists(
  db: Database,
  parentClientId: number | null | undefined,
) {
  if (!parentClientId) return;

  const [parent] = await db
    .select({ id: parentClientTable.id })
    .from(parentClientTable)
    .where(eq(parentClientTable.id, parentClientId))
    .limit(1);

  if (!parent) {
    throw notFound("Main client", parentClientId, {
      userMessage: "The selected main client no longer exists.",
    });
  }
}

export const clientMutationRouter = router({
  createParentClient: adminProcedure
    .input(clientSchemas.createParentClientSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        await assertParentClientNameAvailable(ctx.db, input.name);

        try {
          const result = await ctx.db.insert(parentClientTable).values(input);

          return { success: true, parentClientId: result[0].insertId };
        } catch (error) {
          throw fromDatabaseError(error, "Creating main client");
        }
      }),
    ),

  updateParentClient: adminProcedure
    .input(clientSchemas.updateParentClientSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        await assertParentClientExists(ctx.db, input.id);
        await assertParentClientNameAvailable(ctx.db, input.name, input.id);

        try {
          await ctx.db
            .update(parentClientTable)
            .set({ name: input.name })
            .where(eq(parentClientTable.id, input.id));

          return { success: true };
        } catch (error) {
          throw fromDatabaseError(error, "Updating main client");
        }
      }),
    ),

  // Branches are kept; the foreign key ungroups them (ON DELETE SET NULL).
  deleteParentClient: adminProcedure
    .input(clientSchemas.deleteParentClientSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        await assertParentClientExists(ctx.db, input.parentClientId);

        try {
          await ctx.db
            .delete(parentClientTable)
            .where(eq(parentClientTable.id, input.parentClientId));

          return { success: true };
        } catch (error) {
          throw fromDatabaseError(error, "Deleting main client");
        }
      }),
    ),

  createClient: adminProcedure.input(clientSchemas.createClientSchema).mutation(
    handleMutation(async ({ input, ctx }) => {
      await assertParentClientExists(ctx.db, input.parent_client_id);

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
        await assertParentClientExists(ctx.db, input.client.parent_client_id);

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

      await assertParentClientExists(ctx.db, rest.parent_client_id);

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

        await assertParentClientExists(ctx.db, client.parent_client_id);

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
