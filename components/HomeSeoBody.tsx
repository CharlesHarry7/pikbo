import Link from "next/link";
import { site } from "@/lib/site";
import { createRemixHref } from "@/lib/remixIntent";

/** Default listing recipe for SEO body Generate doors. */
const SEO_BODY_GENERATE_HREF = createRemixHref("360-spin-showcase");

/**
 * 哥飞：首页正文厚度 + 品牌场景；主词完整词组克制使用。
 * 必须有一条清晰内链 → /tools/ai-toy-video-generator（权重输送）。
 * SSR 纯文案；不替代上方 on-page 工具。
 */
const FAQ = [
  {
    q: "What does Pikbo do on this homepage?",
    a: "Pikbo turns a still photo of a designer toy, figure, or blind-box collectible into a short motion clip. Use the tool above on this page, or open the dedicated rank page when you need the full keyword-focused guide.",
  },
  {
    q: "Can I turn a photo into short video without filming?",
    a: "Yes. Upload a clear product photo you own and pick a recipe such as 360° spin or floating hero. Public validation shows a cached prototype first; eligible Live accounts receive an exact quote before submission.",
  },
  {
    q: "Is the homepage tool the same as /create?",
    a: "Yes. The upload → generate block on this page is a real generate path, not a teaser. /create is the full studio when you want more recipes, Seller Starter Pack, or library tools.",
  },
  {
    q: "Do Lab demos use my photo?",
    a: "No. Homepage Lab samples are cached prototypes and never process your upload. Your photo is only sent after the server confirms an eligible Live submission.",
  },
  {
    q: "Where is the main keyword page for AI toy video?",
    a: `The ranking-focused page is ${site.rankToolPath} — Title, H1, and body aligned to the primary search query. This homepage stays brand + suite with an embedded tool.`,
  },
] as const;

