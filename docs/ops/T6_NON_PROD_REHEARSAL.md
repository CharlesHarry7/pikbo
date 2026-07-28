# T6 server-owned derivative rehearsal

Status: non-production source + real media proof; production remains blocked
Production apply/deploy: prohibited until owner approval
Proof: temporary npm-provided ffmpeg 6.0 and ffprobe 4.4 binaries were used
against synthetic media only; they are not a production runtime installation

Required migration order in a disposable Supabase project:

1. `20260723120000_t5_auth_credits.sql`
2. `20260727213000_r1_atomic_generation_credits.sql`
3. `20260727233000_r1c_generation_reconciliation.sql`
4. `20260728220000_t6_owned_derivatives.sql`

T6 turns one private provider output into a Pikbo-owned, visibly watermarked
MP4. Financial capture is not delivery proof. The customer receives a file
only when the exact job-bound derivative passes every check below.

## Source boundary

- `lib/t6FfmpegRunner.ts` resolves and pins an allowlisted HTTPS provider host,
  rejects redirects/private addresses, caps bytes/time, and invokes binaries
  without a shell.
- `lib/t6Worker.ts` compares source/output SHA-256, ffprobe container, codec,
  duration and resolution. It also requires a decoded source/output luma
  difference in the expected watermark region; MP4 metadata alone cannot pass.
- `lib/t6OwnedStorage.ts` atomically publishes only verified MP4 bytes beneath
  a deterministic `t6-baked/<sha>.mp4` key. Concurrent conflicting bytes fail.
- `/api/t6-derivatives/[hash]` requires an authenticated user, the matching
  signed session/job, verified job-bound metadata, readiness, and a checksum
  match before returning owned bytes.
- Raw provider URLs never appear in the derivative route, public T6 truth, or
  owned storage.

## Disposable single-node procedure

1. Use an isolated machine and storage directory containing no customer data.
2. Install reviewed ffmpeg and ffprobe builds. Record versions and package
   source in the private operator log.
3. Create a private directory outside the repository, mode `0700`.
4. Set absolute `PIKBO_FFMPEG_PATH`, `PIKBO_FFPROBE_PATH` and
   `PIKBO_T6_OWNED_STORAGE_DIR`.
5. Set `PIKBO_T6_PROVIDER_HOST_ALLOWLIST` to the exact CDN host observed from a
   legitimate provider task. Do not use `*`, a public suffix or an IP literal.
6. Keep `PIKBO_T6_BAKED_WATERMARK_WORKER=0`.
7. Run:

   ```bash
   npm run t6-deliverable-proof
   npm run t6-real-ffmpeg-proof
   npm run typecheck
   npm run lint
   npm run build
   ```

8. Apply the four migrations above in order. Confirm `anon` and
   `authenticated` cannot read `generation_derivatives` or execute its RPCs.
9. With a synthetic owned MP4 (no customer media), invoke
   `createT6FfmpegFilesystemRunner()` through the trusted worker harness.
10. Record only aggregate proof: input/output byte counts, distinct hashes,
   duration delta, dimensions, codec, watermark signal and controlled route
   status. Never log the provider URL, bytes, user identity or object path.
11. Attempt twenty concurrent writes for one deterministic key. Exactly one
    creates the object; identical writers are idempotent and different bytes
    fail with `OWNED_OBJECT_CONFLICT`.
12. Run twenty simultaneous durable claim RPCs against one queued row. Exactly
    one receives a lease; after expiry a second worker can recover it.
13. Verify direct provider URL access is never returned by either T6 route.
14. Verify unauthenticated, wrong-session, wrong-job, mismatched hash,
    duration/resolution drift, missing mark, failed bake and storage corruption
    all remain blocked.

## Pass gate before enabling a private worker

- A real ffmpeg output visibly contains the PIKBO mark.
- Source/output hashes differ and the stored bytes match the recorded output
  hash.
- ffprobe confirms MP4, a video codec, positive duration, unchanged dimensions,
  duration within 3% or 250ms, and the baked mark metadata signal.
- Decoded-pixel proof shows the bottom-right watermark region changed
  materially more than the control region. Metadata-only evidence fails.
- The raw provider URL is service-private and never returned or redirected.
- Free download returns only owned bytes through the authenticated controlled
  route.
- Bake failure leaves delivery withheld and does not claim a refund; settlement
  remains the R1/R1c ledger’s responsibility.
- Restart/crash recovery and a durable worker lease are proven against the
  reviewed Supabase schema.
- Multi-node object storage replaces the single-node filesystem adapter before
  Vercel/public launch.

Until every item passes, `SERVER_OWNED_T6_BAKED_WATERMARK_IMPLEMENTED` remains
false, health remains blocked, and Free live generation stays closed.
