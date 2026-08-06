import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { TOOLS, getTool } from "@/lib/tools";
import { COMMON_FAQ, getPreset } from "@/lib/presets";
import { PresetCard } from "@/components/PresetCard";
import { LandingToolPanel } from "@/components/LandingToolPanel";
import {
  LandingHowItWorks,
  photoRecipeDraftHowToJsonLd,
} from "@/components/LandingHowItWorks";
import { LandingResults } from "@/components/LandingResults";
import { createGenerate360Href } from "@/lib/jobIntents";
import { site } from "@/lib/site";
import { robotsForToolSlug } from "@/lib/seoIndex";
import { SuiteDoorLinks } from "@/components/SuiteDoorLinks";
import { LandingSeoMesh } from "@/components/LandingSeoMesh";
import { JsonLd } from "@/components/JsonLd";
import {
  softwareApplicationJsonLd,
} from "@/lib/jsonLd";
import { DEMO_VIDEOS } from "@/lib/demoVideos";
import { HighIntentProductTruth } from "@/components/HighIntentProductTruth";

/** 哥飞：排名主战场 slug — On Page 火力集中 */
const PRIMARY_RANK_SLUG = "ai-toy-video-generator";
const HIGH_INTENT_TOOL_SLUGS = new Set([
  PRIMARY_RANK_SLUG,
  "blind-box-reveal-video-maker",
]);

