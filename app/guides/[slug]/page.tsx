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
      ...(g.datePublished ? { publishedTime: g.datePublished } : {}),
      ...(g.dateModified ? { modifiedTime: g.dateModified } : {}),
      images: [
        {
          url: site.socialImages.openGraph,
          width: site.socialImages.width,
          height: site.socialImages.height,
          alt: g.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: g.seoTitle,
      description: g.seoDescription,
      images: [site.socialImages.twitter],
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
    image: site.socialImages.openGraph,
    author: {
      "@type": "Organization",
      name: g.author ?? site.name,
      url: `${site.url}/about`,
    },
    publisher: {
      "@type": "Organization",
      name: site.name,
      url: site.url,
    },
    mainEntityOfPage: `${site.url}/guides/${g.slug}`,
    ...(g.datePublished ? { datePublished: g.datePublished } : {}),
    ...(g.dateModified ? { dateModified: g.dateModified } : {}),
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
          {g.author || g.datePublished || g.dateModified ? (
            <p className="mt-3 text-xs leading-relaxed text-[var(--fg-dim)]">
              {g.author ? (
                <>
                  By{" "}
                  <Link href="/about" className="underline hover:text-[var(--mint)]">
                    {g.author}
                  </Link>
                </>
              ) : null}
              {g.datePublished ? (
                <>
                  {" "}
                  · Published{" "}
                  <time dateTime={g.datePublished}>
                    {g.datePublished.slice(0, 10)}
                  </time>
                </>
              ) : null}
              {g.dateModified ? (
                <>
                  {" "}
                  · Reviewed{" "}
                  <time dateTime={g.dateModified}>
                    {g.dateModified.slice(0, 10)}
                  </time>
                </>
              ) : null}
            </p>
          ) : null}
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

          {g.checklist?.length ? (
            <section className="mt-10">
              <h2 className="text-xl font-bold">Toy-photo preflight checklist</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--fg-muted)]">
                Use this before the first draft. It is a product-truth checklist,
                not a promise that generation will preserve every unseen detail.
              </p>
              <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="bg-white/[0.04] text-[var(--fg)]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Check</th>
                      <th className="px-4 py-3 font-semibold">Use</th>
                      <th className="px-4 py-3 font-semibold">Avoid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] text-[var(--fg-muted)]">
                    {g.checklist.map((row) => (
                      <tr key={row.check}>
                        <th className="px-4 py-3 font-semibold text-[var(--fg)]">
                          {row.check}
                        </th>
                        <td className="px-4 py-3">{row.use}</td>
                        <td className="px-4 py-3">{row.avoid}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {g.sources?.length ? (
            <section className="mt-10">
              <h2 className="text-xl font-bold">Sources and review method</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--fg-muted)]">
                Pikbo combines these published marketplace and camera guidelines
                with a manual comparison of the source photo, cached prototype,
                and commercially important toy details.
              </p>
              <ul className="mt-4 space-y-3 text-sm text-[var(--fg-muted)]">
                {g.sources.map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      className="font-semibold text-[var(--mint)] hover:underline"
                    >
                      {source.label}
                    </a>
                    <span> — {source.note}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-sm leading-relaxed text-[var(--fg-muted)]">
                When the photo passes this check, preview it with the{" "}
                <Link
                  href="/tools/ai-toy-video-generator"
                  className="font-semibold text-[var(--mint)] hover:underline"
                >
                  AI toy video generator
                </Link>
                , try a focused{" "}
                <Link
                  href="/tools/blind-box-reveal-video-maker"
                  className="font-semibold text-[var(--mint)] hover:underline"
                >
                  blind-box reveal workflow
                </Link>
                , or review{" "}
                <Link
                  href="/pricing"
                  className="font-semibold text-[var(--mint)] hover:underline"
                >
                  current plan limits
                </Link>
                .
              </p>
            </section>
          ) : null}

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
                labelTry="Try free · Lab →"
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
                href="/create?effect=street-power-up&source=guide"
                className="btn border border-white/40 bg-transparent px-5 py-2.5 font-semibold text-white hover:bg-white/10"
              >
                Create one Moment
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
