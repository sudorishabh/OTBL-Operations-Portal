import {
  SharePointConfig,
  getTokenEndpoint,
  GRAPH_API_BASE_URL,
} from "./sharepoint.config";

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

export interface SharePointFile {
  id: string;
  name: string;
  size: number;
  webUrl: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  mimeType?: string;
  downloadUrl?: string;
}

export interface SharePointFolder {
  id: string;
  name: string;
  webUrl: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  childCount?: number;
}

export class SharePointService {
  private config: SharePointConfig;
  private siteId: string | null = null;

  constructor(config: SharePointConfig) {
    this.config = config;
  }

  private async getAccessToken(): Promise<string> {
    if (tokenCache && tokenCache.expiresAt > Date.now() + 60000) {
      console.log("[SharePoint] Using cached access token");
      return tokenCache.accessToken;
    }

    const tokenEndpoint = getTokenEndpoint(this.config.tenantId);
    console.log(
      "[SharePoint] Requesting new access token from:",
      tokenEndpoint,
    );

    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    });

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[SharePoint] Token request failed:", {
        status: response.status,
        statusText: response.statusText,
        error,
      });
      throw new Error(
        `Failed to get access token (${response.status}): ${error}`,
      );
    }

    const data = await response.json();
    console.log("[SharePoint] Access token acquired successfully");

    tokenCache = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    return data.access_token;
  }

  private async graphRequest<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = await this.getAccessToken();
    const url = `${GRAPH_API_BASE_URL}${endpoint}`;

    console.log("[SharePoint] Making Graph API request:", {
      method: options.method || "GET",
      url,
    });

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[SharePoint] Graph API request failed:", {
        status: response.status,
        statusText: response.statusText,
        url,
        error,
      });
      throw new Error(
        `Graph API request failed: ${response.status} - ${error}`,
      );
    }

    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json();
    console.log("[SharePoint] Graph API request successful");
    return data;
  }

  async getSiteId(): Promise<string> {
    const site = await this.graphRequest<any>(
      "/sites/teriindia.sharepoint.com:/sites/OTBLDOC",
    );
    return site.id;
  }

  async testConnection(): Promise<{
    success: boolean;
    message: string;
    details?: any;
    steps?: { step: string; success: boolean; message: string }[];
  }> {
    const steps: { step: string; success: boolean; message: string }[] = [];

    try {
      console.log("[SharePoint] Step 1: Testing token acquisition...");
      let token: string;
      try {
        token = await this.getAccessToken();
        if (!token) {
          steps.push({
            step: "Token Acquisition",
            success: false,
            message: "No token returned",
          });
          return {
            success: false,
            message: "Failed to acquire access token",
            steps,
          };
        }
        steps.push({
          step: "Token Acquisition",
          success: true,
          message: "Token acquired successfully",
        });
        console.log("[SharePoint] Token acquired, length:", token.length);
      } catch (tokenError) {
        const msg =
          tokenError instanceof Error ? tokenError.message : String(tokenError);
        steps.push({ step: "Token Acquisition", success: false, message: msg });
        return {
          success: false,
          message: `Token acquisition failed: ${msg}`,
          steps,
        };
      }

      console.log("[SharePoint] Step 2: Testing basic Graph API access...");
      try {
        const rootSiteResponse = await this.graphRequest<any>("/sites/root");
        steps.push({
          step: "Root Site Access",
          success: true,
          message: `Connected to tenant: ${rootSiteResponse.displayName || rootSiteResponse.webUrl}`,
        });
      } catch (rootSiteError) {
        const msg =
          rootSiteError instanceof Error
            ? rootSiteError.message
            : String(rootSiteError);
        steps.push({ step: "Root Site Access", success: false, message: msg });

        return {
          success: false,
          message:
            "Cannot access SharePoint. Please verify:\n1. API permissions (Sites.Read.All, Sites.ReadWrite.All) are added in Azure AD\n2. Admin consent has been granted\n3. Wait a few minutes after granting consent",
          steps,
          details: {
            error: msg,
            hint: "Go to Azure Portal > App registrations > Your App > API permissions > Grant admin consent",
          },
        };
      }

      console.log("[SharePoint] Step 3: Testing specific site access...");
      try {
        const siteId = await this.getSiteId();
        steps.push({
          step: "Site Access",
          success: true,
          message: `Site ID: ${siteId}`,
        });
      } catch (siteError) {
        const msg =
          siteError instanceof Error ? siteError.message : String(siteError);
        steps.push({ step: "Site Access", success: false, message: msg });
        return {
          success: false,
          message: `Cannot access the specified SharePoint site. Please verify the SHAREPOINT_SITE_URL is correct.`,
          steps,
          details: {
            configuredUrl: this.config.siteUrl,
            error: msg,
          },
        };
      }

      return {
        success: true,
        message: "All connection tests passed!",
        steps,
        details: {
          siteUrl: this.config.siteUrl,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("[SharePoint] Connection test failed:", errorMessage);
      return {
        success: false,
        message: errorMessage,
        steps,
      };
    }
  }

  async getDriveId(): Promise<string> {
    const siteId = await this.getSiteId();

    const drive = await this.graphRequest<any>(`/sites/${siteId}/drive`);

    return drive.id;
  }

  async getFiles(
    folderPath: string = "/",
    options?: {
      top?: number;
      skip?: number;
      orderBy?: string;
    },
  ): Promise<SharePointFile[]> {
    const driveId = await this.getDriveId();

    let queryParams: string[] = [];
    if (options?.top) {
      queryParams.push(`$top=${options.top}`);
    }
    if (options?.skip) {
      queryParams.push(`$skip=${options.skip}`);
    }
    if (options?.orderBy) {
      queryParams.push(`$orderby=${encodeURIComponent(options.orderBy)}`);
    }

    const queryString =
      queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
    const encodedPath = encodeURIComponent(folderPath).replace(/%2F/g, "/");

    const endpoint =
      folderPath === "/"
        ? `/drives/${driveId}/root/children${queryString}`
        : `/drives/${driveId}/root:${encodedPath}:/children${queryString}`;

    const response = await this.graphRequest<{ value: any[] }>(endpoint);

    return response.value
      .filter((item) => item.file)
      .map((item) => ({
        id: item.id,
        name: item.name,
        size: item.size,
        webUrl: item.webUrl,
        createdDateTime: item.createdDateTime,
        lastModifiedDateTime: item.lastModifiedDateTime,
        mimeType: item.file?.mimeType,
        downloadUrl: item["@microsoft.graph.downloadUrl"],
      }));
  }

  async getFolders(folderPath: string = "/"): Promise<SharePointFolder[]> {
    const driveId = await this.getDriveId();
    const encodedPath = encodeURIComponent(folderPath).replace(/%2F/g, "/");

    const endpoint =
      folderPath === "/"
        ? `/drives/${driveId}/root/children`
        : `/drives/${driveId}/root:${encodedPath}:/children`;

    const response = await this.graphRequest<{ value: any[] }>(endpoint);

    return response.value
      .filter((item) => item.folder)
      .map((item) => ({
        id: item.id,
        name: item.name,
        webUrl: item.webUrl,
        createdDateTime: item.createdDateTime,
        lastModifiedDateTime: item.lastModifiedDateTime,
        childCount: item.folder?.childCount,
      }));
  }

  private static readonly SIMPLE_UPLOAD_MAX_SIZE = 4 * 1024 * 1024;
  private static readonly UPLOAD_CHUNK_SIZE = 10 * 1024 * 1024;

  async uploadFile(
    folderPath: string,
    fileName: string,
    content: Buffer | ArrayBuffer | string,
    options?: {
      conflictBehavior?: "fail" | "replace" | "rename";
      onProgress?: (uploaded: number, total: number) => void;
    },
  ): Promise<SharePointFile> {
    let fileBuffer: Buffer;
    if (Buffer.isBuffer(content)) {
      fileBuffer = content;
    } else if (content instanceof ArrayBuffer) {
      fileBuffer = Buffer.from(content);
    } else {
      fileBuffer = Buffer.from(content, "utf-8");
    }

    const fileSize = fileBuffer.length;
    console.log(
      `[SharePoint] Uploading file: ${fileName}, size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`,
    );

    if (fileSize <= SharePointService.SIMPLE_UPLOAD_MAX_SIZE) {
      return this.uploadSmallFile(folderPath, fileName, fileBuffer, options);
    } else {
      return this.uploadLargeFile(
        folderPath,
        fileName,
        fileBuffer,
        fileSize,
        options,
      );
    }
  }

  private async uploadSmallFile(
    folderPath: string,
    fileName: string,
    content: Buffer,
    options?: {
      conflictBehavior?: "fail" | "replace" | "rename";
    },
  ): Promise<SharePointFile> {
    const driveId = await this.getDriveId();
    const conflictBehavior = options?.conflictBehavior || "replace";

    const encodedPath = encodeURIComponent(`${folderPath}/${fileName}`).replace(
      /%2F/g,
      "/",
    );

    const bodyContent = new Uint8Array(content).buffer;

    const response = await this.graphRequest<any>(
      `/drives/${driveId}/root:${encodedPath}:/content?@microsoft.graph.conflictBehavior=${conflictBehavior}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/octet-stream",
        },
        body: bodyContent,
      },
    );

    return {
      id: response.id,
      name: response.name,
      size: response.size,
      webUrl: response.webUrl,
      createdDateTime: response.createdDateTime,
      lastModifiedDateTime: response.lastModifiedDateTime,
      mimeType: response.file?.mimeType,
      downloadUrl: response["@microsoft.graph.downloadUrl"],
    };
  }

  async createUploadSession(
    folderPath: string,
    fileName: string,
    conflictBehavior: "fail" | "replace" | "rename" = "replace",
  ): Promise<{ uploadUrl: string; expirationDateTime: string }> {
    const driveId = await this.getDriveId();

    const encodedPath = encodeURIComponent(`${folderPath}/${fileName}`).replace(
      /%2F/g,
      "/",
    );

    console.log(`[SharePoint] Creating upload session for: ${fileName}`);

    const sessionResponse = await this.graphRequest<{
      uploadUrl: string;
      expirationDateTime: string;
    }>(`/drives/${driveId}/root:${encodedPath}:/createUploadSession`, {
      method: "POST",
      body: JSON.stringify({
        item: {
          "@microsoft.graph.conflictBehavior": conflictBehavior,
          name: fileName,
        },
      }),
    });

    return sessionResponse;
  }

  async createSharingLink(
    fileId: string,
    type: "view" | "edit" | "embed" = "view",
  ): Promise<string> {
    const driveId = await this.getDriveId();

    try {
      const response = await this.graphRequest<any>(
        `/drives/${driveId}/items/${fileId}/createLink`,
        {
          method: "POST",
          body: JSON.stringify({
            type,
            scope: "anonymous",
          }),
        },
      );
      return response.link.webUrl;
    } catch (error) {
      console.warn(
        "[SharePoint] Failed to create anonymous link, falling back to organization link",
        error,
      );
      const response = await this.graphRequest<any>(
        `/drives/${driveId}/items/${fileId}/createLink`,
        {
          method: "POST",
          body: JSON.stringify({
            type,
            scope: "organization",
          }),
        },
      );
      return response.link.webUrl;
    }
  }

  private async uploadLargeFile(
    folderPath: string,
    fileName: string,
    content: Buffer,
    fileSize: number,
    options?: {
      conflictBehavior?: "fail" | "replace" | "rename";
      onProgress?: (uploaded: number, total: number) => void;
    },
  ): Promise<SharePointFile> {
    const conflictBehavior = options?.conflictBehavior || "replace";
    const token = await this.getAccessToken();

    const sessionResponse = await this.createUploadSession(
      folderPath,
      fileName,
      conflictBehavior,
    );

    const uploadUrl = sessionResponse.uploadUrl;
    console.log(
      `[SharePoint] Upload session created, expires: ${sessionResponse.expirationDateTime}`,
    );

    const chunkSize = SharePointService.UPLOAD_CHUNK_SIZE;
    let uploadedBytes = 0;
    let response: any;

    try {
      while (uploadedBytes < fileSize) {
        const chunkStart = uploadedBytes;
        const chunkEnd = Math.min(uploadedBytes + chunkSize, fileSize);
        const chunk = content.slice(chunkStart, chunkEnd);
        const chunkLength = chunkEnd - chunkStart;

        console.log(
          `[SharePoint] Uploading chunk: bytes ${chunkStart}-${chunkEnd - 1}/${fileSize} (${((chunkEnd / fileSize) * 100).toFixed(1)}%)`,
        );

        const chunkResponse = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Length": chunkLength.toString(),
            "Content-Range": `bytes ${chunkStart}-${chunkEnd - 1}/${fileSize}`,
          },
          body: new Uint8Array(chunk).buffer,
        });

        if (!chunkResponse.ok) {
          const errorText = await chunkResponse.text();
          console.error(
            `[SharePoint] Chunk upload failed: ${chunkResponse.status}`,
            errorText,
          );

          await this.cancelUploadSession(uploadUrl, token);

          throw new Error(
            `Chunk upload failed: ${chunkResponse.status} - ${errorText}`,
          );
        }

        uploadedBytes = chunkEnd;

        if (options?.onProgress) {
          options.onProgress(uploadedBytes, fileSize);
        }

        if (chunkResponse.status === 200 || chunkResponse.status === 201) {
          response = await chunkResponse.json();
        }
      }

      console.log(`[SharePoint] Large file upload completed: ${fileName}`);

      return {
        id: response.id,
        name: response.name,
        size: response.size,
        webUrl: response.webUrl,
        createdDateTime: response.createdDateTime,
        lastModifiedDateTime: response.lastModifiedDateTime,
        mimeType: response.file?.mimeType,
        downloadUrl: response["@microsoft.graph.downloadUrl"],
      };
    } catch (error) {
      try {
        await this.cancelUploadSession(uploadUrl, token);
      } catch (cancelError) {
        console.error(
          "[SharePoint] Failed to cancel upload session:",
          cancelError,
        );
      }
      throw error;
    }
  }

  private async cancelUploadSession(
    uploadUrl: string,
    token: string,
  ): Promise<void> {
    console.log("[SharePoint] Cancelling upload session...");
    try {
      await fetch(uploadUrl, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log("[SharePoint] Upload session cancelled");
    } catch (error) {
      console.error("[SharePoint] Failed to cancel upload session:", error);
    }
  }

  async downloadFile(
    fileId: string,
    options?: {
      onProgress?: (downloaded: number, total: number) => void;
    },
  ): Promise<{
    content: ArrayBuffer;
    fileName: string;
    mimeType: string;
    size: number;
  }> {
    const driveId = await this.getDriveId();
    const token = await this.getAccessToken();

    const metadata = await this.graphRequest<any>(
      `/drives/${driveId}/items/${fileId}`,
    );

    const fileSize = metadata.size || 0;
    console.log(
      `[SharePoint] Downloading file: ${metadata.name}, size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`,
    );

    const response = await fetch(
      `${GRAPH_API_BASE_URL}/drives/${driveId}/items/${fileId}/content`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status}`);
    }

    if (options?.onProgress && response.body) {
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let downloadedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        downloadedBytes += value.length;

        if (options.onProgress) {
          options.onProgress(downloadedBytes, fileSize);
        }
      }

      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      console.log(`[SharePoint] Download completed: ${metadata.name}`);

      return {
        content: result.buffer,
        fileName: metadata.name,
        mimeType: metadata.file?.mimeType || "application/octet-stream",
        size: fileSize,
      };
    }

    const content = await response.arrayBuffer();
    console.log(`[SharePoint] Download completed: ${metadata.name}`);

    return {
      content,
      fileName: metadata.name,
      mimeType: metadata.file?.mimeType || "application/octet-stream",
      size: fileSize,
    };
  }

  async getFileDownloadUrl(fileId: string): Promise<{
    downloadUrl: string;
    fileName: string;
    mimeType: string;
    size: number;
  }> {
    const driveId = await this.getDriveId();

    const metadata = await this.graphRequest<any>(
      `/drives/${driveId}/items/${fileId}`,
    );

    if (!metadata["@microsoft.graph.downloadUrl"]) {
      throw new Error("Failed to get download URL for file");
    }

    console.log(
      `[SharePoint] Got download URL for: ${metadata.name}, size: ${(metadata.size / 1024 / 1024).toFixed(2)} MB`,
    );

    return {
      downloadUrl: metadata["@microsoft.graph.downloadUrl"],
      fileName: metadata.name,
      mimeType: metadata.file?.mimeType || "application/octet-stream",
      size: metadata.size,
    };
  }

  async downloadLargeFile(
    fileId: string,
    options?: {
      chunkSize?: number;
      onProgress?: (downloaded: number, total: number) => void;
    },
  ): Promise<{
    content: Buffer;
    fileName: string;
    mimeType: string;
    size: number;
  }> {
    const driveId = await this.getDriveId();
    const token = await this.getAccessToken();

    const metadata = await this.graphRequest<any>(
      `/drives/${driveId}/items/${fileId}`,
    );

    const fileSize = metadata.size;
    const chunkSize = options?.chunkSize || 10 * 1024 * 1024;
    const chunks: Buffer[] = [];
    let downloadedBytes = 0;

    console.log(
      `[SharePoint] Downloading large file in chunks: ${metadata.name}, size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`,
    );

    while (downloadedBytes < fileSize) {
      const rangeStart = downloadedBytes;
      const rangeEnd = Math.min(downloadedBytes + chunkSize - 1, fileSize - 1);

      console.log(
        `[SharePoint] Downloading chunk: bytes ${rangeStart}-${rangeEnd}/${fileSize} (${((rangeEnd / fileSize) * 100).toFixed(1)}%)`,
      );

      const response = await fetch(
        `${GRAPH_API_BASE_URL}/drives/${driveId}/items/${fileId}/content`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Range: `bytes=${rangeStart}-${rangeEnd}`,
          },
        },
      );

      if (!response.ok && response.status !== 206) {
        throw new Error(`Failed to download file chunk: ${response.status}`);
      }

      const chunkData = await response.arrayBuffer();
      chunks.push(Buffer.from(chunkData));

      downloadedBytes += chunkData.byteLength;

      if (options?.onProgress) {
        options.onProgress(downloadedBytes, fileSize);
      }
    }

    console.log(`[SharePoint] Large file download completed: ${metadata.name}`);

    return {
      content: Buffer.concat(chunks),
      fileName: metadata.name,
      mimeType: metadata.file?.mimeType || "application/octet-stream",
      size: fileSize,
    };
  }

  async deleteFile(fileId: string): Promise<void> {
    const driveId = await this.getDriveId();
    await this.graphRequest(`/drives/${driveId}/items/${fileId}`, {
      method: "DELETE",
    });
  }

  async createFolder(
    parentPath: string,
    folderName: string,
  ): Promise<SharePointFolder> {
    const driveId = await this.getDriveId();
    const encodedPath = encodeURIComponent(parentPath).replace(/%2F/g, "/");

    const endpoint =
      parentPath === "/"
        ? `/drives/${driveId}/root/children`
        : `/drives/${driveId}/root:${encodedPath}:/children`;

    const response = await this.graphRequest<any>(endpoint, {
      method: "POST",
      body: JSON.stringify({
        name: folderName,
        folder: {},
        "@microsoft.graph.conflictBehavior": "rename",
      }),
    });

    return {
      id: response.id,
      name: response.name,
      webUrl: response.webUrl,
      createdDateTime: response.createdDateTime,
      lastModifiedDateTime: response.lastModifiedDateTime,
      childCount: response.folder?.childCount,
    };
  }
}

export function createSharePointService(
  config: SharePointConfig,
): SharePointService {
  return new SharePointService(config);
}
