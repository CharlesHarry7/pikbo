import Image from "next/image";
import Link from "next/link";
import { createGenerate360Href } from "@/lib/jobIntents";
import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";

/** Calm gallery hero — designer-vinyl still, not carnival neon + cartoon demo. */
const HERO_STILL = {
  src: "/style-studies/art-vinyl-guardian-v1.jpg",
  title: "Designer vinyl study",
  caption: "Art toy / urban vinyl direction",
} as const;

/**
 * Money-path Generate door — listing 360 workbench in one click.
 * AIT-413: primary Generate on gallery-calm home (Moment stays product door).
 */
const HOME_HERO_360_HREF = createGenerate360Href("home-hero");

/**
 * Public front door: one honest create path + collectible photography.
 * No confetti, no rainbow orbit, no cartoon mascot IP.
 */
export function HomeCinemaHero() {
  return (
    <section
      id="home-create"
      data-home-hero="designer-toy-gallery"
      data-visual="gallery-calm-v1"
      className="relative isolate overflow-hidden bg-[var(--bg)] px-4 pb-12 pt-8 text-[var(--fg)] sm:px-7 lg:px-10 lg:pb-16 lg:pt-12"
      aria-labelledby="home-moment-title"
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_30%_0%,rgba(196,165,116,0.08),transparent_55%)]"
        aria-hidden
      />

      <div className="mx-auto grid max-w-[1120px] items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        {/* Copy + dual doors — order-1 leads mobile fold */}
        <div className="order-1 lg:order-1" data-home-hero-doors="fold">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--brand)]">
            Pikbo · AI video for designer toys
          </p>
          <h1
            id="home-moment-title"
            className="mt-4 font-display text-[clamp(2.4rem,4.6vw,3.75rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-[var(--fg)]"
          >
            Turn your 潮玩
            <br />
            <span className="text-[var(--fg-muted)]">into listing motion.</span>
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-7 text-[var(--fg-muted)]">
            Built for art toys, blind boxes, vinyl, sofubi, mecha kits, and
            plush — not random cartoon mascots. One photo. One directed clip.
            Private when you create for real.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={HOME_HERO_360_HREF}
              data-home-hero-360-cta
              data-home-primary-generate="360"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--brand)] px-6 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary-foreground)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/50"
            >
              Generate 360° listing spin
            </Link>
            <Link
              href={MOMENT_CREATE_HREF}
              data-home-moment-cta
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--border)] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--fg-muted)] transition hover:border-[var(--brand)]/40 hover:text-[var(--fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/40"
            >
              Create with my toy
            </Link>
          </div>
          <p className="mt-3 text-[11px] leading-5 text-[var(--fg-dim)]">
            One-tap 360° workbench · or Street Power-Up Moment when you want the
            fixed private path.
          </p>

          <ul className="mt-8 flex flex-wrap gap-2 text-[11px] text-[var(--fg-dim)]">
            <li className="rounded-md border border-[var(--border)] px-2.5 py-1">
              Art toy · vinyl
            </li>
            <li className="rounded-md border border-[var(--border)] px-2.5 py-1">
              Blind box
            </li>
            <li className="rounded-md border border-[var(--border)] px-2.5 py-1">
              Mecha kit
            </li>
            <li className="rounded-md border border-[var(--border)] px-2.5 py-1">
              Plush · sofubi
            </li>
          </ul>
        </div>

        {/* Still stage — product photography frame; click → same 360 door (AIT-462) */}
        <div className="order-2 lg:order-2">
          <Link
            href={HOME_HERO_360_HREF}
            data-home-hero-still-generate="360"
            className="group block overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-md)] transition hover:border-[var(--brand)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/50"
            aria-label="Open Generate 360° listing spin workbench"
          >
            <figure>
              <div className="relative aspect-[4/5] w-full bg-[var(--bg-soft)]">
                <Image
                  src={HERO_STILL.src}
                  alt="Designer vinyl art toy style study for Pikbo homepage"
                  fill
                  priority
                  sizes="(max-width:1024px) 100vw, 480px"
                  className="object-cover transition duration-500 group-hover:scale-[1.02]"
                />
              </div>
              <figcaption className="flex items-start justify-between gap-3 border-t border-[var(--border)] px-4 py-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">
                    Style study · try 360°
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-[var(--fg)]">
                    {HERO_STILL.title}
                  </p>
                  <p className="text-xs text-[var(--fg-muted)]">
                    {HERO_STILL.caption}
                  </p>
                </div>
                <p className="shrink-0 text-right text-[10px] leading-4 text-[var(--fg-dim)]">
                  Not a customer
                  <br />
                  upload · Lab study
                </p>
              </figcaption>
            </figure>
          </Link>
        </div>
      </div>
    </section>
  );
}
