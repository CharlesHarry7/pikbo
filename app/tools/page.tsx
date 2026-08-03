import type { Metadata } from "next";
import Link from "next/link";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { TOOLS } from "@/lib/tools";
import { createRemixHref } from "@/lib/remixIntent";
import { site } from "@/lib/site";
import { JsonLd } from "@/components/JsonLd";
import { itemListJsonLd } from "@/lib/jsonLd";
import { CONCEPT_ROBOTS } from "@/lib/seoIndex";

/** Tools hub Open Generate — listing spin remix (ratio/duration/channel). */
const TOOLS_GENERATE_HREF = createRemixHref("360-spin-showcase");

export const metadata: Metadata = {
  title: "Toy Video Tools",
  description:
    "Search-intent toy video tools: image-to-video, listing clips, unboxing hooks, and seller demos. Each page deep-links to a real Create recipe with honest Free Mini limits.",
  alternates: { canonical: "/tools" },
  // Hub is thin vs primary rank slug — noindex during cold start
  robots: CONCEPT_ROBOTS,
  openGraph: {
    title: `Toy Video Tools | ${site.name}`,
    description:
      "One search job per page — upload a toy photo, pick a recipe, generate a short clip.",
    url: `${site.url}/tools`,
  },
};

/** Phase H: FAQ so /tools hub is not a thin card grid. */
const TOOLS_FAQ = [
  {
    q: "What is a Pikbo tool page?",
    a: "One search job: intent title, a working Create deep-link with a registered recipe, Free Mini limits, and FAQ. Not a multi-model marketplace.",
  },
  {
    q: "Does Try free burn credits?",
    a: "Lab sample is a free cached path (0 credits). Free Mini live is about one Seedance Mini clip (5s · 480p · on-player mark). When trial is used, CTAs send you to plans — Lab demos stay free.",
  },
  {
    q: "Are sales or rankings guaranteed?",
    a: "No. Pikbo makes short listing and social clips from a toy photo you own. Marketplace performance depends on your listing, price, and traffic.",
  },
] as const;

/**
 * Hub for the /tools/[slug] SEO cluster (GPT SEO_INTENT_50).
 * No fake capability list — every card opens a real registered tool page.
 */
export default function ToolsIndexPage() {
  // Phase H: ItemList of real tool URLs only — numberOfItems === list length.
  const itemListLd = itemListJsonLd({
    name: "Pikbo toy video tools",
    description:
      "Search-intent toy video tools that deep-link to a registered Create recipe.",
    items: TOOLS.map((t) => ({
      name: t.label,
      url: `${site.url}/tools/${t.slug}`,
      description: t.h1,
    })),
  });

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: TOOLS_FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };

  return (
    <div className="relative px-4 py-10 sm:px-8">
      <JsonLd data={itemListLd} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(45%_80%_at_0%_0%,rgba(200,255,61,0.06),transparent_70%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-5xl">
        <p className="section-label">Tools</p>
        <h1 className="mt-2 font-display text-3xl font-black tracking-tight sm:text-4xl">
          Toy video tools from one photo
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--fg-muted)]">
          Each tool page completes one search job: searchable intent, a working
          Create deep-link, Free Mini limits (5s · 480p · on-player mark), and
          honest FAQ. No unlimited generation and no guaranteed sales.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Link
            href={TOOLS_GENERATE_HREF}
            className="btn btn-primary text-sm"
            data-tools-generate="remix"
          >
            Open Generate
          </Link>
          <FreeTrialCta path="/tools" variant="ghost" />
          <Link href="/modules" className="btn btn-ghost text-sm">
            Modules
          </Link>
          <Link
            href="/create?effect=street-power-up"
            className="btn btn-ghost text-sm"
          >
            Create one Moment
          </Link>
          <Link
            href="/flow"
            className="btn btn-ghost text-sm text-white/50"
            title="Preview media wall — not a live Seedance job"
          >
            Flow · Preview
          </Link>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((t) => (
            <Link
              key={t.slug}
              href={`/tools/${t.slug}`}
              className="card group flex flex-col gap-2 p-4 transition hover:border-[var(--mint)]/40"
            >
              <span className="text-lg" aria-hidden>
                {t.emoji}
              </span>
              <span className="text-sm font-bold text-[var(--fg)] group-hover:text-[var(--mint)]">
                {t.label}
              </span>
              <span className="text-xs leading-relaxed text-[var(--fg-muted)]">
                {t.h1}
              </span>
              <span className="mt-auto pt-2 text-[10px] font-bold uppercase tracking-wide text-[var(--fg-dim)]">
                → Open tool
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-[var(--fg-dim)]">
          {TOOLS.length} tools · every page links to a registered Create recipe
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link
            href={TOOLS_GENERATE_HREF}
            className="btn btn-primary text-sm"
            data-tools-footer-generate="remix"
          >
            Open Generate
          </Link>
          <Link href="/modules" className="btn btn-ghost text-sm">
            Toy Modules
          </Link>
          <Link
            href="/create?effect=street-power-up"
            className="btn btn-ghost text-sm"
          >
            Create one Moment
          </Link>
          <Link href="/effects" className="btn btn-ghost text-sm">
            All presets
          </Link>
          <Link href="/community" className="btn btn-ghost text-sm">
            Lab examples
          </Link>
        </div>

        <section className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-7">
          <h2 className="text-sm font-bold text-white">Tools FAQ</h2>
          <p className="mt-1 text-xs text-white/40">
            One job per page · Free Mini · no sales guarantee
          </p>
          <dl className="mt-4 space-y-4 text-left">
            {TOOLS_FAQ.map((f) => (
              <div key={f.q}>
                <dt className="text-sm font-semibold text-white/90">{f.q}</dt>
                <dd className="mt-1 text-xs leading-relaxed text-white/55">
                  {f.a}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
