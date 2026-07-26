import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  FOR_SLUG_ALIASES,
  USE_CASES,
  getUseCase,
  resolveUseCaseSlug,
} from "@/lib/usecases";
import { COMMON_FAQ, getPreset } from "@/lib/presets";
import { PresetCard } from "@/components/PresetCard";
import { LandingToolPanel } from "@/components/LandingToolPanel";
import {
  LandingHowItWorks,
  photoRecipeDraftHowToJsonLd,
} from "@/components/LandingHowItWorks";
import { LandingResults } from "@/components/LandingResults";
import { site } from "@/lib/site";
import { robotsForForSlug } from "@/lib/seoIndex";
import { SuiteDoorLinks } from "@/components/SuiteDoorLinks";
import { LandingSeoMesh } from "@/components/LandingSeoMesh";
import { JsonLd } from "@/components/JsonLd";
import { softwareApplicationJsonLd } from "@/lib/jsonLd";

export function generateStaticParams() {
  const canonical = USE_CASES.map((u) => ({ slug: u.slug }));
  const aliases = Object.keys(FOR_SLUG_ALIASES).map((slug) => ({ slug }));
  return [...canonical, ...aliases];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const uc = getUseCase(slug);
  if (!uc) return {};
  return {
    title: { absolute: uc.seoTitle },
    description: uc.seoDescription,
    keywords: uc.keywords,
    alternates: { canonical: `/for/${uc.slug}` },
    robots: robotsForForSlug(uc.slug),
    openGraph: {
      title: uc.seoTitle,
      description: uc.seoDescription,
      url: `${site.url}/for/${uc.slug}`,
    },
  };
}

export default async function UseCasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // G4: short roast-era paths must never 404 when dynamic route wins.
  const aliasTarget = FOR_SLUG_ALIASES[slug];
  if (aliasTarget) {
    redirect(`/for/${aliasTarget}`);
  }
  const uc = getUseCase(resolveUseCaseSlug(slug));
  if (!uc) notFound();

  const primarySlug = uc.recommendedEffects[0];
  const primary = primarySlug ? getPreset(primarySlug) : undefined;
  const effects = uc.recommendedEffects
    .map((s) => getPreset(s))
    .filter((p) => p !== undefined);

  const allFaq = [...uc.faq, ...COMMON_FAQ];
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: allFaq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  // HowTo only when Photo → Recipe → Video draft is visible with on-page tool
  const showHowTo = Boolean(primary);
  const jsonLdBlocks: object[] = [
    faqJsonLd,
    softwareApplicationJsonLd({
      name: `${uc.h1} | ${site.name}`,
      description: uc.seoDescription,
      url: `${site.url}/for/${uc.slug}`,
    }),
  ];
  if (showHowTo) {
    jsonLdBlocks.push(
      photoRecipeDraftHowToJsonLd({
        name: uc.h1,
        description: uc.seoDescription,
      })
    );
  }

  return (
    <>
      <JsonLd data={jsonLdBlocks} />

      <section className="glow-bg">
        <div className="container-x relative z-10 pt-14 pb-8">
          <span className="chip">
            {uc.emoji} For {uc.audience === "seller" ? "sellers" : "collectors"}{" "}
            · Tool landing
          </span>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
            {uc.h1}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[var(--fg-muted)]">
            {uc.intro}
          </p>
          <SuiteDoorLinks
            effectSlug={primary?.slug}
            className="mt-5"
          />
        </div>
      </section>

      {/* Tool + three steps on first product surface */}
      {primary ? (
        <>
          <section className="container-x py-8">
            <LandingToolPanel
              effectSlug={primary.slug}
              effectName={primary.name}
              duration={primary.duration}
              aspectRatio={primary.aspectRatio}
            />
          </section>
          <LandingHowItWorks productLabel="listing-ready draft" compact />
        </>
      ) : null}

      <section className="container-x py-10">
        <h2 className="text-2xl font-bold">Why this works for {uc.label}</h2>
        <div className="mt-5 max-w-2xl space-y-5 text-[var(--fg-muted)]">
          {uc.body.map((para, i) => (
            <p key={i} className="leading-relaxed">
              {para}
            </p>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-2">
          {uc.keywords.map((k) => (
            <span key={k} className="chip">
              {k}
            </span>
          ))}
        </div>
      </section>

      <LandingResults
        effectSlug={primary?.slug}
        title="Sample clips for this use case"
      />

      <section className="container-x py-8">
        <h2 className="text-2xl font-bold">Best effects for this</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {effects.map((p) => (
            <PresetCard key={p.slug} preset={p} />
          ))}
        </div>
      </section>

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

      <LandingSeoMesh
        kind="for"
        currentSlug={uc.slug}
        effectSlugs={uc.recommendedEffects}
      />
    </>
  );
}
