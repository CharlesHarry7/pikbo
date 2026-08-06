/**
 * 哥飞 V2 — 落地三步：Photo → Recipe → Video draft
 * 必须与页面真实 UI 一致；仅在页内有工具时挂 HowTo JSON-LD。
 *
 * Soft-launch honesty: do not brand Free Mini / Seedance Mini product caps
 * while public Live is closed. Prefer Live-gated / Cached Lab copy so SSR
 * landings stay fail-closed (JSON-LD helper stays server-safe in this module).
 */
export function LandingHowItWorks({
  productLabel = "video draft",
  compact = false,
}: {
  productLabel?: string;
  /** Place under on-page tool (first screen), not a distant footer block */
  compact?: boolean;
}) {
  const steps = [
    {
      n: "1",
      t: "Photo",
      d: "Upload a photo of a collectible you own—not a selfie. Clear figure, plain background, full product in frame.",
    },
    {
      n: "2",
      t: "Recipe",
      d: "Pick a toy-native recipe (spin, float, unbox energy). Soft launch: cached Lab previews first; Live generation stays gated for eligible invited accounts.",
    },
    {
      n: "3",
      t: "Video draft",
      d: `Review the ${productLabel} before posting. Cached Lab · Live gated · refunds when confirmed. Real generation opens only when Live is enabled for eligible accounts.`,
    },
  ];

  return (
    <section
      className={
        compact
          ? "container-x py-6"
          : "container-x py-12"
      }
      aria-label="How it works: Photo, Recipe, Video draft"
      data-landing-hiw-cap="lab-gated"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--neon-pink)]">
        How it works
      </p>
      <h2
        className={
          compact
            ? "mt-1 font-display text-xl font-black tracking-tight sm:text-2xl"
            : "mt-1 font-display text-2xl font-black tracking-tight sm:text-3xl"
        }
      >
        Photo → Recipe → Video draft
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--fg-muted)]">
        Upload a collectible photo you own, choose a recipe, and review a short
        video draft for listings or social—not a portrait selfie pipeline.
      </p>
      <ol
        className={
          compact
            ? "mt-5 grid gap-2.5 sm:grid-cols-3"
            : "mt-8 grid gap-3 sm:grid-cols-3"
        }
      >
        {steps.map((s) => (
          <li
            key={s.n}
            className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-black/40 p-4 shadow-[0_16px_40px_-28px_rgba(0,0,0,0.9)] sm:p-5"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--neon-pink)] text-sm font-black text-[var(--void)] shadow-[0_0_16px_rgba(255,78,205,0.3)]">
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

/** Shared HowTo JSON-LD steps — only emit when LandingHowItWorks is on the page. */
export function photoRecipeDraftHowToJsonLd(input: {
  name: string;
  description: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: input.name,
    description: input.description,
    step: [
      {
        "@type": "HowToStep",
        name: "Photo",
        text: "Upload a photo of a collectible you own—not a selfie.",
      },
      {
        "@type": "HowToStep",
        name: "Recipe",
        text: "Choose a toy-native recipe such as spin, float, or unbox energy.",
      },
      {
        "@type": "HowToStep",
        name: "Video draft",
        text: "Review the short video draft for listings or social before posting.",
      },
    ],
  };
}
