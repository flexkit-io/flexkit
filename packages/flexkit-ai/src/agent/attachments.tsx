import type { JSX } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FileIcon, XIcon } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  Spinner,
  usePromptInputAttachments,
  usePromptInputController,
} from '@flexkit/studio/ui';
import type { ApiClient } from '../api';
import type { AgentChatAttachment, AgentChatPart } from '../types';

/** Mirrors the platform limits so invalid files are rejected before upload. */
export const ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024;
export const ATTACHMENTS_MAX_PER_MESSAGE = 10;

const SUPPORTED_EXTENSIONS = new Set([
  'css',
  'csv',
  'gif',
  'gql',
  'graphql',
  'htm',
  'html',
  'jpeg',
  'jpg',
  'js',
  'json',
  'jsx',
  'log',
  'markdown',
  'md',
  'mjs',
  'ndjson',
  'pdf',
  'png',
  'py',
  'sql',
  'ts',
  'tsv',
  'tsx',
  'txt',
  'webp',
  'xml',
  'yaml',
  'yml',
]);

const SUPPORTED_UNNAMED_TYPES = new Set(['application/pdf', 'image/gif', 'image/jpeg', 'image/png', 'image/webp']);

/** Comma-separated `accept` value for the file picker. */
export const ATTACHMENT_ACCEPT = [
  ...[...SUPPORTED_EXTENSIONS].map((extension) => `.${extension}`),
  ...SUPPORTED_UNNAMED_TYPES,
].join(',');

function getExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf('.');

  return dotIndex <= 0 ? '' : filename.slice(dotIndex + 1).toLowerCase();
}

/** Why a file cannot be attached, or null when it can. */
export function getAttachmentValidationError(file: { name: string; size: number; type: string }): string | null {
  const extension = getExtension(file.name);
  const supported = extension ? SUPPORTED_EXTENSIONS.has(extension) : SUPPORTED_UNNAMED_TYPES.has(file.type);

  if (!supported) {
    return `"${file.name}" is not supported. Attach images, PDFs, or text files.`;
  }

  if (file.size === 0) {
    return `"${file.name}" is empty.`;
  }

  if (file.size > ATTACHMENT_MAX_BYTES) {
    return `"${file.name}" exceeds the ${String(Math.round(ATTACHMENT_MAX_BYTES / (1024 * 1024)))} MB limit.`;
  }

  return null;
}

type UploadStatus = 'uploading' | 'done' | 'error';

interface UploadEntry {
  attachment?: AgentChatAttachment;
  controller: AbortController;
  status: UploadStatus;
}

export interface AttachmentUploads {
  /** Uploaded attachments for the given composer file ids, in the same order. */
  getUploaded: (_fileIds: string[]) => AgentChatAttachment[];
  isUploading: boolean;
  /** Whether the composer file with this id is still uploading. */
  isUploadingFile: (_fileId: string) => boolean;
}

async function readComposerFile(file: { filename?: string; mediaType?: string; url: string }): Promise<File> {
  const response = await fetch(file.url);
  const blob = await response.blob();

  return new File([blob], file.filename ?? 'file', { type: file.mediaType || blob.type });
}

/**
 * Uploads every file added to the composer as soon as it appears, so the
 * message can be sent as soon as the user is done typing. Files that fail
 * validation or are refused by the platform (unsupported type, size, daily
 * cap, restricted project) are removed again with an explanation.
 */
export function useAttachmentUploads(api: ApiClient, onError: (_message: string) => void): AttachmentUploads {
  const { attachments } = usePromptInputController();
  const entriesRef = useRef<{ [fileId: string]: UploadEntry }>({});
  const [, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((current) => current + 1), []);
  const removeRef = useRef(attachments.remove);
  removeRef.current = attachments.remove;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    const currentIds = new Set(attachments.files.map((file) => file.id));

    // Abort and forget uploads whose file was removed from the composer.
    for (const [fileId, entry] of Object.entries(entriesRef.current)) {
      if (!currentIds.has(fileId)) {
        entry.controller.abort();
        delete entriesRef.current[fileId];
      }
    }

    for (const file of attachments.files) {
      if (entriesRef.current[file.id]) {
        continue;
      }

      const controller = new AbortController();
      const entry: UploadEntry = { controller, status: 'uploading' };
      entriesRef.current[file.id] = entry;

      void (async () => {
        try {
          const nativeFile = await readComposerFile(file);
          const validationError = getAttachmentValidationError(nativeFile);

          if (validationError) {
            throw new Error(validationError);
          }

          const uploaded = await api.uploadAgentChatAttachment(nativeFile, controller.signal);

          if (controller.signal.aborted) {
            return;
          }

          entry.attachment = uploaded;
          entry.status = 'done';
        } catch (error) {
          if (controller.signal.aborted) {
            return;
          }

          entry.status = 'error';
          delete entriesRef.current[file.id];
          removeRef.current(file.id);
          onErrorRef.current(error instanceof Error ? error.message : 'The file could not be uploaded.');
        } finally {
          bump();
        }
      })();
    }

    bump();
  }, [api, attachments.files, bump]);

  const isUploading = Object.values(entriesRef.current).some((entry) => entry.status === 'uploading');

  return {
    getUploaded: (fileIds) =>
      fileIds
        .map((fileId) => entriesRef.current[fileId]?.attachment)
        .filter((attachment): attachment is AgentChatAttachment => Boolean(attachment)),
    isUploading,
    isUploadingFile: (fileId) => entriesRef.current[fileId]?.status === 'uploading',
  };
}

