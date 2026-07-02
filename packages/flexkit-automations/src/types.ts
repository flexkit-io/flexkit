export type AutomationRunStatus = 'running' | 'success' | 'skipped' | 'failed' | 'cancelled';
export type AutomationTriggerType = 'entity' | 'manual' | 'schedule';
export type AutomationToolProvider = 'slack' | 'teams';

export interface AutomationToolChannel {
  id: string;
  name: string;
  serviceUrl?: string;
  teamId?: string;
}

export interface AutomationModel {
  deprecated: boolean;
  effort: string | null;
  id: string;
  name: string;
}

export interface Automation {
  createdAt: string | null;
  enabled: boolean;
  entities: string[];
  id: string;
  instructions: string;
  lastRunAt: string | null;
  modelId: string;
  name: string;
  projectId: string;
  scheduleTimezone: string;
  totalRuns: number;
  triggerCreate: boolean;
  triggerDelete: boolean;
  triggerSchedule: string | null;
  triggerUpdate: boolean;
  updatedAt: string | null;
}

export interface AutomationRun {
  automationId: string;
  completedAt: string | null;
  error: string | null;
  id: string;
  projectId: string;
  startedAt: string;
  status: AutomationRunStatus;
  summary: string | null;
  triggerPayload: unknown;
  triggerType: AutomationTriggerType;
  workflowRunId: string | null;
}

export interface RunHistoryRun extends AutomationRun {
  automationName: string;
}

export interface RunHistoryMetrics {
  failed24h: number;
  failed7d: number;
  successful24h: number;
  successful7d: number;
}

export interface RunHistory {
  hasMore: boolean;
  metrics: RunHistoryMetrics;
  runs: RunHistoryRun[];
}

export interface AutomationProviderTools {
  channels: AutomationToolChannel[];
  connected: boolean;
  enabled: boolean;
  workspaceName: string | null;
}

export interface AutomationTools {
  models: AutomationModel[];
  providers: {
    slack: AutomationProviderTools;
    teams: AutomationProviderTools;
  };
  teamId: string;
}

export interface AutomationCreditBalance {
  availableMicros: number;
  billingUrl: string;
  display: string;
  isLowBalance: boolean;
  teamId: string;
}

export interface AutomationArtifact {
  artifactId: string;
  contentType: string;
  createdAt: string;
  downloadUrl: string;
  filename: string;
  kind: 'html' | 'pdf';
  previewUrl: string;
  sizeBytes: number;
}

export interface AutomationToolConfigInput {
  channels: AutomationToolChannel[];
  enabled: boolean;
  provider: AutomationToolProvider;
}

export interface AutomationInput {
  enabled: boolean;
  entities: string[];
  instructions: string;
  modelId: string;
  name: string;
  scheduleTimezone: string;
  toolConfigs: AutomationToolConfigInput[];
  triggerCreate: boolean;
  triggerDelete: boolean;
  triggerSchedule: string | null;
  triggerUpdate: boolean;
}

export interface MutationResult {
  errorCode: string;
  errorMessage: string | string[];
  success: boolean;
}
