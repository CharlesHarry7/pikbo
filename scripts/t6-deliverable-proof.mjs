#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import {
  readT6OwnedDerivative,
  writeT6OwnedDerivative,
} from "../lib/t6OwnedStorage.ts";
import { parseT6FfprobeJson } from "../lib/t6Probe.mjs";
import {
  sha256,
  t6DerivativePublicTruth,
  t6OwnedDeliveryPath,
} from "../lib/t6Worker.ts";

const root = await mkdtemp(join(tmpdir(), "pikbo-t6-owned-proof-"));
process.env.PIKBO_T6_OWNED_STORAGE_DIR = root;

try {
  const objectKey = `t6-baked/${"a".repeat(64)}.mp4`;
  const derivative = Buffer.from(
    "fixture-owned-watermarked-mp4-PIKBO-baked-watermark"
  );
  const checksum = sha256(derivative);

  // Twenty workers may publish the same deterministic verified object. Exactly
  // one creates it; the other nineteen observe an identical idempotent object.
  const writes = await Promise.all(
    Array.from({ length: 20 }, () =>
      writeT6OwnedDerivative({
        objectKey,
        contentType: "video/mp4",
        bytes: derivative,
        expectedChecksum: checksum,
      })
    )
  );
  assert.equal(writes.filter((result) => result.ok).length, 20);
  assert.equal(
    writes.filter((result) => result.ok && !result.idempotent).length,
    1
  );
  assert.equal(
    writes.filter((result) => result.ok && result.idempotent).length,
    19
  );
  const storedPath = join(root, objectKey);
  assert.deepEqual(await readFile(storedPath), derivative);

  const read = await readT6OwnedDerivative(objectKey, checksum);
  assert.equal(read.ok, true);
  if (read.ok) {
    assert.equal(read.object.contentType, "video/mp4");
    assert.equal(read.object.checksum, checksum);
  }
  assert.deepEqual(await readT6OwnedDerivative(objectKey, "b".repeat(64)), {
    ok: false,
    code: "OWNED_CHECKSUM_MISMATCH",
  });

  const conflictBytes = Buffer.from("different-verified-output");
  assert.deepEqual(
    await writeT6OwnedDerivative({
      objectKey,
      contentType: "video/mp4",
      bytes: conflictBytes,
      expectedChecksum: sha256(conflictBytes),
    }),
    { ok: false, code: "OWNED_OBJECT_CONFLICT" }
  );

  const probe = parseT6FfprobeJson({
    format: {
      format_name: "mov,mp4,m4a,3gp,3g2,mj2",
      duration: "5.016",
      tags: { comment: "PIKBO baked watermark" },
    },
    streams: [
      {
        codec_type: "video",
        codec_name: "h264",
        width: 720,
        height: 1280,
      },
    ],
  });
  assert.deepEqual(probe, {
    formatName: "mov,mp4,m4a,3gp,3g2,mj2",
    durationSeconds: 5.016,
    width: 720,
    height: 1280,
    videoCodec: "h264",
    bakedMarkSignal: true,
  });
  assert.equal(
    parseT6FfprobeJson({
      format: { format_name: "mov,mp4", duration: "NaN" },
      streams: [],
    }),
    null
  );

  const failureTruth = t6DerivativePublicTruth({
    jobId: "job-1",
    providerRequestId: "provider-1",
    derivative: {
      status: "failed",
      idempotencyKey: "failed",
      objectKey,
      deliveryPath: t6OwnedDeliveryPath(objectKey) || undefined,
      contentType: "video/mp4",
    },
  });
  assert.deepEqual(failureTruth, {
    deliverable: false,
    withheld: true,
    refundConfirmed: false,
    providerOutputRef: null,
  });

  const route = readFileSync(
    join(process.cwd(), "app/api/t6-derivatives/[hash]/route.ts"),
    "utf8"
  );
  const downloads = readFileSync(
    join(process.cwd(), "app/api/downloads/[id]/route.ts"),
    "utf8"
  );
  const worker = readFileSync(
    join(process.cwd(), "lib/t6Worker.ts"),
    "utf8"
  );
  const durableWorker = readFileSync(
    join(process.cwd(), "lib/t6DurableWorker.ts"),
    "utf8"
  );
  const durableAdapter = readFileSync(
    join(process.cwd(), "lib/durableCredits/t6Derivatives.ts"),
    "utf8"
  );
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/20260728220000_t6_owned_derivatives.sql"
    ),
    "utf8"
  );
  assert.match(route, /readT6OwnedDerivative/);
  assert.match(route, /canServeVerifiedT6Derivative/);
  assert.match(route, /getAuthUserFromRequest/);
  assert.doesNotMatch(route, /providerOutputUrl|videoUrl|NextResponse\.redirect/);
  assert.match(downloads, /job\.bakedDerivative\?\.deliveryPath/);
  assert.doesNotMatch(
    worker,
    /providerOutputRef:\s*input\.job\.providerOutputUrl/
  );
  assert.match(worker, /providerOutputRef:\s*null/);
  assert.match(durableWorker, /processClaimedT6Derivative/);
  assert.match(durableWorker, /runT6PipelineWithInjectedRunner/);
  assert.match(durableAdapter, /claimDurableT6Derivative/);
  assert.match(durableAdapter, /finishDurableT6Derivative/);
  assert.match(migration, /for update skip locked/i);
  assert.match(migration, /pikbo_enqueue_t6_derivative_v1/);
  assert.match(migration, /pikbo_claim_t6_derivative_v1/);
  assert.match(migration, /pikbo_finish_t6_derivative_v1/);
  assert.match(migration, /FREE_WATERMARK_JOB_REQUIRED/);
  assert.match(migration, /revoke all[\s\S]*anon, authenticated/i);
  assert.match(migration, /'refundConfirmed', false/);
  assert.doesNotMatch(route, /sourceRef/);

  console.log(
    "t6-deliverable-proof: PASS (20-way atomic owned write; checksum conflict; ffprobe parse; raw-source non-disclosure; failed bake withheld)"
  );
} finally {
  await rm(root, { recursive: true, force: true });
  delete process.env.PIKBO_T6_OWNED_STORAGE_DIR;
}
