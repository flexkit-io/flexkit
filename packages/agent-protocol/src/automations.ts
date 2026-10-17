/** Run and approval shapes returned by the automations API. */
export type AutomationRunStatus = 'running' | 'awaiting_approval' | 'success' | 'skipped' | 'failed' | 'cancelled';
export type AutomationTriggerType = 'entity' | 'manual' | 'schedule' | 'webhook';
export type AutomationApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';
export type AutomationApprovalKind = 'graphql' | 'bulk' | 'plugin' | 'exec' | 'schema' | 'automation';
export type AutomationApprovalPreviewKind = 'create' | 'update' | 'delete' | 'unknown';
export type AutomationMutationPolicy = 'require_approval' | 'auto_approve';
/**
 * Which finished runs create an Activity item for the automation's recipients:
 * every run, runs the agent flagged for attention, failures only, or none.
 * Failures notify under every rule except `never`.
 */
export type AutomationNotifyRule = 'always' | 'when_flagged' | 'failures' | 'never';
export type AutomationVisibility = 'project' | 'space' | 'personal';

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

/** Extra context carried by `kind: 'schema'` approvals (agent-proposed schema deployments). */
export interface SchemaChangePreviewSummary {
  /** One line per change, e.g. "Add Review (3 attributes)". */
  summaryLines: string[];
  /** Changes that lose access to data; the deployment was proposed with them acknowledged. */
  breakingChanges: string[];
  warnings: string[];
}

/** A plugin an agent-proposed automation may use. */
export interface AutomationProposalPlugin {
  /** The connected account, e.g. an email address; null when the plugin needs none. */
  account: string | null;
  /** Channel names it delivers to (Slack, Teams); empty when it does not deliver. */
  deliveryChannels: string[];
  name: string;
}

/**
 * Extra context carried by `kind: 'automation'` approvals: the automation the
 * chat agent proposed. Nothing exists until a person approves; the approver may
 * edit the instructions first.
 */
export interface AutomationProposalPreview {
  customTools: string[];
  instructions: string;
  modelLabel: string;
  mutationPolicy: AutomationMutationPolicy;
  name: string;
  notifyCreator: boolean;
  notifyRule: AutomationNotifyRule;
  plugins: AutomationProposalPlugin[];
  /** The description of the chat monitor this automation replaces; the monitor stops once it exists. */
  replacesMonitor?: string;
  /** Run the automation once right after it is created (the approver can also choose this). */
  runOnceAfterCreate: boolean;
  skills: string[];
  spaceLabel: string | null;
  /** Subscribers' display names. */
  subscribers: string[];
  /** One line per trigger in plain words, e.g. "Every Monday at 09:00 (Europe/Prague)". */
  triggers: string[];
  visibility: AutomationVisibility;
}

/** One changed setting of an automation, in plain words. */
export interface AutomationChangeField {
  after: string;
  before: string;
  /** `name`, `instructions`, `triggers`, `enabled`, `notifyRule` or `mutationPolicy`. */
  field: string;
  label: string;
}

/**
 * Extra context carried by `kind: 'automation'` approvals that change an
 * existing automation: only the settings that change, before and after.
 */
export interface AutomationChangePreview {
  automationId: string;
  changes: AutomationChangeField[];
  /** The automation's current name. */
  name: string;
}

export interface AutomationApprovalPreview {
  automation?: AutomationProposalPreview;
  automationChange?: AutomationChangePreview;
  operations: AutomationApprovalPreviewOperation[];
  schema?: SchemaChangePreviewSummary;
}

/** What an approved `kind: 'automation'` proposal created. */
export interface CreatedAutomationResult {
  automationId: string;
  /** The first run, when the approver chose to run it once. */
  runId: string | null;
}

export interface AutomationApproval {
  affectedCount: number | null;
  /** Null for approvals raised by a chat turn. */
  automationId: string | null;
  automationName: string;
  /** Set once an approved `kind: 'automation'` proposal created its automation. */
  createdAutomation?: CreatedAutomationResult | null;
  /** Set for approvals raised by a chat turn. */
  chatId: string | null;
  chatMessageId: string | null;
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
  /** Null for approvals raised by a chat turn. */
  runId: string | null;
  status: AutomationApprovalStatus;
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

/** A plugin tool a reviewer chose to always allow for one automation. */
export interface AutomationToolAllowRule {
  addedAt: string;
  addedBy: string | null;
  pluginId: string;
  server: string;
  tool: string;
}
