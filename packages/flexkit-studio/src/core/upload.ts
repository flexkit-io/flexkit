import { toast } from 'sonner';
import { apiPaths } from './api-paths';
import { useCreateAssetMutation } from '../graphql-client/use-entity-mutation';
import type { FormEntityItem } from '../graphql-client/types';

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

type UploadResponse = {
  pathname: string;
  lqip?: string;
};

export type OpenFileDialogAndUploadOptions = {
  projectId: string | undefined;
  accept?: string;
  multiple?: boolean;
  maxBytes?: number;
};

/**
 * Opens a native file picker and uploads selected files to the Flexkit upload endpoint.
 * It also creates an asset node in the database.
 * Returns a list of uploaded file results. Skips files that exceed maxBytes.
 */
async function openFileDialogAndUpload(
  options: OpenFileDialogAndUploadOptions,
  createAssetNode?: (file: UploadedFileResult, projectId?: string) => Promise<void>
): Promise<UploadedFileResult[]> {
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

    const uploadUrl = apiPaths(projectId).upload;
    const uploads = await Promise.all(
      validFiles.map(async (file): Promise<UploadedFileResult> => {
        const dimensions = await readImageDimensions(file);

        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          body: file,
        });

        if (!response.ok) {
          throw new Error(`Upload failed for ${file.name}`);
        }

        const data = (await response.json()) as UploadResponse;

        const result: UploadedFileResult = {
          pathname: data.pathname,
          lqip: data.lqip,
          originalFilename: file.name,
          size: file.size,
          mimeType: file.type,
          width: dimensions?.width,
          height: dimensions?.height,
        };

        if (createAssetNode) {
          await createAssetNode(result, projectId);
        }

        return result;
      })
    );

    if (uploads.length > 0) {
      toast.success(`Uploaded ${uploads.length} file${uploads.length > 1 ? 's' : ''}`);
    }

    return uploads;
  } catch (error) {
    // eslint-disable-next-line no-console -- surface error for debugging
    console.error(error);
    toast.error('Upload failed. Please try again.');

    return [];
  } finally {
    document.body.removeChild(input);
  }
}

async function readImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  const isImage = file.type.startsWith('image/');

  if (!isImage) {
    return null;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => resolve(null);
      img.src = reader.result as string;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

// Asset creation is delegated via the createAssetNode callback so callers can use Apollo useMutation

export function useUploadAssets(): (options: OpenFileDialogAndUploadOptions) => Promise<UploadedFileResult[]> {
  const createAsset = useCreateAssetMutation();

  return async (options: OpenFileDialogAndUploadOptions): Promise<UploadedFileResult[]> => {
    return openFileDialogAndUpload(options, async (file) => {
      const entityData: FormEntityItem = {
        path: { _id: '', disabled: false, scope: 'default', value: file.pathname },
        originalFilename: { _id: '', disabled: false, scope: 'default', value: file.originalFilename },
        size: { _id: '', disabled: false, scope: 'default', value: file.size as unknown as string },
        lqip: { _id: '', disabled: false, scope: 'default', value: file.lqip },
        mimeType: { _id: '', disabled: false, scope: 'default', value: file.mimeType },
        ...(typeof file.width === 'number'
          ? { width: { _id: '', disabled: false, scope: 'default', value: file.width as unknown as string } }
          : {}),
        ...(typeof file.height === 'number'
          ? { height: { _id: '', disabled: false, scope: 'default', value: file.height as unknown as string } }
          : {}),
      };

      await createAsset(entityData);
    });
  };
}
