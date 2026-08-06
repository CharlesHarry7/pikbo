/**
 * Curated designer-toy (潮玩) stills for homepage gallery.
 * Prefer style-studies + moments product photography over cartoon demo loops
 * (orbit/beatbot/scout) that read as generic characters, not collectible vinyl.
 *
 * Labels stay honest: style studies / lab archive — never fake UGC.
 */

import { createGenerate360Href } from "@/lib/jobIntents";

export type DesignerToyGalleryItem = {
  id: string;
  title: string;
  category: string;
  /** What kind of 潮玩 this represents */
  toyKind: string;
  src: string;
  href: string;
  badge: string;
  aspect: "3/4" | "16/9" | "1/1";
};

/**
 * Market categories of 潮玩 / designer toys (product taxonomy).
 * Also mirrored as site pages under /toys/[slug] (see lib/toytypes.ts).
 */
export const DESIGNER_TOY_KINDS = [
  { slug: "art-toys", label: "Art toys / designer vinyl" },
  { slug: "blind-box-figures", label: "Blind box figures" },
  { slug: "vinyl-figures", label: "Urban vinyl" },
  { slug: "resin-sofubi", label: "Resin & sofubi" },
  { slug: "anime-figures", label: "Anime scale figures" },
  { slug: "garage-kits", label: "Garage kits" },
  { slug: "model-kits", label: "Model kits / mecha" },
  { slug: "plush-toys", label: "Designer plush" },
  { slug: "capsule-toys", label: "Capsule toys" },
  { slug: "ball-jointed-dolls", label: "BJD" },
  { slug: "action-figures", label: "Action figures" },
  { slug: "tabletop-miniatures", label: "Tabletop miniatures" },
  { slug: "diorama-scenes", label: "Diorama / scene" },
  { slug: "desk-toys", label: "Desk toys" },
] as const;

/** Homepage gallery — real collectible photography, not cartoon mascot demos. */
export const DESIGNER_TOY_GALLERY: DesignerToyGalleryItem[] = [
  {
    id: "vinyl-guardian",
    title: "Guardian vinyl",
    category: "Art toy",
    toyKind: "art-toys",
    src: "/style-studies/art-vinyl-guardian-v1.jpg",
    href: "/toys/art-toys",
    badge: "Style study · vinyl",
    aspect: "3/4",
  },
  {
    id: "blind-box-direction",
    title: "Blind-box direction",
    category: "Blind box",
    toyKind: "blind-box-figures",
    src: "/style-studies/art-vinyl-blind-box-direction-v1.jpg",
    href: "/toys/blind-box-figures",
    badge: "Style study · unbox",
    aspect: "3/4",
  },
  {
    id: "social-flash-vinyl",
    title: "Drop-day flash",
    category: "Urban vinyl",
    toyKind: "vinyl-figures",
    src: "/style-studies/art-vinyl-social-flash-direction-v1.jpg",
    href: "/toys/vinyl-figures",
    badge: "Style study · social",
    aspect: "3/4",
  },
  {
    id: "precision-mecha",
    title: "Precision mecha kit",
    category: "Model kit",
    toyKind: "model-kits",
    src: "/style-studies/precision-mecha-v1.jpg",
    href: "/toys/model-kits",
    badge: "Style study · kit",
    aspect: "3/4",
  },
  {
    id: "plush-hybrid",
    title: "Designer plush",
    category: "Plush",
    toyKind: "plush-toys",
    src: "/style-studies/plush-hybrid-v1.jpg",
    href: "/toys/plush-toys",
    badge: "Style study · plush",
    aspect: "3/4",
  },
  {
    id: "gallery-spotlight",
    title: "Gallery spotlight",
    category: "Display",
    toyKind: "art-toys",
    src: "/moments/gallery-spotlight.jpg",
    href: "/create?mode=moment&effect=street-power-up&source=gallery-spotlight",
    badge: "Lab moment · lighting",
    aspect: "16/9",
  },
  {
    id: "capsule-reveal",
    title: "Capsule reveal",
    category: "Blind box",
    toyKind: "blind-box-figures",
    src: "/moments/capsule-reveal.jpg",
    href: "/create?mode=moment&effect=street-power-up&source=capsule-reveal",
    badge: "Lab moment · reveal",
    aspect: "16/9",
  },
  {
    id: "colorblock-pedestal",
    title: "Pedestal hold",
    category: "Listing",
    toyKind: "vinyl-figures",
    src: "/moments/colorblock-pedestal.jpg",
    // AIT-462: skip /effects hop — one tap into listing 360 workbench
    href: createGenerate360Href("home-gallery-pedestal"),
    badge: "Lab moment · 360 listing",
    aspect: "16/9",
  },
];

export function designerToyGalleryForHome(limit = 8): DesignerToyGalleryItem[] {
  return DESIGNER_TOY_GALLERY.slice(0, limit);
}
