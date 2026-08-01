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
    <section className="border-t border-[#D4D8E0] bg-[#F7F8FA] px-5 py-16 text-[#15171B] sm:px-8 sm:py-22">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2457E6]">
              Built around the product
            </p>
            <h2 className="mt-3 font-display text-4xl font-black leading-[0.96] tracking-[-0.055em] sm:text-5xl">
              See the input, the output, and the limits.
            </h2>
            <p className="mt-6 max-w-xl text-sm font-semibold leading-6 text-[#626B78] sm:text-base">
              {site.name} is for designer-toy sellers and studios that already
              have clear product photos but need motion for listings, launches,
              and social posts. Public prototypes stay labeled until Pikbo can
              publish verified beta input-to-output evidence.
            </p>
            <nav
              aria-label="Focused toy video guides"
              className="mt-7 flex flex-wrap gap-2"
            >
              {HIGH_INTENT_PAGES.map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-lg border border-[#CFD4DD] bg-white px-3 py-2 text-[11px] font-black text-[#5E6673] transition hover:border-[#2457E6] hover:text-[#2457E6]"
                >
                  {label} ↗
                </Link>
              ))}
            </nav>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Input", "1 seller-owned toy photo"],
              ["Output", "3 fixed 5-second formats"],
              ["Credits", "10 per completed clip"],
              ["Delivery", "Private signed-in Library"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-[#D4D8E0] bg-white p-5"
              >
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#7B8390]">
                  {label}
                </p>
                <p className="mt-7 text-xl font-black tracking-[-0.03em]">
                  {value}
                </p>
              </div>
            ))}
            <div className="rounded-2xl bg-[#151A24] p-5 text-white sm:col-span-2">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#85A5FF]">
                Private delivery, limited processing
              </p>
              <p className="mt-5 max-w-2xl text-sm leading-6 text-white/62">
                Real beta photos are sent to the generation provider only for
                the requested clips. Finished videos are copied to Pikbo&apos;s
                private storage. Pikbo does not send your image, prompt, email,
                or asset URL to analytics.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-18 grid gap-3 border-t border-black/15 pt-12 lg:grid-cols-2">
          <article className="rounded-2xl border border-[#D4D8E0] bg-[#E9EDF7] p-6 sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5F6774]">
              Private beta · invite only
            </p>
            <h3 className="mt-4 text-2xl font-black tracking-[-0.035em]">
              What is available now
            </h3>
            <p className="mt-4 text-sm leading-6 text-[#626B78]">
              Public visitors can inspect cached examples without processing an
              upload. When private Live is enabled, eligible invited accounts
              can create private 5-second 720p results and recover completed
              clips after refresh.
              Subscriptions remain closed while quality, recovery, privacy, and
              cost are tested.
            </p>
          </article>

          <article className="rounded-2xl border border-[#D4D8E0] bg-white p-6 sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5F6774]">
              Before publishing
            </p>
            <h3 className="mt-4 text-2xl font-black tracking-[-0.035em]">
              Treat every generated angle as a draft.
            </h3>
            <p className="mt-4 text-sm leading-6 text-[#626B78]">
              Review sculpt, paint, logos, packaging, accessories, and
              proportions against the physical product. Pikbo does not
              guarantee exact unseen details, sales, reach, or rankings.
            </p>
          </article>
        </div>

        <div className="mt-18">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2457E6]">
            FAQ
          </p>
          <div className="mt-4 grid gap-px overflow-hidden rounded-2xl border border-[#D4D8E0] bg-[#D4D8E0] md:grid-cols-3">
            {FAQ.map((item) => (
              <div key={item.q} className="bg-white p-6 sm:p-7">
                <h3 className="text-base font-black">{item.q}</h3>
                <p className="mt-3 text-sm leading-6 text-[#626B78]">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
