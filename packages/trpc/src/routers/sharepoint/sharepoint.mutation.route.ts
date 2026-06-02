import { router } from "../../trpc";
import { protectedProcedure, operatorProcedure } from "../../middleware";
import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import {
  getSharePointConfig,
  isSharePointConfigured,
} from "./sharepoint.config";
import { createSharePointService } from "./sharepoint.service";
import {
  createSharePointError,
  createServiceUnavailableError,
  validationError,
} from "../../errors";

const uploadFileSchema = z.object({
  folderPath: z.string().min(1, "Folder path is required"),
  fileName: z.string().min(1, "File name is required"),
  content: z.string().min(1, "File content is required"),
  conflictBehavior: z
    .enum(["fail", "replace", "rename"])
    .optional()
    .default("replace"),
});

const deleteFileSchema = z.object({
  fileId: z.string().min(1, "File ID is required"),
});

const createFolderSchema = z.object({
  parentPath: z.string().optional().default("/"),
  folderName: z.string().min(1, "Folder name is required"),
});

const createUploadSessionSchema = z.object({
  folderPath: z.string().min(1, "Folder path is required"),
  fileName: z.string().min(1, "File name is required"),
  conflictBehavior: z
    .enum(["fail", "replace", "rename"])
    .optional()
    .default("replace"),
});

const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".csv",
  ".txt",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".zip",
];

const assertSafePath = (value: string, fieldName: string) => {
  if (value.includes("..") || value.includes("//") || /[<>:|?*]/.test(value)) {
    throw validationError(`Invalid ${fieldName}`, [
      { field: fieldName, message: `${fieldName} contains invalid characters` },
    ]);
  }
};

const getExtension = (fileName: string) => {
  const idx = fileName.lastIndexOf(".");
  return idx >= 0 ? fileName.slice(idx).toLowerCase() : "";
};

const sharePointMutationRouterRecord = {
  uploadFile: protectedProcedure
    .input(uploadFileSchema)
    .mutation(async ({ input, ctx }) => {
      const ext = getExtension(input.fileName);
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        throw validationError("File type not allowed", [
          {
            field: "fileName",
            message: `"${ext}" files are not permitted. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`,
          },
        ]);
      }
      assertSafePath(input.fileName, "fileName");
      assertSafePath(input.folderPath, "folderPath");

      if (!isSharePointConfigured(ctx.appEnv)) {
        throw createServiceUnavailableError("SharePoint", {
          userMessage:
            "SharePoint is not configured. Please contact your administrator.",
          devMessage:
            "SharePoint credentials not found in environment variables",
        });
      }

      try {
        const config = getSharePointConfig(ctx.appEnv);
        const service = createSharePointService(config);

        const buffer = Buffer.from(input.content, "base64");

        const file = await service.uploadFile(
          input.folderPath,
          input.fileName,
          buffer,
          { conflictBehavior: input.conflictBehavior },
        );

        return {
          success: true,
          message: "File uploaded successfully",
          file,
        };
      } catch (error) {
        throw createSharePointError("upload", {
          devMessage:
            error instanceof Error ? error.message : "Unknown upload error",
          cause: error,
        });
      }
    }),

  deleteFile: protectedProcedure
    .input(deleteFileSchema)
    .mutation(async ({ input, ctx }) => {
      if (!isSharePointConfigured(ctx.appEnv)) {
        throw createServiceUnavailableError("SharePoint", {
          userMessage:
            "SharePoint is not configured. Please contact your administrator.",
          devMessage:
            "SharePoint credentials not found in environment variables",
        });
      }

      try {
        const config = getSharePointConfig(ctx.appEnv);
        const service = createSharePointService(config);
        await service.deleteFile(input.fileId);

        return {
          success: true,
          message: "File deleted successfully",
        };
      } catch (error) {
        throw createSharePointError("upload", {
          userMessage: "Failed to delete the file. Please try again.",
          devMessage:
            error instanceof Error ? error.message : "Unknown delete error",
          cause: error,
        });
      }
    }),

  createFolder: protectedProcedure
    .input(createFolderSchema)
    .mutation(async ({ input, ctx }) => {
      assertSafePath(input.parentPath, "parentPath");
      assertSafePath(input.folderName, "folderName");

      if (!isSharePointConfigured(ctx.appEnv)) {
        throw createServiceUnavailableError("SharePoint", {
          userMessage:
            "SharePoint is not configured. Please contact your administrator.",
          devMessage:
            "SharePoint credentials not found in environment variables",
        });
      }

      try {
        const config = getSharePointConfig(ctx.appEnv);
        const service = createSharePointService(config);
        const folder = await service.createFolder(
          input.parentPath,
          input.folderName,
        );

        return {
          success: true,
          message: "Folder created successfully",
          folder,
        };
      } catch (error) {
        throw createSharePointError("upload", {
          userMessage: "Failed to create folder. Please try again.",
          devMessage:
            error instanceof Error
              ? error.message
              : "Unknown folder creation error",
          cause: error,
        });
      }
    }),

  createUploadSession: protectedProcedure
    .input(createUploadSessionSchema)
    .mutation(async ({ input, ctx }) => {
      if (!isSharePointConfigured(ctx.appEnv)) {
        throw createServiceUnavailableError("SharePoint", {
          userMessage:
            "SharePoint is not configured. Please contact your administrator.",
          devMessage:
            "SharePoint credentials not found in environment variables",
        });
      }

      try {
        const config = getSharePointConfig(ctx.appEnv);
        console.log("config", config);
        1;
        const service = createSharePointService(config);
        console.log("service", service);
        const session = await service.createUploadSession(
          input.folderPath,
          input.fileName,
          input.conflictBehavior,
        );
        console.log("session", session);
        return {
          success: true,
          ...session,
        };
      } catch (error) {
        throw createSharePointError("upload", {
          userMessage: "Failed to initialize file upload. Please try again.",
          devMessage:
            error instanceof Error
              ? error.message
              : "Failed to create upload session",
          cause: error,
        });
      }
    }),

  createPublicLink: operatorProcedure
    .input(z.object({ fileId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!isSharePointConfigured(ctx.appEnv)) {
        throw createServiceUnavailableError("SharePoint", {
          userMessage:
            "SharePoint is not configured. Please contact your administrator.",
          devMessage:
            "SharePoint credentials not found in environment variables",
        });
      }

      try {
        const config = getSharePointConfig(ctx.appEnv);
        const service = createSharePointService(config);
        const webUrl = await service.createSharingLink(input.fileId);

        return {
          success: true,
          webUrl,
        };
      } catch (error) {
        throw createSharePointError("permission", {
          userMessage: "Failed to create sharing link. Please try again.",
          devMessage:
            error instanceof Error
              ? error.message
              : "Failed to create public link",
          cause: error,
        });
      }
    }),
} satisfies TRPCRouterRecord;

export const sharePointMutationRouter = router(sharePointMutationRouterRecord);
