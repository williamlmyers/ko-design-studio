import crypto from "crypto";

function getHmacSecret(): string {
  return process.env.ADMIN_BOOTSTRAP_SECRET || "ko-builders-field-secret";
}

/**
 * Generates a deterministic HMAC-SHA256 hex digest binding a share link to a
 * specific `projectId`, `tradeSlug`, and `magicAccessToken`.
 * Changing `tradeSlug` in the URL invalidates the signature.
 */
export function generateTradeToken(
  projectId: string,
  tradeSlug: string,
  magicAccessToken: string
): string {
  const normalizedSlug = (tradeSlug || "").trim().toLowerCase();
  const payload = `${projectId}:${normalizedSlug}:${magicAccessToken}`;
  return crypto
    .createHmac("sha256", getHmacSecret())
    .update(payload)
    .digest("hex");
}

/**
 * Timing-safe verification of a trade-scoped HMAC token against
 * `${projectId}:${tradeSlug}:${magicAccessToken}`.
 */
export function verifyTradeToken(
  projectId: string,
  tradeSlug: string,
  magicAccessToken: string,
  providedToken?: string | null
): boolean {
  if (!providedToken || typeof providedToken !== "string") {
    return false;
  }

  const expectedHex = generateTradeToken(
    projectId,
    tradeSlug,
    magicAccessToken
  );

  const expectedBuf = Buffer.from(expectedHex, "utf-8");
  const providedBuf = Buffer.from(providedToken.trim(), "utf-8");

  if (expectedBuf.length !== providedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}
