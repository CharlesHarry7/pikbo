import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { PRESETS, getPreset, COMMON_FAQ } from "@/lib/presets";
import { USE_CASES } from "@/lib/usecases";
import { PresetCard } from "@/components/PresetCard";
import { LandingToolPanel } from "@/components/LandingToolPanel";
import {
  LandingHowItWorks,
  photoRecipeDraftHowToJsonLd,
} from "@/components/LandingHowItWorks";
import { createRemixHref } from "@/lib/remixIntent";
import { LandingResults } from "@/components/LandingResults";
import { site } from "@/lib/site";
import { viralName } from "@/lib/viralNames";
import { recipeHasUniqueProof, robotsForRecipe } from "@/lib/seoIndex";
import {
  listSellerJobWorkflows,
  workflowsForEffect,
} from "@/lib/workflows";

// Pre-render every effect page at build time. Concept recipes without unique
// Lab proof are noindex (Phase H) but still reachable for Create deep-links.
export function generateStaticParams() {
  return PRESETS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const preset = getPreset(slug);
  if (!preset) return {};
  return {
    title: { absolute: preset.seoTitle },
    description: preset.seoDescription,
    keywords: preset.keywords,
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
  const preset = getPreset(slug);
  if (!preset) notFound();

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

  // Preset-specific FAQ + shared objection FAQ (allowance/watermark/commercial/input/review)
  const allFaq = [...preset.faq, ...COMMON_FAQ];

  // 哥飞 V2: FAQ + HowTo + SoftwareApplication JSON-LD (SSR)
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: allFaq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  // Matches visible LandingHowItWorks (Photo → Recipe → Video draft)
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
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "One free Mini trial: 5-second 480p clip from a photo of a toy you own",
    },
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

      {/* Hero — H1 + intro SSR for crawlers */}
      <section className="glow-bg">
        <div className="container-x relative z-10 pt-14 pb-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/effects"
              className="block w-fit text-sm text-[var(--fg-dim)] hover:text-[var(--fg)]"
            >
              ← All effects
            </Link>
            <div className="flex flex-wrap gap-2">
              <Link
                href={createRemixHref(preset.slug)}
                className="btn btn-primary !px-4 !py-2 text-xs font-black"
              >
                Open Generate
              </Link>
              <FreeTrialCta
                path={`/effects/${preset.slug}`}
                variant="ghost"
                className="btn btn-ghost !px-3 !py-2 text-xs"
              />
              <Link
                href="/create?mode=seller-pack"
                className="btn btn-ghost !px-3 !py-2 text-xs"
              >
                Seller Starter Pack
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
            Free: one Seedance Mini live trial · 5s · 480p · on-player mark.
            Without provider access, the tool returns a labeled cached demo.
          </p>
        </div>
      </section>

      {/* Tool + three steps on first product surface */}
      <section className="container-x py-8">
        <LandingToolPanel
          effectSlug={preset.slug}
          effectName={preset.name}
          duration={preset.duration}
          aspectRatio={preset.aspectRatio}
        />
      </section>
      <LandingHowItWorks productLabel="video draft" compact />

      {/* Suite modules tied to this recipe (or seller jobs fallback) */}
      {(() => {
        const bound = workflowsForEffect(preset.slug);
        const modules =
          bound.length > 0 ? bound : listSellerJobWorkflows().slice(0, 4);
        return (
          <section className="container-x border-y border-white/10 py-8">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--mint)]">
                  {bound.length > 0 ? "Modules · this recipe" : "Modules · next job"}
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

      {/* Body copy — SSR long text for crawlers (哥飞 V2 落地文案) */}
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

      {/* V2: result showcase */}
      <LandingResults
        effectSlug={preset.slug}
        title="Cached PIKBO Lab references"
      />

      {/* FAQ */}
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

      {/* Internal links — 内链 */}
      {forLinks.length > 0 && (
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

      <section className="container-x py-12">
        <h2 className="text-2xl font-bold">More effects</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {relatedFallback.map((p) => (
            <PresetCard key={p.slug} preset={p} />
          ))}
        </div>
      </section>
    </>
  );
}