export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const t = getTool(slug);
  if (!t) return {};
  return {
    title: { absolute: t.seoTitle },
    description: t.seoDescription,
    alternates: { canonical: `/tools/${t.slug}` },
    robots: robotsForToolSlug(t.slug),
    openGraph: {
      title: t.seoTitle,
      description: t.seoDescription,
      url: `${site.url}/tools/${t.slug}`,
      siteName: site.name,
      type: "website",
      images: [
        {
          url: site.socialImages.openGraph,
          width: site.socialImages.width,
          height: site.socialImages.height,
          alt: t.h1,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t.seoTitle,
      description: t.seoDescription,
      images: [site.socialImages.twitter],
    },
  };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = getTool(slug);
  if (!t) notFound();

  const primary = getPreset(t.primaryEffect);
  const effects = t.effects
    .map((s) => getPreset(s))
    .filter((p) => p !== undefined);

  const isPrimaryRank = t.slug === PRIMARY_RANK_SLUG;
  const isHighIntentTool = HIGH_INTENT_TOOL_SLUGS.has(t.slug);
  const allFaq = isHighIntentTool ? t.faq : [...t.faq, ...COMMON_FAQ];
  const primaryDemo = isPrimaryRank
    ? DEMO_VIDEOS.find((demo) => demo.preset === t.primaryEffect)
    : undefined;
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: allFaq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  // HowTo only when the three-step block is actually rendered with the tool
  const showHowTo = Boolean(primary);
  const jsonLdBlocks: object[] = [
    faqJsonLd,
    softwareApplicationJsonLd({
      name: `${t.h1} | ${site.name}`,
      description: t.seoDescription,
      url: `${site.url}/tools/${t.slug}`,
    }),
  ];
  if (showHowTo) {
    jsonLdBlocks.push(
      photoRecipeDraftHowToJsonLd({
        name: t.h1,
        description: t.seoDescription,
      })
    );
  }
  return (
    <>
      <JsonLd data={jsonLdBlocks} />

      <section className="glow-bg">
        <div className="container-x relative z-10 pt-14 pb-8">
          <span className="chip">
            {t.emoji} {t.label} · Tool
          </span>
          {/* Rank page friction line — above H1, does not change H1 (CTR / soft launch) */}
          {isHighIntentTool ? (
            <p
              className="mt-4 max-w-2xl text-sm font-semibold tracking-wide text-[var(--neon-pink)]/95 sm:text-base"
              data-tools-friction="cached-preview"
            >
              Cached format preview · no card · your upload is not processed.
              Private generation is invite-only, and subscriptions are not open
              yet.
            </p>
          ) : null}
          <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
            {t.h1}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[var(--fg-muted)]">
            {t.intro}
          </p>
          {isPrimaryRank ? (
            <p className="mt-3 max-w-2xl text-base font-medium leading-relaxed text-white/85">
              Upload a photo of a collectible you own—not a selfie—and turn it
              into a short video draft for listings and social.
            </p>
          ) : null}
          {isHighIntentTool ? (
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/create?effect=street-power-up&source=tool-page"
                className="btn btn-primary !px-4 !py-2 text-xs font-black"
              >
                Preview one toy Moment
              </Link>
              <Link
                href="/pricing"
                className="btn btn-ghost !px-3 !py-2 text-xs font-black"
              >
                Beta limits
              </Link>
            </div>
          ) : (
            <SuiteDoorLinks effectSlug={primary?.slug} className="mt-5" />
          )}
        </div>
      </section>

      {isHighIntentTool ? (
        <HighIntentProductTruth
          focus={isPrimaryRank ? "generator" : "blind-box"}
        />
      ) : null}

      {primaryDemo && !isHighIntentTool ? (
        <LandingResults
          effectSlug={primaryDemo.preset}
          title="Watch a cached AI toy video prototype"
        />
      ) : null}

      {primary && !isHighIntentTool ? (
        <>
          <section className="container-x py-8">
            <LandingToolPanel
              effectSlug={primary.slug}
              effectName={primary.name}
              duration={primary.duration}
              aspectRatio={primary.aspectRatio}
            />
          </section>
          {/* Three steps sit next to the first-screen tool (not buried below body) */}
          <LandingHowItWorks productLabel="video draft" compact />
        </>
      ) : null}

      <section className="container-x py-10">
        <h2 className="text-2xl font-bold">
          {t.slug === PRIMARY_RANK_SLUG
            ? "How this tool works for designer toys"
            : "How this tool works"}
        </h2>
        <div className="mt-5 max-w-2xl space-y-5 text-[var(--fg-muted)]">
          {t.body.map((para, i) => (
            <p key={i} className="leading-relaxed">
              {para}
            </p>
          ))}
        </div>
        {t.slug === PRIMARY_RANK_SLUG ? (
          <div className="mt-8 max-w-2xl space-y-4 text-[var(--fg-muted)]">
            <h2 className="text-2xl font-bold text-[var(--fg)]">
              Who should use an AI toy video generator
            </h2>
            <p className="leading-relaxed">
              Sellers who need listing motion without a turntable. Collectors
              who want shelf flex clips. Indie brands drafting drop teasers from
              lookbook stills. If you searched for an{" "}
              <strong className="text-[var(--fg)]">ai toy video generator</strong>
              , this page is the focused answer: tool above, depth below, no
              fake social proof.
            </p>
            <h2 className="text-2xl font-bold text-[var(--fg)]">
              AI toy video generator vs generic photo-to-video apps
            </h2>
            <p className="leading-relaxed">
              Generic photo-to-video apps optimize for faces and landscapes.
              An AI toy video generator for designer toys prioritizes product
              identity—sculpt edges, paint apps, packaging. Public access shows
              honest cached prototypes; invited validation pins one Fast 720p,
              5-second private-delivery path rather than a fake multi-model
              wall.
            </p>
            <p className="leading-relaxed text-sm">
              Brand home with embedded tool:{" "}
              <Link href="/" className="text-[var(--neon-pink)] hover:underline">
                {site.url}
              </Link>
              . Scene page:{" "}
              <Link
                href="/for/photo-to-video-for-toys"
                className="text-[var(--neon-pink)] hover:underline"
              >
                photo to video for toys
              </Link>
              . Full studio:{" "}
              <Link
                href={createGenerate360Href("tool-page")}
                className="text-[var(--neon-pink)] hover:underline"
                data-tool-full-studio="remix"
              >
                Generate
              </Link>
              .
            </p>
            <nav
              aria-label="Prepare and compare AI toy video"
              className="flex flex-wrap gap-x-4 gap-y-2 text-sm"
            >
              <Link
                href="/guides/how-to-photograph-toys-for-ai-video"
                className="text-[var(--neon-pink)] hover:underline"
              >
                Prepare a clean toy photo
              </Link>
              <Link
                href="/tools/blind-box-reveal-video-maker"
                className="text-[var(--neon-pink)] hover:underline"
              >
                Make a blind-box reveal
              </Link>
              <Link
                href="/pricing"
                className="text-[var(--neon-pink)] hover:underline"
              >
                Review plan limits
              </Link>
            </nav>
          </div>
        ) : null}
      </section>

      {!primaryDemo && !isHighIntentTool ? (
        <LandingResults effectSlug={primary?.slug} title="Example clips" />
      ) : null}

      {!isHighIntentTool ? (
        <section className="container-x py-8">
          <h2 className="text-2xl font-bold">Recipes for this tool</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {effects.map((p) => (
              <PresetCard key={p.slug} preset={p} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="container-x py-8">
        <h2 className="text-2xl font-bold">
          {t.slug === PRIMARY_RANK_SLUG
            ? "AI toy video generator FAQ"
            : "Questions"}
        </h2>
        <div className="mt-6 divide-y divide-[var(--border)]">
          {allFaq.map((f) => (
            <div key={f.q} className="py-5">
              <h3 className="font-semibold">{f.q}</h3>
              <p className="mt-1.5 text-[var(--fg-muted)]">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {!isHighIntentTool ? (
        <LandingSeoMesh
          kind="tools"
          currentSlug={t.slug}
          effectSlugs={[t.primaryEffect, ...t.effects]}
        />
      ) : null}
    </>
  );
}
