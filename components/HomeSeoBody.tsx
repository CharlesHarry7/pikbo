import Link from "next/link";
import { site } from "@/lib/site";

/**
 * 哥飞诊断 P1：首页正文厚度 + 完整词组 + H2 关键词。
 * SSR 纯文案，供爬虫读取；不替代上方 on-page 工具。
 */
const FAQ = [
  {
    q: "What is an AI toy video generator?",
    a: "An AI toy video generator turns a still photo of a designer toy, figure, or blind-box collectible into a short motion clip. Pikbo is built for that job: one owned photo in, short video out—for listings, TikTok, and drops.",
  },
  {
    q: "Can I turn a photo into short video without filming?",
    a: "Yes. Upload a clear product photo you own, pick a recipe such as 360° spin or floating hero, and generate. Soft launch Free Mini runs Seedance Mini at about 5 seconds and 480p with an on-player mark.",
  },
  {
    q: "Is the homepage tool the same as /create?",
    a: "Yes. The upload → generate block on this page is a real generate path, not a teaser. /create is the full studio when you want more recipes, Seller Pack, or library tools.",
  },
  {
    q: "Do Lab demos use my photo?",
    a: "No. Homepage Lab samples are official cached demos. Your photo is only used when you run a live generate.",
  },
  {
    q: "What photo works best?",
    a: "Front-facing, sharp, even light, plain background, full figure in frame. Busy shelves and heavy shadows reduce quality.",
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
            Why use an AI toy video generator on this page
          </h2>
          <p className="mt-4">
            {site.name} is an <strong className="text-white/90">AI toy video generator</strong>{" "}
            for collectors and sellers who already have product photos. The
            product job is simple: take one photo of a designer toy you own and{" "}
            <strong className="text-white/90">turn that photo into short video</strong>{" "}
            you can list or post. You do not need a turntable, a studio crew, or
            a multi-model zoo—soft launch live path is Seedance Mini with honest
            Free Mini caps.
          </p>
          <p className="mt-3">
            Searchers looking for an AI toy video generator often bounce when a
            homepage only links out to another URL. That is why this page embeds
            the same photo-to-video control used in Generate: upload, confirm
            rights, run Free Mini or live credits, wait for the render (often
            one to three minutes), then preview the clip. Lab wall demos below
            stay labeled official examples—not fake customer UGC.
          </p>
        </div>

        <div>
          <h2 className="font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
            How an AI toy video generator turns a photo into short video
          </h2>
          <p className="mt-4">
            The phrase people type is often “photo into short video” or “photo
            to video AI.” For toys the quality bar is different from face-swap
            filters: paint apps, sculpt edges, and packaging logos must stay
            recognizable. Pikbo keeps the still as the visual reference, then
            applies a toy-native recipe—spin for marketplaces, float for launch
            teasers, unbox energy for short-form hooks.
          </p>
          <ol className="mt-4 list-decimal space-y-2 pl-5">
            <li>
              <strong className="text-white/90">Shoot or choose one owned still</strong>
              — plain background, full figure, sharp focus.
            </li>
            <li>
              <strong className="text-white/90">Use the tool above</strong>—or
              open{" "}
              <Link href="/create" className="text-[var(--mint)] hover:underline">
                full Generate
              </Link>{" "}
              for more recipes.
            </li>
            <li>
              <strong className="text-white/90">Confirm you own the photo</strong>
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
            Use cases for AI toy video on listings and social
          </h2>
          <p className="mt-4">
            Sellers use short product motion on Etsy, Amazon, Depop, and Shopify
            so buyers can sense depth. Collectors use the same AI toy video
            generator for shelf flexes and pull reveals. Brands draft drop
            teasers from lookbook stills without rebooking a motion studio.
          </p>
          <p className="mt-3">
            Deeper scene pages (one job per URL) live under{" "}
            <Link
              href="/for"
              className="text-[var(--mint)] hover:underline"
            >
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
            . Tool-intent pages sit on{" "}
            <Link href="/tools" className="text-[var(--mint)] hover:underline">
              /tools
            </Link>
            —for example{" "}
            <Link
              href="/tools/ai-toy-video-generator"
              className="text-[var(--mint)] hover:underline"
            >
              AI toy video generator
            </Link>{" "}
            and{" "}
            <Link
              href="/tools/toy-image-to-video-ai"
              className="text-[var(--mint)] hover:underline"
            >
              toy image to video
            </Link>
            . Those URLs carry keyword paths; this domain root stays the brand
            home with the working tool embedded.
          </p>
        </div>

        <div>
          <h2 className="font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
            Free Mini on this AI toy video generator (honest soft launch)
          </h2>
          <p className="mt-4">
            Free plan soft launch is intentionally small: about ten credits,
            one live Seedance Mini clip path, roughly five seconds, 480p, with
            an on-player mark. Failed live jobs refund the debit when the server
            can confirm failure. Cached Lab demos on the viral wall cost zero
            credits and never process your upload. We do not claim unlimited free
            4K or multi-model live stacks we have not shipped.
          </p>
          <p className="mt-3">
            Stripe checkout stays off until search traffic is stable—soft launch
            prioritizes usable trials and crawlable tool pages over premature
            paywalls. When you need more recipes or Seller Pack formats, open{" "}
            <Link href="/create" className="text-[var(--mint)] hover:underline">
              Generate
            </Link>{" "}
            or{" "}
            <Link
              href="/create?mode=seller-pack"
              className="text-[var(--mint)] hover:underline"
            >
              Seller Pack
            </Link>
            .
          </p>
        </div>

        <div>
          <h2 className="font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
            Recipes, Lab demos, and what “official example” means
          </h2>
          <p className="mt-4">
            The dense wall below the tool is not a fake UGC feed. Each card is an
            official Lab sample or a recipe deep-link into Generate. Remix means
            “run this recipe on a photo you own.” Inside pages show input stills
            and provenance for Lab projects. That honesty helps dwell time
            without inventing social proof.
          </p>
          <p className="mt-3">
            Prefer a full preset browser? Visit{" "}
            <Link href="/effects" className="text-[var(--mint)] hover:underline">
              effects
            </Link>{" "}
            or{" "}
            <Link href="/community" className="text-[var(--mint)] hover:underline">
              community Lab
            </Link>
            . For the ranking-focused{" "}
            <Link
              href="/tools/ai-toy-video-generator"
              className="font-semibold text-[var(--mint)] hover:underline"
            >
              AI toy video generator
            </Link>{" "}
            keyword page (Title, H1, and body aligned to that query), open the
            tools URL. Guides such as{" "}
            <Link
              href="/guides/how-to-make-a-figure-spin-video"
              className="text-[var(--mint)] hover:underline"
            >
              how to make a figure spin video
            </Link>{" "}
            walk through photography and recipe choice without replacing the
            on-page generator above.
          </p>
        </div>

        <div>
          <h2 className="font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
            FAQ — AI toy video generator
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
          Primary topic on this URL: <strong className="text-white/70">{site.keyword}</strong>.
          Supporting phrase used above: photo into short video / photo to short
          video for designer toys. Secondary intents are covered on dedicated
          /for and /tools landings so this page stays one clear job: generate
          toy video from one photo.
        </p>
      </div>
    </section>
  );
}
