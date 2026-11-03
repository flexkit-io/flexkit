/** Pure helpers of `flexkit members`: argument parsing and row formatting. */

export const PROJECT_ROLES = ['owner', 'developer', 'contributor', 'editor', 'viewer'] as const;

export type ProjectRole = (typeof PROJECT_ROLES)[number];

export interface MemberDto {
  avatarUrl: string | null;
  displayName: string;
  email: string;
  id: string;
  role: string;
}

export interface InvitationDto {
  email: string;
  id: string;
  invitedAt: string;
  invitedBy: { displayName: string; userId: string } | null;
  role: string;
}

export interface InviteResponse {
  errorCode: string;
  errorMessage: string | string[];
  members: MemberDto[];
  success: boolean;
}

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

/** Validates a role name (case-insensitive) against the project roles. */
export function parseRole(value: string | undefined, label = 'role'): ProjectRole {
  const role = value?.trim().toLowerCase() ?? '';

  if (!(PROJECT_ROLES as readonly string[]).includes(role)) {
    throw new Error(
      value
        ? `Unknown ${label} "${value}". Use one of: ${PROJECT_ROLES.join(', ')}.`
        : `Pass a ${label}: ${PROJECT_ROLES.join(', ')}.`
    );
  }

  return role as ProjectRole;
}

/**
 * Emails from positional arguments; each may hold several separated by
 * commas or spaces. Trimmed, de-duplicated (case-insensitive) and checked.
 */
export function parseEmails(values: string[]): string[] {
  const seen = new Set<string>();
  const emails: string[] = [];

  for (const email of values.flatMap((value) => value.split(/[\s,]+/)).filter(Boolean)) {
    if (!EMAIL_PATTERN.test(email)) {
      throw new Error(`Invalid email address: ${email}`);
    }

    if (!seen.has(email.toLowerCase())) {
      seen.add(email.toLowerCase());
      emails.push(email);
    }
  }

  if (emails.length === 0) {
    throw new Error('Pass at least one email address.');
  }

  return emails;
}

/** The `--role` filter of `ls`: a comma separated list of roles. */
export function parseRoleFilter(value: string | undefined): ProjectRole[] | null {
  if (!value) {
    return null;
  }

  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => parseRole(part, '--role'));
}

const ROLE_ORDER: { [role: string]: number } = Object.fromEntries(PROJECT_ROLES.map((role, index) => [role, index]));

/** Owners first, then by role and name. */
export function sortMembers(members: MemberDto[]): MemberDto[] {
  return [...members].sort(
    (left, right) =>
      (ROLE_ORDER[left.role] ?? PROJECT_ROLES.length) - (ROLE_ORDER[right.role] ?? PROJECT_ROLES.length) ||
      left.displayName.localeCompare(right.displayName)
  );
}

export function memberRow(member: MemberDto): string[] {
  return [member.id, member.displayName === member.email ? '' : member.displayName, member.email, member.role];
}

export function invitationRow(invitation: InvitationDto, invitedAt: string): string[] {
  return [invitation.id, invitation.email, invitation.role, invitedAt, invitation.invitedBy?.displayName ?? ''];
}

/** The server's partial-success note (some emails skipped), as one line, or null. */
export function inviteNote(response: InviteResponse): string | null {
  const message = Array.isArray(response.errorMessage) ? response.errorMessage.join(' ') : response.errorMessage;

  return response.errorCode && message ? message : null;
}
