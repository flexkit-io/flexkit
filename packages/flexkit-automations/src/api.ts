import type {
  Automation,
  AutomationArtifact,
  AutomationInput,
  AutomationToolChannel,
  AutomationToolProvider,
  MutationResult,
} from './types';

export interface ApiClient {
  cancelRun: (_runId: string) => Promise<MutationResult>;
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
  updateAutomation: (_automationId: string, _input: AutomationInput) => Promise<MutationResult & { automation?: Automation }>;
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
      request<MutationResult & { automation?: Automation }>(`${automationsBasePath}/${encodeURIComponent(automationId)}`, {
        body: JSON.stringify(input),
        method: 'PATCH',
      }),
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
  automation: (_automationId: string) => string;
  automationRuns: (_automationId: string) => string;
  automations: string;
  creditBalance: string;
  entities: string;
  run: (_runId: string) => string;
  runHistory: (_scope: 'mine' | 'team', _offset?: number) => string;
  tools: (_automationId?: string) => string;
} {
  const basePath = `/api/flexkit/${projectId}/automations`;

  return {
    automation: (automationId) => `${basePath}/${encodeURIComponent(automationId)}`,
    automationRuns: (automationId) => `${basePath}/${encodeURIComponent(automationId)}/runs`,
    automations: basePath,
    creditBalance: `${basePath}/credits`,
    entities: `${basePath}/entities`,
    run: (runId) => `${basePath}/runs/${encodeURIComponent(runId)}`,
    runHistory: (scope, offset = 0) => `${basePath}/runs?scope=${scope}&offset=${offset.toString()}`,
    tools: (automationId) =>
      automationId ? `${basePath}/${encodeURIComponent(automationId)}/tools` : `${basePath}/tools`,
  };
}
