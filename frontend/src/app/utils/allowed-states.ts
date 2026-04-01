/** States shown in the UI dropdown only; API / CSV unchanged. */
export const ALLOWED_STATE_CODES = ["FL", "NY", "HI", "LA", "TX"] as const;

export function filterStatesForUi(states: string[]): string[] {
  const set = new Set(states);
  return ALLOWED_STATE_CODES.filter((code) => set.has(code));
}
