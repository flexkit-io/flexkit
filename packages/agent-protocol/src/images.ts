import { z } from 'zod';

/**
 * Image models the Flexkit Agent can create images with. The Studio lists
 * them in the composer's image chip; the server accepts only these ids.
 */
export const AGENT_IMAGE_MODELS = [
  {
    id: 'openai/gpt-image-2.6-sunburst',
    name: 'GPT Image',
    description: 'Best all-round, sharp text',
  },
  {
    id: 'bytedance/seedream-5.5',
    name: 'Seedream',
    description: 'Photoreal, fast',
  },
  {
    id: 'google/gemini-nano-banana-2.1',
    name: 'Nano Banana',
    description: 'Edits, consistent subjects',
  },
] as const;

export type AgentImageModelId = (typeof AGENT_IMAGE_MODELS)[number]['id'];

/** Used when neither the user nor the agent picks a model. */
export const DEFAULT_AGENT_IMAGE_MODEL_ID: AgentImageModelId = 'openai/gpt-image-2.6-sunburst';

export const AGENT_IMAGE_MODEL_IDS = AGENT_IMAGE_MODELS.map((model) => model.id) as [
  AgentImageModelId,
  ...AgentImageModelId[],
];

export const AGENT_IMAGE_ASPECT_RATIOS = ['1:1', '3:2', '2:3', '16:9', '9:16'] as const;

export type AgentImageAspectRatio = (typeof AGENT_IMAGE_ASPECT_RATIOS)[number];

export function isAgentImageModelId(value: unknown): value is AgentImageModelId {
  return typeof value === 'string' && (AGENT_IMAGE_MODEL_IDS as string[]).includes(value);
}

export function getAgentImageModelName(id: string): string {
  return AGENT_IMAGE_MODELS.find((model) => model.id === id)?.name ?? id;
}

/**
 * Sent with a chat message when the user turned on "Create image" in the
 * composer: the turn starts by creating an image. Both fields are optional;
 * an omitted model means the default and an omitted ratio lets the agent pick.
 */
export const agentImageRequestSchema = z.object({
  aspectRatio: z.enum(AGENT_IMAGE_ASPECT_RATIOS).optional(),
  model: z.enum(AGENT_IMAGE_MODEL_IDS).optional(),
  /** An image the agent created earlier in this chat to edit instead of starting from scratch. */
  sourceArtifactId: z.string().uuid().optional(),
});

export type AgentImageRequest = z.infer<typeof agentImageRequestSchema>;
