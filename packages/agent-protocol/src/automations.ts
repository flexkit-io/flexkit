/** Run and approval shapes returned by the automations API. */
export type AutomationRunStatus = 'running' | 'awaiting_approval' | 'success' | 'skipped' | 'failed' | 'cancelled';
export type AutomationTriggerType = 'entity' | 'manual' | 'schedule' | 'webhook';
export type AutomationApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';
export type AutomationApprovalKind = 'graphql' | 'bulk' | 'plugin' | 'exec';
export type AutomationApprovalPreviewKind = 'create' | 'update' | 'delete' | 'unknown';
export type AutomationMutationPolicy = 'require_approval' | 'auto_approve';

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
  /** Null for approvals raised by a chat turn. */
  automationId: string | null;
  automationName: string;
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
