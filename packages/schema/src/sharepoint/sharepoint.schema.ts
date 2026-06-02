import { z } from "zod";

export const uploadFileSchema = z.object({
  folderPath: z.string().min(1, "Folder path is required"),
  fileName: z.string().min(1, "File name is required"),
  content: z.string().min(1, "File content is required"),
  conflictBehavior: z
    .enum(["fail", "replace", "rename"])
    .optional()
    .default("replace"),
});

export const deleteFileSchema = z.object({
  fileId: z.string().min(1, "File ID is required"),
});

export const createFolderSchema = z.object({
  parentPath: z.string().optional().default("/"),
  folderName: z.string().min(1, "Folder name is required"),
});

export const createUploadSessionSchema = z.object({
  folderPath: z.string().min(1, "Folder path is required"),
  fileName: z.string().min(1, "File name is required"),
  conflictBehavior: z
    .enum(["fail", "replace", "rename"])
    .optional()
    .default("replace"),
});

export const getFilesSchema = z.object({
  folderPath: z.string().optional().default("/"),
  top: z.number().int().positive().max(1000).optional(),
  skip: z.number().int().nonnegative().optional(),
  orderBy: z.string().optional(),
});

export const getFoldersSchema = z.object({
  folderPath: z.string().optional().default("/"),
});

export const downloadFileSchema = z.object({
  fileId: z.string().min(1, "File ID is required"),
});
