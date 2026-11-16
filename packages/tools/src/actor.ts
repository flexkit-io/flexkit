export type CustomerToolActor =
  | {
      kind: 'automation';
      automationId: string;
      /**
       * For a project or space automation: every space of the project, or the
       * automation's one space. For a personal automation: the spaces of the
       * member it belongs to, which it runs with.
       */
      spaceCodes: string[];
      spaceId: string | null;
      /**
       * Set for a personal automation, which acts with its creator's access.
       * Absent for project and space automations, and when the backend does
       * not report it.
       */
      visibility?: 'personal';
      /** The member a personal automation belongs to. Present together with `visibility`. */
      creatorId?: string;
    }
  | {
      kind: 'chat';
      role: string;
      spaceCodes: string[];
      userId: string;
    };

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function parseCustomerToolActor(value: unknown): CustomerToolActor | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as { [key: string]: unknown };

  if (record.kind === 'chat') {
    if (typeof record.userId !== 'string' || !record.userId) {
      return null;
    }

    if (typeof record.role !== 'string' || !record.role) {
      return null;
    }

    if (!isStringArray(record.spaceCodes)) {
      return null;
    }

    return {
      kind: 'chat',
      role: record.role,
      spaceCodes: record.spaceCodes,
      userId: record.userId,
    };
  }

  if (record.kind === 'automation') {
    if (typeof record.automationId !== 'string' || !record.automationId) {
      return null;
    }

    const spaceId = record.spaceId ?? null;

    if (spaceId !== null && typeof spaceId !== 'string') {
      return null;
    }

    if (!isStringArray(record.spaceCodes)) {
      return null;
    }

    // A personal automation says so and names its member. Both or neither: a handler that
    // scopes data by member must never see "personal" without knowing whose it is.
    const isPersonal =
      record.visibility === 'personal' && typeof record.creatorId === 'string' && record.creatorId !== '';

    return {
      automationId: record.automationId,
      kind: 'automation',
      spaceCodes: record.spaceCodes,
      spaceId,
      ...(isPersonal ? { creatorId: record.creatorId as string, visibility: 'personal' as const } : {}),
    };
  }

  return null;
}
