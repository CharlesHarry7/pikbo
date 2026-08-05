/**
 * Library empty / guest CTA contracts.
 * Primary door is 360° Spin remix (listing-grade); Moment stays as secondary
 * fixed product path. source=library-empty preserves intent through Create.
 */

import { createGenerate360Href } from "@/lib/jobIntents";
import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";

export const LIBRARY_EMPTY_SOURCE = "library-empty" as const;

/** Primary empty-shelf CTA → Create 360° showcase remix. */
export function libraryEmpty360Href(): string {
  return createGenerate360Href(LIBRARY_EMPTY_SOURCE);
}

/** Secondary empty-shelf CTA → fixed first-dollar Street Power-Up Moment. */
export function libraryEmptyMomentHref(): string {
  return `${MOMENT_CREATE_HREF}&source=${LIBRARY_EMPTY_SOURCE}`;
}
