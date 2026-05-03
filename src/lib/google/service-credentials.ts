/** Load Google Calendar API credentials for a GCP-style service account. */

export type ServiceAccountCredentials = {
  client_email: string;
  private_key: string;
};

/**
 * Prefer `GOOGLE_SERVICE_ACCOUNT_JSON` (full JSON pasted as env), or EMAIL + PRIVATE_KEY.
 * PRIVATE_KEY expects literal `\n` for newlines in env files.
 */
export function loadServiceAccountCredentials(): ServiceAccountCredentials | null {
  const jsonRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (jsonRaw) {
    try {
      const parsed = JSON.parse(jsonRaw) as {
        client_email?: string;
        private_key?: string;
      };
      if (
        typeof parsed.client_email !== "string" ||
        typeof parsed.private_key !== "string"
      ) {
        console.error("[service-account] GOOGLE_SERVICE_ACCOUNT_JSON missing client_email/private_key");
        return null;
      }
      return {
        client_email: parsed.client_email,
        private_key: parsed.private_key.replace(/\\n/g, "\n"),
      };
    } catch {
      console.error("[service-account] Invalid GOOGLE_SERVICE_ACCOUNT_JSON");
      return null;
    }
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (email && key) return { client_email: email, private_key: key };
  return null;
}
