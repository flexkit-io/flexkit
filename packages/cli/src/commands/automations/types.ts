/*
 * Response shapes of the project automation API (`/automations/**`), mirrored
 * from the backend's `lib/automations/api-dto.ts`. Only the fields the CLI
 * reads are typed strictly; everything else passes through to `--json`.
 */

export type AutomationVisibility = 'project' | 'space' | 'personal';
export type AutomationMutationPolicy = 'require_approval' | 'auto_approve';
export type AutomationRunStatus = 'running' | 'awaiting_approval' | 'success' | 'skipped' | 'failed' | 'cancelled';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';

export interface AutomationTrigger {
  id?: string;
  type: 'schedule' | 'webhook' | 'entity' | 'job' | 'poll';
  [key: string]: unknown;
}

export interface Automation {
  id: string;
  name: string;
  instructions: string;
  enabled: boolean;
  modelId: string;
  visibility: AutomationVisibility;
  spaceId: string | null;
  mutationPolicy: AutomationMutationPolicy;
  notifyCreator: boolean;
  notifyRule: string;
  customToolNames: string[];
  toolAllowRules: unknown[];
  toolConfigs?: unknown[];
  skillIds?: string[];
  subscriberIds?: string[];
  triggers: AutomationTrigger[];
  totalRuns: number;
  lastRunAt: string | null;
  createdAt: string | null;
  createdBy: string;
  updatedAt: string | null;
  projectId: string;
}

export interface AutomationsList {
  automations: Automation[];
  count: number;
  hasMore: boolean;
}

export interface AutomationMutationResult {
  automation?: Automation;
  errorCode: string;
  errorMessage: string | string[];
  success: boolean;
}

export interface AutomationRun {
  id: string;
  automationId: string;
  automationName?: string;
  status: AutomationRunStatus;
  triggerType: string;
  triggerPayload: unknown;
  summary: string | null;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
  workflowRunId: string | null;
  projectId: string;
}

export interface RunHistory {
  hasMore: boolean;
  metrics: { failed24h: number; failed7d: number; successful24h: number; successful7d: number };
  runs: AutomationRun[];
}

export interface RunArtifact {
  artifactId: string;
  contentType: string;
  createdAt: string;
  downloadUrl: string;
  filename: string;
  kind: string;
  previewUrl: string;
  sizeBytes: number;
}

export interface Approval {
  id: string;
  kind: string;
  status: ApprovalStatus;
  automationId: string | null;
  automationName: string;
  chatId: string | null;
  runId: string | null;
  operations: { query: string; variables: Record<string, unknown> | null }[];
  operationsSummary: string;
  affectedCount: number | null;
  preview: unknown;
  reason: string | null;
  error: string | null;
  requestedAt: string;
  expiresAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
  executedAt: string | null;
}

export interface ApprovalsList {
  approvals: Approval[];
  hasMore: boolean;
  pendingCount: number;
}

export interface ApprovalDecisionResult {
  approval?: Approval;
  errorCode: string;
  errorMessage: string;
  success: boolean;
}

export interface AutomationModel {
  id: string;
  name: string;
  kind: 'auto' | 'model';
  deprecated: boolean;
  efforts: string[];
  defaultEffort: string | null;
  autoTier: string | null;
  gatewayModelId: string | null;
}

export interface AutomationTools {
  customTools: {
    connected: boolean;
    connectionLabel: string | null;
    origin: string | null;
    tools: { description: string; name: string }[];
  };
  models: AutomationModel[];
  providers: Record<
    string,
    { channels: { id: string; name: string }[]; connected: boolean; enabled: boolean; workspaceName: string | null }
  >;
  teamId: string;
}

export interface CreditBalance {
  availableMicros: number;
  billingUrl: string;
  display: string;
  isLowBalance: boolean;
  teamId: string;
}
