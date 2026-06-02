import { useState, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import toast from "react-hot-toast";
import { parseApiError } from "@pkg/trpc/errors";

interface UploadedFile {
  id: string;
  name: string;
  webUrl: string;
}

interface UseUploadDocumentOptions {
  folderPath: string;
  allowedExtensions?: string[];
  maxSizeMB?: number;
  onUploadComplete?: (filePath: string) => void;
  onFileChange?: (file: UploadedFile | null) => void;
  onUploadingChange?: (isUploading: boolean) => void;
}

export const useUploadDocument = ({
  folderPath,
  allowedExtensions = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt"],
  maxSizeMB = 10,
  onUploadComplete,
  onFileChange,
  onUploadingChange,
}: UseUploadDocumentOptions) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);

  useEffect(() => {
    if (onUploadingChange) {
      onUploadingChange(uploading);
    }
  }, [uploading, onUploadingChange]);

  const deleteMutation = trpc.sharePointMutation.deleteFile.useMutation({
    onSuccess: () => {
      toast.success("File deleted successfully");
      setUploadedFile(null);
      setFile(null);
      setProgress(0);
      onUploadComplete?.("");
      onFileChange?.(null);
    },
    onError: (error: any) => {
      const parsed = parseApiError(error);
      console.error("Delete error:", error);
      toast.error(parsed.message);
    },
  });

  const createSessionMutation =
    trpc.sharePointMutation.createUploadSession.useMutation({
      onError: (error: any) => {
        setUploading(false);
        const parsed = parseApiError(error);
        console.error("Session creation error:", error);
        toast.error(parsed.message);
      },
    });

  const validateFile = (selectedFile: File): boolean => {
    const fileSizeMB = selectedFile.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      toast.error(`File size must be less than ${maxSizeMB}MB`);
      return false;
    }

    const fileExtension =
      "." + selectedFile.name.split(".").pop()?.toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      toast.error(
        `Invalid file type. Allowed: ${allowedExtensions.join(", ")}`,
      );
      return false;
    }

    return true;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
        setUploadedFile(null);
        setProgress(0);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
        setUploadedFile(null);
        setProgress(0);
      }
    }
  };

  const createPublicLinkMutation =
    trpc.sharePointMutation.createPublicLink.useMutation();

  const handleUpload = useCallback(() => {
    if (!file) return;

    setUploading(true);
    setProgress(1);

    createSessionMutation.mutate(
      {
        folderPath,
        fileName: file.name,
        conflictBehavior: "replace",
      },
      {
        onSuccess: (sessionData: any) => {
          const uploadUrl = sessionData.uploadUrl;

          const xhr = new XMLHttpRequest();
          xhr.open("PUT", uploadUrl, true);

          const rangeHeader = `bytes 0-${file.size - 1}/${file.size}`;
          console.log("Upload Content-Range:", rangeHeader);

          xhr.setRequestHeader("Content-Range", rangeHeader);

          xhr.upload.onprogress = (e: any) => {
            if (e.lengthComputable) {
              const percent = Math.round((e.loaded / e.total) * 90);
              setProgress(percent);
            }
          };

          xhr.onload = async (e: any) => {
            if (e.target.status === 200 || e.target.status === 201) {
              try {
                const data = JSON.parse(e.target.response);

                try {
                  const linkResult = await createPublicLinkMutation.mutateAsync(
                    {
                      fileId: data.id,
                    },
                  );

                  const fileData: UploadedFile = {
                    id: data.id,
                    name: data.name,
                    webUrl: linkResult.webUrl,
                  };

                  setUploadedFile(fileData);
                  const path = linkResult.webUrl;

                  setUploading(false);
                  setProgress(100);

                  onUploadComplete?.(path);
                  onFileChange?.(fileData);
                  toast.success(
                    "File uploaded and public link created successfully",
                  );
                } catch (linkError) {
                  console.error("Failed to create public link", linkError);
                  toast.error("File uploaded but failed to create public link");
                  const fileData: UploadedFile = {
                    id: data.id,
                    name: data.name,
                    webUrl: data.webUrl,
                  };
                  setUploadedFile(fileData);
                  setUploading(false);
                  setProgress(100);
                  onUploadComplete?.(data.webUrl);
                  onFileChange?.(fileData);
                }
              } catch (e) {
                setUploading(false);
                console.error("Failed to parse response", e);
                toast.error("Upload succeeded but failed to parse response");
              }
            } else {
              setUploading(false);
              console.error(
                "Upload failed",
                e.target.status,
                e.target.responseText,
              );
              toast.error(`Upload failed: Server returned ${e.target.status}`);
            }
          };

          xhr.onerror = (e: any) => {
            setUploading(false);
            console.error(
              "XHR Error",
              e.target.status,
              e.target.responseText || ("No response text" as string),
            );
            toast.error(
              `Network error during upload: ${e.target.status} ${e.target.responseText || ("No response text" as string)}`,
            );
          };

          xhr.send(file.slice(0, file.size));
        },
      },
    );
  }, [
    file,
    folderPath,
    createSessionMutation,
    createPublicLinkMutation,
    onUploadComplete,
    onFileChange,
  ]);

  const clearFile = () => {
    setFile(null);
    setUploadedFile(null);
    setProgress(0);
  };

  const removeFile = useCallback(() => {
    if (uploadedFile?.id) {
      deleteMutation.mutate({ fileId: uploadedFile.id });
    } else {
      clearFile();
    }
  }, [uploadedFile, deleteMutation]);

  return {
    file,
    uploading,
    progress,
    uploadedFile,
    handleFileSelect,
    handleDrop,
    handleUpload,
    clearFile,
    removeFile,
    isDeleting: deleteMutation.isPending,
  };
};
