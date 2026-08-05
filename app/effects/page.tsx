import type { Metadata } from "next";
import Link from "next/link";
import { EffectStudioCard } from "@/components/EffectStudioCard";
import {
  EFFECT_CATEGORIES,
  liveToyEffects,
  listToyEffects,
  type EffectCategory,
} from "@/lib/effects";
import { site } from "@/lib/site";
import { CONCEPT_ROBOTS } from "@/lib/seoIndex";

export const metadata: Metadata = {
  title: "Toy Effect Studio · 潮玩特效工坊",
  description:
    "Toy-native one-click effects for designer toys. Street Power-Up is live in private beta; more Moments are Coming Soon.",
  alternates: { canonical: "/effects" },
  robots: CONCEPT_ROBOTS,
  openGraph: {
    title: `Toy Effect Studio | ${site.name}`,
    description:
      "Higgsfield-style effect wall for designer toys — Street Power-Up live, more Coming Soon.",
    url: `${site.url}/effects`,
  },
};

const STUDIO_FAQ = [
  {
    q: "Which effect works today?",
    a: "Street Power-Up is the only live Moment contract in private beta: one owned toy photo becomes one private 9:16, 5-second clip. Everything else on this wall is Coming Soon.",
  },
  {
    q: "Are Coming Soon cards real generation?",
    a: "No. They are catalog concepts with mock or cached Lab previews so you can browse the roadmap. They do not start a provider job.",
  },
  {
    q: "Does watching previews cost credits?",
    a: "No. Studio previews are static or cached. Live generation only runs on the authenticated Create path for Street Power-Up under private-beta rules.",
  },
] as const;

export default function EffectsStudioPage() {
  const effects = listToyEffects();
  const live = liveToyEffects();
  const byCategory = EFFECT_CATEGORIES.map((cat) => ({
    ...cat,
    items: effects.filter((e) => e.category === cat.id),
  })).filter((g) => g.items.length > 0);

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Pikbo Toy Effect Studio",
    description:
      "Toy-specific video effects. Street Power-Up is live; other effects are Coming Soon concepts.",
    numberOfItems: effects.length,
    itemListElement: effects.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: e.name,
      url: `${site.url}/effects/${e.slug}`,
      description: e.description,
    })),
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: STUDIO_FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.07]">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% -10%, rgba(200,255,61,0.18), transparent 55%), radial-gradient(ellipse 60% 50% at 90% 20%, rgba(34,211,238,0.12), transparent 50%)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--mint)]">
            Toy Effect Studio · 潮玩特效工坊
          </p>
          <h1 className="mt-2 max-w-3xl font-display text-3xl font-black uppercase tracking-tight text-white sm:text-4xl md:text-5xl">
            One-click effects built for designer toys
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55 sm:text-base">
            A Higgsfield-style preset wall — but toy-native.{" "}
            <strong className="font-semibold text-white/85">
              {live.length} live
            </strong>
            {" · "}
            <span className="text-white/50">
              {effects.length - live.length} coming soon
            </span>
            . Previews are cached or mock stills; only Street Power-Up starts a
            real private Moment today.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {live[0]?.tryHref ? (
              <Link
                href={live[0].tryHref}
                className="btn btn-primary !px-5 !py-2.5 text-xs font-black"
                data-effects-studio-primary="street-power-up"
              >
                Try Street Power-Up
              </Link>
            ) : null}
            <a
              href="#studio-grid"
              className="btn btn-ghost !px-4 !py-2.5 text-xs"
            >
              Browse all effects
            </a>
            <Link
              href="/create?effect=street-power-up"
              className="btn btn-ghost !px-4 !py-2.5 text-xs text-white/50"
            >
              Create one Moment
            </Link>
          </div>

          {/* Category chips */}
          <div className="mt-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {byCategory.map((cat) => (
              <a
                key={cat.id}
                href={`#cat-${cat.id}`}
                className="shrink-0 rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-white/60 transition hover:border-[var(--mint)]/40 hover:text-[var(--mint)]"
              >
                {cat.label}
                <span className="ml-1.5 text-white/30">{cat.items.length}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Live callout */}
      {live.length > 0 ? (
        <section className="border-b border-white/[0.06] bg-[var(--mint)]/[0.04] px-4 py-4 sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-white/70 sm:text-sm">
              <span className="font-bold text-[var(--mint)]">Live now:</span>{" "}
              {live.map((e) => e.name).join(", ")} — private beta · owned photo
              · 9:16 · 5s · 720p
            </p>
            {live[0]?.tryHref ? (
              <Link
                href={live[0].tryHref}
                className="text-[11px] font-bold uppercase tracking-wide text-[var(--mint)] hover:underline"
              >
                Open Create →
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Studio grid by category */}
      <div id="studio-grid" className="mx-auto max-w-7xl scroll-mt-24">
        {byCategory.map((cat) => (
          <section
            key={cat.id}
            id={`cat-${cat.id as EffectCategory}`}
            className="scroll-mt-28 border-b border-white/[0.06] px-3 py-8 sm:px-5"
          >
            <div className="mb-5 flex flex-wrap items-end justify-between gap-2 px-1">
              <div>
                <h2 className="font-display text-base font-bold tracking-tight sm:text-lg">
                  {cat.label}
                </h2>
                <p className="mt-0.5 text-xs text-white/40">{cat.blurb}</p>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">
                {cat.items.length} effects
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {cat.items.map((effect) => (
                <EffectStudioCard key={effect.slug} effect={effect} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* FAQ */}
      <section className="mx-auto max-w-7xl px-3 pb-10 pt-6 sm:px-5">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-7">
          <h2 className="text-sm font-bold text-white">Effect Studio FAQ</h2>
          <p className="mt-1 text-xs text-white/40">
            Live vs Coming Soon · credits · private beta
          </p>
          <dl className="mt-4 space-y-4">
            {STUDIO_FAQ.map((f) => (
              <div key={f.q}>
                <dt className="text-sm font-semibold text-white/90">{f.q}</dt>
                <dd className="mt-1 text-xs leading-relaxed text-white/55">
                  {f.a}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  );
}
