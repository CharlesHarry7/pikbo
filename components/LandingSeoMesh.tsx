import Link from "next/link";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { USE_CASES } from "@/lib/usecases";
import { TOOLS } from "@/lib/tools";
import { GUIDES } from "@/lib/guides";
import { createGenerate360Href } from "@/lib/jobIntents";
import { recipeHasUniqueProof } from "@/lib/seoIndex";

/** Landing mesh Open Generate — listing spin remix (ratio/duration/channel). */
const SEO_MESH_GENERATE_HREF = createGenerate360Href("seo-mesh");

/**
 * 哥飞内链网：落地页底部相关 Tools / For / Guides（可爬、可点进工具）。
 */
export function LandingSeoMesh({
  kind,
  currentSlug,
  effectSlugs = [],
}: {
  kind: "for" | "tools" | "guides" | "effects";
  currentSlug: string;
  /** Prefer related items that share these recipes */
  effectSlugs?: string[];
}) {
  const effects = new Set(effectSlugs.filter(Boolean));

  const relatedFor = USE_CASES.filter((u) => {
    if (kind === "for" && u.slug === currentSlug) return false;
    if (!effects.size) return true;
    return u.recommendedEffects.some((e) => effects.has(e));
  }).slice(0, 6);

  const relatedTools = TOOLS.filter((t) => {
    if (kind === "tools" && t.slug === currentSlug) return false;
    if (!effects.size) return recipeHasUniqueProof(t.primaryEffect);
    return (
      effects.has(t.primaryEffect) || t.effects.some((e) => effects.has(e))
    );
  }).slice(0, 6);

  const relatedGuides = GUIDES.filter((g) => {
    if (kind === "guides" && g.slug === currentSlug) return false;
    if (!effects.size) return true;
    return g.relatedEffects.some((e) => effects.has(e));
  }).slice(0, 5);

  return (
    <section className="container-x border-t border-white/[0.06] py-10">
      <h2 className="text-2xl font-bold">Related pages</h2>
      <p className="mt-2 max-w-2xl text-sm text-[var(--fg-muted)]">
        Same Generate loop — different search jobs. Each page keeps its own TDH
        and on-page tool where applicable.
      </p>

      {relatedFor.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--mint)]/80">
            Use cases
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {relatedFor.map((u) => (
              <Link key={u.slug} href={`/for/${u.slug}`} className="chip">
                {u.emoji} {u.label}
              </Link>
            ))}
            <Link href="/for" className="chip">
              All use cases →
            </Link>
          </div>
        </div>
      )}

      {relatedTools.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--mint)]/80">
            Tools
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {relatedTools.map((t) => (
              <Link key={t.slug} href={`/tools/${t.slug}`} className="chip">
                {t.emoji} {t.label}
              </Link>
            ))}
            <Link href="/tools" className="chip">
              All tools →
            </Link>
          </div>
        </div>
      )}

      {relatedGuides.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--mint)]/80">
            Guides
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {relatedGuides.map((g) => (
              <Link key={g.slug} href={`/guides/${g.slug}`} className="chip">
                {g.emoji} {g.title.length > 42 ? `${g.title.slice(0, 40)}…` : g.title}
              </Link>
            ))}
            <Link href="/guides" className="chip">
              All guides →
            </Link>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <FreeTrialCta
          path={`/${kind}/${currentSlug}`}
          variant="mint"
          labelTry="Try free Mini"
        />
        <Link
          href={SEO_MESH_GENERATE_HREF}
          className="btn btn-ghost text-sm"
          data-seo-mesh-generate="remix"
        >
          Open Generate
        </Link>
      </div>
    </section>
  );
}
