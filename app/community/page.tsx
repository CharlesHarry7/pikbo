import type { Metadata } from "next";
import Link from "next/link";
import {
  buildVideoFeed,
  communityProjects,
  conceptRecipeCount,
  suiteRail,
} from "@/lib/videoFeed";
import { createRemixHref } from "@/lib/remixIntent";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { VideoTile } from "@/components/VideoTile";
import { VideoRail } from "@/components/VideoRail";
import { ProjectCard } from "@/components/ProjectCard";
import { site } from "@/lib/site";
import { listPublicCommunityPosts } from "@/lib/communityPosts";
import { isSafeDeliverableUrl } from "@/lib/createTrust";
import { CONCEPT_ROBOTS } from "@/lib/seoIndex";

export const metadata: Metadata = {
  title: "Explore toy video projects · Lab",
  description:
    "World-class designer-toy AIGC gallery: open Lab prototypes, inspect recipe + motion, remake with your figure. Real maker posts appear only when published — never fake UGC.",
  alternates: { canonical: "/community" },
  // 哥飞: Lab-only community — noindex (empty/false UGC hurts trust + crawl budget)
  robots: CONCEPT_ROBOTS,
  openGraph: {
    title: `Explore toy video projects | ${site.name}`,
    description:
      "Higgsfield-class project explore for designer toys — Lab demos you can remake, honest labels, no fake community counts.",
    url: `${site.url}/community`,
  },
};

/** Phase H: FAQ so /community is not a thin Lab wall (tool + proof + intent). */
const COMMUNITY_FAQ = [
  {
    q: "Is this real customer community content?",
    a: "Only when signed-in makers publish from Library. Until then Community shows PIKBO Lab only — cached Lab prototype demos. We never invent likes, fake accounts, or customer posts.",
  },
  {
    q: "How do I publish my clip?",
    a: "Generate a live paid/clean deliverable → open Library → Publish to Community (sign-in required). Lab demos and Free Mini raw provider files cannot be posted as public UGC (T6).",
  },
  {
    q: "What is Remix vs Inside?",
    a: "Remix opens Generate with that recipe on a toy photo you own. Inside shows a reference poster, cached output, settings, and the evidence status.",
  },
  {
    q: "Do Lab demos use Free Mini credits?",
    a: "Cached Lab playback costs 0 credits. Free Mini is for one live Seedance Mini clip (about 5s · 480p · on-player mark). After trial, Lab still free; live needs a plan.",
  },
] as const;

