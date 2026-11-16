/**
 * The letter shown on a generated avatar, for someone who has no picture:
 * the initial of their name, or the first letter of their email address
 * when they gave no name. Upper case. Empty when there is neither, and the
 * avatar then stays a plain pattern.
 */
export function getAvatarInitial(name: string | null | undefined, email: string | null | undefined): string {
  for (const source of [name, email]) {
    // By code point, so a letter outside the basic plane is not cut in half.
    const [first] = Array.from((source ?? '').trim());

    if (first) {
      return first.toLocaleUpperCase();
    }
  }

  return '';
}
