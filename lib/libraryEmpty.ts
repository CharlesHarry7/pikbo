/**
 * Library empty / owner-shelf CTA contract (AIT-82).
 *
 * One primary Generate 360 door above the fold on mobile, matching the AIT-62
 * mobile-nav label. Deep link stays on soft-launch Moment Create
 * (`MOMENT_CREATE_HREF`) — never an orphan suite route.
 */

import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";

export const LIBRARY_EMPTY_SOURCE = "library-empty" as const;

/** Filled-shelf Generate door (toolbar / recovery). */
export const LIBRARY_SOURCE = "library" as const;

/** Primary empty-shelf CTA → fixed Street Power-Up Moment. */
export const LIBRARY_EMPTY_GENERATE_HREF =
  `${MOMENT_CREATE_HREF}&source=${LIBRARY_EMPTY_SOURCE}` as const;

/** Signed-in toolbar / filled shelf Generate door. */
export const LIBRARY_GENERATE_HREF =
  `${MOMENT_CREATE_HREF}&source=${LIBRARY_SOURCE}` as const;

/** AIT-62-aligned label: one primary Generate 360 above fold. */
export const LIBRARY_EMPTY_GENERATE_LABEL = "Generate 360" as const;
