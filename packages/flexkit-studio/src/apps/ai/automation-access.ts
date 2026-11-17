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
 * Whether the signed-in member may make the stored automation personal. Only
 * its creator may: the server refuses anyone else (`personal_requires_creator`),
 * since it would hide a colleague's automation from the whole project. A new
 * automation, one that is personal already, and one from an older API that
 * does not say who created it are not limited here.
 */
export function canMakePersonal(
  saved: Pick<Automation, 'createdBy' | 'visibility'> | undefined,
  userId: string | null | undefined
): boolean {
  if (!saved || saved.visibility === 'personal' || !saved.createdBy) {
    return true;
  }

  return saved.createdBy === userId;
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
  userId,
}: {
  memberPersonalOnly: boolean;
  nextVisibility: AutomationVisibility;
  /** The stored automation; undefined when creating one. */
  saved: Pick<Automation, 'createdBy' | 'visibility'> | undefined;
  userId: string | null | undefined;
}): boolean {
  // Someone else's automation cannot be made personal at all, so there is nothing to confirm.
  if (memberPersonalOnly || !saved || nextVisibility !== 'personal' || !canMakePersonal(saved, userId)) {
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
