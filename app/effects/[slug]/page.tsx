import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { HighIntentProductTruth } from "@/components/HighIntentProductTruth";
import {
  LandingHowItWorks,
  photoRecipeDraftHowToJsonLd,
} from "@/components/LandingHowItWorks";
import { LandingResults } from "@/components/LandingResults";
import { LandingToolPanel } from "@/components/LandingToolPanel";
import { PresetCard } from "@/components/PresetCard";
import { EffectStudioCard } from "@/components/EffectStudioCard";
import {
  effectStatusLabel,
  getToyEffect,
  listToyEffects,
  type ToyEffect,
} from "@/lib/effects";
import { PRESETS, getPreset, COMMON_FAQ, type Preset } from "@/lib/presets";
import { createRemixHref } from "@/lib/remixIntent";
import { site } from "@/lib/site";
import { viralName } from "@/lib/viralNames";
import { recipeHasUniqueProof, robotsForRecipe } from "@/lib/seoIndex";
import { USE_CASES } from "@/lib/usecases";
import {
  listSellerJobWorkflows,
  workflowsForEffect,
} from "@/lib/workflows";

// Studio effects + legacy recipe presets (backward-compatible deep links).
export function generateStaticParams() {
  const slugs = new Set<string>([
    ...listToyEffects().map((e) => e.slug),
    ...PRESETS.map((p) => p.slug),
  ]);
  return Array.from(slugs).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const studio = getToyEffect(slug);
  if (studio) {
    return {
      title: { absolute: `${studio.name} · Toy Effect Studio | ${site.name}` },
      description: studio.description,
      alternates: { canonical: `/effects/${studio.slug}` },
      robots: robotsForRecipe(studio.slug),
      openGraph: {
        title: `${studio.name} · Toy Effect Studio`,
        description: studio.description,
        url: `${site.url}/effects/${studio.slug}`,
        images: studio.previewImage
          ? [{ url: studio.previewImage }]
          : undefined,
      },
    };
  }

  const preset = getPreset(slug);
  if (!preset) return {};
  return {
    title: { absolute: preset.seoTitle },
    description: preset.seoDescription,
    alternates: { canonical: `/effects/${preset.slug}` },
    robots: robotsForRecipe(preset.slug),
    openGraph: {
      title: preset.seoTitle,
      description: preset.seoDescription,
      url: `${site.url}/effects/${preset.slug}`,
    },
  };
}

export default async function EffectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const studio = getToyEffect(slug);
  if (studio) {
    return <StudioEffectDetail effect={studio} />;
  }

  const preset = getPreset(slug);
  if (!preset) notFound();
  return <LegacyPresetDetail preset={preset} />;
}

/* -------------------------------------------------------------------------- */
/* Studio detail — product-honest Try Now / Coming Soon                        */
/* -------------------------------------------------------------------------- */

