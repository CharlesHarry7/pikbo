import Image from "next/image";
import Link from "next/link";
import {
  DESIGNER_TOY_KINDS,
  designerToyGalleryForHome,
} from "@/lib/designerToyGallery";
import { createGenerate360Href } from "@/lib/jobIntents";

/** Section primary — same Generate→360 money door as hero / trust. */
const GALLERY_SECTION_GENERATE_HREF = createGenerate360Href(
  "home-gallery-section"
);

/**
 * Calm collectible shelf — designer-toy stills only.
 * Replaces carnival multi-rail + cartoon demo wall on the public home.
 * AIT-521: stills + section CTA open Generate→360 in one tap; taxonomy
 * browse stays secondary (chips + Browse toy types).
 */
export function HomeDesignerGallery() {
  const items = designerToyGalleryForHome(8);
  const kinds = DESIGNER_TOY_KINDS.slice(0, 8);

  return (
    <section
      className="border-t border-[var(--border)] bg-[var(--bg)] px-4 py-12 sm:px-7 sm:py-16 lg:px-10"
      data-home-gallery="designer-toy"
      aria-labelledby="home-gallery-title"
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">
              Designer toys · 潮玩
            </p>
            <h2
              id="home-gallery-title"
              className="mt-2 font-display text-2xl font-semibold tracking-[-0.03em] text-[var(--fg)] sm:text-3xl"
            >
              Collectible subjects — not cartoon fillers
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--fg-muted)]">
              Style studies and lab lighting references for vinyl, blind box,
              mecha kits, and plush. Labeled studies — not customer uploads, not
              fake UGC. Tap any still to open listing 360°.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <Link
              href={GALLERY_SECTION_GENERATE_HREF}
              data-home-gallery-generate="360"
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--brand)] px-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--primary-foreground)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/50"
            >
              Generate 360° listing spin
            </Link>
            <Link
              href="/toys/art-toys"
              className="text-xs font-semibold text-[var(--fg-muted)] underline-offset-4 hover:text-[var(--brand)] hover:underline"
            >
              Browse toy types →
            </Link>
          </div>
        </div>

        {/* Category chips — calm taxonomy, not rainbow Generate doors */}
        <ul
          className="mt-6 flex flex-wrap gap-2"
          aria-label="Designer toy categories"
        >
          {kinds.map((k) => (
            <li key={k.slug}>
              <Link
                href={`/toys/${k.slug}`}
                className="inline-flex rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[11px] font-medium text-[var(--fg-muted)] transition hover:border-[var(--brand)]/40 hover:text-[var(--fg)]"
              >
                {k.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Still grid — each tile is Generate→360 (AIT-521) */}
        <ul
          className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
          data-home-gallery-stills="generate-360"
        >
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                data-home-gallery-still-generate="360"
                className="group block overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] transition hover:border-[var(--brand)]/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/50"
                aria-label={`Open Generate 360° listing spin from ${item.title}`}
              >
                <div
                  className={`relative w-full overflow-hidden bg-[var(--bg-soft)] ${
                    item.aspect === "16/9"
                      ? "aspect-[16/9]"
                      : item.aspect === "1/1"
                        ? "aspect-square"
                        : "aspect-[3/4]"
                  }`}
                >
                  <Image
                    src={item.src}
                    alt={`${item.title} — ${item.category} style study`}
                    fill
                    sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                  <span className="absolute left-2 top-2 rounded-md border border-white/10 bg-black/55 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-white/85 backdrop-blur-sm">
                    {item.badge}
                  </span>
                </div>
                <div className="space-y-0.5 px-3 py-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--fg-dim)]">
                    {item.category}
                  </p>
                  <p className="text-sm font-semibold tracking-[-0.02em] text-[var(--fg)]">
                    {item.title}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-center text-[11px] leading-5 text-[var(--fg-dim)]">
          14 潮玩类型 on site (art toy · blind box · vinyl · sofubi · anime figure ·
          garage kit · model kit · plush · capsule · BJD · action · miniature ·
          diorama · desk). Hero no longer leads with cartoon demo loops.
        </p>
      </div>
    </section>
  );
}
