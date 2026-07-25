import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { APPS } from "@/lib/catalog";
import { DEMO_VIDEOS } from "@/lib/demoVideos";
import { getPreset } from "@/lib/presets";
import {
  CONCEPT_ROBOTS,
  PREVIEW_ROBOTS,
  recipeHasUniqueProof,
} from "@/lib/seoIndex";
import { site } from "@/lib/site";
import { getWorkflow, WORKFLOWS, type Workflow } from "@/lib/workflows";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const fromApps = APPS.filter((a) => a.href.startsWith("/apps/")).map((a) => ({
    slug: a.id,
  }));
  const fromWorkflows = WORKFLOWS.map((w) => ({ slug: w.id }));
  const seen = new Set<string>();
  return [...fromWorkflows, ...fromApps].filter((p) => {
    if (seen.has(p.slug)) return false;
    seen.add(p.slug);
    return true;
  });
}

/**
 * Phase H: index only live workflow doors with unique Lab proof + FAQ body.
 * SOON / preview / open-door shells (photo-to-clip, toy-presets) stay noindex.
 */
function appDetailIndexable(workflow: Workflow | undefined): boolean {
  if (!workflow?.live) return false;
  if (!workflow.effect) return false;
  return recipeHasUniqueProof(workflow.effect);
}

function posterForEffect(effect?: string): string | null {
  if (!effect) return null;
  return DEMO_VIDEOS.find((d) => d.preset === effect)?.poster ?? null;
}

function demoForEffect(effect?: string) {
  if (!effect) return null;
  return DEMO_VIDEOS.find((d) => d.preset === effect) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const workflow = getWorkflow(slug);
  const app = APPS.find((a) => a.id === slug);
  if (!workflow && !app) {
    return { title: "App not found", robots: PREVIEW_ROBOTS };
  }
  const title = workflow?.label ?? app?.name ?? "App";
  const blurb =
    workflow?.blurb ??
    app?.blurb ??
    "Toy-native workflow that opens Generate with a prefilled recipe.";
  const indexable = appDetailIndexable(workflow);
  return {
    title: `${title} · Toy workflow`,
    description: `${blurb} One owned toy photo → short Seedance clip. Free Mini limits apply; Lab demos cost 0 credits.`,
    alternates: { canonical: `/apps/${slug}` },
    robots: indexable ? undefined : CONCEPT_ROBOTS,
    openGraph: {
      title: `${title} | ${site.name}`,
      description: blurb,
      url: `${site.url}/apps/${slug}`,
      images: posterForEffect(workflow?.effect)
        ? [{ url: posterForEffect(workflow?.effect)! }]
        : undefined,
    },
  };
}

const APP_DETAIL_FAQ = [
  {
    q: "Is this a separate video engine?",
    a: "No. App doors open the same Seedance Generate workbench with a prefilled recipe and aspect. Not a multi-model zoo.",
  },
  {
    q: "Does launching cost Free Mini credits?",
    a: "Opening the door is free. Cached Lab samples cost 0 credits. A live Mini job uses your Free trial or paid credits (about 5s · 480p · on-player mark on Free).",
  },
  {
    q: "Is the poster my final video?",
    a: "No. Posters are official Lab style demos only. Your upload is never those stills. Review live output before listing or social posts.",
  },
  {
    q: "Can Free Mini raw files be downloaded?",
    a: "Free live raw provider URLs stay gated until server watermark bake (T6). Lab cached demos and paid clean deliverables remain downloadable when the download gate allows.",
  },
] as const;

