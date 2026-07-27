/**
 * Process-memory R1c fallback journal.
 *
 * When durable Supabase reconciliation is not applied / unavailable, generate
 * and image still must not lose withhold facts. This journal never claims
 * multi-node durability, never exposes outputRef to public clients, and never
 * confirms refund or delivery.
 */

export type LocalReconEventType =
  | "provider_succeeded_withheld"
  | "confirmed_pre_output_failure"
  | "settlement_unknown";

export type LocalReconEntry = {
  eventId: string;
  type: LocalReconEventType;
  jobId: string;
  reservationId: string;
  userId: string;
  reason?: string;
  providerRequestId?: string;
  /** Private — never serialize to public health/client JSON. */
  hasOutputRef: boolean;
  createdAt: string;
};

const MAX = 200;
const byEventId = new Map<string, LocalReconEntry>();
const order: string[] = [];

function nowIso() {
  return new Date().toISOString();
}

function trim() {
  while (order.length > MAX) {
    const drop = order.shift();
    if (drop) byEventId.delete(drop);
  }
}

/**
 * Record a withhold / pending fact. Idempotent on eventId.
 * outputRef is accepted only as a boolean presence flag (never stored).
 */
export function recordLocalReconciliationEvent(input: {
  eventId: string;
  type: LocalReconEventType;
  jobId: string;
  reservationId: string;
  userId: string;
  reason?: string;
  providerRequestId?: string;
  /** Pass true when a private provider URL existed — do not pass the URL. */
  hasOutputRef?: boolean;
}): { ok: true; idempotent: boolean; entry: LocalReconEntry } {
  const eventId = input.eventId.trim().slice(0, 160);
  const existing = byEventId.get(eventId);
  if (existing) {
    return { ok: true, idempotent: true, entry: existing };
  }
  const entry: LocalReconEntry = {
    eventId,
    type: input.type,
    jobId: input.jobId.slice(0, 128),
    reservationId: input.reservationId.slice(0, 128),
    userId: input.userId.slice(0, 128),
    reason: input.reason?.slice(0, 160),
    providerRequestId: input.providerRequestId?.slice(0, 256),
    hasOutputRef: Boolean(input.hasOutputRef),
    createdAt: nowIso(),
  };
  byEventId.set(eventId, entry);
  order.push(eventId);
  trim();
  return { ok: true, idempotent: false, entry };
}

/** Ops probe — counts only, never echoes output refs or reservation secrets. */
export function localReconciliationProbe(): {
  total: number;
  byType: Record<string, number>;
  openWithheld: number;
  note: string;
} {
  const byType: Record<string, number> = {
    provider_succeeded_withheld: 0,
    confirmed_pre_output_failure: 0,
    settlement_unknown: 0,
  };
  for (const e of byEventId.values()) {
    byType[e.type] = (byType[e.type] || 0) + 1;
  }
  return {
    total: byEventId.size,
    byType,
    openWithheld: byType.provider_succeeded_withheld || 0,
    note:
      "Process-memory R1c fallback only. Not multi-node durable. Never delivers media. Apply Supabase R1c migration for real settlement.",
  };
}

/** Test helper. */
export function __resetLocalReconciliationJournalForTests() {
  byEventId.clear();
  order.length = 0;
}
