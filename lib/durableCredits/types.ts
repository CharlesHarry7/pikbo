/**
 * T5 durable credits — shared types (docs/prd/AUTH_CREDITS.md).
 * Pure contract used by local adapter and future Supabase adapter.
 */

export type PlanId = "free" | "founding_studio";

export type LedgerKind =
  | "grant"
  | "reserve"
  | "settle"
  | "release"
  | "expire"
  | "refund"
  | "adjustment"
  | "migration";

export type ReservationPurpose = "generation" | "seller_pack";

export type ReservationStatus =
  | "reserved"
  | "partially_settled"
  | "settled"
  | "released"
  | "expired";

export type CreditWallet = {
  accountId: string;
  availableCredits: number;
  reservedCredits: number;
  lifetimeUsedCredits: number;
  version: number;
  updatedAt: string;
};

export type CreditReservation = {
  id: string;
  accountId: string;
  purpose: ReservationPurpose;
  quotedCredits: number;
  settledCredits: number;
  releasedCredits: number;
  status: ReservationStatus;
  idempotencyKey: string;
  expiresAt: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type LedgerEntry = {
  id: string;
  accountId: string;
  kind: LedgerKind;
  deltaAvailable: number;
  deltaReserved: number;
  availableAfter: number;
  reservedAfter: number;
  reservationId?: string;
  sourceType: string;
  sourceId: string;
  idempotencyKey: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type DurableAccount = {
  id: string;
  kind: "personal" | "shop";
  ownerUserId: string;
  planId: PlanId;
  status: "active" | "restricted" | "closed";
  createdAt: string;
  updatedAt: string;
};

export type DurableState = {
  accounts: Record<string, DurableAccount>;
  wallets: Record<string, CreditWallet>;
  reservations: Record<string, CreditReservation>;
  ledger: LedgerEntry[];
  /** idempotency_key → ledger entry id */
  ledgerByIdempotency: Record<string, string>;
  /** reservation idempotency_key → reservation id */
  reservationByIdempotency: Record<string, string>;
  /** guest session hash → migration record */
  consumedGuests: Record<
    string,
    { userId: string; accountId: string; migratedCredits: number; consumedAt: string }
  >;
};

export type EngineErrorCode =
  | "INSUFFICIENT_CREDITS"
  | "EXPIRED_RESERVATION"
  | "RESERVATION_NOT_FOUND"
  | "OVER_SETTLE"
  | "ACCOUNT_NOT_FOUND"
  | "WALLET_NOT_FOUND"
  | "DUPLICATE_OK"
  | "INVALID_AMOUNT";

export type EngineOk<T> = { ok: true; data: T; state: DurableState };
export type EngineFail = {
  ok: false;
  code: EngineErrorCode;
  error: string;
  state: DurableState;
};

export type EngineResult<T> = EngineOk<T> | EngineFail;
