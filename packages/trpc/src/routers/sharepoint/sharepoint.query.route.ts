import { z } from "zod";
import { router } from "../../trpc";
import { protectedProcedure, isAdmin } from "../../middleware";
import { sharepointSchemas } from "@pkg/schema";
import {
  getSharePointConfig,
  isSharePointConfigured,
} from "./sharepoint.config";
import { createSharePointService } from "./sharepoint.service";
import {
  createSharePointError,
  createServiceUnavailableError,
  createNotFoundError,
} from "../../errors";

export const sharePointQueryRouter = router({
  isConfigured: protectedProcedure.query(async ({ ctx }) => {
    return {
      configured: isSharePointConfigured(ctx.appEnv),
    };
  }),

  testConnection: protectedProcedure.use(isAdmin).query(async ({ ctx }) => {
    if (!isSharePointConfigured(ctx.appEnv)) {
      return {
        success: false,
        message:
          "SharePoint is not configured. Please add SharePoint credentials to environment variables.",
        configured: false,
      };
    }

    try {
      const config = getSharePointConfig(ctx.appEnv);
      const service = createSharePointService(config);
      const result = await service.testConnection();
      return {
        ...result,
        configured: true,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Connection test failed",
        configured: true,
      };
    }
  }),

  getFiles: protectedProcedure
    .input(sharepointSchemas.getFilesSchema)
    .query(async ({ input, ctx }) => {
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
        return await service.getFiles(input.folderPath, {
          top: input.top,
          skip: input.skip,
          orderBy: input.orderBy,
        });
      } catch (error) {
        throw createSharePointError("download", {
          userMessage: "Failed to load files. Please try again.",
          devMessage:
            error instanceof Error
              ? error.message
              : "Failed to fetch files from SharePoint",
          cause: error,
        });
      }
    }),

  getFolders: protectedProcedure
    .input(sharepointSchemas.getFoldersSchema)
    .query(async ({ input, ctx }) => {
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
        return await service.getFolders(input.folderPath);
      } catch (error) {
        throw createSharePointError("download", {
          userMessage: "Failed to load folders. Please try again.",
          devMessage:
            error instanceof Error
              ? error.message
              : "Failed to fetch folders from SharePoint",
          cause: error,
        });
      }
    }),

  downloadFile: protectedProcedure
    .input(sharepointSchemas.downloadFileSchema)
    .query(async ({ input, ctx }) => {
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
        const result = await service.downloadFile(input.fileId);

        const base64Content = Buffer.from(result.content).toString("base64");

        return {
          fileName: result.fileName,
          mimeType: result.mimeType,
          content: base64Content,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "File not found";
        if (
          errorMessage.includes("404") ||
          errorMessage.toLowerCase().includes("not found")
        ) {
          throw createNotFoundError("File", input.fileId, {
            devMessage: errorMessage,
            cause: error,
          });
        }

        throw createSharePointError("download", {
          userMessage: "Failed to download the file. Please try again.",
          devMessage: errorMessage,
          cause: error,
        });
      }
    }),

  getDownloadUrls: protectedProcedure
    .input(z.object({ fileIds: z.array(z.string().min(1)).max(100) }))
    .query(async ({ input, ctx }) => {
      const empty: { id: string; url: string; mimeType: string }[] = [];
      if (input.fileIds.length === 0 || !isSharePointConfigured(ctx.appEnv)) {
        return { urls: empty };
      }

      const config = getSharePointConfig(ctx.appEnv);
      const service = createSharePointService(config);

      const uniqueIds = [...new Set(input.fileIds)];
      const settled = await Promise.allSettled(
        uniqueIds.map((id) => service.getFileDownloadUrl(id)),
      );

      const urls = settled.flatMap((res, i) =>
        res.status === "fulfilled"
          ? [
              {
                id: uniqueIds[i]!,
                url: res.value.downloadUrl,
                mimeType: res.value.mimeType,
              },
            ]
          : [],
      );

      return { urls };
    }),
});
