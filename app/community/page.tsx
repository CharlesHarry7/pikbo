import type { Metadata } from "next";
import Link from "next/link";
import {
  buildVideoFeed,
  communityProjects,
  conceptRecipeCount,
  suiteRail,
} from "@/lib/videoFeed";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { VideoTile } from "@/components/VideoTile";
import { VideoRail } from "@/components/VideoRail";
import { ProjectCard } from "@/components/ProjectCard";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Official AI Toy Video Examples",
  description:
    "Browse official cached Pikbo examples and toy-video recipes. These are product demonstrations, not customer posts or claimed community activity.",
  alternates: { canonical: "/community" },
  openGraph: {
    title: `Official AI Toy Video Examples | ${site.name}`,
    description:
      "PIKBO Lab cached demos — owned inputs, distinct outputs, honest official-example labels. Not customer UGC.",
    url: `${site.url}/community`,
  },
};

/** PIKBO Lab: unique official demos only — no shared-loop density wall (G2/G3). */
export default function CommunityPage() {
  const projects = communityProjects();
  const suite = suiteRail();
  const wall = buildVideoFeed();
  const concepts = conceptRecipeCount();

  // Phase H: ItemList of official Lab project detail URLs only (no fake UGC).
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Pikbo Lab official toy video examples",
    description:
      "Official cached demonstrations with owned inputs and distinct outputs — not community posts.",
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

  return (
    <div className="pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />
      <div className="sticky top-0 z-20 border-b border-white/[0.07] bg-black/90 px-4 py-3.5 backdrop-blur-xl sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="section-label">Official examples · Lab only</p>
            <h1 className="font-display text-lg font-black tracking-tight sm:text-xl">
              See what each toy-video recipe is designed to make
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FreeTrialCta path="/community" variant="mint" />
            <Link href="/create" className="btn btn-ghost !px-3 !py-2 text-xs">
              Generate
            </Link>
            <Link href="/flow" className="btn btn-ghost !px-3 !py-2 text-xs">
              Flow
            </Link>
            <Link
              href="/modules"
              className="btn btn-ghost !px-3 !py-2 text-xs"
            >
              Modules
            </Link>
            <Link
              href="/create?mode=seller-pack"
              className="btn btn-ghost !px-3 !py-2 text-xs"
            >
              Seller Pack
            </Link>
            <Link href="/image" className="btn btn-ghost !px-3 !py-2 text-xs">
              Stills
            </Link>
            <Link
              href="/effects"
              className="btn btn-ghost !px-3 !py-2 text-xs"
            >
              All presets
            </Link>
          </div>
        </div>
        <p className="mt-1 text-[11px] text-[var(--fg-dim)]">
          Official product demos only — not customer posts.{" "}
          <b className="font-semibold text-[var(--fg-muted)]">
            Remix = use recipe with your toy photo
          </b>
          ; Inside = input, settings, provenance.
        </p>
      </div>

      <section className="border-b border-[var(--border)] px-3 py-6 sm:px-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2 px-1">
          <div>
            <p className="section-label">Pikbo Lab · official examples</p>
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
        title="Official cached examples · no claimed customer activity"
        href="/apps"
        items={suite}
        wide
      />

      <section className="px-2 py-6 sm:px-4">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2 px-1">
          <div>
            <p className="section-label">Official Lab clips</p>
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
    </div>
  );
}
