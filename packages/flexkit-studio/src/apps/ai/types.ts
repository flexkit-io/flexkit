import type {
  ActivityItem,
  ActivityItemKind,
  ActivityItemResolution,
  ActivityItemsPage,
  ActivityItemState,
  ActivitySummary,
  AgentChat,
  AgentChatAttachment,
  AgentChatFollowUp,
  AgentChatFollowUpDelivery,
  AgentChatFollowUpResult,
  AgentChatMessage,
  AgentChatMessageKind,
  AgentChatMonitor,
  AgentMonitorStatus,
  AgentChatMessageRole,
  AgentChatMessageStatus,
  AgentChatPart,
  AgentChatQuestion,
  AgentChatQuestionAnswer,
  AgentChatQuestionResponse,
  AgentChatTurn,
  AutomationApproval,
  AutomationApprovalKind,
  AutomationApprovalOperation,
  AutomationApprovalPreview,
  AutomationApprovalPreviewKind,
  AutomationApprovalPreviewOperation,
  AutomationApprovalPreviewRow,
  AutomationApprovalStatus,
  AutomationChangeField,
  AutomationChangePreview,
  AutomationMutationPolicy,
  AutomationNotifyRule,
  AutomationProposalPlugin,
  AutomationProposalPreview,
  AutomationRun,
  AutomationRunStatus,
  AutomationToolAllowRule,
  AutomationTriggerType,
  CreatedAutomationResult,
} from '@flexkit/agent-protocol';

// Shared with the platform through @flexkit/agent-protocol; re-exported so
// the rest of this package keeps importing from './types'.
export type {
  ActivityItem,
  ActivityItemKind,
  ActivityItemResolution,
  ActivityItemsPage,
  ActivityItemState,
  ActivitySummary,
  AgentChat,
  AgentChatAttachment,
  AgentChatFollowUp,
  AgentChatFollowUpDelivery,
  AgentChatFollowUpResult,
  AgentChatMessage,
  AgentChatMessageKind,
  AgentChatMonitor,
  AgentMonitorStatus,
  AgentChatMessageRole,
  AgentChatMessageStatus,
  AgentChatPart,
  AgentChatQuestion,
  AgentChatQuestionAnswer,
  AgentChatQuestionResponse,
  AgentChatTurn,
  AutomationApproval,
  AutomationApprovalKind,
  AutomationApprovalOperation,
  AutomationApprovalPreview,
  AutomationApprovalPreviewKind,
  AutomationApprovalPreviewOperation,
  AutomationApprovalPreviewRow,
  AutomationApprovalStatus,
  AutomationChangeField,
  AutomationChangePreview,
  AutomationMutationPolicy,
  AutomationNotifyRule,
  AutomationProposalPlugin,
  AutomationProposalPreview,
  AutomationRun,
  AutomationRunStatus,
  AutomationToolAllowRule,
  AutomationTriggerType,
  CreatedAutomationResult,
};

export type AutomationTriggerEvent = 'create' | 'update' | 'delete';
export type AutomationToolProvider = 'slack' | 'teams';
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

/** The jobs whose completion can start an automation. */
export type AutomationJobKind = 'automation_run' | 'bulk_action' | 'schema_deploy';

export interface AutomationJobTrigger {
  /** For `automation_run` (required) and `bulk_action`: only jobs of this automation; null for any. */
  automationId: string | null;
  id?: string;
  job: AutomationJobKind;
  outcome: 'any' | 'failed' | 'succeeded';
  type: 'job';
}

export type AutomationPollConditionOp = 'contains' | 'eq' | 'exists' | 'gt' | 'gte' | 'lt' | 'lte' | 'neq';

export interface AutomationPollTrigger {
  /** Without a condition, a run starts whenever the query result changes. */
  condition: { op: AutomationPollConditionOp; path: string; value?: string | number | boolean | null } | null;
  id?: string;
  intervalMinutes: number;
  query: string;
  type: 'poll';
  variables: { [key: string]: unknown } | null;
}

export type AutomationTrigger =
  | AutomationScheduleTrigger
  | AutomationWebhookTrigger
  | AutomationEntityTrigger
  | AutomationJobTrigger
  | AutomationPollTrigger;

