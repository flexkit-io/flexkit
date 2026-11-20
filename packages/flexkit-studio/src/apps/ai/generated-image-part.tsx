import type { JSX } from 'react';
import { createContext, useContext, useState } from 'react';
import {
  ChevronDownIcon,
  CopyIcon,
  DownloadIcon,
  ImagePlusIcon,
  Maximize2Icon,
  PencilIcon,
  RefreshCwIcon,
} from 'lucide-react';
import type { DataPart } from '@flexkit/agent-protocol';
import { useConfig } from '../../core/config/config-context';
import { useUploadAssets } from '../../core/upload';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  Shimmer,
  toast,
} from '../../ui';
import { ImagePreviewDialog } from './agent/attachments';
import { getCssAspectRatio, getRetryImageModels, type AgentImageModelId } from './agent/image-mode';

type GeneratedImage = DataPart['generated-image'];

/**
 * What an image card can ask of the chat around it. Provided by the agent
 * chat page; where it is absent (run history) the card offers only the file
 * actions.
 */
export interface GeneratedImageActions {
  /** Turn on Create Image to edit this image with the next message. */
  onEdit: (_image: { artifactId: string; model: string }) => void;
  /** Ask for the same image again with another model. */
  onRetry: (_image: { aspectRatio?: string; model: AgentImageModelId; modelName: string }) => void;
}

export const GeneratedImageActionsContext = createContext<GeneratedImageActions | null>(null);

async function fetchImage(url: string): Promise<Blob> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('The image could not be loaded.');
  }

  return response.blob();
}

/** The clipboard takes PNG everywhere; other formats are redrawn as PNG first. */
async function toPng(blob: Blob): Promise<Blob> {
  if (blob.type === 'image/png') {
    return blob;
  }

  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');

  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((png) => (png ? resolve(png) : reject(new Error('The image could not be copied.'))), 'image/png');
  });
}

function getDownloadUrl(url: string): string {
  return `${url}${url.includes('?') ? '&' : '?'}download=1`;
}

export function GeneratedImagePart({ message }: { message: GeneratedImage }): JSX.Element {
  const actions = useContext(GeneratedImageActionsContext);
  const { currentProjectId } = useConfig();
  const uploadAssets = useUploadAssets();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const modelName = message.modelName ?? message.model;
  const caption = [modelName, message.aspectRatio].filter(Boolean).join(' · ');

  if (message.status === 'generating') {
    return (
      <figure className="fk:w-full fk:max-w-md">
        <div
          aria-busy="true"
          className="fk:flex fk:w-full fk:animate-pulse fk:items-center fk:justify-center fk:rounded-xl fk:bg-muted fk:corner-squircle"
          style={{ aspectRatio: getCssAspectRatio(message.aspectRatio) }}
        >
          <Shimmer as="span" className="fk:text-sm">
            Creating image...
          </Shimmer>
        </div>
        <figcaption className="fk:mt-1.5 fk:text-xs fk:text-muted-foreground">{caption}</figcaption>
      </figure>
    );
  }

  if (message.status === 'error' || !message.url || !message.artifactId) {
    return (
      <div className="fk:w-full fk:max-w-md fk:rounded-xl fk:border fk:border-border fk:px-3.5 fk:py-3 fk:text-sm fk:corner-squircle">
        <div className="fk:font-medium">The image could not be created</div>
        <div className="fk:mt-1 fk:text-xs fk:text-muted-foreground">
          {message.error?.message ?? 'The image model did not return an image.'}
        </div>
        {actions ? (
          <Button
            className="fk:mt-2"
            size="sm"
            variant="outline"
            onClick={() =>
              actions.onRetry({
                aspectRatio: message.aspectRatio,
                model: message.model as AgentImageModelId,
                modelName,
              })
            }
          >
            <RefreshCwIcon className="fk:size-3" />
            Try again
          </Button>
        ) : null}
      </div>
    );
  }

  const { artifactId, url } = message;
  const filename = message.filename ?? 'image.png';

  async function copyImage(): Promise<void> {
    try {
      const png = await toPng(await fetchImage(url));

      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
      toast.success('Image copied');
    } catch {
      toast.error('The image could not be copied.');
    }
  }

  async function saveToAssets(): Promise<void> {
    setSaving(true);

    try {
      const blob = await fetchImage(url);
      const file = new File([blob], filename, { type: message.contentType ?? blob.type });

      await uploadAssets({ files: [file], projectId: currentProjectId });
      toast.success('Saved to assets');
    } catch {
      toast.error('The image could not be saved to assets. Saving needs a role that can upload assets.');
    } finally {
      setSaving(false);
    }
  }

  const retryModels = getRetryImageModels(message.model);

  return (
    <figure className="fk:w-full fk:max-w-md">
      <div className="fk:group fk:relative">
        <button
          aria-label="Open image full size"
          className="fk:block fk:w-full fk:overflow-hidden fk:rounded-xl fk:corner-squircle fk:focus-visible:outline-none fk:focus-visible:ring-2 fk:focus-visible:ring-ring"
          type="button"
          onClick={() => setPreviewOpen(true)}
        >
          <img alt={message.prompt || filename} className="fk:block fk:h-auto fk:w-full" loading="lazy" src={url} />
        </button>
        <div className="fk:absolute fk:right-2 fk:top-2 fk:flex fk:gap-1 fk:opacity-0 fk:transition-opacity fk:group-hover:opacity-100 fk:group-focus-within:opacity-100">
          <Button asChild aria-label="Download" size="icon" variant="secondary" className="fk:size-8">
            <a download={filename} href={getDownloadUrl(url)}>
              <DownloadIcon className="fk:size-4" />
            </a>
          </Button>
          <Button
            aria-label="Copy image"
            className="fk:size-8"
            size="icon"
            variant="secondary"
            onClick={() => void copyImage()}
          >
            <CopyIcon className="fk:size-4" />
          </Button>
          <Button
            aria-label="Open full size"
            className="fk:size-8"
            size="icon"
            variant="secondary"
            onClick={() => setPreviewOpen(true)}
          >
            <Maximize2Icon className="fk:size-4" />
          </Button>
        </div>
      </div>
      <figcaption className="fk:mt-1.5 fk:flex fk:flex-wrap fk:items-center fk:gap-x-3 fk:gap-y-1">
        <span className="fk:mr-auto fk:text-xs fk:text-muted-foreground">{caption}</span>
        {actions ? (
          <Button size="sm" variant="ghost" onClick={() => actions.onEdit({ artifactId, model: message.model })}>
            <PencilIcon className="fk:size-3" />
            Edit
          </Button>
        ) : null}
        {actions && retryModels.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost">
                <RefreshCwIcon className="fk:size-3" />
                Try with
                <ChevronDownIcon className="fk:size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Create it again with</DropdownMenuLabel>
              {retryModels.map((model) => (
                <DropdownMenuItem
                  key={model.id}
                  onSelect={() =>
                    actions.onRetry({ aspectRatio: message.aspectRatio, model: model.id, modelName: model.name })
                  }
                >
                  {model.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        <Button disabled={saving} size="sm" variant="ghost" onClick={() => void saveToAssets()}>
          <ImagePlusIcon className="fk:size-3" />
          {saving ? 'Saving...' : 'Save to assets'}
        </Button>
      </figcaption>
      <ImagePreviewDialog image={previewOpen ? { filename, url } : null} onClose={() => setPreviewOpen(false)} />
    </figure>
  );
}