export function HomeSeoBody() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <section className="border-t border-white/10 bg-black px-4 py-14 text-white sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <div className="mx-auto max-w-3xl space-y-10 text-[15px] leading-relaxed text-white/70">
        <div>
          <h2 className="font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
            Why generate toy video from one photo on this page
          </h2>
          <p className="mt-4">
            {site.name} is a{" "}
            <strong className="text-white/90">designer-toy AI video suite</strong>
            : collectors and sellers who already have product photos can{" "}
            <strong className="text-white/90">
              turn that photo into short video
            </strong>{" "}
            for listings, TikTok, and drops. You do not need a turntable, a studio
            crew, or a multi-model zoo. Cached Lab prototypes show the workflow;
            the Generate workbench checks Live eligibility before any provider call.
          </p>
          <p className="mt-3">
            For the full head-term guide and On Page battlefield, use our{" "}
            <Link
              href={site.rankToolPath}
              className="font-semibold text-[var(--mint)] hover:underline"
            >
              AI toy video generator tool page
            </Link>
            . This homepage embeds the same photo-to-video control for people who
            arrive by brand: upload, confirm rights, choose a recipe, and review
            the exact mode and quote. Lab wall demos stay labeled cached
            prototypes—not fake customer UGC.
          </p>
          <nav
            aria-label="Long-tail toy video jobs"
            className="mt-5 flex flex-wrap gap-2"
            data-home-seo-mesh="long-tail"
          >
            {(
              [
                ["/tools/figure-360-product-video", "AI figure 360 video"],
                ["/tools/blind-box-reveal-video-maker", "Blind box AI video"],
                ["/tools/one-photo-product-video", "One photo toy video AI"],
                ["/tools/ai-product-video-generator-for-toys", "Toy product video AI"],
                ["/for/action-figure-product-videos", "Action figure AI video"],
                [
                  "/guides/designer-toy-ai-video-vs-generic-tools",
                  "Why toy-vertical",
                ],
                [
                  "/guides/toy-unboxing-video-from-one-photo",
                  "Unboxing video from one photo",
                ],
              ] as const
            ).map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="rounded-full border border-white/12 bg-white/[0.03] px-2.5 py-1 text-[11px] font-semibold text-white/55 transition hover:border-[var(--mint)]/40 hover:text-[var(--mint)]"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div>
          <h2 className="font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
            How photo-to-video works for designer toys
          </h2>
          <p className="mt-4">
            People often type “photo into short video” or “animate designer
            toys.” For figures the quality bar is different from face-swap
            filters: paint apps, sculpt edges, and packaging logos must stay
            recognizable. Pikbo keeps the still as the visual reference, then
            applies a toy-native recipe—spin for marketplaces, float for launch
            teasers, unbox energy for short-form hooks.
          </p>
          <ol className="mt-4 list-decimal space-y-2 pl-5">
            <li>
              <strong className="text-white/90">
                Shoot or choose one owned still
              </strong>
              — plain background, full figure, sharp focus.
            </li>
            <li>
              <strong className="text-white/90">Use the tool above</strong>—or
              open{" "}
              <Link
                href={SEO_BODY_GENERATE_HREF}
                className="text-[var(--mint)] hover:underline"
                data-home-seo="generate-remix"
              >
                full Generate
              </Link>{" "}
              for more recipes. Deep keyword write-up:{" "}
              <Link
                href={site.rankToolPath}
                className="text-[var(--mint)] hover:underline"
              >
                {site.rankToolPath}
              </Link>
              .
            </li>
            <li>
              <strong className="text-white/90">
                Confirm you own the photo
              </strong>
              — required server-side before live jobs.
            </li>
            <li>
              <strong className="text-white/90">Generate and wait</strong>—live
              Mini often needs one to three minutes; keep the tab open.
            </li>
            <li>
              <strong className="text-white/90">QA before publish</strong>—check
              sculpt and color; AI can drift on small details.
            </li>
          </ol>
        </div>

        <div>
          <h2 className="font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
            Use cases for listings and social
          </h2>
          <p className="mt-4">
            Sellers use short product motion on Etsy, Amazon, Depop, and Shopify
            so buyers can sense depth. Collectors use toy video AI for shelf
            flexes and pull reveals. Brands draft drop teasers from lookbook
            stills without rebooking a motion studio.
          </p>
          <p className="mt-3">
            Deeper scene pages (one job per URL) live under{" "}
            <Link href="/for" className="text-[var(--mint)] hover:underline">
              use cases
            </Link>
            , including{" "}
            <Link
              href="/for/etsy-listing-videos"
              className="text-[var(--mint)] hover:underline"
            >
              Etsy listing videos
            </Link>
            ,{" "}
            <Link
              href="/for/tiktok-shop-product-videos"
              className="text-[var(--mint)] hover:underline"
            >
              TikTok Shop
            </Link>
            , and{" "}
            <Link
              href="/for/photo-to-video-for-toys"
              className="text-[var(--mint)] hover:underline"
            >
              photo to video for toys
            </Link>
            . Intent tools live on{" "}
            <Link href="/tools" className="text-[var(--mint)] hover:underline">
              /tools
            </Link>
            —especially the primary rank page{" "}
            <Link
              href={site.rankToolPath}
              className="font-semibold text-[var(--mint)] hover:underline"
            >
              AI toy video generator
            </Link>
            .
          </p>
        </div>

        <div>
          <h2 className="font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
            Cached preview first; Live remains gated
          </h2>
          <p className="mt-4">
            Cached Lab prototypes on the viral wall cost zero credits and never
            process your upload. When Live is enabled for an eligible account,
            Generate shows the configured duration, resolution, and credit quote.
            A refund is only claimed after the server confirms release. We do not
            claim unlimited free 4K or model access we have not shipped.
          </p>
          <p className="mt-3">
            Stripe checkout stays off until search traffic is stable—soft launch
            prioritizes usable trials and crawlable tool pages over premature
            paywalls. When you need more recipes or Seller Starter Pack formats, open{" "}
            <Link
              href={SEO_BODY_GENERATE_HREF}
              className="text-[var(--mint)] hover:underline"
              data-home-seo="generate-remix"
            >
              Generate
            </Link>{" "}
            or{" "}
            <Link
              href="/create?mode=seller-pack"
              className="text-[var(--mint)] hover:underline"
            >
              Seller Starter Pack
            </Link>
            .
          </p>
        </div>

        <div>
          <h2 className="font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
            Recipes, Lab demos, and cached prototypes
          </h2>
          <p className="mt-4">
            The dense wall below the tool is not a fake UGC feed. Each card is an
            PIKBO Lab prototype sample or a recipe deep-link into Generate. Remix means
            “run this recipe on a photo you own.” Inside pages show reference
            posters, cached outputs, and evidence status for Lab prototypes.
          </p>
          <p className="mt-3">
            Prefer a full preset browser? Visit{" "}
            <Link
              href="/effects"
              className="text-[var(--mint)] hover:underline"
            >
              effects
            </Link>
            . Community stays Lab-only until real maker posts exist. For the
            ranking-focused keyword page, open{" "}
            <Link
              href={site.rankToolPath}
              className="font-semibold text-[var(--mint)] hover:underline"
            >
              {site.rankToolPath}
            </Link>
            . Guides such as{" "}
            <Link
              href="/guides/how-to-make-a-figure-spin-video"
              className="text-[var(--mint)] hover:underline"
            >
              how to make a figure spin video
            </Link>{" "}
            walk through photography without replacing the on-page generator
            above.
          </p>
        </div>

        <div>
          <h2 className="font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
            FAQ — designer toy video suite
          </h2>
          <div className="mt-4 divide-y divide-white/10">
            {FAQ.map((f) => (
              <div key={f.q} className="py-4">
                <h3 className="text-base font-bold text-white">{f.q}</h3>
                <p className="mt-2 text-sm text-white/65">{f.a}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm text-white/45">
          This URL is the <strong className="text-white/70">brand home</strong>{" "}
          with an embedded generate tool. Primary search keyword{" "}
          <strong className="text-white/70">{site.keyword}</strong> is owned by{" "}
          <Link
            href={site.rankToolPath}
            className="text-[var(--mint)] hover:underline"
          >
            {site.rankToolPath}
          </Link>
          . Supporting phrases here: photo into short video / animate designer
          toys.
        </p>
      </div>
    </section>
  );
}