export interface AutomationToolChannel {
  id: string;
  name: string;
  serviceUrl?: string;
  teamId?: string;
}

export interface AutomationModel {
  /** Price/quality band the Auto router may pick this model from; null when never auto-picked. */
  autoTier?: 'fast' | 'balanced' | 'strong' | null;
  defaultEffort?: string | null;
  deprecated: boolean;
  /** Legacy label of the default effort ("Medium"). */
  effort: string | null;
  /** Reasoning efforts the model supports, ascending; empty for Auto. Absent on older APIs. */
  efforts?: string[];
  gatewayModelId?: string | null;
  /** `auto`, or `<gatewayModelId>:<defaultEffort>`. Any `<gatewayModelId>:<effort>` may be sent back. */
  id: string;
  kind?: 'auto' | 'model';
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
  logoUrl: string | null;
  name: string;
  projectId: string;
  source: 'code' | 'studio' | 'plugin';
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
  toolConfigs?: AutomationToolConfigInput[];
  createdAt: string | null;
  createdBy?: string;
  /** Customer tool names attached to this automation. */
  customToolNames?: string[];
  enabled: boolean;
  id: string;
  instructions: string;
  lastRunAt: string | null;
  modelId: string;
  /** May be absent from older API responses. */
  mutationPolicy?: AutomationMutationPolicy;
  name: string;
  /** May be absent from older API responses; treated as true. */
  notifyCreator?: boolean;
  /** May be absent from older API responses; treated as "when_flagged". */
  notifyRule?: AutomationNotifyRule;
  projectId: string;
  /** Members who receive its approval requests and run notifications. Only populated by the detail endpoint. */
  subscriberIds?: string[];
  /** Plugin tools a reviewer chose to always allow in this automation. */
  toolAllowRules?: AutomationToolAllowRule[];
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

export interface AutomationApprovals {
  approvals: AutomationApproval[];
  hasMore: boolean;
  pendingCount: number;
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

export interface AutomationCustomTool {
  description: string;
  name: string;
}

export interface AutomationCustomTools {
  connected: boolean;
  connectionLabel: string | null;
  origin: string | null;
  tools: AutomationCustomTool[];
}

export interface AutomationTools {
  customTools?: AutomationCustomTools;
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
  kind: 'html' | 'pdf' | 'csv' | 'json';
  previewUrl: string;
  sizeBytes: number;
}

export interface AutomationToolConfigInput {
  pluginId: string;
  enabled: boolean;
  connectionMode: 'project' | 'personal';
  connectionId: string | null;
  /** Every tool of the plugin, including ones added later; `selectedTools` applies only when false. */
  allTools?: boolean;
  selectedTools: string[];
  deliveryEnabled: boolean;
  channels: AutomationToolChannel[];
}

export interface AutomationInput {
  /** Customer tool names this automation may call. */
  customToolNames: string[];
  enabled: boolean;
  instructions: string;
  modelId: string;
  mutationPolicy?: AutomationMutationPolicy;
  name: string;
  notifyCreator: boolean;
  notifyRule: AutomationNotifyRule;
  /** Members who receive its approval requests and run notifications. */
  subscriberIds: string[];
  /** Omitted keeps the stored rules; an array replaces them. */
  toolAllowRules?: AutomationToolAllowRule[];
  /** Skills that are always loaded into the agent context on every run. */
  skillIds: string[];
  /** Space id required when visibility is "space". */
  spaceId?: string | null;
  toolConfigs: AutomationToolConfigInput[];
  triggers: AutomationTrigger[];
  visibility?: AutomationVisibility;
}

/** A project member as listed for pickers (`GET /members`). */
export interface ProjectMember {
  avatarUrl: string | null;
  displayName: string;
  email: string;
  id: string;
  role: string;
}

export interface MutationResult {
  errorCode: string;
  errorMessage: string | string[];
  success: boolean;
}

export interface AgentChatsList {
  chats: AgentChat[];
  hasMore: boolean;
}

export interface AgentChatDetail {
  hasMore?: boolean;
  nextCursor?: string | null;
  chat: AgentChat;
  messages: AgentChatMessage[];
  /** Monitors still watching for this chat; may be absent from older API responses. */
  monitors?: AgentChatMonitor[];
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
