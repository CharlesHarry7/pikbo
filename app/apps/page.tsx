import type { Metadata } from "next";
import Link from "next/link";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { WORKFLOWS } from "@/lib/workflows";
import { APPS } from "@/lib/catalog";
import { DEMO_VIDEOS } from "@/lib/demoVideos";
import { createGenerate360Href } from "@/lib/jobIntents";
import { site } from "@/lib/site";
import { CONCEPT_ROBOTS } from "@/lib/seoIndex";

/** Apps Open Generate — listing spin remix (ratio/duration/channel). */
const APPS_GENERATE_HREF = createGenerate360Href("apps");

function posterForEffect(effect?: string): string | null {
  if (!effect) return null;
  return DEMO_VIDEOS.find((d) => d.preset === effect)?.poster ?? null;
}

export const metadata: Metadata = {
  title: "Apps & Workflows · Toy video mini-apps",
  description:
    "Pikbo toy-native workflows — listing spin, TikTok hook, blind-box drop, and shelf motion. One directed Moment through the same Create engine.",
  alternates: { canonical: "/apps" },
  robots: CONCEPT_ROBOTS,
  openGraph: {
    title: `Apps & Workflows | ${site.name}`,
    description:
      "Toy-native recipe doors for listings, social posts, drops, and shelf motion. Runtime access is checked in Generate.",
    url: `${site.url}/apps`,
  },
};

const CATS = [
  { id: "video" as const, label: "Video for your shelf" },
  { id: "image" as const, label: "Stills & packaging" },
  { id: "studio" as const, label: "Pro studio" },
  { id: "edit" as const, label: "Edit tools" },
];

/** Phase H: FAQ so /apps is not a thin workflow shelf. */
const APPS_FAQ = [
  {
    q: "What are Pikbo Apps?",
    a: "Recipe doors that open Generate with one prefilled toy-video Moment, such as a listing spin, social hook, unbox, or shelf shot. Cached previews stay free; eligible Live access is checked at runtime.",
  },
  {
    q: "What does SOON mean?",
    a: "Roadmap cards you can see but cannot run. READY cards open a registered recipe, but they do not promise a provider call; Generate checks account and deployment eligibility.",
  },
  {
    q: "Is Try free a live generation?",
    a: "No. Try free plays a cached Pikbo Lab prototype for 0 credits and does not process your upload. When Live is enabled for an eligible account, Generate shows the exact quote before submission.",
  },
  {
    q: "How is Apps different from Modules?",
    a: "Same product family. /modules is the dense modular wall; /apps is the workflow shelf with LIVE vs SOON honesty. Prefer /modules for job-first browsing.",
  },
] as const;

