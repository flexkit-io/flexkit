export const FLEXKIT_ERROR_CODES = ['PROJECT_PAUSED', 'PROJECT_NOT_FOUND', 'READ_ONLY_MODE', 'UNKNOWN_ERROR'] as const;

export type FlexkitErrorCode = (typeof FLEXKIT_ERROR_CODES)[number];

export const FLEXKIT_ERROR_MESSAGES: Record<FlexkitErrorCode, string> = {
  PROJECT_PAUSED: 'This project has been paused.',
  PROJECT_NOT_FOUND: 'The requested project ID was not found',
  READ_ONLY_MODE: 'This project is currently in read only mode and changes cannot be saved',
  UNKNOWN_ERROR: 'Sorry, an unexpected error has occurred. Please try again',
};

export class FlexkitError extends Error {
  readonly code: FlexkitErrorCode;

  constructor(code: FlexkitErrorCode, message?: string) {
    super(message ?? FLEXKIT_ERROR_MESSAGES[code]);
    this.name = 'FlexkitError';
    this.code = code;

    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, new.target.prototype);
    }
  }

  static from(code: FlexkitErrorCode, message?: string): FlexkitError {
    return new FlexkitError(code, message);
  }
}

export function isFlexkitError(error: unknown): error is FlexkitError {
  if (!(error instanceof Error)) {
    return false;
  }

  const maybeCode = (error as { code?: unknown }).code;

  if (typeof maybeCode !== 'string') {
    return false;
  }

  return (FLEXKIT_ERROR_CODES as readonly string[]).includes(maybeCode);
}

export function getFlexkitErrorCode(error: unknown): FlexkitErrorCode | undefined {
  if (isFlexkitError(error)) {
    return error.code;
  }

  return undefined;
}
