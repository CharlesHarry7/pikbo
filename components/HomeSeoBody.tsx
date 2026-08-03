import Link from "next/link";

const HIGH_INTENT_PAGES = [
  ["/tools/ai-toy-video-generator", "AI toy video generator"],
  ["/effects/360-spin-showcase", "360 toy listing video"],
  ["/tools/blind-box-reveal-video-maker", "Blind-box reveal video"],
] as const;

const FAQ = [
  {
    q: "What goes in?",
    a: "One clear photo of a designer toy you own or are authorized to market.",
  },
  {
    q: "What comes out?",
    a: "The product target is a listing spin, blind-box reveal, and social hook. Public visitors currently see separate archived format prototypes.",
  },
  {
    q: "Can I buy it now?",
    a: "Not yet. Seller access is invite-only while output quality, private recovery, and cost are validated.",
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
    <section className="bg-[#F2EDE3] px-4 pb-20 text-[#171717] sm:px-7 sm:pb-28 lg:bg-[#111111] lg:px-8 lg:pb-24 lg:text-[#F5F1E8]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <div className="mx-auto max-w-[1440px]">
        <div className="grid overflow-hidden rounded-[26px] border border-black/12 bg-[#FAF7F0] lg:grid-cols-[0.8fr_1.2fr] lg:rounded-[18px] lg:border-white/12 lg:bg-[#181818]">
          <div className="border-b border-black/12 p-6 sm:p-9 lg:border-b-0 lg:border-r lg:border-white/12 lg:p-12">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF6846]">
              One simple workflow
            </p>
            <h2 className="mt-4 font-display text-4xl font-black leading-[0.94] tracking-[-0.055em] sm:text-5xl">
              From shelf shot to launch set.
            </h2>
            <p className="mt-5 max-w-md text-sm font-semibold leading-6 text-[#6D675E] lg:text-[#A39C91]">
              No prompt engineering, model hunting, or editing timeline. The
              invited private-beta workflow is designed to keep completed clips
              private and reusable.
            </p>
          </div>

          <div className="divide-y divide-black/10 lg:divide-white/10">
            {[
              ["01", "Add your toy", "Use one clean, authorized product photo."],
              ["02", "Choose the sales Moment", "Pick the listing, reveal, or social direction you need now."],
              ["03", "Publish what passes review", "Download the result and check every product detail."],
            ].map(([number, title, copy]) => (
              <div
                key={number}
                className="grid grid-cols-[44px_1fr] gap-4 p-6 sm:grid-cols-[62px_1fr] sm:p-8"
              >
                <span className="font-display text-xl font-black text-[#2876FF] lg:text-[#D84A35]">
                  {number}
                </span>
                <div>
                  <h3 className="text-lg font-black tracking-[-0.025em]">
                    {title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-[#6D675E] lg:text-[#A39C91]">{copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <article className="rounded-[26px] bg-[#2876FF] p-7 text-white sm:p-10 lg:rounded-[18px] lg:border lg:border-white/12 lg:bg-[#181818] lg:text-[#F5F1E8]">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
              Your working shelf
            </p>
            <h2 className="mt-12 max-w-2xl font-display text-3xl font-black leading-[0.96] tracking-[-0.045em] sm:mt-20 sm:text-5xl">
              Private beta is built for private, reusable launches.
            </h2>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-white/70 lg:text-[#A39C91]">
              When private Live is enabled,
              eligible invited accounts
              can create private 5-second 720p results. Completed clips are
              designed to return to the signed-in Library after refresh.
            </p>
          </article>

          <article className="flex flex-col justify-between rounded-[26px] bg-[#FF6846] p-7 text-[#1B0B06] sm:p-10 lg:rounded-[18px] lg:bg-[#F5F1E8] lg:text-[#111111]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/48">
                Founding Studio
              </p>
              <h2 className="mt-4 font-display text-3xl font-black leading-[0.96] tracking-[-0.045em]">
                Help shape the first seller-ready Pack.
              </h2>
            </div>
            <Link
              href="/contact?source=home-founding-studio"
              className="mt-10 inline-flex min-h-14 items-center justify-between rounded-full bg-[#171717] px-6 text-sm font-black text-white hover:bg-black lg:rounded-[10px] lg:bg-[#D84A35] lg:hover:bg-[#E25A43]"
            >
              Request seller beta <span aria-hidden>↗</span>
            </Link>
          </article>
        </div>

        <div className="mt-16 grid gap-10 border-t border-black/15 pt-8 lg:grid-cols-[0.7fr_1.3fr] lg:border-white/12">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6D675E] lg:text-[#A39C91]">
              Focused tools
            </p>
            <nav className="mt-4 flex flex-col items-start gap-2" aria-label="Toy video guides">
              {HIGH_INTENT_PAGES.map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="text-sm font-black underline decoration-black/20 underline-offset-4 hover:decoration-[#FF6846] lg:decoration-white/20 lg:hover:decoration-[#D84A35]"
                >
                  {label} ↗
                </Link>
              ))}
            </nav>
          </div>

          <div className="grid gap-px overflow-hidden rounded-2xl border border-black/12 bg-black/12 md:grid-cols-3 lg:rounded-[14px] lg:border-white/12 lg:bg-white/12">
            {FAQ.map((item) => (
              <article key={item.q} className="bg-[#FAF7F0] p-6 lg:bg-[#181818]">
                <h3 className="font-black">{item.q}</h3>
                <p className="mt-3 text-sm leading-6 text-[#6D675E] lg:text-[#A39C91]">{item.a}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
