import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getShowcaseProject,
  listShowcaseProjectSlugs,
  showcaseProvenanceLabel,
  showcaseRecipeHref,
} from "@/lib/showcaseProjects";
import { getPreset } from "@/lib/presets";
import { CREDITS_PER_VIDEO } from "@/lib/pricing";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { ProjectOpenBeacon } from "@/components/ProjectOpenBeacon";
import { CONCEPT_ROBOTS } from "@/lib/seoIndex";
import {
  isPromotedShowcaseProvenance,
  showcaseEvidenceChecklist,
} from "@/lib/showcaseEvidence";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return listShowcaseProjectSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = getShowcaseProject(slug);
  if (!project) {
    return {
      title: "Project not found",
      robots: { index: false, follow: false },
    };
  }
  return {
    title: `${project.title} · Inside the project`,
    description: `${project.result} Inspect the reference poster, cached prototype, recipe, and missing evidence record.`,
    alternates: { canonical: `/projects/${project.slug}` },
    // Phase H cold-start: proof pages stay reachable but out of the 9-URL index budget.
    robots: CONCEPT_ROBOTS,
    openGraph: {
      title: `${project.title} · PIKBO Lab`,
      description: project.result,
      images: [{ url: project.poster }],
    },
  };
}

export default async function ShowcaseProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = getShowcaseProject(slug);
  if (!project) notFound();

  const preset = getPreset(project.recipeSlug);
  const provenance = showcaseProvenanceLabel(project);
  const evidenceChecklist = showcaseEvidenceChecklist(project.evidence);
  const evidenceComplete = evidenceChecklist.every((item) => item.complete);
  const promoted = isPromotedShowcaseProvenance(project.provenance);
  const verifiedSource = promoted
    ? project.evidence!.source.inputAssetPath
    : project.referencePoster;

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-8 sm:py-12">
      <ProjectOpenBeacon slug={project.slug} recipe={project.recipeSlug} />
      <div className="mx-auto max-w-7xl">
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex flex-wrap items-center gap-2 text-[11px] text-white/45"
          data-project-path="product-first"
        >
          <Link href="/" className="hover:text-white">
            Home
          </Link>
          <span aria-hidden>/</span>
          <Link href="/explore" className="hover:text-white">
            Explore
          </Link>
          <span aria-hidden>/</span>
          <span className="text-white/70">{project.title}</span>
        </nav>

        <header className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-neon-pink px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-void shadow-[0_0_20px_rgba(255,78,205,0.25)]">
                Inside project
              </span>
              <span className="rounded-full border border-white/15 bg-white/[0.05] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/70">
                {provenance}
              </span>
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/45">
                {project.aspectRatio} · {project.durationSeconds}s
              </span>
            </div>
            <h1 className="font-display mt-4 max-w-3xl text-3xl font-black uppercase leading-[1.02] tracking-tight sm:text-5xl">
              {project.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55 sm:text-base">
              {project.result}
            </p>
          </div>
          <div
            className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[16rem]"
            data-project-cta="product-first"
          >
            <Link
              href={showcaseRecipeHref(project)}
              className="inline-flex w-full items-center justify-center rounded-full bg-neon-pink px-7 py-3.5 text-sm font-black text-void shadow-[0_0_40px_rgba(255,78,205,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_0_48px_rgba(255,78,205,0.35)]"
            >
              Use this recipe →
            </Link>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
              <Link
                href="/create?effect=street-power-up"
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/[0.03] px-4 py-2 text-[11px] font-bold text-white/80 transition hover:border-neon-pink/40 hover:text-neon-pink"
              >
                Create one Moment
              </Link>
              <Link
                href="/modules"
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/[0.03] px-4 py-2 text-[11px] font-bold text-white/80 transition hover:border-neon-pink/40 hover:text-neon-pink"
              >
                Modules
              </Link>
              <Link
                href="/library"
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/[0.03] px-4 py-2 text-[11px] font-bold text-white/80 transition hover:border-neon-pink/40 hover:text-neon-pink"
              >
                Library
              </Link>
              <FreeTrialCta
                path={`/projects/${project.slug}`}
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/[0.03] px-4 py-2 text-[11px] font-bold text-white/80 transition hover:border-neon-pink/40 hover:text-neon-pink"
              />
            </div>
          </div>
        </header>

        <section
          aria-label={
            promoted
              ? "Verified source input and generated output"
              : "Reference poster and cached prototype"
          }
          className="grid gap-3 lg:grid-cols-2"
        >
          <article className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_20px_50px_-30px_rgba(0,0,0,0.9)]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-white/40">
                  {promoted ? "Source input" : "Reference poster"}
                </p>
                <h2 className="text-sm font-bold">
                  {promoted
                    ? "Matched to the evidence record"
                    : "Not a verified provider input"}
                </h2>
              </div>
              <span className="text-[10px] text-white/35">
                {project.character}
              </span>
            </div>
            <div className="media-stage m-3 grid min-h-[320px] place-items-center p-3 sm:min-h-[480px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={verifiedSource}
                alt={
                  promoted
                    ? `Verified source input for ${project.title}`
                    : `Reference poster for ${project.title}`
                }
                className="relative z-[2] max-h-[64vh] w-full rounded-xl object-contain"
              />
            </div>
          </article>

          <article className="overflow-hidden rounded-2xl border border-neon-pink/30 bg-white/[0.03] shadow-[0_20px_50px_-28px_rgba(255,78,205,0.12)]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-neon-pink">
                  {promoted ? "Verified output" : "Cached prototype"}
                </p>
                <h2 className="text-sm font-bold">{provenance}</h2>
              </div>
              <span className="text-[10px] text-white/35">
                {project.durationSeconds}s · {project.aspectRatio}
              </span>
            </div>
            <div className="media-stage m-3 grid min-h-[320px] place-items-center p-3 sm:min-h-[480px]">
              <video
                className="relative z-[2] max-h-[64vh] w-full rounded-xl object-contain"
                poster={project.poster}
                controls
                playsInline
                muted
                loop
                preload="metadata"
              >
                {project.outputWebm ? (
                  <source src={project.outputWebm} type="video/webm" />
                ) : null}
                <source src={project.outputVideo} type="video/mp4" />
              </video>
            </div>
          </article>
        </section>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-[10px] font-black uppercase tracking-wider text-neon-pink">
              Recipe record
            </p>
            <dl className="mt-4 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-white/35">
                  Recipe
                </dt>
                <dd className="mt-1 font-semibold">
                  {preset?.name ?? project.recipeSlug}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-white/35">
                  Provenance
                </dt>
                <dd className="mt-1 font-semibold text-neon-pink">
                  {provenance}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-white/35">
                  Model
                </dt>
                <dd className="mt-1 font-semibold">{project.model}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-white/35">
                  Format
                </dt>
                <dd className="mt-1 font-semibold">
                  {project.aspectRatio} · {project.durationSeconds}s ·{" "}
                  {project.resolution}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[10px] uppercase tracking-wide text-white/35">
                  Prompt summary
                </dt>
                <dd className="mt-1 leading-relaxed text-white/70">
                  {project.promptSummary}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[10px] uppercase tracking-wide text-white/35">
                  Negative constraints
                </dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {project.negativeConstraints.map((constraint) => (
                    <span
                      key={constraint}
                      className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[11px] text-white/60"
                    >
                      {constraint}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
            <p className="mt-5 border-t border-white/10 pt-4 text-[11px] leading-relaxed text-white/40">
              {promoted ? (
                <>
                  Evidence record complete. The registered source, provider run,
                  output assets, and named review all match this project.
                </>
              ) : (
                <>
                  Evidence record: {project.sourceRecord}. The repository does
                  not link this poster and clip through a provider task ID, so
                  this page does not claim an input-to-output transformation or
                  formal QA. Cached playback costs 0 credits and did not process
                  your current upload. When live generation is enabled for an
                  eligible account, the current configured quote is{" "}
                  {CREDITS_PER_VIDEO} credits.
                </>
              )}
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-neon-pink">
                Evidence checklist
              </p>
              <span
                className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${
                  promoted && evidenceComplete
                    ? "border-neon-pink/35 bg-neon-pink/10 text-neon-pink"
                    : "border-white/10 bg-white/[0.04] text-white/45"
                }`}
              >
                {promoted && evidenceComplete
                  ? "Verified"
                  : evidenceComplete
                    ? "Ready for promotion"
                    : "Promotion locked"}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {evidenceChecklist.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[10px] font-semibold ${
                    item.complete
                      ? "border-neon-pink/25 bg-neon-pink/[0.06] text-white/75"
                      : "border-white/[0.07] bg-black/20 text-white/35"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] ${
                      item.complete
                        ? "bg-neon-pink text-void"
                        : "border border-white/15 text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  {item.label}
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-white/35">
              {promoted && evidenceComplete
                ? "Rights, provider run, source, output, and named review records are complete."
                : evidenceComplete
                  ? "Evidence is complete, but this project remains a prototype until provenance is explicitly promoted."
                : "This cached prototype stays unscored and unverified until every record is attached."}
            </p>

            <div className="mt-6 grid gap-2" data-project-footer="product-first">
              <Link
                href={showcaseRecipeHref(project)}
                className="rounded-full bg-neon-pink px-5 py-3 text-center text-sm font-black text-void shadow-[0_0_28px_rgba(255,78,205,0.2)] transition hover:-translate-y-0.5"
              >
                Use this recipe →
              </Link>
              <Link
                href={`/effects/${project.recipeSlug}`}
                className="rounded-full border border-white/15 bg-white/[0.03] px-5 py-3 text-center text-sm font-bold text-white transition hover:border-neon-pink/40"
              >
                Read recipe requirements
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/create?effect=street-power-up"
                  className="rounded-full border border-white/12 px-3 py-2 text-center text-[11px] font-semibold text-white/55 hover:text-white"
                >
                  Create one Moment
                </Link>
                <Link
                  href="/explore"
                  className="rounded-full border border-white/12 px-3 py-2 text-center text-[11px] font-semibold text-white/55 hover:text-white"
                >
                  More projects
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
