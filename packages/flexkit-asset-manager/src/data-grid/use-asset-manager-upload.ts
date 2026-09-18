import { useState } from 'react';
import { useCanMutate, useParams, useUploadAssets } from '@flexkit/studio';

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export function useAssetManagerUpload(): {
  canMutate: boolean;
  isUploading: boolean;
  uploadFiles: (files: File[]) => Promise<void>;
  uploadFromDialog: () => Promise<void>;
} {
  const { projectId } = useParams();
  const uploadAssets = useUploadAssets();
  const canMutate = useCanMutate();
  const [isUploading, setIsUploading] = useState(false);

  async function runUpload(files?: File[]): Promise<void> {
    if (!canMutate || isUploading) {
      return;
    }

    if (files && files.length === 0) {
      return;
    }

    try {
      await uploadAssets({
        files,
        maxBytes: MAX_UPLOAD_BYTES,
        multiple: true,
        onUploadStart: () => {
          setIsUploading(true);
        },
        projectId,
      });
    } finally {
      setIsUploading(false);
    }
  }

  return {
    canMutate,
    isUploading,
    uploadFiles: (files) => runUpload(files),
    uploadFromDialog: () => runUpload(),
  };
}
