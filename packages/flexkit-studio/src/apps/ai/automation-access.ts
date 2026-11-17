import type { Automation, AutomationVisibility } from './types';

type MemberSubject = { capabilities?: unknown; role?: string | null } | null | undefined;

/** Roles the backend lets create their own personal automations only. */
const PERSONAL_ONLY_ROLES = new Set(['editor', 'contributor']);

/**
 * True when the signed-in member may only keep personal automations with a
 * reduced feature set (no webhooks, project connections, channel delivery,
 * custom tools or auto-approve).
 *
 * Only a backend that reports `canCreatePersonalAutomations` enforces those
 * limits. With an older backend the field is missing and the form stays as it
 * was, so nothing changes for anyone until the backend does.
 */
export function isMemberPersonalOnly(user: MemberSubject): boolean {
  if (!user?.role || !PERSONAL_ONLY_ROLES.has(user.role)) {
    return false;
  }

  const sent = user.capabilities;

  return (
    Boolean(sent) &&
    typeof sent === 'object' &&
    !Array.isArray(sent) &&
    typeof (sent as Record<string, unknown>).canCreatePersonalAutomations === 'boolean'
  );
}

/**
 * Whether saving needs the "make it personal" confirmation: an owner or
 * developer turning an existing project or space automation into a personal
 * one removes its subscribers and hands it to them, which is hard to undo.
 */
export function needsPersonalConversionConfirm({
  memberPersonalOnly,
  nextVisibility,
  saved,
}: {
  memberPersonalOnly: boolean;
  nextVisibility: AutomationVisibility;
  /** The stored automation; undefined when creating one. */
  saved: Pick<Automation, 'visibility'> | undefined;
}): boolean {
  if (memberPersonalOnly || !saved || nextVisibility !== 'personal') {
    return false;
  }

  // Older APIs omit visibility, which means project.
  return (saved.visibility ?? 'project') !== 'personal';
}

/**
 * Why an automation is off, when the backend switched it off rather than its
 * owner. Null for automations that are on, switched off by hand, or come from
 * an older backend that does not say.
 */
export function getDisabledReasonLabel(
  automation: Pick<Automation, 'disabledByName' | 'disabledReason' | 'enabled'>
): string | null {
  if (automation.enabled) {
    return null;
  }

  switch (automation.disabledReason) {
    case 'owner':
      return automation.disabledByName ? `Switched off by ${automation.disabledByName}` : 'Switched off by a project owner';
    case 'creator_role':
      return 'Your role no longer allows it';
    case 'credit_cap':
      return 'Credit limit reached';
    case 'loop_protection':
      return 'Switched off by loop protection';
    default:
      return null;
  }
}