export default function AppsPage() {
  const liveWorkflows = WORKFLOWS.filter((w) => w.live);
  const coveredHrefs = new Set(liveWorkflows.map((w) => w.href));
  const coveredNames = new Set(
    liveWorkflows.map((w) => w.label.toLowerCase())
  );
  const extraLive = APPS.filter(
    (a) =>
      a.live &&
      !coveredHrefs.has(a.href) &&
      !coveredNames.has(a.name.toLowerCase())
  );
  const soon = APPS.filter((a) => !a.live);

  // Phase H: ItemList of live jobs only — never list SOON / preview as indexable apps.
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Pikbo toy recipe workflows",
    description:
      "Recipe doors that open Create with a prefilled toy-video job. Preview/soon items are omitted.",
    numberOfItems: liveWorkflows.length + extraLive.length,
    itemListElement: [
      ...liveWorkflows.map((w, i) => ({
        "@type": "ListItem" as const,
        position: i + 1,
        name: w.label,
        url: w.href.startsWith("http") ? w.href : `${site.url}${w.href}`,
        description: w.blurb,
      })),
      ...extraLive.map((a, i) => ({
        "@type": "ListItem" as const,
        position: liveWorkflows.length + i + 1,
        name: a.name,
        url: a.href.startsWith("http") ? a.href : `${site.url}${a.href}`,
        description: a.blurb ?? a.name,
      })),
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: APPS_FAQ.map((f) => ({
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-[radial-gradient(50%_80%_at_0%_0%,rgba(200,255,61,0.07),transparent_70%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl">
        <span className="chip">🧸 Suite · toy workflows</span>
        <h1 className="mt-3 font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
          Apps & workflows
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--fg-muted)]">
          Recipe doors for one photo of a toy you own — listing, social, drop,
          and batch. Each card prefills the same Generate workbench; runtime
          access is checked there. Canonical modular wall:{" "}
          <Link href="/modules" className="text-[var(--mint)] hover:underline">
            /modules
          </Link>
          .
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link href="/modules" className="btn btn-primary text-sm">
            Toy Modules
          </Link>
          <FreeTrialCta path="/apps" variant="ghost" />
          <Link
            href={APPS_GENERATE_HREF}
            className="btn btn-ghost text-sm"
            data-apps-generate="remix"
          >
            Open Generate
          </Link>
          <Link
            href="/create?effect=street-power-up"
            className="btn btn-ghost text-sm"
          >
            Create one Moment
          </Link>
          <Link href="/effects" className="btn btn-ghost text-sm">
            Recipe wall
          </Link>
          <Link
            href="/flow"
            className="btn btn-ghost text-sm text-white/50"
            title="Preview media wall — not a live Seedance job"
          >
            Flow · Preview
          </Link>
        </div>

        <section className="mt-10">
          <h2 className="mb-1 text-xs font-bold uppercase tracking-wider text-[var(--mint)]">
            Ready recipes · {liveWorkflows.length}
          </h2>
          <p className="mb-4 text-[11px] text-[var(--fg-dim)]">
            One tap opens Create with recipe + aspect (or batch mode) ready.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
            {liveWorkflows.map((app) => {
              const poster = posterForEffect(app.effect);
              return (
                <Link
                  key={app.id}
                  href={app.href}
                  className="group overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-[0_16px_40px_-28px_rgba(0,0,0,0.9)] transition duration-300 hover:-translate-y-1 hover:border-[var(--mint)]/40 hover:shadow-[0_20px_48px_-24px_rgba(200,255,61,0.12)]"
                >
                  <div className="relative aspect-[3/4] bg-black/50">
                    {poster ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={poster}
                        alt=""
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-3xl">
                        {app.emoji}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                    <span className="absolute left-2 top-2 rounded-full bg-[var(--mint)] px-1.5 py-0.5 text-[9px] font-black text-black">
                      READY
                    </span>
                    <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-[var(--mint)] px-2 py-0.5 text-[9px] font-black uppercase text-black opacity-0 transition group-hover:opacity-100">
                      Launch
                    </span>
                    <div className="absolute inset-x-0 bottom-0 p-3">
                      <p className="text-sm font-bold text-white group-hover:text-[var(--mint)]">
                        {app.emoji} {app.label}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-white/55">
                        {app.blurb}
                      </p>
                      {app.badge ? (
                        <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-white/35">
                          {app.badge}
                          {app.aspectRatio ? ` · ${app.aspectRatio}` : ""}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {extraLive.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[var(--mint)]">
              More prefilled · {extraLive.length}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {extraLive.map((app) => (
                <Link
                  key={app.id}
                  href={app.href}
                  className="card group flex gap-3 p-4 transition-transform hover:-translate-y-0.5"
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--grad-soft)] text-2xl">
                    {app.emoji}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold group-hover:text-[var(--mint)]">
                        {app.name}
                      </h3>
                      <span className="rounded-full bg-[var(--mint)]/15 px-1.5 py-0.5 text-[9px] font-bold text-[var(--mint)]">
                        PREFILLED
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--fg-muted)]">
                      {app.blurb}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {CATS.map((cat) => {
          const items = soon.filter((a) => a.category === cat.id);
          if (items.length === 0) return null;
          return (
            <section key={cat.id} id="soon" className="mt-10 scroll-mt-24">
              <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[var(--fg-dim)]">
                {cat.label} · soon
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((app) => (
                  <div
                    key={app.id}
                    className="card flex gap-3 p-4 opacity-60"
                    aria-disabled
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/5 text-2xl">
                      {app.emoji}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{app.name}</h3>
                        <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-[var(--fg-dim)]">
                          SOON
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--fg-muted)]">
                        {app.blurb}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        <section className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-7">
          <h2 className="text-sm font-bold text-white">Apps FAQ</h2>
          <p className="mt-1 text-xs text-white/40">
            LIVE vs SOON · Live gated · Modules · same Generate engine
          </p>
          <dl className="mt-4 space-y-4">
            {APPS_FAQ.map((f) => (
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
