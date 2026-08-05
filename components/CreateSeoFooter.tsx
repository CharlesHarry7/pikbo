import Link from "next/link";
import { getPreset, PRESETS } from "@/lib/presets";
import { USE_CASES } from "@/lib/usecases";
import { GUIDES } from "@/lib/guides";
import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";

/**
 * SSR crawlable copy + internal links under Create.
 * Always collapsed by default so the Studio / Moment path stays primary on
 * mobile (HF product rule: the app is the product; SEO is secondary).
 */
export function CreateSeoFooter({ effectSlug }: { effectSlug?: string }) {
  const preset = effectSlug ? getPreset(effectSlug) : undefined;
  const h1 = preset?.h1 ?? "Street Power-Up · private toy Moment";
  const intro =
    preset?.intro ??
    "Turn one owned designer-toy photo into one private 9:16, 5-second Street Power-Up clip — then recover it from Library.";
  const body = preset?.body ?? [
    "Create is the Studio path: upload a photo you own, confirm rights, then run the fixed Moment contract when private beta is enabled.",
    "Guides and recipe links stay here for crawlability and discovery — they never compete with the primary upload → generate path on mobile.",
  ];
  const keywords = preset?.keywords ?? [
    "designer toy video",
    "figure spin clip",
    "blind box listing video",
  ];

  const relatedEffects = PRESETS.filter((p) => p.slug !== effectSlug).slice(
    0,
    6
  );
  const forLinks = USE_CASES.slice(0, 5);
  const guides = GUIDES.slice(0, 3);

  return (
    <div
      className="border-t border-white/10 bg-[var(--void)] text-[var(--cream)]"
      data-create-seo-footer="collapsed-default"
    >
      {/*
        HF product rule: Create is the app. SEO copy stays in the DOM for
        crawlers/follow links but is collapsed so mobile Studio is obvious.
      */}
      <details className="group container-x py-4 sm:py-5">
        <summary className="cursor-pointer list-none text-sm font-bold text-white/50 marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/12 px-3.5 py-1.5 transition group-open:border-[#FF4ECD]/40 group-open:text-[#FF4ECD]">
            <span className="truncate">Guides · recipes · seller paths</span>
            <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-white/30 group-open:hidden">
              expand
            </span>
            <span className="hidden shrink-0 text-[10px] font-black uppercase tracking-wider text-white/30 group-open:inline">
              collapse
            </span>
          </span>
        </summary>
        <section className="pb-10 pt-7" data-create-seo-footer-body>
          <h2 className="text-2xl font-bold text-white">{h1}</h2>
          <p className="mt-3 max-w-2xl text-white/55">{intro}</p>
          <div className="mt-6 max-w-2xl space-y-4 text-sm leading-relaxed text-white/45">
            {body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {keywords.map((k) => (
              <span key={k} className="chip">
                {k}
              </span>
            ))}
          </div>

          <p className="mt-8 text-sm">
            <Link
              href={`${MOMENT_CREATE_HREF}&source=create-seo-footer`}
              className="font-bold text-[#FF4ECD] hover:text-[#ff7adf]"
              data-create-seo-primary="studio"
            >
              Back to Studio · Street Power-Up →
            </Link>
          </p>

          <div className="mt-10 grid gap-10 md:grid-cols-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white/40">
                Recipes
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                {relatedEffects.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={`/effects/${p.slug}`}
                      className="text-white/50 hover:text-[#FF4ECD]"
                    >
                      {p.emoji} {p.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/effects" className="text-[#FF4ECD]">
                    All recipes →
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white/40">
                For sellers
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                {forLinks.map((u) => (
                  <li key={u.slug}>
                    <Link
                      href={`/for/${u.slug}`}
                      className="text-white/50 hover:text-[#FF4ECD]"
                    >
                      {u.emoji} {u.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white/40">
                Guides
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                {guides.map((g) => (
                  <li key={g.slug}>
                    <Link
                      href={`/guides/${g.slug}`}
                      className="text-white/50 hover:text-[#FF4ECD]"
                    >
                      {g.emoji} {g.title}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/guides" className="text-[#FF4ECD]">
                    All guides →
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </details>
    </div>
  );
}
