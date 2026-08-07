/** Join class names, dropping anything falsy. No dependency needed for this. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
