/** Pure private-result identity/host guards shared by runtime and no-network tests. */

function normalizedProviderHost(value) {
  const host = String(value).trim().toLowerCase().replace(/^\./, "");
  if (
    !host ||
    host.length > 253 ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)
  ) {
    return null;
  }
  const labels = host.split(".");
  if (
    labels.length < 2 ||
    labels.some(
      (label) =>
        label.length === 0 ||
        label.length > 63 ||
        !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)
    )
  ) {
    return null;
  }
  return host;
}

/**
 * Parse the operator allowlist as hostname-only entries. A single malformed
 * value invalidates the complete configuration so readiness and delivery
 * cannot disagree after a paid Provider call.
 *
 * @returns {string[]}
 */
export function parseProviderOutputHostAllowlist(value) {
  const entries = (
    Array.isArray(value) ? value : String(value || "").split(",")
  ).map((entry) => String(entry).trim());
  if (entries.every((entry) => !entry)) return [];
  if (entries.some((entry) => !entry)) return [];
  /** @type {string[]} */
  const hosts = [];
  for (const entry of entries) {
    const host = normalizedProviderHost(entry);
    if (!host) return [];
    hosts.push(host);
  }
  return [...new Set(hosts)];
}

export function providerOutputHostAllowed(value, allowlist) {
  const configuredHosts = parseProviderOutputHostAllowlist(allowlist);
  if (configuredHosts.length === 0) return false;
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
    return configuredHosts.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`)
    );
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

/** Pure decision used after an ambiguous private Storage write is read back. */
export function privateStoredObjectMatches(input) {
  return (
    Number.isInteger(input.expectedByteLength) &&
    input.expectedByteLength >= 32 &&
    Number.isInteger(input.storedByteLength) &&
    input.storedByteLength === input.expectedByteLength &&
    typeof input.expectedChecksum === "string" &&
    /^[a-f0-9]{64}$/.test(input.expectedChecksum) &&
    input.storedChecksum === input.expectedChecksum
  );
}
