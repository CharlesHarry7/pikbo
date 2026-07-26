# Toy Identity V0 — reusable device-local SKU profiles

**Phase:** Phase 1 paid vertical wedge

**Target user:** independent designer-toy seller or creator producing multiple clips for one SKU

**Job:** keep the same product intent and Library grouping while changing Recipes

**North-star support:** second-SKU retention and published launch assets per active seller

## User contract

The creator can save up to 12 Toy Identity profiles on one device. Each profile has:

- a stable device-local identity id;
- Name / SKU;
- details that must be preserved;
- `Sales` or `Story` generation intent;
- created and updated timestamps.

Selecting an identity applies it to new generations and groups their Library
records under the same stable identity even if the display SKU is renamed.

### Modes

- **Sales:** prioritize product geometry, paint, markings, and included
  accessories; do not invent commercially material details.
- **Story:** allow more expressive motion and scene changes while keeping the
  toy recognizable.

Identity instructions are placed before optional user motion text so the
prompt-length cap does not silently remove the fidelity contract.

## Honesty boundary

V0 is saved in browser `localStorage` and uses the single primary photo already
accepted by the live generation provider. It is not:

- cloud sync;
- model training or LoRA;
- multi-reference generation;
- an automated identity score;
- a guarantee of exact output.

The UI must say this plainly. Existing clips remain in the device Library when
an identity is removed.

## Storage and migration

- Library key: `pikbo_toy_identities_v2`.
- Legacy `pikbo_toy_identity_v1` is migrated into one Sales profile.
- Invalid, duplicate, empty, or oversized records are removed during
  normalization.
- Maximum profiles: 12.
- No photo, prompt, URL, email, or secret is sent in identity analytics.

## Integration

Each new History item may store:

```ts
toyIdentityId?: string;
identityMode?: "sales" | "story";
```

`projectId` uses the stable Toy Identity when present, then falls back to the
existing image/remix-derived project id.

## Acceptance

1. A legacy single identity migrates without losing SKU or preserve notes.
2. A user can create, select, edit, and remove multiple local identities.
3. Sales/Story mode changes the generation instruction.
4. Two Recipes using one identity group together in Library by stable id.
5. Clearing/removing an identity does not delete existing Library clips.
6. Demo mode, credits, retries, refunds, and provider routing remain unchanged.
7. Typecheck, lint, engine smoke, and build pass.

## Next version

V1 adds durable ownership and reference roles (`front`, `side`, `back`,
`packaging`, `material_detail`, `brand_reference`) only when storage,
permissions, and the provider request truly consume them. Automated review must
show `Not scored` whenever no comparison service ran.
