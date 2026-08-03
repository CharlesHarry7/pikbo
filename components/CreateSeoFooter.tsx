import Link from "next/link";
import { getPreset, PRESETS } from "@/lib/presets";
import { USE_CASES } from "@/lib/usecases";
import { GUIDES } from "@/lib/guides";

/**
 * 哥飞 V2：Generate 页下方 SSR 文案 + 内链
 * CreateStudio 是客户端工具；此块给爬虫补正文与站内链接。
 */
export function CreateSeoFooter({ effectSlug }: { effectSlug?: string }) {
  const preset = effectSlug ? getPreset(effectSlug) : undefined;
  const h1 = preset?.h1 ?? "Designer toy AI video maker";
  const intro =
    preset?.intro ??
    "Turn one photo of a figure or blind box you own into a listing or social clip — spin, unbox, float, and more.";
  const body = preset?.body ?? [
    "Upload a photo of a toy you own and pick a recipe. Free path: one Mini trial with an on-player mark when live is on; otherwise you get a labeled cached demo that does not animate your upload.",
    "Use clips for Etsy, TikTok Shop, Whatnot, shelf flexes, and drop-day posts — without a camera rig.",
  ];
  const keywords = preset?.keywords ?? [
    "designer toy video maker",
    "figure spin video",
    "blind box video from photo",
  ];

  const relatedEffects = PRESETS.filter((p) => p.slug !== effectSlug).slice(
    0,
    6
  );
  const forLinks = USE_CASES.slice(0, 5);
  const guides = GUIDES.slice(0, 3);

  return (
    <div
      className="border-t border-white/10 bg-[#0A0A0A] text-[#F7F4ED]"
      data-create-seo-footer="collapsed-default"
    >
      {/*
        HF product rule: Generate is the app. SEO copy stays crawlable but
        collapsed so the studio does not feel like a marketing blog.
      */}
      <details className="group container-x py-6">
        <summary className="cursor-pointer list-none text-sm font-bold text-white/55 marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 transition group-open:border-[#c8ff3d]/40 group-open:text-[#c8ff3d]">
            Guides · effects · seller paths
            <span className="text-[10px] font-black uppercase tracking-wider text-white/35 group-open:hidden">
              expand
            </span>
            <span className="hidden text-[10px] font-black uppercase tracking-wider text-white/35 group-open:inline">
              collapse
            </span>
          </span>
        </summary>
        <section className="pb-10 pt-8">
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

        <div className="mt-12 grid gap-10 md:grid-cols-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/40">
              Effects
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {relatedEffects.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/effects/${p.slug}`}
                    className="text-[var(--fg-muted)] hover:text-[var(--mint)]"
                  >
                    {p.emoji} {p.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/effects" className="text-[var(--mint)]">
                  All effects →
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--fg-dim)]">
              For sellers
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {forLinks.map((u) => (
                <li key={u.slug}>
                  <Link
                    href={`/for/${u.slug}`}
                    className="text-[var(--fg-muted)] hover:text-[var(--mint)]"
                  >
                    {u.emoji} {u.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--fg-dim)]">
              Guides
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {guides.map((g) => (
                <li key={g.slug}>
                  <Link
                    href={`/guides/${g.slug}`}
                    className="text-[var(--fg-muted)] hover:text-[var(--mint)]"
                  >
                    {g.emoji} {g.title}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/guides" className="text-[var(--mint)]">
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