export default async function AppDetailPage({ params }: Props) {
  const { slug } = await params;
  const workflow = getWorkflow(slug);
  const app = APPS.find((a) => a.id === slug);
  if (!workflow && !app) notFound();

  const emoji = workflow?.emoji ?? app?.emoji ?? "🧸";
  const name = workflow?.label ?? app?.name ?? "App";
  const blurb = workflow?.blurb ?? app?.blurb ?? "";
  const href = workflow?.href ?? app?.href ?? "/create";
  const live = workflow?.live ?? app?.live ?? false;
  const indexable = appDetailIndexable(workflow);
  const effect = workflow?.effect;
  const preset = effect ? getPreset(effect) : undefined;
  const demo = demoForEffect(effect);
  const poster = posterForEffect(effect);

  const faqLd = indexable
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: APP_DETAIL_FAQ.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: f.a,
          },
        })),
      }
    : null;

  return (
    <div className="px-4 py-12 sm:px-8 sm:py-16">
      {faqLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      ) : null}
      <div className="mx-auto max-w-lg text-center">
        {poster ? (
          <div className="relative mx-auto mb-5 aspect-[3/4] w-40 overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_20px_48px_-24px_rgba(0,0,0,0.9)] sm:w-48">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={poster}
              alt=""
              className="h-full w-full object-cover"
              loading="eager"
            />
            <span className="absolute left-2 top-2 rounded-full border border-white/15 bg-black/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/80 backdrop-blur">
              Lab demo
            </span>
          </div>
        ) : (
          <span className="text-5xl">{emoji}</span>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
          {live ? (
            <span className="rounded-full bg-[var(--mint)]/15 px-2 py-0.5 text-[10px] font-bold text-[var(--mint)]">
              LIVE
            </span>
          ) : (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-[var(--fg-dim)]">
              SOON
            </span>
          )}
          {workflow?.badge && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/55">
              {workflow.badge}
            </span>
          )}
          {!indexable ? (
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/40">
              noindex · thin door
            </span>
          ) : null}
        </div>
        <p className="mt-3 text-sm leading-relaxed text-[var(--fg-muted)]">
          {blurb}
        </p>
        {workflow && (
          <ul className="mx-auto mt-6 max-w-sm space-y-2 text-left text-xs text-[var(--fg-muted)]">
            <li className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
              <span className="font-semibold text-white/80">Input · </span>
              One photo of a toy you own
            </li>
            <li className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
              <span className="font-semibold text-white/80">Engine · </span>
              Seedance image-to-video (same as Generate)
            </li>
            {effect && (
              <li className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                <span className="font-semibold text-white/80">Recipe · </span>
                {preset?.name ?? effect}
                {workflow.aspectRatio ? ` · ${workflow.aspectRatio}` : ""}
              </li>
            )}
            <li className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
              <span className="font-semibold text-white/80">Output · </span>
              Short product clip for listing or social
            </li>
            {demo ? (
              <li className="rounded-xl border border-[var(--mint)]/25 bg-[var(--mint)]/[0.06] px-3 py-2">
                <span className="font-semibold text-[var(--mint)]">
                  Lab proof ·{" "}
                </span>
                Official cached demo ({demo.character}) — not your upload
              </li>
            ) : null}
          </ul>
        )}
        {!workflow && (
          <p className="mt-4 text-xs text-[var(--fg-dim)]">
            Catalog entry for suite parity. Core live path is Photo → Clip
            (Seedance).
          </p>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={href} className="btn btn-primary text-sm">
            {live ? "Launch workflow" : "Open Generate"}
          </Link>
          <FreeTrialCta
            path={`/apps/${slug}`}
            variant="ghost"
            labelTry="Try free · Lab"
            hideClipsChip
          />
          {effect && recipeHasUniqueProof(effect) ? (
            <Link
              href={`/effects/${encodeURIComponent(effect)}`}
              className="btn btn-ghost text-sm"
            >
              Recipe page
            </Link>
          ) : null}
          <Link href="/apps" className="btn btn-ghost text-sm">
            All apps
          </Link>
        </div>

        {indexable ? (
          <section className="mx-auto mt-10 max-w-md text-left">
            <h2 className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--mint)]">
              Workflow FAQ
            </h2>
            <dl className="mt-3 space-y-3">
              {APP_DETAIL_FAQ.map((f) => (
                <div
                  key={f.q}
                  className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5"
                >
                  <dt className="text-xs font-bold text-white/90">{f.q}</dt>
                  <dd className="mt-1 text-[11px] leading-relaxed text-white/50">
                    {f.a}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-center text-[10px] leading-relaxed text-white/35">
              Hub with full shelf + ItemList:{" "}
              <Link href="/apps" className="text-[var(--mint)] hover:underline">
                /apps
              </Link>
              . Modules wall:{" "}
              <Link
                href="/modules"
                className="text-[var(--mint)] hover:underline"
              >
                /modules
              </Link>
              .
            </p>
          </section>
        ) : (
          <p className="mx-auto mt-8 max-w-sm text-[11px] leading-relaxed text-white/40">
            {live
              ? "Open-door shell — use Launch to Create. Search indexes the /apps hub and proof-backed recipe landings, not thin intermediate doors."
              : "Preview / SOON card — not a live Seedance job. Prefer Listing Spin, Seller Pack, or Photo → Clip."}
          </p>
        )}
      </div>
    </div>
  );
}
