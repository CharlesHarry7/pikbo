import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Browser clients cannot release durable holds; the server job worker owns it. */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      code: "SERVER_OWNED_JOBS_REQUIRED",
      disabled: true,
      authority: "server-owned-jobs",
      error: "Seller Pack release is performed only by server-owned jobs.",
    },
    { status: 409 }
  );
}
