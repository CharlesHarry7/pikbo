# T6 real ffmpeg/ffprobe proof — 2026-07-28

Scope: synthetic media on this Mac only. No provider request, customer media,
Supabase mutation, Stripe call, deployment or production configuration was
used.

## Result

- Real ffmpeg: `6.0`
- Real ffprobe: `4.4-tessus`
- Source: H.264 MP4, 640×360, 2.000 seconds, 22,375 bytes
- Derivative: H.264 MP4, 640×360, 2.021 seconds, 34,872 bytes
- Source SHA-256:
  `c099e2d1b3659d9ec9f5b3722a031648c695e0d30f406e5eab34b7f806961092`
- Derivative SHA-256:
  `6371b8708a98977a4239541584afa1ae4fbf5579f1f3c901bf6b53625e3f3b80`
- Decoded watermark ROI: 92,160 sampled pixels across 4 frames
- Watermark ROI mean delta: `6.011892`
- Control ROI mean delta: `0`
- Watermark ROI changed ratio: `0.048568`
- Control ROI changed ratio: `0`
- Peak pixel delta: `165`
- Metadata-only negative case: blocked with
  `WATERMARK_PIXEL_PROOF_FAILED`

The exact source and output frame PNGs are stored next to
[`proof.json`](./t6-real-ffmpeg-2026-07-28/proof.json). The source frame has no
mark; the derivative frame visibly contains `PIKBO` in the bottom-right.

## Command

```bash
PIKBO_FFMPEG_PATH=/absolute/path/to/ffmpeg \
PIKBO_FFPROBE_PATH=/absolute/path/to/ffprobe \
PIKBO_T6_PROOF_ARTIFACT_DIR="$PWD/docs/evidence/t6-real-ffmpeg-2026-07-28" \
npm run t6-real-ffmpeg-proof
```

The proof runner spawns both binaries with `shell: false`, uses the production
T6 bake arguments, probes both MP4s, compares decoded source/output pixels and
performs a negative gate. It retains only proof JSON and frame images.

## Honest boundary

This proves the non-production bake and verification logic. It does not prove
that a durable worker is scheduled, that the T6 migration has been applied, or
that shared object storage is configured. Therefore
`SERVER_OWNED_T6_BAKED_WATERMARK_IMPLEMENTED` remains `false`; Free live
delivery remains fail-closed.
