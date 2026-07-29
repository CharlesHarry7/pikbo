import {
  freeDeliveryReadyForAccess,
  isPrivateLiveInvite,
  parsePrivateLiveAllowlist,
  privateLiveBudget,
} from "@/lib/privateLiveBeta.mjs";
import { getPrivateLiveSpent } from "@/lib/privateLiveBudgetStore";
import { t6DeliveryReadiness } from "@/lib/t6Worker";

export type PrivateLiveAuthUser = {
  id: string;
  email: string | null;
} | null;

/**
 * Shared private-live facts for /api/me and /api/generate.
 *
 * Keeping allowlist, process-fuse budget, and delivery fallback in one server
 * function prevents the UI from promising cached processing while Generate is
 * authorized to spend against the provider.
 */
export function resolvePrivateLiveAccess(authUser: PrivateLiveAuthUser) {
  const enabled = process.env.PIKBO_PRIVATE_LIVE_ENABLED === "1";
  const allowlist = parsePrivateLiveAllowlist(
    process.env.PIKBO_PRIVATE_LIVE_ALLOWLIST || ""
  );
  const budgetMax = Math.max(
    0,
    Math.floor(Number(process.env.PIKBO_PRIVATE_LIVE_BUDGET_MAX || "0"))
  );
  const invite = isPrivateLiveInvite({
    enabled,
    allowlist,
    email: authUser?.email,
    userId: authUser?.id,
  });
  const spent = authUser ? getPrivateLiveSpent(authUser.id) : 0;
  const budget = privateLiveBudget({ spent, max: budgetMax });
  const t6FreeLiveDeliveryReady = t6DeliveryReadiness().effective === true;
  const freeDeliveryReady = freeDeliveryReadyForAccess({
    t6FreeLiveDeliveryReady,
    privateInvite: invite.invited === true,
    privateBudgetOk: budget.ok,
  });

  return {
    enabled,
    invite,
    budget,
    budgetMax,
    freeDeliveryReady,
    t6FreeLiveDeliveryReady,
  };
}
