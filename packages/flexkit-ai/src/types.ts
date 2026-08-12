export type AutomationRunStatus = 'running' | 'awaiting_approval' | 'success' | 'skipped' | 'failed' | 'cancelled';
export type AutomationTriggerType = 'entity' | 'manual' | 'schedule' | 'webhook';
export type AutomationTriggerEvent = 'create' | 'update' | 'delete';
export type AutomationToolProvider = 'slack' | 'teams';
export type AutomationMutationPolicy = 'require_approval' | 'auto_approve';
export type AutomationApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';
export type AutomationApprovalKind = 'graphql' | 'bulk';
export type AutomationApprovalPreviewKind = 'create' | 'update' | 'delete' | 'unknown';
export type AutomationVisibility = 'project' | 'space' | 'personal';

export interface AutomationScheduleTrigger {
  cron: string;
  id?: string;
  timezone: string;
  type: 'schedule';
}

export interface AutomationWebhookTrigger {
  id?: string;
  secret: string | null;
  token: string;
  type: 'webhook';
  url?: string;
}

export interface AutomationEntityTrigger {
  entities: string[];
  events: AutomationTriggerEvent[];
  id?: string;
  type: 'entity';
}

export type AutomationTrigger = AutomationScheduleTrigger | AutomationWebhookTrigger | AutomationEntityTrigger;

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

export interface ProjectSpace {
  code: string;
  id: string;
  label: string;
}

export interface Skill {
  content: string;
  createdAt: string;
  createdBy: string;
  description: string;
  id: string;
  name: string;
  projectId: string;
  spaceId: string | null;
  updatedAt: string;
  visibility: AutomationVisibility;
}

export interface SkillsList {
  count: number;
  hasMore: boolean;
  skills: Skill[];
}

export interface SkillInput {
  content: string;
  description: string;
  name: string;
  /** Space id required when visibility is "space". */
  spaceId?: string | null;
  visibility: AutomationVisibility;
}

export interface Automation {
  createdAt: string | null;
  createdBy?: string;
  enabled: boolean;
  id: string;
  instructions: string;
  lastRunAt: string | null;
  modelId: string;
  /** May be absent from older API responses. */
  mutationPolicy?: AutomationMutationPolicy;
  name: string;
  projectId: string;
  /** Attached skill ids. Only populated by the detail endpoint. */
  skillIds?: string[];
  /** Space the automation belongs to when visibility is "space". */
  spaceId?: string | null;
  totalRuns: number;
  triggers: AutomationTrigger[];
  updatedAt: string | null;
  /** May be absent from older API responses; treated as "project". */
  visibility?: AutomationVisibility;
}

export interface AutomationApprovalOperation {
  query: string;
  variables: { [key: string]: unknown } | null;
}

export interface AutomationApprovalPreviewRow {
  after: { [key: string]: unknown } | null;
  before: { [key: string]: unknown } | null;
  id: string | null;
}

export interface AutomationApprovalPreviewOperation {
  affectedCount: number | null;
  columns: string[];
  /** Read-only fields shown alongside the changed columns for reviewer context. */
  contextColumns?: string[];
  entity: string | null;
  kind: AutomationApprovalPreviewKind;
  rows: AutomationApprovalPreviewRow[];
  truncated: boolean;
}

export interface AutomationApprovalPreview {
  operations: AutomationApprovalPreviewOperation[];
}

export interface AutomationApproval {
  affectedCount: number | null;
  automationId: string;
  automationName: string;
  decidedAt: string | null;
  decidedBy: string | null;
  error: string | null;
  executedAt: string | null;
  expiresAt: string;
  id: string;
  kind: AutomationApprovalKind;
  operations: AutomationApprovalOperation[];
  operationsSummary: string;
  preview: AutomationApprovalPreview | null;
  projectId: string;
  reason: string | null;
  requestedAt: string;
  runId: string;
  status: AutomationApprovalStatus;
}

export interface AutomationApprovals {
  approvals: AutomationApproval[];
  hasMore: boolean;
  pendingCount: number;
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
  instructions: string;
  modelId: string;
  mutationPolicy?: AutomationMutationPolicy;
  name: string;
  /** Skills that are always loaded into the agent context on every run. */
  skillIds: string[];
  /** Space id required when visibility is "space". */
  spaceId?: string | null;
  toolConfigs: AutomationToolConfigInput[];
  triggers: AutomationTrigger[];
  visibility?: AutomationVisibility;
}

export interface MutationResult {
  errorCode: string;
  errorMessage: string | string[];
  success: boolean;
}

export type AgentChatMessageRole = 'user' | 'assistant';
export type AgentChatMessageStatus = 'pending' | 'streaming' | 'awaiting_approval' | 'complete' | 'failed';

export interface AgentChat {
  createdAt: string;
  id: string;
  lastMessageAt: string | null;
  modelId: string | null;
  title: string | null;
  updatedAt: string;
}

export interface AgentChatsList {
  chats: AgentChat[];
  hasMore: boolean;
}

/** UIMessage-shaped part persisted for finished turns. */
export interface AgentChatPart {
  data?: unknown;
  errorText?: string;
  input?: unknown;
  output?: unknown;
  state?: string;
  text?: string;
  toolCallId?: string;
  type: string;
}

export interface AgentChatMessage {
  createdAt: string;
  error: string | null;
  id: string;
  parts: AgentChatPart[] | null;
  role: AgentChatMessageRole;
  status: AgentChatMessageStatus;
  textContent: string;
  workflowRunId: string | null;
}

export interface AgentChatDetail {
  chat: AgentChat;
  messages: AgentChatMessage[];
  pendingApproval: AutomationApproval | null;
}

export interface AgentChatSearchResult {
  chatId: string;
  chatTitle: string | null;
  createdAt: string;
  messageId: string;
  score: number;
  snippet: string;
}

export interface AgentChatTurn {
  assistantMessage: AgentChatMessage;
  userMessage: AgentChatMessage;
  workflowRunId: string;
}
