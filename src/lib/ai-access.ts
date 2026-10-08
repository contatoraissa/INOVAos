export function isLocalAiRequest({
  development,
  enabled,
  url,
  origin,
  additionalOrigin,
}: {
  development: boolean;
  enabled: boolean;
  url: string;
  origin: string | null;
  additionalOrigin?: string | undefined;
}) {
  if (!development || !enabled) return false;
  try {
    const parsed = new URL(url);
    const allowedOrigins = (additionalOrigin ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    return (
      (["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname) ||
        allowedOrigins.includes(parsed.origin)) &&
      (!origin || origin === parsed.origin)
    );
  } catch {
    return false;
  }
}
