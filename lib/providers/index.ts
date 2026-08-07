/**
 * Single decision point for which video provider serves a request.
 *
 * Selection order is deliberate:
 *   1. Mock, only when explicitly enabled and not production.
 *   2. fal, the current real provider.
 *
 * A future kie.ai implementation registers here; the generate route never
 * changes to accommodate it.
 */

import { FalVideoProvider } from "./falVideoProvider";
import { MockVideoProvider, isMockProviderEnabled } from "./mockVideoProvider";
import type { VideoProvider } from "./videoProvider";

export { isMockProviderEnabled };
export { normalizeRequestId } from "./videoProvider";
export type {
  VideoJobInput,
  VideoJobResult,
  VideoProvider,
  VideoProviderId,
} from "./videoProvider";

export function getVideoProvider(): VideoProvider {
  if (isMockProviderEnabled()) return new MockVideoProvider();
  return new FalVideoProvider();
}

/**
 * Whether a real provider credential is present. Kept separate from
 * getVideoProvider() so /api/health reports credential truth rather than
 * whichever provider a mock run selected.
 */
export function isRealProviderConfigured(): boolean {
  return new FalVideoProvider().isConfigured();
}
