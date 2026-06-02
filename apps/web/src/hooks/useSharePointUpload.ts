import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import toast from "react-hot-toast";

interface UploadedFileInfo {
  id: string;
  name: string;
  webUrl: string;
}

interface UseSharePointUploadOptions {
  folderPath: string;
  conflictBehavior?: "rename" | "replace" | "fail";
  onUploadComplete?: (fileInfo: UploadedFileInfo) => void;
  onUploadError?: (error: Error) => void;
  onDeleteComplete?: () => void;
}

interface UseSharePointUploadReturn {
  isUploading: boolean;
  isDeleting: boolean;
  progress: number;
  uploadFile: (file: File) => Promise<UploadedFileInfo | null>;
  deleteFile: (fileId: string) => Promise<void>;
  reset: () => void;
}

export const useSharePointUpload = ({
  folderPath,
  conflictBehavior = "replace",
  onUploadComplete,
  onUploadError,
  onDeleteComplete,
}: UseSharePointUploadOptions): UseSharePointUploadReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [progress, setProgress] = useState(0);

  const createSessionMutation =
    trpc.sharePointMutation.createUploadSession.useMutation();
  const createPublicLinkMutation =
    trpc.sharePointMutation.createPublicLink.useMutation();
  const deleteFileMutation = trpc.sharePointMutation.deleteFile.useMutation({
    onSuccess: () => {
      toast.success("File deleted successfully");
      onDeleteComplete?.();
    },
    onError: (error: unknown) => {
      console.error("Delete error:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to delete the file. Please try again.";
      toast.error(message);
    },
  });

  const uploadFile = useCallback(
    async (file: File): Promise<UploadedFileInfo | null> => {
      if (!file) {
        console.warn("No file provided for upload");
        return null;
      }

      setIsUploading(true);
      setProgress(5);

      try {
        const sessionData = await createSessionMutation.mutateAsync({
          folderPath,
          fileName: file.name,
          conflictBehavior,
        });

        setProgress(10);

        const uploadResult = await new Promise<UploadedFileInfo>(
          (resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("PUT", sessionData.uploadUrl, true);

            const rangeHeader = `bytes 0-${file.size - 1}/${file.size}`;
            xhr.setRequestHeader("Content-Range", rangeHeader);

            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const percent = 10 + Math.round((e.loaded / e.total) * 70);
                setProgress(percent);
              }
            };

            xhr.onload = () => {
              if (xhr.status === 200 || xhr.status === 201) {
                try {
                  const data = JSON.parse(xhr.response);
                  resolve({
                    id: data.id,
                    name: data.name,
                    webUrl: data.webUrl,
                  });
                } catch (e) {
                  reject(new Error("Failed to parse upload response"));
                }
              } else {
                reject(
                  new Error(`Upload failed: Server returned ${xhr.status}`),
                );
              }
            };

            xhr.onerror = () => {
              reject(new Error("Network error during upload"));
            };

            xhr.send(file.slice(0, file.size));
          },
        );

        setProgress(85);

        const linkResult = await createPublicLinkMutation.mutateAsync({
          fileId: uploadResult.id,
        });

        setProgress(100);

        const fileInfo: UploadedFileInfo = {
          id: uploadResult.id,
          name: uploadResult.name,
          webUrl: linkResult.webUrl,
        };

        setIsUploading(false);

        onUploadComplete?.(fileInfo);
        toast.success("File uploaded successfully");

        return fileInfo;
      } catch (error) {
        setIsUploading(false);
        setProgress(0);

        const errorMessage =
          error instanceof Error ? error.message : "Upload failed";
        console.error("Upload error:", error);
        toast.error(errorMessage);

        onUploadError?.(
          error instanceof Error ? error : new Error(errorMessage),
        );

        return null;
      }
    },
    [
      folderPath,
      conflictBehavior,
      createSessionMutation,
      createPublicLinkMutation,
      onUploadComplete,
      onUploadError,
    ],
  );

  const deleteFile = useCallback(
    async (fileId: string) => {
      if (!fileId) {
        console.warn("No file ID provided for deletion");
        return;
      }

      setIsDeleting(true);
      try {
        await deleteFileMutation.mutateAsync({ fileId });
      } finally {
        setIsDeleting(false);
      }
    },
    [deleteFileMutation],
  );

  const reset = useCallback(() => {
    setProgress(0);
    setIsUploading(false);
    setIsDeleting(false);
  }, []);

  return {
    isUploading,
    isDeleting,
    progress,
    uploadFile,
    deleteFile,
    reset,
  };
};

export type {
  UploadedFileInfo,
  UseSharePointUploadOptions,
  UseSharePointUploadReturn,
};