interface PreviewableImage {
  filename: string;
  url: string;
}

function isImageMediaType(mediaType: string | undefined): boolean {
  return Boolean(mediaType?.startsWith('image/'));
}

/**
 * Fullscreen view of one image attachment. The image is centred and grows to
 * fill the viewport but never beyond its intrinsic size.
 */
function ImagePreviewDialog({
  image,
  onClose,
}: {
  image: PreviewableImage | null;
  onClose: () => void;
}): JSX.Element {
  return (
    <Dialog onOpenChange={(open) => (open ? undefined : onClose())} open={image !== null}>
      <DialogContent
        className="fk:h-dvh fk:w-dvw fk:max-w-none fk:sm:max-w-none fk:rounded-none fk:border-0 fk:bg-black/90 fk:p-4 fk:shadow-none fk:flex fk:items-center fk:justify-center"
        showCloseButton={false}
      >
        <DialogTitle className="fk:sr-only">{image?.filename ?? 'Image preview'}</DialogTitle>
        {image ? (
          <img
            alt={image.filename}
            className="fk:block fk:h-auto fk:w-auto fk:max-h-full fk:max-w-full fk:object-contain"
            src={image.url}
          />
        ) : null}
        <DialogClose
          aria-label="Close preview"
          className="fk:absolute fk:top-4 fk:right-4 fk:flex fk:size-9 fk:items-center fk:justify-center fk:rounded-full fk:bg-white/10 fk:text-white fk:transition-colors fk:hover:bg-white/20 fk:focus-visible:outline-none fk:focus-visible:ring-2 fk:focus-visible:ring-white/60"
        >
          <XIcon className="fk:size-5" />
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

/** Small round "×" pinned to the top-right corner of a chip. */
function ChipRemoveButton({ label, onRemove }: { label: string; onRemove: () => void }): JSX.Element {
  return (
    <button
      aria-label={label}
      className="fk:absolute fk:top-1 fk:right-1 fk:z-10 fk:flex fk:size-5 fk:items-center fk:justify-center fk:rounded-full fk:border fk:border-border fk:bg-background fk:text-foreground fk:shadow-sm fk:transition-colors fk:hover:bg-accent fk:focus-visible:outline-none fk:focus-visible:ring-2 fk:focus-visible:ring-ring"
      onClick={(event) => {
        event.stopPropagation();
        onRemove();
      }}
      type="button"
    >
      <XIcon className="fk:size-3" />
    </button>
  );
}

/** Square image thumbnail that opens the fullscreen preview when clicked. */
function ImageThumbnail({
  image,
  isUploading = false,
  onOpen,
  onRemove,
  sizeClassName,
}: {
  image: PreviewableImage;
  isUploading?: boolean;
  onOpen: () => void;
  onRemove?: () => void;
  sizeClassName: string;
}): JSX.Element {
  return (
    <div className={`fk:relative fk:shrink-0 fk:overflow-hidden fk:rounded-xl fk:bg-muted ${sizeClassName}`}>
      <button
        aria-label={`Preview ${image.filename}`}
        className="fk:block fk:size-full fk:cursor-zoom-in fk:focus-visible:outline-none fk:focus-visible:ring-2 fk:focus-visible:ring-ring"
        onClick={onOpen}
        type="button"
      >
        <img alt={image.filename} className="fk:size-full fk:object-cover" src={image.url} />
      </button>
      {isUploading ? (
        <div className="fk:pointer-events-none fk:absolute fk:inset-0 fk:flex fk:items-center fk:justify-center fk:bg-background/60">
          <Spinner className="fk:size-4" />
        </div>
      ) : null}
      {onRemove ? <ChipRemoveButton label={`Remove ${image.filename}`} onRemove={onRemove} /> : null}
    </div>
  );
}

/** Uppercase type label for a file chip, e.g. `NDJSON` or `PDF`. */
function getFileTypeLabel(filename: string, mediaType: string | undefined): string {
  const extension = getExtension(filename);

  if (extension) {
    return extension.toUpperCase();
  }

  const subtype = mediaType?.split('/')[1]?.split('+')[0];

  return subtype ? subtype.toUpperCase() : 'FILE';
}

/** Card-style chip for non-image files: icon tile, filename, and type. */
function FileChip({
  file,
  href,
  isUploading = false,
  onRemove,
}: {
  file: { filename: string; mediaType?: string };
  href?: string;
  isUploading?: boolean;
  onRemove?: () => void;
}): JSX.Element {
  const content = (
    <>
      <div className="fk:flex fk:size-10 fk:shrink-0 fk:items-center fk:justify-center fk:rounded-lg fk:bg-muted fk:text-muted-foreground">
        {isUploading ? <Spinner className="fk:size-4" /> : <FileIcon className="fk:size-5" />}
      </div>
      <div className="fk:min-w-0 fk:pr-4 fk:text-left">
        <div className="fk:truncate fk:text-sm fk:font-medium fk:text-foreground">{file.filename}</div>
        <div className="fk:truncate fk:text-xs fk:text-muted-foreground">{getFileTypeLabel(file.filename, file.mediaType)}</div>
      </div>
    </>
  );
  const chipClassName =
    'fk:flex fk:h-14 fk:max-w-64 fk:items-center fk:gap-2.5 fk:rounded-xl fk:border fk:border-border fk:bg-background fk:px-2';

  return (
    <div className="fk:relative fk:shrink-0">
      {href ? (
        <a
          className={`${chipClassName} fk:transition-colors fk:hover:bg-accent/50 fk:focus-visible:outline-none fk:focus-visible:ring-2 fk:focus-visible:ring-ring`}
          href={href}
          rel="noreferrer"
          target="_blank"
        >
          {content}
        </a>
      ) : (
        <div className={chipClassName}>{content}</div>
      )}
      {onRemove ? <ChipRemoveButton label={`Remove ${file.filename}`} onRemove={onRemove} /> : null}
    </div>
  );
}

/**
 * Attachment chips shown above the composer textarea while drafting: images
 * as bare thumbnails, other files as labelled chips.
 */
export function ComposerAttachments({ uploads }: { uploads: AttachmentUploads }): JSX.Element | null {
  const attachments = usePromptInputAttachments();
  const [preview, setPreview] = useState<PreviewableImage | null>(null);

  if (attachments.files.length === 0) {
    return null;
  }

  return (
    <>
      <div className="fk:flex fk:flex-wrap fk:items-center fk:gap-2">
        {attachments.files.map((file) => {
          if (isImageMediaType(file.mediaType) && file.url) {
            const image = { filename: file.filename ?? 'Image', url: file.url };

            return (
              <ImageThumbnail
                image={image}
                isUploading={uploads.isUploadingFile(file.id)}
                key={file.id}
                onOpen={() => setPreview(image)}
                onRemove={() => attachments.remove(file.id)}
                sizeClassName="fk:size-14"
              />
            );
          }

          return (
            <FileChip
              file={{ filename: file.filename ?? 'file', mediaType: file.mediaType }}
              isUploading={uploads.isUploadingFile(file.id)}
              key={file.id}
              onRemove={() => attachments.remove(file.id)}
            />
          );
        })}
      </div>
      <ImagePreviewDialog image={preview} onClose={() => setPreview(null)} />
    </>
  );
}

/** Attachments of a persisted user message, read from its `file` parts. */
export function getAttachmentsFromParts(parts: AgentChatPart[] | null | undefined): AgentChatAttachment[] {
  if (!Array.isArray(parts)) {
    return [];
  }

  return parts
    .filter((part) => part.type === 'file' && typeof part.url === 'string')
    .map((part) => ({
      filename: part.filename ?? 'file',
      mediaType: part.mediaType ?? 'application/octet-stream',
      sizeBytes: part.sizeBytes ?? 0,
      url: part.url ?? '',
    }));
}

/** Attachments rendered with a sent user message: image thumbnails plus file chips. */
export function MessageAttachments({ attachments }: { attachments: AgentChatAttachment[] }): JSX.Element | null {
  const [preview, setPreview] = useState<PreviewableImage | null>(null);

  if (attachments.length === 0) {
    return null;
  }

  const images = attachments.filter((attachment) => isImageMediaType(attachment.mediaType));
  const files = attachments.filter((attachment) => !isImageMediaType(attachment.mediaType));

  return (
    <div className="fk:flex fk:flex-col fk:items-end fk:gap-2">
      {images.length > 0 ? (
        <div className="fk:flex fk:flex-wrap fk:justify-end fk:gap-2">
          {images.map((attachment) => (
            <ImageThumbnail
              image={attachment}
              key={attachment.url}
              onOpen={() => setPreview(attachment)}
              sizeClassName="fk:size-24"
            />
          ))}
        </div>
      ) : null}
      <ImagePreviewDialog image={preview} onClose={() => setPreview(null)} />
      {files.length > 0 ? (
        <div className="fk:flex fk:flex-wrap fk:justify-end fk:gap-2">
          {files.map((attachment) => (
            <FileChip file={attachment} href={attachment.url} key={attachment.url} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
