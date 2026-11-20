/**
 * Pure helpers behind the composer's Create Image mode. Kept free of React so
 * they can be unit-tested in isolation.
 */
import {
  AGENT_IMAGE_ASPECT_RATIOS,
  AGENT_IMAGE_MODELS,
  DEFAULT_AGENT_IMAGE_MODEL_ID,
  getAgentImageModelName,
  isAgentImageModelId,
  type AgentImageAspectRatio,
  type AgentImageModelId,
  type AgentImageRequest,
} from '@flexkit/agent-protocol';

/** What the chip shows: "Image · GPT Image", or "Edit image · Seedream" while an image is being edited. */
export function getImageModeLabel(request: AgentImageRequest): string {
  const model = getAgentImageModelName(request.model ?? DEFAULT_AGENT_IMAGE_MODEL_ID);

  return `${request.sourceArtifactId ? 'Edit image' : 'Image'} · ${model}`;
}

export function getImageModePlaceholder(request: AgentImageRequest): string {
  return request.sourceArtifactId ? 'Describe the changes...' : 'Describe an image...';
}

/**
 * The mode after a message was sent with it: it stays on for the next image,
 * with the same model and ratio, but an edit applies to one message only.
 */
export function getImageModeAfterSend(request: AgentImageRequest): AgentImageRequest {
  const { sourceArtifactId: _sent, ...rest } = request;

  return rest;
}

/** The request body field: only the options the user set, so the server applies its defaults. */
export function toImageGeneration(request: AgentImageRequest | null | undefined): AgentImageRequest | undefined {
  if (!request) {
    return undefined;
  }

  return {
    ...(request.aspectRatio ? { aspectRatio: request.aspectRatio } : {}),
    ...(request.model ? { model: request.model } : {}),
    ...(request.sourceArtifactId ? { sourceArtifactId: request.sourceArtifactId } : {}),
  };
}

/**
 * The image options an image card reuses (its model and ratio come from chat
 * history). A model or ratio that is no longer offered is left out, so the
 * server applies its default instead of refusing the message.
 */
export function toReusedImageRequest({
  aspectRatio,
  model,
  sourceArtifactId,
}: {
  aspectRatio?: string;
  model?: string;
  sourceArtifactId?: string;
}): AgentImageRequest {
  return {
    ...(aspectRatio && (AGENT_IMAGE_ASPECT_RATIOS as readonly string[]).includes(aspectRatio)
      ? { aspectRatio: aspectRatio as AgentImageAspectRatio }
      : {}),
    ...(isAgentImageModelId(model) ? { model } : {}),
    ...(sourceArtifactId ? { sourceArtifactId } : {}),
  };
}

/** The other models an image can be tried again with. */
export function getRetryImageModels(currentModel: string): Array<{ id: AgentImageModelId; name: string }> {
  return AGENT_IMAGE_MODELS.filter((model) => model.id !== currentModel).map((model) => ({
    id: model.id,
    name: model.name,
  }));
}

/** CSS `aspect-ratio` of an image card while the image is being created. */
export function getCssAspectRatio(aspectRatio: string | undefined): string {
  const match = /^(\d+):(\d+)$/.exec(aspectRatio ?? '');

  return match ? `${match[1]!} / ${match[2]!}` : '1 / 1';
}

export type { AgentImageAspectRatio, AgentImageModelId, AgentImageRequest };
