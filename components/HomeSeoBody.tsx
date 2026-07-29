import Link from "next/link";
import { site } from "@/lib/site";

const HIGH_INTENT_PAGES = [
  ["/tools/ai-toy-video-generator", "AI toy video generator"],
  ["/tools/figure-360-product-video", "360 toy listing video"],
  ["/tools/blind-box-reveal-video-maker", "Blind-box reveal video"],
] as const;

const FAQ = [
  {
    q: "What does Pikbo make?",
    a: "Pikbo turns one owned toy photo into a fixed Launch Pack: a square listing spin, a vertical blind-box reveal, and a vertical social hook.",
  },
  {
    q: "Do preview examples use my photo?",
    a: "No. Public examples are labeled previews and do not process your upload. Only invited, signed-in private-beta accounts can submit a real generation.",
  },
  {
    q: "How are failed clips charged?",
    a: "The three-format Pack uses 30 credits: 10 per completed clip. A confirmed failed format restores its 10-credit charge.",
  },
  {
    q: "Can I publish the result immediately?",
    a: "Review the toy sculpt, paint, packaging text, and proportions first. AI video can drift on small product details.",
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
    <section className="border-t border-white/10 bg-black px-4 py-14 text-white sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <div className="mx-auto max-w-3xl space-y-10 text-[15px] leading-relaxed text-white/70">
        <div>
          <h2 className="font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
            One toy photo. Three launch-ready formats.
          </h2>
          <p className="mt-4">
            {site.name} is built for designer-toy sellers and studios that
            already have sharp product photos but need motion for listings,
            launches, and social posts. The fixed Launch Pack creates a Listing
            Spin in 1:1, a Blind-box Reveal in 9:16, and a Social Flash in 9:16.
          </p>
          <p className="mt-3">
            The three focused guides below show the intended input, output,
            commercial use, and current limitations for each high-intent job.
          </p>
          <nav
            aria-label="Focused toy video guides"
            className="mt-5 flex flex-wrap gap-2"
          >
            {HIGH_INTENT_PAGES.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-white/60 transition hover:border-[var(--mint)]/40 hover:text-[var(--mint)]"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div>
          <h2 className="font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
            How the Launch Pack works
          </h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5">
            <li>Choose a clear, full-product photo that you own.</li>
            <li>Confirm your rights and review the fixed 30-credit quote.</li>
            <li>Create the three 5-second formats from the same SKU photo.</li>
            <li>Download completed clips from your private Library.</li>
            <li>Check sculpt, paint, logos, and packaging before publishing.</li>
          </ol>
        </div>

        <div>
          <h2 className="font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
            What is available now
          </h2>
          <p className="mt-4">
            Public visitors can explore labeled preview examples at zero
            credits; those examples do not process an uploaded photo. Invited
            private-beta accounts can create private 5-second 720p results and
            recover them after refresh through owner-only downloads.
          </p>
          <p className="mt-3">
            Founding Studio subscriptions remain closed until real SKU tests
            meet the published quality, recovery, privacy, and cost thresholds.
            No plan promises unlimited generation.
          </p>
        </div>

        <div>
          <h2 className="font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
            FAQ
          </h2>
          <div className="mt-4 divide-y divide-white/10">
            {FAQ.map((item) => (
              <div key={item.q} className="py-4">
                <h3 className="text-base font-bold text-white">{item.q}</h3>
                <p className="mt-2 text-sm text-white/65">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