/** Lab always; real UGC only when rows exist (never fake posts). */
export default async function CommunityPage() {
  const projects = communityProjects();
  const suite = suiteRail();
  const wall = buildVideoFeed();
  const concepts = conceptRecipeCount();
  const ugc = await listPublicCommunityPosts(24);
  const realPosts = ugc.posts;

  // Phase H: ItemList of PIKBO Lab prototype project detail URLs only (no fake UGC).
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Pikbo Lab cached toy video prototypes",
    description:
      "Cached Lab prototype demonstrations with reference posters and distinct outputs — not community posts or verified provider runs.",
    numberOfItems: projects.length,
    itemListElement: projects.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.title,
      url: p.detailHref.startsWith("http")
        ? p.detailHref
        : `${site.url}${p.detailHref}`,
      description: p.look,
    })),
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: COMMUNITY_FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
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
      <div className="sticky top-0 z-20 border-b border-white/[0.07] bg-black/90 px-4 py-3.5 backdrop-blur-xl sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="section-label">
              {realPosts.length > 0
                ? `Community · ${realPosts.length} real posts + Lab`
                : "World-class toy AIGC · Lab projects"}
            </p>
            <h1 className="font-display text-lg font-black tracking-tight sm:text-xl">
              {realPosts.length > 0
                ? "Real maker clips + PIKBO Lab prototype demos"
                : "Explore inside every toy-video project"}
            </h1>
          </div>
          <div
            className="flex flex-wrap items-center gap-2"
            data-community-path="product-first"
          >
            <FreeTrialCta path="/community" variant="mint" />
            <Link
              href={createRemixHref("360-spin-showcase")}
              className="btn btn-ghost !px-3 !py-2 text-xs"
              data-community-generate="remix"
            >
              Generate
            </Link>
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
              href="/library"
              className="btn btn-ghost !px-3 !py-2 text-xs"
            >
              Library
            </Link>
            <Link
              href="/effects"
              className="btn btn-ghost !px-3 !py-2 text-xs"
            >
              Recipes
            </Link>
            <Link
              href="/flow"
              className="btn btn-ghost !px-3 !py-2 text-xs text-white/50"
              title="Preview media wall — not a live Seedance job"
            >
              Flow · Preview
            </Link>
            <Link
              href="/image"
              className="btn btn-ghost !px-3 !py-2 text-xs text-white/50"
              title="Optional stills preview"
            >
              Stills · Preview
            </Link>
          </div>
        </div>
        <p className="mt-1 text-[11px] text-[var(--fg-dim)]">
          {realPosts.length > 0
            ? "Real posts below are signed-in publishes. Lab cards stay cached prototypes — we never invent fake UGC."
            : "No real community posts yet — showing PIKBO Lab only. Sign in to publish from Library when UGC SQL is live."}{" "}
          <b className="font-semibold text-[var(--fg-muted)]">
            Remix = use recipe with your toy photo
          </b>
          ; Inside = input, settings, provenance.
        </p>
      </div>

      {realPosts.length > 0 ? (
        <section className="border-b border-[var(--border)] px-3 py-6 sm:px-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2 px-1">
            <div>
              <p className="section-label">Community · real makers</p>
              <h2 className="mt-1 text-xl font-bold tracking-tight">
                Published by signed-in users
              </h2>
              <p className="mt-1 text-xs text-[var(--fg-muted)]">
                No fake likes or invented accounts. Remake opens Generate with
                your own photo.
              </p>
            </div>
            <Link href="/login" className="text-xs font-bold text-[var(--mint)]">
              Sign in to publish →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {realPosts
              .filter((p) => isSafeDeliverableUrl(p.videoUrl))
              .map((p) => (
              <article
                key={p.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950"
              >
                <div className="aspect-[9/14] bg-black">
                  <video
                    className="h-full w-full object-cover"
                    src={p.videoUrl}
                    poster={
                      p.posterUrl && isSafeDeliverableUrl(p.posterUrl)
                        ? p.posterUrl
                        : undefined
                    }
                    muted
                    loop
                    playsInline
                    controls
                    preload="metadata"
                    aria-label={p.title}
                  />
                </div>
                <div className="p-3">
                  <p className="text-sm font-bold text-white">{p.title}</p>
                  {p.caption ? (
                    <p className="mt-1 line-clamp-2 text-xs text-white/50">
                      {p.caption}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link
                      href={
                        p.effectSlug
                          ? createRemixHref(p.effectSlug)
                          : createRemixHref("360-spin-showcase")
                      }
                      className="text-[11px] font-bold text-[var(--mint)]"
                    >
                      Remake →
                    </Link>
                    <span className="text-[10px] text-white/30">
                      {p.createdAt.slice(0, 10)}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="border-b border-white/[0.06] px-4 py-5 sm:px-6">
          <div className="overflow-hidden rounded-2xl border border-dashed border-[var(--mint)]/25 bg-gradient-to-br from-[var(--mint)]/[0.06] to-transparent">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
              <div className="max-w-xl">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--mint)]">
                  Community · waiting for real posts
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  No invented UGC — Lab cards below stay cached prototypes
                </p>
                <p className="mt-1 text-xs leading-relaxed text-white/50">
                  Validation path: browse cached prototypes → reuse a recipe →
                  save locally. Future eligible live accounts may publish from
                  Library after Supabase + migration{" "}
                  <code className="text-[10px] text-white/35">
                    community_ugc
                  </code>
                  . Until then this wall stays Lab-only.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/library" className="btn btn-primary !px-3 !py-2 text-xs">
                  Open Library
                </Link>
                <Link
                  href="/login?next=/library"
                  className="btn btn-ghost !px-3 !py-2 text-xs"
                >
                  Sign in
                </Link>
                <Link
                  href={createRemixHref("360-spin-showcase")}
                  className="btn btn-ghost !px-3 !py-2 text-xs"
                  data-community-empty-generate="remix"
                >
                  Generate
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="border-b border-[var(--border)] px-3 py-6 sm:px-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2 px-1">
          <div>
            <p className="section-label">Pikbo Lab · cached prototypes</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight">
              Start from a demonstrated look
            </h2>
            <p className="mt-1 text-xs text-[var(--fg-muted)]">
              Each card opens Studio with that recipe. We do not invent a video
              wall of shared loops for recipes without unique footage.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      </section>

      <VideoRail
        label="Product workflow references"
        title="Cached Lab prototype examples · no claimed customer activity"
        href="/apps"
        items={suite}
        wide
      />

      <section className="px-2 py-6 sm:px-4">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2 px-1">
          <div>
            <p className="section-label">PIKBO Lab prototype clips</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight">
              Unique demos · tap to configure
            </h2>
            <p className="mt-1 max-w-xl text-xs text-[var(--fg-muted)]">
              {wall.length} unique Lab clips shown.
              {concepts > 0
                ? ` ${concepts} more concept recipes (no unique footage yet) live on the full preset list.`
                : null}
            </p>
          </div>
          <Link
            href="/effects"
            className="text-xs font-semibold text-[var(--mint)] hover:underline"
          >
            All presets →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {wall.map((item) => (
            <VideoTile key={item.id} item={item} compact />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-3 pb-10 pt-4 sm:px-5">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-7">
          <h2 className="text-sm font-bold text-white">Community FAQ</h2>
          <p className="mt-1 text-xs text-white/40">
            Lab only · not UGC · Remix · Free Mini
          </p>
          <dl className="mt-4 space-y-4">
            {COMMUNITY_FAQ.map((f) => (
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
