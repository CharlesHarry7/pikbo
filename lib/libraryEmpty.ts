/**
 * Library empty / guest CTA contracts.
 * Primary door is Generate 360° (listing-grade spin) via createGenerate360Href;
 * Moment stays as secondary fixed product path. source=library-empty preserves
 * intent through Create. Never bare `/create`, never fake UGC.
 */

import { createGenerate360Href } from "@/lib/jobIntents";
import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";

export const LIBRARY_EMPTY_SOURCE = "library-empty" as const;

/** AIT-62 / AIT-82-aligned primary empty-shelf label. */
export const LIBRARY_EMPTY_GENERATE_LABEL = "Generate 360" as const;

/** Primary empty-shelf CTA → Create 360° showcase remix. */
export function libraryEmpty360Href(): string {
  return createGenerate360Href(LIBRARY_EMPTY_SOURCE);
}

/** Secondary empty-shelf CTA → fixed first-dollar Street Power-Up Moment. */
export function libraryEmptyMomentHref(): string {
  return `${MOMENT_CREATE_HREF}&source=${LIBRARY_EMPTY_SOURCE}`;
}
