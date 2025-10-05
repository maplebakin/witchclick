export function toCssVariables(vars: Record<string, string | undefined | null>): string {
  return Object.entries(vars)
    .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
    .map(([key, value]) => `--${key}: ${value}`)
    .join("; ");
}
