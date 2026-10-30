import { getKnowledgeFileProblem } from '../knowledge/knowledge';
import type { PluginConnection, PluginScope, PluginTools } from './plugin-types';
import { put } from '@vercel/blob/client';
import { convertRecordedAudioToPcm } from './agent/dictation';
import { getDesktop } from '../../core/desktop';
import { flexkitDomain } from '../../core/domains';
import type {
  ActivityItem,
  ActivityItemState,
  AgentChat,
  AgentChatAttachment,
  AgentChatFollowUpResult,
  AgentChatMessage,
  AgentChatMonitor,
  AgentChatQuestion,
  AgentChatQuestionResponse,
  AgentChatTurn,
  Automation,
  AutomationApproval,
  AutomationApprovalStatus,
  AutomationArtifact,
  AutomationInput,
  AutomationToolChannel,
  AutomationToolProvider,
  AutomationVisibility,
  MutationResult,
  Skill,
  SkillInput,
} from './types';

export interface DecideApprovalInput {
  /** Approve and always allow this plugin tool for the automation. */
  remember?: boolean;
  approved: boolean;
  /** For a proposed automation: the approver's edited instructions and whether to run it once now. */
  automationEdits?: { instructions?: string; runOnce?: boolean };
  force?: boolean;
  reason?: string;
}

export interface SendAgentChatMessageInput {
  attachments?: AgentChatAttachment[];
  content: string;
  modelId?: string | null;
}

/** A new chat and its first turn, started by one request. */
export interface StartAgentChatResult {
  chat: AgentChat;
  turn: AgentChatTurn;
}

/** Lowercase hex SHA-256 of a file, or undefined where the browser cannot hash (insecure contexts). */
async function sha256Hex(file: File): Promise<string | undefined> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return undefined;
  }

  try {
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());

    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  } catch {
    return undefined;
  }
}

/** Thrown when the API refuses an upload; `code` lets the UI tailor the message. */
export class AgentUploadError extends Error {
  code: string | null;
  status: number;

  constructor(status: number, message: string, code: string | null = null) {
    super(message);
    this.name = 'AgentUploadError';
    this.code = code;
    this.status = status;
  }
}

export interface ApiClient {
  /** Starts OAuth for a new account, or for `connectionId` to reconnect that specific account. */
  connectPlugins: (_input: {
    pluginId: string;
    scope: PluginScope;
    studioOrigin: string;
    connectionId?: string;
  }) => Promise<{ transactionId: string; authorizeUrl: string; completionOrigin: string; launchTicket: string }>;
  /** Connects a token plugin with a pasted token, or replaces the token of `connectionId`. */
  connectPluginToken: (_input: {
    pluginId: string;
    scope: PluginScope;
    token: string;
    connectionId?: string;
  }) => Promise<{ connection: PluginConnection }>;
  /** Renames (label null resets to the provider name) or makes a connection primary. */
  updatePluginConnection: (
    _id: string,
    _input: { label?: string | null; primary?: true }
  ) => Promise<{ connection: PluginConnection }>;
  pluginOAuthStatus: (
    _id: string
  ) => Promise<{ id: string; status: 'pending' | 'exchanging' | 'complete' | 'failed'; expires_at: string }>;
  disconnectPlugin: (_id: string) => Promise<{ success: boolean }>;
  installPlugin: (_id: string) => Promise<unknown>;
  setPluginPolicy: (_id: string, _input: { enabled: boolean; allowPersonal: boolean }) => Promise<{ success: boolean }>;
  refreshPluginTools: (_id: string) => Promise<PluginTools>;

