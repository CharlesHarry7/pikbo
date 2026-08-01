import Link from "next/link";
import { site } from "@/lib/site";

const HIGH_INTENT_PAGES = [
  ["/tools/ai-toy-video-generator", "AI toy video generator"],
  ["/effects/360-spin-showcase", "360 toy listing video"],
  ["/tools/blind-box-reveal-video-maker", "Blind-box reveal video"],
] as const;

const FAQ = [
  {
    q: "What does Pikbo make?",
    a: "Pikbo turns one owned toy photo into a fixed Launch Pack: a square listing spin, a vertical blind-box reveal, and a vertical social hook.",
  },
  {
    q: "Do public previews use my photo?",
    a: "No. Public examples are labeled cached previews and do not process your upload. When private Live is enabled, only eligible invited, signed-in beta accounts can submit a real generation.",
  },
  {
    q: "How are failed clips charged?",
    a: "The three-format Pack reserves 30 credits. Each completed clip settles 10 credits; a confirmed failed format restores 10 credits.",
  },
  {
    q: "Can I publish a result without checking it?",
    a: "Review the toy sculpt, paint, packaging text, logos, and proportions first. AI video can drift on small product details.",
  },
] as const;

export function HomeSeoBody() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <section className="border-t border-white/[0.08] bg-[#09090B] px-3 py-10 text-[#F4F4F5] sm:px-5 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <div className="mx-auto max-w-[1500px]">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#C8FF3D]">
              Built around the product
            </p>
            <h2 className="mt-2 max-w-2xl font-display text-2xl font-semibold tracking-[-0.04em] sm:text-4xl">
              See the input, the output, and the limits.
            </h2>
            <p className="mt-4 max-w-xl text-xs leading-5 text-white/50 sm:text-sm sm:leading-6">
              {site.name} is for designer-toy sellers and studios that already
              have clear product photos but need motion for listings, launches,
              and social posts. Public prototypes stay labeled until Pikbo can
              publish verified beta input-to-output evidence.
            </p>
            <nav
              aria-label="Focused toy video guides"
              className="mt-5 flex flex-wrap gap-2"
            >
              {HIGH_INTENT_PAGES.map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-2 text-[10px] font-semibold text-white/58 transition hover:border-[#C8FF3D]/45 hover:text-[#C8FF3D]"
                >
                  {label} ↗
                </Link>
              ))}
            </nav>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {[
              ["Input", "1 seller-owned toy photo"],
              ["Output", "3 fixed 5-second formats"],
              ["Credits", "10 per completed clip"],
              ["Delivery", "Private signed-in Library"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[0.9rem] border border-white/[0.08] bg-[#121214] p-4"
              >
                <p className="text-[8px] font-semibold uppercase tracking-[0.13em] text-[#C8FF3D]">
                  {label}
                </p>
                <p className="mt-4 text-base font-semibold tracking-[-0.02em]">
                  {value}
                </p>
              </div>
            ))}
            <div className="rounded-[0.9rem] border border-white/[0.08] bg-[#161619] p-4 text-white sm:col-span-2">
              <p className="text-[8px] font-semibold uppercase tracking-[0.13em] text-[#C8FF3D]">
                Private delivery, limited processing
              </p>
              <p className="mt-3 max-w-2xl text-xs leading-5 text-white/52">
                Real beta photos are sent to the generation provider only for
                the requested clips. Finished videos are copied to Pikbo&apos;s
                private storage. Pikbo does not send your image, prompt, email,
                or asset URL to analytics.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-2 border-t border-white/[0.08] pt-8 lg:grid-cols-2">
          <article className="rounded-[0.9rem] border border-white/[0.08] bg-[#121214] p-5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-white/36">
              Private beta · invite only
            </p>
            <h3 className="mt-3 text-lg font-semibold tracking-[-0.025em]">
              What is available now
            </h3>
            <p className="mt-3 text-xs leading-5 text-white/48">
              Public visitors can inspect cached examples without processing an
              upload. When private Live is enabled, eligible invited accounts
              can create private 5-second 720p results and recover completed
              clips after refresh.
              Subscriptions remain closed while quality, recovery, privacy, and
              cost are tested.
            </p>
          </article>

          <article className="rounded-[0.9rem] border border-white/[0.08] bg-[#121214] p-5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-white/36">
              Before publishing
            </p>
            <h3 className="mt-3 text-lg font-semibold tracking-[-0.025em]">
              Treat every generated angle as a draft.
            </h3>
            <p className="mt-3 text-xs leading-5 text-white/48">
              Review sculpt, paint, logos, packaging, accessories, and
              proportions against the physical product. Pikbo does not
              guarantee exact unseen details, sales, reach, or rankings.
            </p>
          </article>
        </div>

        <div className="mt-10">
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#C8FF3D]">
            FAQ
          </p>
          <div className="mt-3 grid gap-px overflow-hidden rounded-[0.9rem] border border-white/[0.08] bg-white/[0.08] md:grid-cols-2">
            {FAQ.map((item) => (
              <div key={item.q} className="bg-[#121214] p-5">
                <h3 className="text-sm font-semibold">{item.q}</h3>
                <p className="mt-2 text-xs leading-5 text-white/48">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
