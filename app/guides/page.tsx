import type { Metadata } from "next";
import Link from "next/link";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { GUIDES } from "@/lib/guides";
import { site } from "@/lib/site";
import { CONCEPT_ROBOTS } from "@/lib/seoIndex";

export const metadata: Metadata = {
  title: "Guides",
  description:
    "How-to guides for making great AI videos of designer toys, figures, and blind boxes — spin videos, photo tips, and content ideas.",
  alternates: { canonical: "/guides" },
  robots: CONCEPT_ROBOTS,
  openGraph: {
    title: `Guides | ${site.name}`,
    description:
      "Practical guides for turning owned-toy photos into listing and social clips.",
    url: `${site.url}/guides`,
  },
};

/** Phase H: FAQ so /guides is not a thin article index. */
const GUIDES_FAQ = [
  {
    q: "Are these guides product manuals or SEO filler?",
    a: "Short how-tos that end in a real Generate path — spin, photo tips, content ideas. Each guide links recipes and Free Mini limits honestly.",
  },
  {
    q: "Is Free Mini a 10-second render?",
    a: "No. Free Mini live is about one Seedance Mini clip (5s · 480p · on-player mark). Lab samples cost 0 credits. Longer paid durations need plan credits.",
  },
  {
    q: "Do guides guarantee viral reach or sales?",
    a: "No. Guides help craft clearer inputs and choose recipes. Marketplace and social outcomes depend on your product and distribution.",
  },
] as const;

export default function GuidesHub() {
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Pikbo toy video guides",
    numberOfItems: GUIDES.length,
    itemListElement: GUIDES.map((g, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: g.title,
      url: `${site.url}/guides/${g.slug}`,
      description: g.dek,
    })),
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: GUIDES_FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };

  return (
    <div className="relative container-x py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(40%_80%_at_0%_0%,rgba(200,255,61,0.07),transparent_70%)]"
        aria-hidden
      />
      <div className="relative max-w-2xl">
        <span className="chip">📚 Guides</span>
        <h1 className="mt-4 font-display text-4xl font-black tracking-tight sm:text-5xl">
          Make better toy videos
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-[var(--fg-muted)]">
          Short, practical guides for turning photos of the toys you own into
          videos that sell and get shared.
        </p>
      </div>

      <div className="relative mt-6 flex flex-wrap items-center gap-2">
        <Link href="/create" className="btn btn-primary text-sm">
          Open Generate
        </Link>
        <FreeTrialCta path="/guides" variant="ghost" />
        <Link href="/flow" className="btn btn-ghost text-sm">
          Flow
        </Link>
        <Link href="/modules" className="btn btn-ghost text-sm">
          Toy Modules
        </Link>
        <Link href="/create?mode=seller-pack" className="btn btn-ghost text-sm">
          Seller Pack
        </Link>
      </div>

      <div className="relative mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GUIDES.map((g) => (
          <Link
            key={g.slug}
            href={`/guides/${g.slug}`}
            className="group flex flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-black/40 p-6 shadow-[0_16px_40px_-28px_rgba(0,0,0,0.9)] transition duration-300 hover:-translate-y-1 hover:border-[var(--mint)]/40"
          >
            <span className="text-3xl">{g.emoji}</span>
            <h2 className="mt-3 font-semibold text-white transition group-hover:text-[var(--mint)]">
              {g.title}
            </h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-white/50">
              {g.dek}
            </p>
            <span className="mt-4 text-xs font-semibold text-[var(--mint)]">
              {g.readMins} min read →
            </span>
          </Link>
        ))}
      </div>

      <section className="relative mx-auto mt-12 max-w-3xl rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-7">
        <h2 className="text-sm font-bold text-white">Guides FAQ</h2>
        <p className="mt-1 text-xs text-white/40">
          How-tos · Free Mini 5s · no viral guarantee
        </p>
        <dl className="mt-4 space-y-4">
          {GUIDES_FAQ.map((f) => (
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
  );
}
