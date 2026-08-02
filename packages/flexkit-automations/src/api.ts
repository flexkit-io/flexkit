import type {
  Automation,
  AutomationApproval,
  AutomationApprovalStatus,
  AutomationArtifact,
  AutomationInput,
  AutomationToolChannel,
  AutomationToolProvider,
  MutationResult,
} from './types';

export interface DecideApprovalInput {
  approved: boolean;
  force?: boolean;
  reason?: string;
}

export interface ApiClient {
  cancelRun: (_runId: string) => Promise<MutationResult>;
  decideApproval: (
    _approvalId: string,
    _input: DecideApprovalInput
  ) => Promise<MutationResult & { approval?: AutomationApproval }>;
  createAutomation: (_input: AutomationInput) => Promise<MutationResult & { automation?: Automation }>;
  deleteAutomation: (_automationId: string) => Promise<MutationResult>;
  getArtifactUrl: (_artifactId: string, _options?: { download?: boolean }) => string;
  getIntegrationManageUrl: (_teamId: string) => string;
  getRunArtifacts: (_workflowRunId: string) => Promise<AutomationArtifact[]>;
  getStreamUrl: (_workflowRunId: string) => string;
  listChannels: (_provider: AutomationToolProvider) => Promise<{
    channels: AutomationToolChannel[];
    errorMessage?: string;
    success: boolean;
  }>;
  runAutomation: (_automationId: string) => Promise<MutationResult & { runId?: string }>;
  updateAutomation: (
    _automationId: string,
    _input: AutomationInput
  ) => Promise<MutationResult & { automation?: Automation }>;
}

function getDashboardOrigin(): string {
  if (typeof window === 'undefined') {
    return 'https://flexkit.io';
  }

  const { hostname, protocol } = window.location;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'https://flexkit.test';
  }

  if (hostname === 'flexkit.test' || hostname.endsWith('.flexkit.test')) {
    return `${protocol}//flexkit.test`;
  }

  return 'https://flexkit.io';
}

function getApiRootDomain(): string {
  if (typeof window === 'undefined') {
    return 'flexkit.io';
  }

  const { hostname } = window.location;
  const isDevHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === 'flexkit.test' ||
    hostname.endsWith('.flexkit.test');

  return isDevHost ? 'flexkit.test' : 'flexkit.io';
}

/** Public URL an external system calls to fire a webhook trigger. */
export function getWebhookTriggerUrl(projectId: string, token: string): string {
  return `https://${projectId}.api.${getApiRootDomain()}/automations/webhook/${encodeURIComponent(token)}`;
}

export function createApiClient(projectId: string): ApiClient {
  const projectBasePath = `/api/flexkit/${projectId}`;
  const automationsBasePath = `${projectBasePath}/automations`;

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
    cancelRun: async (runId) =>
      request<MutationResult>(`${automationsBasePath}/runs/${encodeURIComponent(runId)}/cancel`, { method: 'POST' }),
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
    createAutomation: async (input) =>
      request<MutationResult & { automation?: Automation }>(automationsBasePath, {
        body: JSON.stringify(input),
        method: 'POST',
      }),
    deleteAutomation: async (automationId) =>
      request<MutationResult>(`${automationsBasePath}/${encodeURIComponent(automationId)}`, { method: 'DELETE' }),
    getArtifactUrl: (artifactId, options) => {
      const suffix = options?.download ? '?download=1' : '';

      return `${automationsBasePath}/artifacts/${encodeURIComponent(artifactId)}/content${suffix}`;
    },
    getIntegrationManageUrl: (teamId) => `${getDashboardOrigin()}/dashboard/${teamId}/${projectId}/integrations`,
    getRunArtifacts: async (workflowRunId) =>
      request<{ artifacts: AutomationArtifact[] }>(
        `${automationsBasePath}/runs/${encodeURIComponent(workflowRunId)}/artifacts`
      ).then((response) => response.artifacts),
    getStreamUrl: (workflowRunId) => `${automationsBasePath}/runs/${encodeURIComponent(workflowRunId)}/stream`,
    listChannels: async (provider) => {
      const response = await fetch(`${projectBasePath}/integrations/${provider}/channels`, {
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
  };
}

export const fetcher = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, { credentials: 'include' });

  if (!response.ok) {
    throw new Error('Request failed');
  }

  return (await response.json()) as T;
};

export function paths(projectId: string): {
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
  automations: string;
  creditBalance: string;
  entities: string;
  run: (_runId: string) => string;
  runHistory: (_scope: 'mine' | 'team', _offset?: number, _limit?: number) => string;
  tools: (_automationId?: string) => string;
} {
  const basePath = `/api/flexkit/${projectId}/automations`;

  return {
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
    automations: basePath,
    creditBalance: `${basePath}/credits`,
    entities: `${basePath}/entities`,
    run: (runId) => `${basePath}/runs/${encodeURIComponent(runId)}`,
    runHistory: (scope, offset = 0, limit = 25) =>
      `${basePath}/runs?scope=${scope}&offset=${offset.toString()}&limit=${limit.toString()}`,
    tools: (automationId) =>
      automationId ? `${basePath}/${encodeURIComponent(automationId)}/tools` : `${basePath}/tools`,
  };
}
