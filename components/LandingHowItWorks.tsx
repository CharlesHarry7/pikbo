/** 哥飞 V2 — 落地文案块：SSR 步骤，给用户 + 爬虫 */
export function LandingHowItWorks({
  productLabel = "clip",
}: {
  productLabel?: string;
}) {
  const steps = [
    {
      n: "1",
      t: "Upload one photo",
      d: "A clear shot of a designer toy, figure, or blind-box pull you own. Plain background works best. Confirm ownership before live jobs.",
    },
    {
      n: "2",
      t: "Use the tool on this page",
      d: `Submit the ${productLabel} for a live Seedance Mini render when configured. Live often takes 1–3 minutes — keep the tab open. Lab demos stay labeled and free.`,
    },
    {
      n: "3",
      t: "Review · Library · post",
      d: "QA paint and logos before publishing. Free Mini: ~5s · 480p · on-player mark; failed live jobs refund. Clips save to this-device Library.",
    },
  ];

  return (
    <section className="container-x py-12">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--mint)]">
        How it works
      </p>
      <h2 className="mt-1 font-display text-2xl font-black tracking-tight sm:text-3xl">
        Photo in · clip out
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--fg-muted)]">
        Upload a toy photo you own, choose the recipe, and review whether Studio
        returned a live render or a labeled cached demo.
      </p>
      <ol className="mt-8 grid gap-3 sm:grid-cols-3">
        {steps.map((s) => (
          <li
            key={s.n}
            className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-black/40 p-5 shadow-[0_16px_40px_-28px_rgba(0,0,0,0.9)]"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--mint)] text-sm font-black text-black shadow-[0_0_16px_rgba(200,255,61,0.3)]">
              {s.n}
            </span>
            <h3 className="mt-3 font-semibold text-white">{s.t}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-white/50">
              {s.d}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