function StudioEffectDetail({ effect }: { effect: ToyEffect }) {
  const live = effect.status === "live";
  const related = listToyEffects()
    .filter((e) => e.slug !== effect.slug)
    .slice(0, 6);

  const appJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `${effect.name} — ${site.name}`,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    description: effect.description,
    url: `${site.url}/effects/${effect.slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
      />

      <section className="border-b border-white/10">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:py-14">
          {/* Preview */}
          <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] lg:mx-0">
            <div className="relative aspect-[3/4]">
              <Image
                src={effect.previewImage}
                alt=""
                fill
                priority
                sizes="(max-width: 1024px) 90vw, 420px"
                className="object-cover"
              />
              <div
                className="pointer-events-none absolute inset-0 opacity-35 mix-blend-soft-light"
                style={{ background: effect.gradient }}
                aria-hidden
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20" />
              <span
                className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                  live
                    ? "bg-[var(--mint)] text-black shadow-[0_0_16px_rgba(200,255,61,0.35)]"
                    : "border border-white/15 bg-black/70 text-white/80"
                }`}
              >
                {effectStatusLabel(effect.status)}
              </span>
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                  {effect.aspectRatio} · {effect.durationSec}s
                  {live ? " · private Moment" : " · concept preview"}
                </p>
              </div>
            </div>
          </div>

          {/* Copy + CTA */}
          <div className="flex flex-col justify-center">
            <Link
              href="/effects"
              className="w-fit text-sm text-[var(--fg-dim)] hover:text-[var(--fg)]"
            >
              ← Toy Effect Studio
            </Link>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/60">
                {effect.emoji} Effect Studio
              </span>
              {effect.nameZh ? (
                <span className="text-[11px] text-white/40">{effect.nameZh}</span>
              ) : null}
            </div>
            <h1 className="mt-3 font-display text-3xl font-black tracking-tight text-white sm:text-4xl md:text-5xl">
              {effect.name}
            </h1>
            <p className="mt-2 text-sm font-medium text-[var(--mint)]/90">
              {effect.tagline}
            </p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/60">
              {effect.longDescription}
            </p>
            <p className="mt-3 text-xs text-white/40">
              {live
                ? "Public previews use cached Lab media. Live private generation requires sign-in and private-beta access."
                : "This effect is Coming Soon. Preview stills are mock or cached Lab media — they do not start a provider job."}
            </p>

            <div className="mt-7 flex flex-wrap gap-2">
              {live && effect.tryHref ? (
                <Link
                  href={effect.tryHref}
                  className="btn btn-primary !px-6 !py-3 text-sm font-black"
                  data-effect-detail-try={effect.slug}
                >
                  Try Now
                </Link>
              ) : (
                <span
                  className="inline-flex items-center rounded-full border border-white/12 bg-white/[0.04] px-5 py-3 text-sm font-bold uppercase tracking-wide text-white/45"
                  data-effect-detail-soon={effect.slug}
                >
                  Coming Soon
                </span>
              )}
              <Link
                href="/effects"
                className="btn btn-ghost !px-4 !py-3 text-sm"
              >
                All effects
              </Link>
              {!live ? (
                <Link
                  href="/create?effect=street-power-up"
                  className="btn btn-ghost !px-4 !py-3 text-sm text-[var(--mint)]"
                >
                  Try Street Power-Up instead
                </Link>
              ) : (
                <Link
                  href="/pricing"
                  className="btn btn-ghost !px-4 !py-3 text-sm"
                >
                  Beta limits
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {live ? <HighIntentProductTruth focus="generator" /> : null}

      {live ? (
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <LandingHowItWorks productLabel="private Moment" compact />
        </section>
      ) : null}

      {/* Related studio effects */}
      <section className="mx-auto max-w-7xl border-t border-white/10 px-3 py-12 sm:px-5">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2 px-1">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--mint)]">
              More from Effect Studio
            </p>
            <h2 className="mt-1 text-lg font-bold text-white">
              Other toy effects
            </h2>
          </div>
          <Link
            href="/effects"
            className="text-[11px] font-semibold text-[var(--mint)] hover:underline"
          >
            Full studio →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {related.map((e) => (
            <EffectStudioCard key={e.slug} effect={e} />
          ))}
        </div>
      </section>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Legacy preset recipe landing (SEO / deep links not in studio catalog)       */
/* -------------------------------------------------------------------------- */

function LegacyPresetDetail({ preset }: { preset: Preset }) {
  const isCoreListingSpin = preset.slug === "360-spin-showcase";

  const related = PRESETS.filter(
    (p) => p.slug !== preset.slug && p.category === preset.category
  ).slice(0, 3);
  const relatedFallback =
    related.length > 0
      ? related
      : PRESETS.filter((p) => p.slug !== preset.slug).slice(0, 3);

  const forLinks = USE_CASES.filter((u) =>
    u.recommendedEffects.includes(preset.slug)
  ).slice(0, 4);

  const allFaq = isCoreListingSpin
    ? preset.faq
    : [...preset.faq, ...COMMON_FAQ];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: allFaq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const howToJsonLd = photoRecipeDraftHowToJsonLd({
    name: preset.h1,
    description: preset.seoDescription,
  });

  const appJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `${preset.name} — ${site.name}`,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    description: preset.seoDescription,
    url: `${site.url}/effects/${preset.slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
      />

      <section className="glow-bg">
        <div className="container-x relative z-10 pt-14 pb-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/effects"
              className="block w-fit text-sm text-[var(--fg-dim)] hover:text-[var(--fg)]"
            >
              ← Toy Effect Studio
            </Link>
            <div className="flex flex-wrap gap-2">
              <Link
                href={
                  isCoreListingSpin
                    ? "/create?effect=street-power-up"
                    : createRemixHref(preset.slug)
                }
                className="btn btn-primary !px-4 !py-2 text-xs font-black"
              >
                {isCoreListingSpin ? "Create one Moment" : "Open Generate"}
              </Link>
              {isCoreListingSpin ? (
                <Link
                  href="/pricing"
                  className="btn btn-ghost !px-3 !py-2 text-xs"
                >
                  Beta limits
                </Link>
              ) : (
                <>
                  <FreeTrialCta
                    path={`/effects/${preset.slug}`}
                    variant="ghost"
                    className="btn btn-ghost !px-3 !py-2 text-xs"
                  />
                  <Link
                    href="/create?effect=street-power-up"
                    className="btn btn-ghost !px-3 !py-2 text-xs"
                  >
                    Create one Moment
                  </Link>
                  <Link
                    href="/modules"
                    className="btn btn-ghost !px-3 !py-2 text-xs"
                  >
                    Modules
                  </Link>
                  <Link
                    href="/flow"
                    className="btn btn-ghost !px-3 !py-2 text-xs text-white/50"
                    title="Preview media wall — not a live Seedance job"
                  >
                    Flow · Preview
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="chip">
              {preset.emoji}{" "}
              {preset.audience === "seller" ? "For sellers" : "For collectors"} ·
              Tool landing
            </span>
            <span className="rounded-full border border-[var(--mint)]/30 bg-[var(--mint)]/10 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-[var(--mint)]">
              {viralName(preset.slug, preset.name)}
            </span>
            {!recipeHasUniqueProof(preset.slug) ? (
              <span className="rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-[var(--fg-dim)]">
                Concept · no unique Lab sample
              </span>
            ) : (
              <span className="rounded-full border border-[var(--mint)]/20 bg-[var(--mint)]/[0.06] px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-[var(--mint)]">
                PIKBO Lab · cached prototype
              </span>
            )}
          </div>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
            {preset.h1}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[var(--fg-muted)]">
            {preset.intro}
          </p>
          <p className="mt-3 text-xs text-[var(--fg-dim)]">
            Public preview: cached format reference · upload not processed.
            Private beta: Fast 720p · 5 seconds · invite only.
          </p>
        </div>
      </section>

      {isCoreListingSpin ? (
        <HighIntentProductTruth focus="listing-spin" />
      ) : null}

      {!isCoreListingSpin ? (
        <>
          <section className="container-x py-8">
            <LandingToolPanel
              effectSlug={preset.slug}
              effectName={preset.name}
              duration={preset.duration}
              aspectRatio={preset.aspectRatio}
            />
          </section>
          <LandingHowItWorks productLabel="video draft" compact />
        </>
      ) : null}

      {!isCoreListingSpin &&
        (() => {
          const bound = workflowsForEffect(preset.slug);
          const modules =
            bound.length > 0 ? bound : listSellerJobWorkflows().slice(0, 4);
          return (
            <section className="container-x border-y border-white/10 py-8">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--mint)]">
                    {bound.length > 0
                      ? "Modules · this recipe"
                      : "Modules · next job"}
                  </p>
                  <h2 className="mt-1 text-lg font-bold">
                    {bound.length > 0
                      ? "Launch as a job block"
                      : "Same photo · different seller job"}
                  </h2>
                </div>
                <Link
                  href="/modules"
                  className="text-[11px] font-semibold text-[var(--mint)] hover:underline"
                >
                  All modules →
                </Link>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {modules.map((w) => (
                  <Link
                    key={w.id}
                    href={w.href}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 transition hover:border-[var(--mint)]/40"
                  >
                    <span className="text-base" aria-hidden>
                      {w.emoji}
                    </span>
                    <span className="mt-1 block text-sm font-bold text-white">
                      {w.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-[var(--fg-muted)]">
                      {w.blurb}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })()}

      <section className="container-x py-10">
        <h2 className="text-2xl font-bold">About this effect</h2>
        <div className="mt-5 max-w-2xl space-y-5 text-[var(--fg-muted)]">
          {preset.body.map((para, i) => (
            <p key={i} className="leading-relaxed">
              {para}
            </p>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-2">
          {preset.keywords.map((k) => (
            <span key={k} className="chip">
              {k}
            </span>
          ))}
        </div>
      </section>

      {!isCoreListingSpin ? (
        <LandingResults
          effectSlug={preset.slug}
          title="Cached PIKBO Lab references"
        />
      ) : null}

      <section className="container-x py-8">
        <h2 className="text-2xl font-bold">Questions</h2>
        <div className="mt-6 divide-y divide-[var(--border)]">
          {allFaq.map((f) => (
            <div key={f.q} className="py-5">
              <h3 className="font-semibold">{f.q}</h3>
              <p className="mt-1.5 text-[var(--fg-muted)]">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {!isCoreListingSpin && forLinks.length > 0 && (
        <section className="container-x py-8">
          <h2 className="text-2xl font-bold">Made for</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {forLinks.map((u) => (
              <Link key={u.slug} href={`/for/${u.slug}`} className="chip">
                {u.emoji} {u.label}
              </Link>
            ))}
            <Link href="/guides" className="chip">
              Guides →
            </Link>
          </div>
        </section>
      )}

      {!isCoreListingSpin ? (
        <section className="container-x py-12">
          <h2 className="text-2xl font-bold">More effects</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {relatedFallback.map((p) => (
              <PresetCard key={p.slug} preset={p} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
