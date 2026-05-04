/**
 * Single-line JSON logs for readability in hosted log drains.
 */
export function logEvent(
  scope: string,
  level: "info" | "warn" | "error",
  message: string,
  extra?: Record<string, unknown>,
): void {
  const line = JSON.stringify({
    t: new Date().toISOString(),
    scope,
    level,
    message,
    ...extra,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
