import Link from "next/link";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { createRemixHref } from "@/lib/remixIntent";

/** Default listing recipe when leaving How it works → Generate. */
const HOW_IT_WORKS_GENERATE_EFFECT = "360-spin-showcase";

const STEPS = [
  {
    n: "1",
    t: "Snap your figure",
    d: "One clear photo — full toy, even light, clean background. You must own the rights.",
  },
  {
    n: "2",
    t: "Pick a toy recipe",
    d: "Spin, unbox, dance, shelf — Modules and presets open Generate with the job ready.",
  },
  {
    n: "3",
    t: "Generate with Seedance",
    d: "Live Mini often 1–3 minutes. Keep the tab open. Failed live jobs restore credits when confirmed; TIMEOUT stays unconfirmed.",
  },
  {
    n: "4",
    t: "Library · post or list",
    d: "Clips save on this device Library. QA paint before you publish. Seller Pack for 3 formats.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-b border-white/10 bg-black px-4 py-16 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--mint)]">
          Process
        </p>
        <h2 className="mt-2 text-center font-display text-3xl font-black uppercase tracking-tight">
          How it works
        </h2>
        <p className="mx-auto mt-3 max-w-md text-center text-sm text-white/50">
          Four steps from shelf photo to post-ready clip
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
            >
              <span className="font-display text-3xl font-black text-[var(--mint)]">
                {s.n.padStart(2, "0")}
              </span>
              <h3 className="mt-4 font-semibold tracking-tight text-white">
                {s.t}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/50">{s.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          <FreeTrialCta
            path="/how-it-works"
            variant="mint"
            labelTry="Try free · Mini 5s"
          />
          <Link
            href={createRemixHref(HOW_IT_WORKS_GENERATE_EFFECT)}
            className="btn btn-ghost text-sm"
            data-how-it-works="generate-remix"
          >
            Open Generate
          </Link>
          <Link href="/library" className="btn btn-ghost text-sm">
            Library
          </Link>
          <Link
            href="/tools/ai-toy-video-generator"
            className="btn btn-ghost text-sm"
          >
            AI toy video generator
          </Link>
        </div>
      </div>
    </section>
  );
}
