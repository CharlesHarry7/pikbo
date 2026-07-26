/**
 * Canonical proof gate for the Effects catalog.
 *
 * A recipe is proven only when DEMO_VIDEOS registers an exact, independent
 * output for that recipe. Shared/fallback loops are presentation assets, not
 * recipe proof, and must never promote a concept recipe to Proven.
 */

import { DEMO_VIDEOS, type DemoVideo } from "@/lib/demoVideos";
import { PRESETS } from "@/lib/presets";

export type EffectProof = {
  recipeSlug: string;
  demo: DemoVideo;
};

function buildEffectProofRegistry(
  demos: readonly DemoVideo[]
): ReadonlyMap<string, EffectProof> {
  const presetSlugs = new Set(PRESETS.map((preset) => preset.slug));
  const byRecipe = new Map<string, EffectProof>();
  const outputOwner = new Map<string, string>();

  for (const demo of demos) {
    if (!presetSlugs.has(demo.preset)) {
      throw new Error(
        `Effect proof ${demo.id} references unknown recipe: ${demo.preset}`
      );
    }
    if (!demo.mp4 || !demo.poster) {
      throw new Error(
        `Effect proof ${demo.id} needs an exact output video and poster`
      );
    }

    const existingRecipe = byRecipe.get(demo.preset);
    if (existingRecipe) {
      throw new Error(
        `Recipe ${demo.preset} has multiple proof registrations: ${existingRecipe.demo.id}, ${demo.id}`
      );
    }

    const existingOutputOwner = outputOwner.get(demo.mp4);
    if (existingOutputOwner) {
      throw new Error(
        `Effect proof output reused by ${existingOutputOwner} and ${demo.preset}: ${demo.mp4}`
      );
    }

    byRecipe.set(demo.preset, {
      recipeSlug: demo.preset,
      demo,
    });
    outputOwner.set(demo.mp4, demo.preset);
  }

  return byRecipe;
}

const EFFECT_PROOF_REGISTRY = buildEffectProofRegistry(DEMO_VIDEOS);

export function getEffectProof(recipeSlug: string): EffectProof | null {
  return EFFECT_PROOF_REGISTRY.get(recipeSlug) ?? null;
}

export function listProvenEffectDemos(): DemoVideo[] {
  return [...EFFECT_PROOF_REGISTRY.values()].map((proof) => proof.demo);
}

export function listProvenEffectSlugs(): string[] {
  return PRESETS.map((preset) => preset.slug).filter((slug) =>
    EFFECT_PROOF_REGISTRY.has(slug)
  );
}

/**
 * VideoObject is only valid for the exact registered proof media. Adapters may
 * adjust display copy, so identity is established by id + recipe + output.
 */
export function isRegisteredEffectProof(demo: DemoVideo): boolean {
  const registered = EFFECT_PROOF_REGISTRY.get(demo.preset)?.demo;
  return Boolean(
    registered &&
      registered.id === demo.id &&
      registered.mp4 === demo.mp4
  );
}
