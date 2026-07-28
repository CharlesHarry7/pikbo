/** Pure private-result identity/host guards shared by runtime and no-network tests. */

export function providerOutputHostAllowed(value, allowlist) {
  if (!Array.isArray(allowlist) || allowlist.length === 0) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (
      url.protocol !== "https:" ||
      !host ||
      url.username ||
      url.password ||
      host === "localhost" ||
      host.endsWith(".localhost") ||
      /^(?:0|10|127|169\.254|172\.(?:1[6-9]|2\d|3[01])|192\.168)\./.test(
        host
      )
    ) {
      return false;
    }
    return allowlist
      .map((entry) => String(entry).trim().toLowerCase().replace(/^\./, ""))
      .filter(Boolean)
      .some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

export function privateResultObjectKey(input) {
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuid.test(input.userId) || !uuid.test(input.jobId)) return null;
  return `private-results/${input.userId.toLowerCase()}/${input.jobId.toLowerCase()}.mp4`;
}
