/**
 * Process-memory private-live budget counters (single node).
 * Multi-node production should prefer durable ledger once Supabase is live;
 * this store is for private-beta rehearsal and fail-closed caps only.
 */

const spentByKey = new Map<string, number>();

export function privateLiveBudgetKey(userId: string): string {
  return `private-live:${userId}`;
}

export function getPrivateLiveSpent(userId: string): number {
  return spentByKey.get(privateLiveBudgetKey(userId)) ?? 0;
}

/** Atomically consume one live attempt if under cap. */
export function tryConsumePrivateLiveBudget(
  userId: string,
  max: number
): { ok: true; spent: number; remaining: number } | { ok: false; spent: number; remaining: number } {
  const key = privateLiveBudgetKey(userId);
  const spent = spentByKey.get(key) ?? 0;
  const cap = Math.max(0, Math.floor(max));
  if (cap <= 0 || spent >= cap) {
    return { ok: false, spent, remaining: Math.max(0, cap - spent) };
  }
  const next = spent + 1;
  spentByKey.set(key, next);
  return { ok: true, spent: next, remaining: Math.max(0, cap - next) };
}

/** Test helper — clear process memory. */
export function resetPrivateLiveBudgetStoreForTests(): void {
  spentByKey.clear();
}
