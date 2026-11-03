import type { Automation, AutomationTrigger } from './types';

/**
 * The body of `POST /automations` and `PATCH /automations/:id`. The API
 * replaces the whole definition on update (missing `triggers`, `toolConfigs`
 * or `enabled` reset to empty/false), so updates always send the current
 * definition with the changes applied on top.
 */
export type AutomationInput = Record<string, unknown>;

/** Fields of an automation the API computes; they are not part of its input. */
const READ_ONLY_FIELDS = ['id', 'createdAt', 'createdBy', 'lastRunAt', 'projectId', 'totalRuns', 'updatedAt'];

export const AUTOMATION_DEFAULTS: AutomationInput = {
  enabled: false,
  modelId: 'auto',
  visibility: 'project',
  spaceId: null,
  toolConfigs: [],
  triggers: [],
};

/** A trigger as input: without its server-made `id` (and a webhook's computed `url`). */
export function toTriggerInput(trigger: AutomationTrigger): AutomationTrigger {
  const { id: _id, url: _url, ...rest } = trigger;

  return rest as AutomationTrigger;
}

/** Turns an automation from the API into the input that recreates it. */
export function toAutomationInput(automation: Automation | AutomationInput): AutomationInput {
  const input: AutomationInput = {};

  for (const [key, value] of Object.entries(automation)) {
    if (!READ_ONLY_FIELDS.includes(key) && value !== undefined) {
      input[key] = value;
    }
  }

  if (Array.isArray(input.triggers)) {
    input.triggers = (input.triggers as AutomationTrigger[]).map(toTriggerInput);
  }

  return input;
}

export interface AutomationFlagValues {
  name?: string;
  instructions?: string;
  modelId?: string;
  visibility?: string;
  spaceId?: string;
  enabled?: boolean;
  mutationPolicy?: string;
  schedules?: string[];
  timezone?: string;
}

const VISIBILITIES = ['project', 'space', 'personal'];
const MUTATION_POLICIES = ['require_approval', 'auto_approve'];

/** Applies flag values on top of an input. `--schedule` adds schedule triggers. */
export function applyAutomationFlags(input: AutomationInput, flags: AutomationFlagValues): AutomationInput {
  const result: AutomationInput = { ...input };

  if (flags.name !== undefined) {
    result.name = flags.name;
  }

  if (flags.instructions !== undefined) {
    result.instructions = flags.instructions;
  }

  if (flags.modelId !== undefined) {
    result.modelId = flags.modelId;
  }

  if (flags.visibility !== undefined) {
    if (!VISIBILITIES.includes(flags.visibility)) {
      throw new Error(`Unknown visibility "${flags.visibility}". Use project, space or personal.`);
    }

    result.visibility = flags.visibility;
  }

  if (flags.spaceId !== undefined) {
    result.spaceId = flags.spaceId;

    if (flags.visibility === undefined) {
      result.visibility = 'space';
    }
  }

  if (flags.enabled !== undefined) {
    result.enabled = flags.enabled;
  }

  if (flags.mutationPolicy !== undefined) {
    if (!MUTATION_POLICIES.includes(flags.mutationPolicy)) {
      throw new Error(`Unknown mutation policy "${flags.mutationPolicy}". Use require_approval or auto_approve.`);
    }

    result.mutationPolicy = flags.mutationPolicy;
  }

  if (flags.schedules && flags.schedules.length > 0) {
    const existing = Array.isArray(result.triggers) ? (result.triggers as AutomationTrigger[]) : [];
    const timezone = flags.timezone ?? 'UTC';

    result.triggers = [...existing, ...flags.schedules.map((cron) => ({ type: 'schedule' as const, cron, timezone }))];
  } else if (flags.timezone !== undefined) {
    throw new Error('--timezone only applies together with --schedule.');
  }

  return result;
}

/** The body for creating an automation: defaults, then the file, then flags. */
export function buildCreateInput(file: AutomationInput | undefined, flags: AutomationFlagValues): AutomationInput {
  const input = applyAutomationFlags({ ...AUTOMATION_DEFAULTS, ...toAutomationInput(file ?? {}) }, flags);
  const missing = ['name', 'instructions'].filter(
    (key) => typeof input[key] !== 'string' || !(input[key] as string).trim()
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing ${missing.map((key) => (key === 'name' ? '--name' : '--instructions')).join(' and ')} (or the same fields in --file).`
    );
  }

  return input;
}

/** The body for updating an automation: its current definition, then the file, then flags. */
export function buildUpdateInput(
  current: Automation,
  file: AutomationInput | undefined,
  flags: AutomationFlagValues
): AutomationInput {
  return applyAutomationFlags({ ...toAutomationInput(current), ...toAutomationInput(file ?? {}) }, flags);
}

/** True when the flags or file change nothing. */
export function isEmptyChange(file: AutomationInput | undefined, flags: AutomationFlagValues): boolean {
  return (
    (!file || Object.keys(toAutomationInput(file)).length === 0) &&
    Object.values(flags).every((value) => value === undefined || (Array.isArray(value) && value.length === 0))
  );
}

/** A short description of one trigger: `cron 0 9 * * * Europe/Madrid`, `webhook`, `on create Product`… */
export function describeTrigger(trigger: AutomationTrigger): string {
  switch (trigger.type) {
    case 'schedule':
      return `cron ${String(trigger.cron)}${trigger.timezone && trigger.timezone !== 'UTC' ? ` ${String(trigger.timezone)}` : ''}`;
    case 'webhook':
      return 'webhook';
    case 'entity': {
      const events = Array.isArray(trigger.events) ? (trigger.events as string[]).join(',') : '';
      const entities =
        Array.isArray(trigger.entities) && trigger.entities.length > 0
          ? (trigger.entities as string[]).join(',')
          : 'any entity';

      return `on ${events} ${entities}`;
    }
    case 'job':
      return `after ${String(trigger.job)}${trigger.outcome && trigger.outcome !== 'any' ? ` ${String(trigger.outcome)}` : ''}`;
    case 'poll':
      return `poll every ${String(trigger.intervalMinutes)}m`;
    default:
      return String(trigger.type);
  }
}

export function describeTriggers(triggers: AutomationTrigger[] | undefined): string {
  return triggers && triggers.length > 0 ? triggers.map(describeTrigger).join('; ') : 'manual';
}
