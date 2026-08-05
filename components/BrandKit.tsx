import { cn } from "@/lib/utils";

const STEPS = [50, 100, 200, 400, 600, 800, 900] as const;

type Palette = {
  id: string;
  label: string;
  role: string;
  base: string;
  prefix: string;
};

const PALETTES: Palette[] = [
  {
    id: "pink",
    label: "Pastelpop pink",
    role: "主色 · 粉调",
    base: "#FFB6D9",
    prefix: "pink",
  },
  {
    id: "purple",
    label: "Violet",
    role: "主色 · 紫调",
    base: "#C77DFF",
    prefix: "purple",
  },
  {
    id: "gold",
    label: "Black-gold",
    role: "主色 · 黑金",
    base: "#FFC857",
    prefix: "gold",
  },
  {
    id: "neon",
    label: "Neon green",
    role: "强调 · 霓虹绿",
    base: "#39FF14",
    prefix: "neon",
  },
  {
    id: "flash",
    label: "Fluoro yellow",
    role: "强调 · 荧光黄",
    base: "#F5FF40",
    prefix: "flash",
  },
  {
    id: "electric",
    label: "Electric blue",
    role: "强调 · 电光蓝",
    base: "#00F0FF",
    prefix: "electric",
  },
  {
    id: "ink",
    label: "Ink black",
    role: "中性 · 墨黑",
    base: "#0E0E12",
    prefix: "ink",
  },
  {
    id: "fog",
    label: "Fog gray",
    role: "中性 · 灰雾",
    base: "#8B8B95",
    prefix: "fog",
  },
];

function Swatch({
  prefix,
  step,
}: {
  prefix: string;
  step: (typeof STEPS)[number];
}) {
  const varName = `--${prefix}-${step}`;
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <div
        className="aspect-[4/3] w-full rounded-lg border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
        style={{ background: `var(${varName})` }}
        title={varName}
      />
      <div className="px-0.5">
        <p className="font-mono text-[10px] font-semibold text-[var(--fg)]">
          {step}
        </p>
        <p className="truncate font-mono text-[9px] text-[var(--fg-dim)]">
          {varName}
        </p>
      </div>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-5", className)}>
      <header className="space-y-1.5">
        <p className="section-label">{eyebrow}</p>
        <h2 className="font-display text-2xl font-extrabold tracking-tight text-[var(--fg)] md:text-3xl">
          {title}
        </h2>
      </header>
      {children}
    </section>
  );
}

/**
 * Full design-system showcase for internal review (/dev/design-system).
 * Pure presentational — no product data, no generation hooks.
 */
