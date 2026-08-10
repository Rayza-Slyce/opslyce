export const CODENAME_MIN_LENGTH = 2;
export const CODENAME_MAX_LENGTH = 18;

export type ValidCodename = Readonly<{ valid: true; value: string }>;

export type InvalidCodename = Readonly<{ valid: false; error: string }>;

export type CodenameValidationResult = ValidCodename | InvalidCodename;

export type CodenameSaveResult =
  | InvalidCodename
  | Readonly<{
      valid: true;
      value: string;
      persisted: boolean;
    }>;

const allowedCodenamePattern = /^[\p{L}\p{N} _-]+$/u;

export function normaliseCodename(value: string): string {
  return value.replace(/^ +| +$/gu, '').replace(/ {2,}/gu, ' ');
}

export function validateCodename(value: string): CodenameValidationResult {
  const normalised = normaliseCodename(value);
  const visibleLength = Array.from(normalised).length;

  if (visibleLength < CODENAME_MIN_LENGTH) {
    return { valid: false, error: 'Codename must contain at least 2 characters.' };
  }

  if (visibleLength > CODENAME_MAX_LENGTH) {
    return { valid: false, error: 'Codename must contain no more than 18 characters.' };
  }

  if (!allowedCodenamePattern.test(normalised)) {
    return {
      valid: false,
      error: 'Use only letters, numbers, spaces, hyphens or underscores.'
    };
  }

  return { valid: true, value: normalised };
}
