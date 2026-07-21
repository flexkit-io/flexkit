import { useCallback } from 'react';
import { toast } from 'sonner';
import { useApolloClient } from '@apollo/client/react';
import { apiPaths } from './api-paths';
import type { OrderedAssetValue } from '../graphql-client/types';

export const ACCEPTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/vnd.microsoft.icon',
  'image/bmp',
  'image/gif',
  'image/tiff',
  'image/svg+xml',
  'image/avif',
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
  'image/apng',
  'audio/aac',
  'audio/mpeg',
  'audio/wav',
  'audio/webm',
  'audio/midi',
  'audio/x-midi',
  'audio/ogg',
  'video/x-msvideo',
  'video/mp4',
  'video/mpeg',
  'video/webm',
  'video/quicktime',
  'video/ogg',
  'video/mp2t',
  'video/3gpp',
  'video/3gpp2',
  'application/x-7z-compressed',
  'application/zip',
  'application/vnd.amazon.ebook',
  'application/octet-stream',
  'application/epub+zip',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-fontobject',
  'application/gzip',
  'application/x-gzip',
  'application/java-archive',
  'application/json',
  'application/ld+json',
  'text/javascript',
  'application/vnd.oasis.opendocument.presentation',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.text',
  'application/ogg',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.rar',
  'application/x-tar',
  'application/vnd.visio',
  'application/xhtml+xml',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/xml',
];

export type UploadedFileResult = {
  pathname: string;
  lqip?: string;
  size: number;
  mimeType: string;
  originalFilename: string;
  width?: number;
  height?: number;
};

export type UploadedAssetResult = UploadedFileResult & {
  asset: OrderedAssetValue;
  _id: string;
};

type AssetUploadResponse = {
  _id: string;
  path: string | null;
  mimeType: string | null;
  originalFilename: string | null;
  size: number | null;
  width: number | null;
  height: number | null;
  lqip: string | null;
  sha256: string | null;
  deduped: boolean;
};

export type OpenFileDialogAndUploadOptions = {
  projectId: string | undefined;
  accept?: string;
  multiple?: boolean;
  maxBytes?: number;
};

/**
 * Uploads a single file to the one-shot /assets endpoint, which stores the
 * blob and creates the _asset node in a single request.
 */
export async function uploadAssetFile(file: File, projectId: string | undefined): Promise<UploadedAssetResult> {
  const params = new URLSearchParams({ filename: file.name });
  const response = await fetch(`${apiPaths(projectId).assets}?${params.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Upload failed for ${file.name}`);
  }

  const data = (await response.json()) as AssetUploadResponse;
  const asset: OrderedAssetValue = {
    _id: data._id,
    path: data.path ?? '',
    originalFilename: data.originalFilename ?? file.name,
    size: data.size ?? file.size,
    mimeType: data.mimeType ?? file.type,
    lqip: data.lqip ?? '',
    width: data.width ?? 0,
    height: data.height ?? 0,
  };

  return {
    pathname: asset.path,
    lqip: asset.lqip || undefined,
    originalFilename: asset.originalFilename,
    size: asset.size,
    mimeType: asset.mimeType,
    width: asset.width || undefined,
    height: asset.height || undefined,
    _id: asset._id,
    asset,
  };
}

/**
 * Opens a native file picker and uploads selected files to the Flexkit assets
 * endpoint, which also creates an asset node in the database.
 * Returns a list of uploaded file results. Skips files that exceed maxBytes.
 */
async function openFileDialogAndUpload(options: OpenFileDialogAndUploadOptions): Promise<UploadedAssetResult[]> {
  const { projectId, accept, multiple = true, maxBytes = 4 * 1024 * 1024 } = options;

  const input = document.createElement('input');
  input.type = 'file';
  const resolvedAccept = accept ?? ACCEPTED_MIME_TYPES.join(',');

  input.accept = resolvedAccept;
  input.multiple = multiple;
  input.style.display = 'none';
  document.body.appendChild(input);

  try {
    const files = await new Promise<FileList | null>((resolve) => {
      input.onchange = () => resolve(input.files);
      input.click();
    });

    if (!files || files.length === 0) {
      return [];
    }

    const validFiles: File[] = [];

    for (const file of Array.from(files)) {
      if (file.size > maxBytes) {
        toast.error(`File size too big (max ${(maxBytes / (1024 * 1024)).toFixed(0)}MB): ${file.name}`);

        continue;
      }

      validFiles.push(file);
    }

    const uploads = await Promise.all(validFiles.map(async (file) => uploadAssetFile(file, projectId)));

    if (uploads.length > 0) {
      toast.success(`Uploaded ${uploads.length} file${uploads.length > 1 ? 's' : ''}`);
    }

    return uploads;
  } catch (error) {
    console.error(error);
    toast.error('Upload failed. Please try again.');

    return [];
  } finally {
    document.body.removeChild(input);
  }
}

export function useUploadAssets(): (options: OpenFileDialogAndUploadOptions) => Promise<UploadedAssetResult[]> {
  const apolloClient = useApolloClient();

  return useCallback(
    async (options: OpenFileDialogAndUploadOptions) => {
      const uploads = await openFileDialogAndUpload(options);

      if (uploads.length > 0) {
        // The upload happens outside Apollo, so active asset list queries
        // (e.g. the Asset Manager grid) must be refetched explicitly.
        // 'GetAssets' is the operation name getEntityQuery builds for '_assets'.
        await apolloClient
          .refetchQueries({
            include: 'active',
            onQueryUpdated: (observableQuery) => observableQuery.queryName === 'GetAssets',
          })
          .catch((error: unknown) => {
            console.error('Error refreshing asset lists after upload:', error);
          });
      }

      return uploads;
    },
    [apolloClient]
  );
}
