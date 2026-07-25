import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { GUIDES, getGuide } from "@/lib/guides";
import { getPreset } from "@/lib/presets";
import { PresetCard } from "@/components/PresetCard";
import { site } from "@/lib/site";
import { SuiteDoorLinks } from "@/components/SuiteDoorLinks";
import { LandingSeoMesh } from "@/components/LandingSeoMesh";
import { robotsForGuideSlug } from "@/lib/seoIndex";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) return {};
  return {
    title: { absolute: g.seoTitle },
    description: g.seoDescription,
    alternates: { canonical: `/guides/${g.slug}` },
    robots: robotsForGuideSlug(g.slug),
    openGraph: {
      title: g.seoTitle,
      description: g.seoDescription,
      url: `${site.url}/guides/${g.slug}`,
      type: "article",
    },
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) notFound();

  const effects = g.relatedEffects
    .map((s) => getPreset(s))
    .filter((p) => p !== undefined);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: g.title,
    description: g.seoDescription,
    author: { "@type": "Organization", name: site.name },
    publisher: { "@type": "Organization", name: site.name },
    mainEntityOfPage: `${site.url}/guides/${g.slug}`,
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: g.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <article className="container-x py-14">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/guides"
            className="block w-fit text-sm text-[var(--fg-dim)] hover:text-[var(--fg)]"
          >
            ← All guides
          </Link>
          <span className="chip mt-4">
            {g.emoji} {g.readMins} min read
          </span>
          <h1 className="mt-4 text-4xl font-bold leading-tight">{g.title}</h1>
          <p className="mt-3 text-lg text-[var(--fg-muted)]">{g.dek}</p>
          <SuiteDoorLinks
            effectSlug={g.relatedEffects[0]}
            className="mt-5"
          />

          <p className="mt-8 leading-relaxed text-[var(--fg-muted)]">{g.intro}</p>

          {g.sections.map((s) => (
            <section key={s.h2} className="mt-8">
              <h2 className="text-xl font-bold">{s.h2}</h2>
              <div className="mt-3 space-y-3 text-[var(--fg-muted)]">
                {s.paragraphs.map((p, i) => (
                  <p key={i} className="leading-relaxed">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}

          {/* FAQ */}
          <section className="mt-10">
            <h2 className="text-xl font-bold">FAQ</h2>
            <div className="mt-4 divide-y divide-[var(--border)]">
              {g.faq.map((f) => (
                <div key={f.q} className="py-4">
                  <h3 className="font-semibold">{f.q}</h3>
                  <p className="mt-1.5 text-[var(--fg-muted)]">{f.a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <div
            className="mt-10 rounded-2xl p-8 text-center"
            style={{ background: "var(--grad)" }}
          >
            <p className="text-lg font-semibold text-white">
              Try it with a toy you own
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <FreeTrialCta
                path={`/guides/${g.slug}`}
                labelTry="Try free · Mini 5s →"
                labelPlans="Compare plans →"
                labelDemo="Try Lab sample →"
                className="btn bg-white px-6 py-2.5 font-semibold text-[var(--bg)] hover:opacity-90"
              />
              <Link
                href="/modules"
                className="btn border border-white/40 bg-transparent px-5 py-2.5 font-semibold text-white hover:bg-white/10"
              >
                Toy Modules
              </Link>
              <Link
                href="/create?mode=seller-pack"
                className="btn border border-white/40 bg-transparent px-5 py-2.5 font-semibold text-white hover:bg-white/10"
              >
                Seller Pack
              </Link>
            </div>
          </div>
        </div>
      </article>

      {/* Related effects */}
      <section className="container-x pb-12">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold">Effects from this guide</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {effects.map((p) => (
              <PresetCard key={p.slug} preset={p} />
            ))}
          </div>
        </div>
      </section>

      {/* 哥飞 mesh — tools / for / more guides */}
      <LandingSeoMesh
        kind="guides"
        currentSlug={g.slug}
        effectSlugs={g.relatedEffects}
      />
      <section className="container-x pb-12">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold">More guides</h2>
          <div className="mt-6 flex flex-wrap gap-3">
            {GUIDES.filter((x) => x.slug !== g.slug).map((x) => (
              <Link key={x.slug} href={`/guides/${x.slug}`} className="chip">
                {x.emoji} {x.title}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
