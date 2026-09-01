export type CustomerToolActor =
  | {
      kind: 'automation';
      automationId: string;
      spaceCodes: string[];
      spaceId: string | null;
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

    if (record.spaceId !== null && typeof record.spaceId !== 'string') {
      return null;
    }

    if (!isStringArray(record.spaceCodes)) {
      return null;
    }

    return {
      automationId: record.automationId,
      kind: 'automation',
      spaceCodes: record.spaceCodes,
      spaceId: record.spaceId ?? null,
    };
  }

  return null;
}