export function BrandKit({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-6xl space-y-16 px-4 py-12 sm:px-6 lg:px-8",
        className
      )}
    >
      <header className="motion-state-in space-y-4 border-b border-[var(--border)] pb-10">
        <p className="eyebrow">Pikbo · 潮玩 design system</p>
        <h1 className="font-display max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight text-[var(--fg)] md:text-5xl">
          Collectible tokens, not AI-SaaS blue.
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-[var(--fg-muted)] md:text-lg">
          Eight ramps × seven steps, two next/font faces, four card surfaces, and
          micro-motion specs. Canvas stays{" "}
          <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-sm text-[var(--neon-400)]">
            #0a0a0a
          </code>
          . Companion cream{" "}
          <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-sm text-[var(--gold-400)]">
            #FFF8E7
          </code>{" "}
          and noir{" "}
          <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-sm text-[var(--pink-400)]">
            #1A1A2E
          </code>
          .
        </p>
      </header>

      <Section eyebrow="01 · Color" title="8-color toy palette">
        <div className="motion-stagger space-y-8">
          {PALETTES.map((p) => (
            <div key={p.id} className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="font-display text-lg font-bold text-[var(--fg)]">
                    {p.label}
                  </h3>
                  <p className="text-sm text-[var(--fg-muted)]">
                    {p.role} · base{" "}
                    <span className="font-mono text-[var(--fg)]">{p.base}</span>
                  </p>
                </div>
                <p className="font-mono text-xs text-[var(--fg-dim)]">
                  --{p.prefix}-&#123;50…900&#125;
                </p>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {STEPS.map((step) => (
                  <Swatch key={step} prefix={p.prefix} step={step} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="card rounded-2xl p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-dim)]">
              Canvas
            </p>
            <p className="mt-1 font-mono text-sm text-[var(--fg)]">
              --bg · #0a0a0a
            </p>
          </div>
          <div className="card rounded-2xl p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-dim)]">
              Cream paper
            </p>
            <p className="mt-1 font-mono text-sm text-[var(--fg)]">
              --cream · #FFF8E7
            </p>
            <div
              className="mt-3 h-8 rounded-lg border border-white/10"
              style={{ background: "var(--cream)" }}
            />
          </div>
          <div className="card rounded-2xl p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-dim)]">
              Noir companion
            </p>
            <p className="mt-1 font-mono text-sm text-[var(--fg)]">
              --noir · #1A1A2E
            </p>
            <div
              className="mt-3 h-8 rounded-lg border border-white/10"
              style={{ background: "var(--noir)" }}
            />
          </div>
        </div>
      </Section>

      <Section eyebrow="02 · Type" title="Display + body faces">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card space-y-4 rounded-2xl p-6">
            <p className="section-label">Display · Plus Jakarta Sans</p>
            <p className="font-display text-4xl font-extrabold leading-none tracking-tight">
              Shelf labels
            </p>
            <p className="font-display text-2xl font-bold tracking-tight text-[var(--pink-400)]">
              Geometric · collectible
            </p>
            <p className="font-display text-lg font-semibold text-[var(--fg-muted)]">
              700 / 800 for titles & tags
            </p>
            <p className="font-mono text-xs text-[var(--fg-dim)]">
              --font-display ← next/font Plus_Jakarta_Sans
            </p>
          </div>
          <div className="card space-y-4 rounded-2xl p-6">
            <p className="section-label">Body · DM Sans</p>
            <p className="text-base leading-relaxed text-[var(--fg)]">
              High-readability body copy for seller guidance, pricing detail, and
              status messages. Keeps the toy energy without shouting.
            </p>
            <p className="text-sm leading-relaxed text-[var(--fg-muted)]">
              Weights 400–700. Loaded with{" "}
              <code className="font-mono text-[var(--electric-400)]">
                display: swap
              </code>{" "}
              to avoid CLS.
            </p>
            <p className="font-mono text-xs text-[var(--fg-dim)]">
              --font-sans ← next/font DM_Sans
            </p>
          </div>
        </div>
      </Section>

      <Section eyebrow="03 · Cards" title="Four surface recipes">
        <div className="motion-stagger grid gap-5 md:grid-cols-2">
          <article className="collection-card flex min-h-[200px] flex-col justify-between p-6">
            <div>
              <p className="chip border-[var(--pink-400)]/30 bg-[var(--pink-400)]/10 text-[var(--pink-200)]">
                collection-card
              </p>
              <h3 className="font-display mt-4 text-xl font-extrabold">
                Speckles + halo
              </h3>
              <p className="mt-2 text-sm text-[var(--fg-muted)]">
                Shelf texture for toy / series tiles. Soft pink–violet glow.
              </p>
            </div>
            <p className="font-mono text-[10px] text-[var(--fg-dim)]">
              hover scale 1.02 · press 0.98
            </p>
          </article>

          <article className="result-card flex min-h-[200px] flex-col justify-between p-6">
            <div>
              <p className="chip border-[var(--neon-400)]/30 bg-[var(--neon-400)]/10 text-[var(--neon-200)]">
                result-card
              </p>
              <h3 className="font-display mt-4 text-xl font-extrabold">
                Preview + sheen
              </h3>
              <p className="mt-2 text-sm text-[var(--fg-muted)]">
                Generation result surface. Hover micro-scale with gloss sweep.
              </p>
            </div>
            <p className="font-mono text-[10px] text-[var(--fg-dim)]">
              hover sheen · neon rim
            </p>
          </article>

          <article className="pricing-card pricing-card--featured flex min-h-[200px] flex-col justify-between p-6 pt-10">
            <div>
              <p className="chip border-[var(--gold-400)]/30 bg-[var(--gold-400)]/10 text-[var(--gold-200)]">
                pricing-card
              </p>
              <h3 className="font-display mt-4 text-xl font-extrabold">
                Featured tilt ribbon
              </h3>
              <p className="mt-2 text-sm text-[var(--fg-muted)]">
                Pricing comparison. Featured variant uses gold diagonal bar.
              </p>
            </div>
            <p className="font-mono text-[10px] text-[var(--fg-dim)]">
              .pricing-card--featured
            </p>
          </article>

          <article className="status-card status-card--ok flex min-h-[200px] flex-col justify-between p-6 pl-7">
            <div>
              <p className="chip border-[var(--electric-400)]/30 bg-[var(--electric-400)]/10 text-[var(--electric-200)]">
                status-card
              </p>
              <h3 className="font-display mt-4 text-xl font-extrabold">
                Task rail
              </h3>
              <p className="mt-2 text-sm text-[var(--fg-muted)]">
                Larger radius + left color rail. Variants: ok / warn / err /
                info.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="status-card status-card--ok px-3 py-1.5 text-xs font-semibold">
                ok
              </span>
              <span className="status-card status-card--warn px-3 py-1.5 text-xs font-semibold">
                warn
              </span>
              <span className="status-card status-card--err px-3 py-1.5 text-xs font-semibold">
                err
              </span>
              <span className="status-card status-card--info px-3 py-1.5 text-xs font-semibold">
                info
              </span>
            </div>
          </article>
        </div>
      </Section>

      <Section eyebrow="04 · Motion" title="Micro-interaction specs">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              name: "Hover",
              detail: "scale(1.02) + stronger shadow",
              token: "200ms · --motion-hover",
            },
            {
              name: "Press",
              detail: "scale(0.98)",
              token: "80ms · --motion-press",
            },
            {
              name: "State change",
              detail: "fade + slide 12px",
              token: "240ms · --motion-state",
            },
            {
              name: "Card enter",
              detail: "stagger 40ms · ease-out",
              token: "320ms · --motion-enter",
            },
          ].map((m) => (
            <div key={m.name} className="card motion-hover rounded-2xl p-5">
              <p className="font-display text-lg font-bold">{m.name}</p>
              <p className="mt-1 text-sm text-[var(--fg-muted)]">{m.detail}</p>
              <p className="mt-3 font-mono text-[10px] text-[var(--fg-dim)]">
                {m.token}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-[var(--fg-dim)]">
          Utilities:{" "}
          <code className="font-mono text-[var(--fg-muted)]">.motion-hover</code>
          ,{" "}
          <code className="font-mono text-[var(--fg-muted)]">.motion-press</code>
          ,{" "}
          <code className="font-mono text-[var(--fg-muted)]">
            .motion-state-in
          </code>
          ,{" "}
          <code className="font-mono text-[var(--fg-muted)]">.motion-enter</code>
          ,{" "}
          <code className="font-mono text-[var(--fg-muted)]">.motion-stagger</code>
          . Reduced-motion: animations disabled.
        </p>
      </Section>

      <Section eyebrow="05 · Gradients" title="Clash, not SaaS blue">
        <div
          className="h-28 rounded-2xl border border-white/10 shadow-lg"
          style={{ background: "var(--grad)" }}
        />
        <p className="mt-3 font-mono text-xs text-[var(--fg-dim)]">
          --grad · pink-400 → purple-400 → gold-400
        </p>
      </Section>
    </div>
  );
}
