import type {
  AgentChat,
  AgentChatAttachment,
  AgentChatMessage,
  AgentChatMessageRole,
  AgentChatMessageStatus,
  AgentChatPart,
  AgentChatTurn,
  AutomationApproval,
  AutomationApprovalKind,
  AutomationApprovalOperation,
  AutomationApprovalPreview,
  AutomationApprovalPreviewKind,
  AutomationApprovalPreviewOperation,
  AutomationApprovalPreviewRow,
  AutomationApprovalStatus,
  AutomationMutationPolicy,
  AutomationRun,
  AutomationRunStatus,
  AutomationToolAllowRule,
  AutomationTriggerType,
} from '@flexkit/agent-protocol';

// Shared with the platform through @flexkit/agent-protocol; re-exported so
// the rest of this package keeps importing from './types'.
export type {
  AgentChat,
  AgentChatAttachment,
  AgentChatMessage,
  AgentChatMessageRole,
  AgentChatMessageStatus,
  AgentChatPart,
  AgentChatTurn,
  AutomationApproval,
  AutomationApprovalKind,
  AutomationApprovalOperation,
  AutomationApprovalPreview,
  AutomationApprovalPreviewKind,
  AutomationApprovalPreviewOperation,
  AutomationApprovalPreviewRow,
  AutomationApprovalStatus,
  AutomationMutationPolicy,
  AutomationRun,
  AutomationRunStatus,
  AutomationToolAllowRule,
  AutomationTriggerType,
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

export type AutomationTrigger = AutomationScheduleTrigger | AutomationWebhookTrigger | AutomationEntityTrigger;

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
  projectId: string;
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
  kind: 'html' | 'pdf';
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

