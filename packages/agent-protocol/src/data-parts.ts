import { z } from 'zod';

/**
 * Custom `data-*` parts streamed by the Flexkit agent platform and rendered by
 * Studio. The server validates what it writes against these schemas and the
 * UI derives its part types from them, so the two can never drift.
 */
export const errorSchema = z.object({
  message: z.string(),
});

export const dataPartSchema = z.object({
  'plugin-connection': z.object({ pluginId: z.string(), connectionId: z.string().optional() }),
  /** Lifecycle of one plugin tool call, so the UI can name the in-flight call in its status line. */
  'plugin-call': z.object({
    pluginId: z.string(),
    tool: z.string(),
    status: z.enum(['loading', 'done', 'error']),
    error: errorSchema.optional(),
  }),
  /** Written when the chat history was summarized before or during a turn. */
  'context-compaction': z.object({
    reason: z.enum(['threshold', 'context_length_error']),
    status: z.enum(['done']),
    summarizedMessageCount: z.number(),
  }),
  /** The agent's working plan; replaced in place as steps complete. */
  plan: z.object({
    explanation: z.string().optional(),
    steps: z.array(
      z.object({
        status: z.enum(['pending', 'in_progress', 'completed']),
        step: z.string(),
      })
    ),
    updatedAt: z.string(),
  }),
  /** A delegated subtask of an automation run. */
  subtask: z.object({
    error: errorSchema.optional(),
    resultPreview: z.string().optional(),
    status: z.enum(['running', 'done', 'error']),
    stepsUsed: z.number().optional(),
    subtaskId: z.string(),
    title: z.string(),
  }),
  /** json-render patch lines, extracted from the assistant text by the stream pipeline. */
  spec: z.union([
    z.object({
      type: z.literal('patch'),
      patch: z.unknown(),
    }),
    z.object({
      type: z.literal('flat'),
      spec: z.unknown(),
    }),
    z.object({
      type: z.literal('nested'),
      spec: z.unknown(),
    }),
  ]),
  'create-sandbox': z.object({
    sandboxId: z.string().optional(),
    status: z.enum(['loading', 'done', 'error']),
    error: errorSchema.optional(),
  }),
  'generating-files': z.object({
    paths: z.array(z.string()),
    status: z.enum(['generating', 'uploading', 'uploaded', 'done', 'error']),
    error: errorSchema.optional(),
  }),
  'run-artifact': z.object({
    artifactId: z.string().optional(),
    contentType: z.string().optional(),
    error: errorSchema.optional(),
    filename: z.string(),
    kind: z.enum(['html', 'pdf']).optional(),
    sizeBytes: z.number().optional(),
    status: z.enum(['uploading', 'done', 'error']),
    /** Persistent public URL of the stored artifact. */
    url: z.string().optional(),
  }),
  'run-command': z.object({
    sandboxId: z.string(),
    commandId: z.string().optional(),
    command: z.string(),
    args: z.array(z.string()),
    status: z.enum(['executing', 'running', 'waiting', 'done', 'error']),
    exitCode: z.number().optional(),
    error: errorSchema.optional(),
  }),
  'search-schema': z.object({
    query: z.string().optional(),
    status: z.enum(['loading', 'done', 'error']),
    error: errorSchema.optional(),
  }),
  'web-search': z.object({
    query: z.string(),
    status: z.enum(['loading', 'done', 'error']),
    error: errorSchema.optional(),
  }),
  'tool-delivery': z.object({
    channelId: z.string(),
    channelName: z.string(),
    provider: z.enum(['slack', 'teams']),
    status: z.enum(['loading', 'done', 'error']),
    error: errorSchema.optional(),
  }),
  'validate-graphql': z.object({
    status: z.enum(['loading', 'valid', 'invalid', 'error']),
    errorCount: z.number().optional(),
    error: errorSchema.optional(),
  }),
  'execute-graphql': z.object({
    operationType: z.enum(['query', 'mutation']).optional(),
    status: z.enum(['loading', 'done', 'error']),
    error: errorSchema.optional(),
  }),
  /** Emitted for proposals; the UI fetches the full proposal from the approvals API by id. */
  'mutation-approval': z.object({
    approvalId: z.string(),
    affectedCount: z.number().nullable().optional(),
    decidedBy: z.string().optional(),
    operationsSummary: z.string(),
    reason: z.string().optional(),
    status: z.enum(['pending', 'approved', 'rejected', 'expired', 'cancelled', 'executed', 'error']),
    error: errorSchema.optional(),
  }),
  'bulk-graphql-action': z.object({
    changedItems: z.number().optional(),
    failedItems: z.number().optional(),
    jobId: z.string().optional(),
    operationName: z.string(),
    processedItems: z.number().optional(),
    status: z.enum(['loading', 'running', 'done', 'error']),
    totalItems: z.number().optional(),
    error: errorSchema.optional(),
  }),
  'update-memory': z.object({
    status: z.enum(['loading', 'done', 'error']),
    error: errorSchema.optional(),
  }),
  'load-skill': z.object({
    /** True for skills attached to the automation, injected at run start rather than loaded on demand. */
    attached: z.boolean().optional(),
    skillName: z.string().optional(),
    status: z.enum(['loading', 'done', 'error']),
    error: errorSchema.optional(),
  }),
  /** Marker written by the run workflow for the trigger event so a run replays as a conversation. */
  'user-message': z.object({
    parts: z.array(z.unknown()),
  }),
  /** Final report written by the run workflow when the agent finishes. */
  'run-summary': z.object({
    status: z.enum(['success', 'skipped', 'failed']),
    summary: z.string(),
  }),
  /** A chat turn that ended with an error. */
  'turn-error': z.object({
    message: z.string(),
  }),
  /** One follow-up instruction offered under a finished chat reply; clicking it fills the composer. */
  'suggested-prompt': z.object({
    prompt: z.string(),
  }),
});

export type DataPart = z.infer<typeof dataPartSchema>;
export type DataPartType = keyof DataPart;

export const DATA_PART_TYPES = Object.keys(dataPartSchema.shape) as DataPartType[];

export function isDataPartType(type: string): type is DataPartType {
  return (DATA_PART_TYPES as string[]).includes(type);
}

/** The `type` of a UI message part carrying this data part. */
export type DataPartMessageType = `data-${DataPartType}`;