  cancelRun: (_runId: string) => Promise<MutationResult>;
  createAgentChat: (_input?: { modelId?: string | null }) => Promise<{ chat: AgentChat }>;
  deleteAgentChat: (_chatId: string) => Promise<{ success: boolean }>;
  getAgentChatStreamUrl: (_chatId: string, _workflowRunId: string) => string;
  renameAgentChat: (_chatId: string, _title: string) => Promise<{ chat: AgentChat }>;
  sendAgentChatMessage: (_chatId: string, _input: SendAgentChatMessageInput) => Promise<AgentChatTurn>;
  /**
   * Sends a message while the chat's turn is running. The platform decides
   * whether it steers that turn or waits as the next one; if the turn has
   * meanwhile ended, the message starts the next turn.
   */
  sendAgentChatFollowUp: (_chatId: string, _input: SendAgentChatMessageInput) => Promise<AgentChatFollowUpResult>;
  /** The user connected a plugin from the chat's connect card: starts the turn that uses it, or queues it. */
  announcePluginConnected: (
    _chatId: string,
    _pluginId: string
  ) => Promise<Extract<AgentChatFollowUpResult, { followUp: unknown } | { turn: unknown }>>;
  /** Answers (or dismisses) the questions a chat turn waits on; a settled question comes back with an error. */
  answerAgentChatQuestion: (
    _chatId: string,
    _questionId: string,
    _response: AgentChatQuestionResponse
  ) => Promise<{ errorMessage?: string; question?: AgentChatQuestion }>;
  /** Creates a chat and sends its first message in one request. */
  startAgentChat: (_input: SendAgentChatMessageInput) => Promise<StartAgentChatResult>;
  /** Starts the next turn from a queued follow-up once the previous turn has ended. */
  startQueuedAgentChatMessage: (_chatId: string, _messageId: string) => Promise<AgentChatTurn>;
  stopAgentChat: (_chatId: string) => Promise<{ message: AgentChatMessage }>;
  stopAgentChatMonitor: (_chatId: string, _monitorId: string) => Promise<{ monitor: AgentChatMonitor }>;
  transcribeAgentAudio: (_audio: Blob, _signal?: AbortSignal) => Promise<{ text: string }>;
  /** Uploads a chat attachment straight to the platform file store. */
  uploadAgentChatAttachment: (_file: File, _signal?: AbortSignal) => Promise<AgentChatAttachment>;
  decideApproval: (
    _approvalId: string,
    _input: DecideApprovalInput
  ) => Promise<MutationResult & { approval?: AutomationApproval }>;
  createAutomation: (_input: AutomationInput) => Promise<MutationResult & { automation?: Automation }>;
  createSkill: (_input: SkillInput) => Promise<MutationResult & { skill?: Skill }>;
  deleteAutomation: (_automationId: string) => Promise<MutationResult>;
  deleteSkill: (_skillId: string) => Promise<MutationResult>;
  getArtifactUrl: (_artifactId: string, _options?: { download?: boolean }) => string;
  getRunArtifacts: (_workflowRunId: string) => Promise<AutomationArtifact[]>;
  getStreamUrl: (_workflowRunId: string) => string;
  /** JSON transcript of a finished run (owners and developers). */
  getTranscriptUrl: (_runId: string) => string;
  /** Lists delivery channels of `connectionId`, or of the provider's primary project account when omitted. */
  listChannels: (
    _provider: AutomationToolProvider,
    _connectionId?: string | null
  ) => Promise<{
    channels: AutomationToolChannel[];
    errorMessage?: string;
    success: boolean;
  }>;
  runAutomation: (_automationId: string) => Promise<MutationResult & { runId?: string }>;
  updateAutomation: (
    _automationId: string,
    _input: AutomationInput
  ) => Promise<MutationResult & { automation?: Automation }>;
  updateSkill: (_skillId: string, _input: SkillInput) => Promise<MutationResult & { skill?: Skill }>;
  /** Marks the caller's Activity items read; `'all'` marks every unread item. */
  markActivityRead: (_ids: string[] | 'all') => Promise<{ success: boolean }>;
  setActivityItemState: (
    _itemId: string,
    _state: Extract<ActivityItemState, 'unread' | 'read' | 'dismissed'>
  ) => Promise<{ item: ActivityItem }>;
}

function getApiRootDomain(): string {
  if (typeof window === 'undefined') {
    return 'flexkit.io';
  }

  // The desktop app serves the Studio on its own scheme (`flexkit://app`), so
  // its page hostname says nothing; the backend it was built for does.
  if (getDesktop()) {
    return flexkitDomain;
  }

  const { hostname } = window.location;
  const isDevHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === 'flexkit.test' ||
    hostname.endsWith('.flexkit.test');

  return isDevHost ? 'flexkit.test' : 'flexkit.io';
}

/** Origin that hosts plugin OAuth start and completion. */
export function getPlatformOrigin(): string {
  return `https://${getApiRootDomain()}`;
}

/** Public URL an external system calls to fire a webhook trigger. */
export function getWebhookTriggerUrl(projectId: string, token: string): string {
  return `https://${projectId}.api.${getApiRootDomain()}/automations/webhook/${encodeURIComponent(token)}`;
}

export function createApiClient(projectId: string): ApiClient {
  const projectBasePath = `/api/flexkit/${projectId}`;
  const automationsBasePath = `${projectBasePath}/automations`;
  const skillsBasePath = `${projectBasePath}/skills`;
  const agentChatsBasePath = `${projectBasePath}/agent/chats`;

  async function request<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      ...init,
    });
    const data = (await response.json()) as T;

    if (!response.ok) {
      const error = data && typeof data === 'object' && 'error' in data ? String(data.error) : 'Request failed';

      throw new Error(error);
    }

    return data;
  }

  return {
    connectPlugins: (input) =>
      request(`${projectBasePath}/plugins/connect`, { method: 'POST', body: JSON.stringify(input) }),
    connectPluginToken: (input) =>
      request(`${projectBasePath}/plugins/connect-token`, { method: 'POST', body: JSON.stringify(input) }),
    pluginOAuthStatus: (id) => request(`${projectBasePath}/plugins/oauth-transactions/${encodeURIComponent(id)}`),
    updatePluginConnection: (id, input) =>
      request(`${projectBasePath}/plugin-connections/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    disconnectPlugin: (id) =>
      request(`${projectBasePath}/plugin-connections/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    installPlugin: (id) =>
      request(`${projectBasePath}/plugins/${encodeURIComponent(id)}/installation`, {
        method: 'PUT',
        body: JSON.stringify({}),
      }),
    setPluginPolicy: (id, input) =>
      request(`${projectBasePath}/plugins/${encodeURIComponent(id)}/policy`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    refreshPluginTools: (id) =>
      request(`${projectBasePath}/plugin-connections/${encodeURIComponent(id)}/tools/refresh`, { method: 'POST' }),
    cancelRun: async (runId) =>
      request<MutationResult>(`${automationsBasePath}/runs/${encodeURIComponent(runId)}/cancel`, { method: 'POST' }),
    createAgentChat: async (input) =>
      request<{ chat: AgentChat }>(agentChatsBasePath, {
        body: JSON.stringify({ modelId: input?.modelId ?? null }),
        method: 'POST',
      }),
    deleteAgentChat: async (chatId) =>
      request<{ success: boolean }>(`${agentChatsBasePath}/${encodeURIComponent(chatId)}`, { method: 'DELETE' }),
    getAgentChatStreamUrl: (chatId, workflowRunId) =>
      `${agentChatsBasePath}/${encodeURIComponent(chatId)}/stream?workflowRunId=${encodeURIComponent(workflowRunId)}`,
    renameAgentChat: async (chatId, title) =>
      request<{ chat: AgentChat }>(`${agentChatsBasePath}/${encodeURIComponent(chatId)}`, {
        body: JSON.stringify({ title }),
        method: 'PATCH',
      }),
    sendAgentChatMessage: async (chatId, input) =>
      request<AgentChatTurn>(`${agentChatsBasePath}/${encodeURIComponent(chatId)}/messages`, {
        body: JSON.stringify(input),
        method: 'POST',
      }),
    announcePluginConnected: async (chatId, pluginId) =>
      request(`${agentChatsBasePath}/${encodeURIComponent(chatId)}/plugin-connected`, {
        body: JSON.stringify({ pluginId }),
        method: 'POST',
      }),
    sendAgentChatFollowUp: async (chatId, input) =>
      request<AgentChatFollowUpResult>(`${agentChatsBasePath}/${encodeURIComponent(chatId)}/follow-ups`, {
        body: JSON.stringify(input),
        method: 'POST',
      }),
    answerAgentChatQuestion: async (chatId, questionId, response) => {
      const result = await fetch(
        `${agentChatsBasePath}/${encodeURIComponent(chatId)}/questions/${encodeURIComponent(questionId)}/answer`,
        {
          body: JSON.stringify(response),
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        }
      );
      const data = (await result.json()) as { errorMessage?: string; error?: string; question?: AgentChatQuestion };

      // A question settled elsewhere (409) comes back with its final state for the card to show.
      if (!result.ok && !data.question) {
        throw new Error(data.errorMessage ?? data.error ?? 'Request failed');
      }

      return { errorMessage: result.ok ? undefined : data.errorMessage, question: data.question };
    },
    startAgentChat: async ({ attachments, content, modelId }) =>
      request<StartAgentChatResult>(agentChatsBasePath, {
        body: JSON.stringify({ message: { attachments, content }, modelId: modelId ?? null }),
        method: 'POST',
      }),
    startQueuedAgentChatMessage: async (chatId, messageId) =>
      request<AgentChatTurn>(
        `${agentChatsBasePath}/${encodeURIComponent(chatId)}/follow-ups/${encodeURIComponent(messageId)}/start`,
        { method: 'POST' }
      ),
    stopAgentChat: async (chatId) =>
      request<{ message: AgentChatMessage }>(`${agentChatsBasePath}/${encodeURIComponent(chatId)}/stop`, {
        method: 'POST',
      }),
    stopAgentChatMonitor: async (chatId, monitorId) =>
      request<{ monitor: AgentChatMonitor }>(
        `${agentChatsBasePath}/${encodeURIComponent(chatId)}/monitors/${encodeURIComponent(monitorId)}/stop`,
        { method: 'POST' }
      ),
    transcribeAgentAudio: async (audio, signal) => {
      const { durationSeconds, pcm } = await convertRecordedAudioToPcm(audio);
      const formData = new FormData();
      formData.append('file', pcm, 'audio.pcm');
      formData.append('durationSeconds', String(durationSeconds));

      const response = await fetch(`${projectBasePath}/agent/transcribe`, {
        body: formData,
        credentials: 'include',
        method: 'POST',
        signal,
      });
      const data = (await response.json()) as { error?: string; text?: string };

      if (!response.ok) {
        const error = data && typeof data === 'object' && data.error ? String(data.error) : 'Request failed';

        throw new Error(error);
      }

      if (!data.text?.trim()) {
        throw new Error('No speech was recognized. Try again.');
      }

      return { text: data.text };
    },
    uploadAgentChatAttachment: async (file, signal) => {
      // The platform issues a token scoped to one pathname, type and size; the
      // browser then writes the bytes to the store directly, so large files
      // never pass through the API function body limit. The hash is computed
      // alongside: Knowledge documents are keyed by it, so the platform can tell
      // later whether this file is already one.
      const [tokenResponse, sha256] = await Promise.all([
        fetch(`${projectBasePath}/agent/uploads`, {
          body: JSON.stringify({ filename: file.name, mediaType: file.type || null, sizeBytes: file.size }),
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
          signal,
        }),
        // Only files Knowledge can index are worth hashing; a screenshot never matches a document.
        getKnowledgeFileProblem({ name: file.name, size: file.size }) === null ? sha256Hex(file) : undefined,
      ]);
      const tokenData = (await tokenResponse.json()) as {
        code?: string;
        error?: string;
        mediaType?: string;
        pathname?: string;
        token?: string;
      };

      if (!tokenResponse.ok || !tokenData.pathname || !tokenData.token || !tokenData.mediaType) {
        throw new AgentUploadError(
          tokenResponse.status,
          tokenData.error ? String(tokenData.error) : 'The file could not be uploaded.',
          tokenData.code ?? null
        );
      }

      const blob = await put(tokenData.pathname, file, {
        abortSignal: signal,
        access: 'public',
        contentType: tokenData.mediaType,
        token: tokenData.token,
      });

      return {
        filename: file.name,
        mediaType: tokenData.mediaType,
        sizeBytes: file.size,
        url: blob.url,
        ...(sha256 ? { sha256 } : {}),
      };
    },
    decideApproval: async (approvalId, input) => {
      const response = await fetch(`${automationsBasePath}/approvals/${encodeURIComponent(approvalId)}/decide`, {
        body: JSON.stringify(input),
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });
      const data = (await response.json()) as MutationResult & { approval?: AutomationApproval; error?: string };

      // Business errors (stale_preview, already_decided) come back as 400
      // with a structured body the caller must be able to inspect.
      if (!response.ok && typeof data.success !== 'boolean') {
        throw new Error(data.error ? String(data.error) : 'Request failed');
      }

      return data;
    },
    markActivityRead: async (ids) =>
      request<{ success: boolean }>(`${projectBasePath}/activity/read`, {
        body: JSON.stringify(ids === 'all' ? { all: true } : { ids }),
        method: 'POST',
      }),
    setActivityItemState: async (itemId, state) =>
      request<{ item: ActivityItem }>(`${projectBasePath}/activity/${encodeURIComponent(itemId)}`, {
        body: JSON.stringify({ state }),
        method: 'PATCH',
      }),
    createAutomation: async (input) =>
      request<MutationResult & { automation?: Automation }>(automationsBasePath, {
        body: JSON.stringify(input),
        method: 'POST',
      }),
    createSkill: async (input) =>
      request<MutationResult & { skill?: Skill }>(skillsBasePath, {
        body: JSON.stringify(input),
        method: 'POST',
      }),
    deleteAutomation: async (automationId) =>
      request<MutationResult>(`${automationsBasePath}/${encodeURIComponent(automationId)}`, { method: 'DELETE' }),
    deleteSkill: async (skillId) =>
      request<MutationResult>(`${skillsBasePath}/${encodeURIComponent(skillId)}`, { method: 'DELETE' }),
    getArtifactUrl: (artifactId, options) => {
      const suffix = options?.download ? '?download=1' : '';

      return `${automationsBasePath}/artifacts/${encodeURIComponent(artifactId)}/content${suffix}`;
    },
    getRunArtifacts: async (workflowRunId) =>
      request<{ artifacts: AutomationArtifact[] }>(
        `${automationsBasePath}/runs/${encodeURIComponent(workflowRunId)}/artifacts`
      ).then((response) => response.artifacts),
    getStreamUrl: (workflowRunId) => `${automationsBasePath}/runs/${encodeURIComponent(workflowRunId)}/stream`,
    getTranscriptUrl: (runId) => `${automationsBasePath}/runs/${encodeURIComponent(runId)}/transcript`,
    listChannels: async (provider, connectionId) => {
      const url = connectionId
        ? `${projectBasePath}/plugin-connections/${encodeURIComponent(connectionId)}/channels`
        : `${projectBasePath}/plugins/${provider}/channels`;
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = (await response.json()) as {
        channels?: AutomationToolChannel[];
        error?: string;
        errorMessage?: string;
        success?: boolean;
      };

      if (response.ok) {
        return {
          channels: data.channels ?? [],
          errorMessage: data.errorMessage,
          success: data.success ?? true,
        };
      }

      if (data.success === false) {
        return {
          channels: data.channels ?? [],
          errorMessage: data.errorMessage ?? `Failed to load ${provider === 'slack' ? 'Slack' : 'Teams'} channels.`,
          success: false,
        };
      }

      const error = data.error ? String(data.error) : 'Request failed';

      throw new Error(error);
    },
    runAutomation: async (automationId) =>
      request<MutationResult & { runId?: string }>(`${automationsBasePath}/${encodeURIComponent(automationId)}/runs`, {
        method: 'POST',
      }),
    updateAutomation: async (automationId, input) =>
      request<MutationResult & { automation?: Automation }>(
        `${automationsBasePath}/${encodeURIComponent(automationId)}`,
        {
          body: JSON.stringify(input),
          method: 'PATCH',
        }
      ),
    updateSkill: async (skillId, input) =>
      request<MutationResult & { skill?: Skill }>(`${skillsBasePath}/${encodeURIComponent(skillId)}`, {
        body: JSON.stringify(input),
        method: 'PATCH',
      }),
  };
}

export class FetcherError extends Error {
  status: number;

  constructor(status: number, message = 'Request failed') {
    super(message);
    this.name = 'FetcherError';
    this.status = status;
  }
}

export const fetcher = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, { credentials: 'include' });

  if (!response.ok) {
    throw new FetcherError(response.status);
  }

  return (await response.json()) as T;
};

export function paths(projectId: string): {
  activity: (_options?: { filter?: 'all' | 'needs_action'; limit?: number; offset?: number }) => string;
  activityItem: (_itemId: string) => string;
  /** Badge counts; with `since`, also the unread items created after it. */
  activitySummary: (_since?: string | null) => string;
  agentChat: (_chatId: string) => string;
  agentChatSearch: (_query: string) => string;
  agentChats: (_offset?: number) => string;
  agentProfile: () => string;
  approval: (_approvalId: string) => string;
  approvals: (_options?: {
    limit?: number;
    offset?: number;
    runId?: string;
    status?: AutomationApprovalStatus;
  }) => string;
  approvalsCount: string;
  automation: (_automationId: string) => string;
  automationRuns: (_automationId: string, _offset?: number, _limit?: number) => string;
  automations: (_options?: {
    enabled?: boolean[];
    limit?: number;
    offset?: number;
    search?: string;
    visibility?: AutomationVisibility[];
  }) => string;
  creditBalance: string;
  entities: string;
  run: (_runId: string) => string;
  runHistory: (_scope: 'mine' | 'team', _offset?: number, _limit?: number) => string;
  skill: (_skillId: string) => string;
  skills: (_options?: {
    limit?: number;
    offset?: number;
    search?: string;
    visibility?: AutomationVisibility[];
  }) => string;
  spaces: string;
  /** Members for pickers; with a space id, only members who can see that space. */
  members: (_spaceId?: string | null) => string;
  tools: (_automationId?: string) => string;
} {
  const basePath = `/api/flexkit/${projectId}/automations`;
  const skillsBasePath = `/api/flexkit/${projectId}/skills`;
  const agentChatsBasePath = `/api/flexkit/${projectId}/agent/chats`;

  return {
    activity: (options = {}) => {
      const { filter = 'all', limit = 25, offset = 0 } = options;
      const params = new URLSearchParams({ filter, limit: limit.toString(), offset: offset.toString() });

      return `/api/flexkit/${projectId}/activity?${params.toString()}`;
    },
    activityItem: (itemId) => `/api/flexkit/${projectId}/activity/${encodeURIComponent(itemId)}`,
    activitySummary: (since) =>
      since
        ? `/api/flexkit/${projectId}/activity/summary?since=${encodeURIComponent(since)}`
        : `/api/flexkit/${projectId}/activity/summary`,
    agentChat: (chatId) => `${agentChatsBasePath}/${encodeURIComponent(chatId)}`,
    agentChatSearch: (query) => `${agentChatsBasePath}/search?q=${encodeURIComponent(query)}`,
    agentChats: (offset = 0) => `${agentChatsBasePath}?offset=${offset.toString()}`,
    agentProfile: () => `/api/flexkit/${projectId}/agent/profile`,
    approval: (approvalId) => `${basePath}/approvals/${encodeURIComponent(approvalId)}`,
    approvals: (options = {}) => {
      const { limit = 25, offset = 0, runId, status } = options;
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (status) {
        params.set('status', status);
      }

      if (runId) {
        params.set('runId', runId);
      }

      return `${basePath}/approvals?${params.toString()}`;
    },
    approvalsCount: `${basePath}/approvals?limit=1`,
    automation: (automationId) => `${basePath}/${encodeURIComponent(automationId)}`,
    automationRuns: (automationId, offset = 0, limit = 25) =>
      `${basePath}/${encodeURIComponent(automationId)}/runs?offset=${offset.toString()}&limit=${limit.toString()}`,
    automations: (options = {}) => {
      const { enabled, limit = 25, offset = 0, search, visibility } = options;
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (enabled && enabled.length > 0) {
        params.set('enabled', enabled.map((value) => (value ? 'true' : 'false')).join(','));
      }

      if (visibility && visibility.length > 0) {
        params.set('visibility', visibility.join(','));
      }

      const trimmedSearch = search?.trim();

      if (trimmedSearch) {
        params.set('q', trimmedSearch);
      }

      return `${basePath}?${params.toString()}`;
    },
    creditBalance: `${basePath}/credits`,
    entities: `${basePath}/entities`,
    run: (runId) => `${basePath}/runs/${encodeURIComponent(runId)}`,
    runHistory: (scope, offset = 0, limit = 25) =>
      `${basePath}/runs?scope=${scope}&offset=${offset.toString()}&limit=${limit.toString()}`,
    skill: (skillId) => `${skillsBasePath}/${encodeURIComponent(skillId)}`,
    skills: (options = {}) => {
      const { limit = 25, offset = 0, search, visibility } = options;
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (visibility && visibility.length > 0) {
        params.set('visibility', visibility.join(','));
      }

      const trimmedSearch = search?.trim();

      if (trimmedSearch) {
        params.set('q', trimmedSearch);
      }

      return `${skillsBasePath}?${params.toString()}`;
    },
    spaces: `/api/flexkit/${projectId}/spaces`,
    members: (spaceId) =>
      spaceId
        ? `/api/flexkit/${projectId}/members?spaceId=${encodeURIComponent(spaceId)}`
        : `/api/flexkit/${projectId}/members`,
    tools: (automationId) =>
      automationId ? `${basePath}/${encodeURIComponent(automationId)}/tools` : `${basePath}/tools`,
  };
}
