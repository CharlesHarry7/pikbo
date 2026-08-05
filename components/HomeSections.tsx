"use client";

import Link from "next/link";

/* ── Toy Effect cards (same as effects page but inline) ── */
const EFFECTS = [
  { emoji: "🎬", name: "Unboxing Reveal", desc: "Cinematic unboxing with confetti & 3D spin", tags: ["New", "Cinematic"] },
  { emoji: "💃", name: "Toy Dance", desc: "Fluid dance with music sync", tags: ["Hot", "Motion"] },
  { emoji: "✨", name: "Magic Sparkle", desc: "Enchanting sparkles & glow", tags: ["Glow"] },
  { emoji: "🌀", name: "Portal Arrival", desc: "Interdimensional portal effect", tags: ["Sci-Fi"] },
  { emoji: "🎨", name: "Art Style Transfer", desc: "Pop art, anime, oil painting", tags: ["Art"] },
  { emoji: "👾", name: "Glitch Wave", desc: "Cyberpunk RGB glitch", tags: ["Cyberpunk"] },
  { emoji: "🎪", name: "Stop Motion", desc: "Clay-style frame animation", tags: ["Classic"] },
  { emoji: "🌊", name: "Water Reflection", desc: "Serene ripples & mirroring", tags: ["Nature"] },
];

const COMMUNITY = [
  { initials: "LL", name: "LabubuLove", effect: "Magic Sparkle", desc: "Labubu Macaron full set reveal ✨", views: "12.4K", likes: "892" },
  { initials: "DS", name: "DimooSpace", effect: "Toy Dance", desc: "Dimoo Social University dance 💃", views: "8.9K", likes: "654" },
  { initials: "SP", name: "SkullpandaHQ", effect: "Glitch Wave", desc: "Skullpanda Warmth glitch remix 🔥", views: "15.2K", likes: "1.2K" },
  { initials: "HR", name: "HironoLife", effect: "Art Style", desc: "Hirono in anime style 🎨", views: "7.1K", likes: "511" },
];

export function HomeEffectsGrid() {
  return (
    <section className="py-24 px-4">
      <div className="container-x">
        <div className="text-center mb-16">
          <span className="section-label">Toy Effect Studio</span>
          <h2 className="text-4xl sm:text-5xl font-display font-bold mt-4 mb-4 tracking-tight">
            10+ AI Effects for Designer Toys
          </h2>
          <p className="text-[var(--fg-muted)] text-lg max-w-xl mx-auto">
            Each effect is purpose-built for collectible figures. Upload a photo, pick an effect, get a stunning video.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {EFFECTS.map((fx) => (
            <Link
              key={fx.name}
              href={`/effects/${fx.name.toLowerCase().replace(/\s+/g, "-")}`}
              className="card-i group bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden"
            >
              <div className="aspect-square bg-[var(--bg-soft)] flex items-center justify-center relative">
                <span className="text-4xl transition-transform duration-300 group-hover:scale-110">{fx.emoji}</span>
                {fx.tags.includes("New") && (
                  <span className="absolute top-3 right-3 text-[0.6rem] font-bold uppercase tracking-wider bg-[var(--mint)] text-black px-2 py-0.5 rounded-full">New</span>
                )}
                {fx.tags.includes("Hot") && (
                  <span className="absolute top-3 right-3 text-[0.6rem] font-bold uppercase tracking-wider bg-[#ec4899] text-white px-2 py-0.5 rounded-full">Hot</span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-sm">{fx.name}</h3>
                <p className="text-[var(--fg-dim)] text-xs mt-1">{fx.desc}</p>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {fx.tags.map((t) => (
                    <span key={t} className="text-[0.6rem] px-2 py-0.5 rounded-full bg-white/5 text-[var(--fg-muted)]">{t}</span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link href="/effects" className="btn btn-ghost text-sm">
            View All Effects →
          </Link>
        </div>
      </div>
    </section>
  );
}

export function HomeCommunityHighlights() {
  return (
    <section className="py-24 px-4 bg-[var(--bg-soft)]">
      <div className="container-x">
        <div className="text-center mb-16">
          <span className="section-label">Community</span>
          <h2 className="text-4xl sm:text-5xl font-display font-bold mt-4 mb-4 tracking-tight">
            See What Others Are Creating
          </h2>
          <p className="text-[var(--fg-muted)] text-lg max-w-xl mx-auto">
            Toy collectors worldwide use Pikbo to showcase their collections. Join the community.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {COMMUNITY.map((c) => (
            <Link
              key={c.name}
              href="/community"
              className="card-i group bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden"
            >
              <div className="aspect-[9/16] bg-[var(--bg)] flex items-center justify-center relative">
                <div className="w-12 h-12 rounded-full bg-black/50 border-2 border-white/30 flex items-center justify-center group-hover:border-[var(--mint)] group-hover:bg-[var(--mint)]/20 transition-all">
                  <svg className="w-4 h-4 fill-white ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--mint)] to-[#7fe6b4] flex items-center justify-center text-black text-[0.6rem] font-bold">{c.initials}</div>
                  <span className="font-semibold text-xs">{c.name}</span>
                  <span className="text-[0.6rem] text-[var(--mint)] ml-auto">{c.effect}</span>
                </div>
                <p className="text-[var(--fg-dim)] text-xs mt-1">{c.desc}</p>
                <div className="flex gap-3 text-[0.65rem] text-[var(--fg-dim)] mt-2">
                  <span>{c.views} views</span>
                  <span>{c.likes} likes</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link href="/community" className="btn btn-ghost text-sm">
            Explore Community →
          </Link>
        </div>
      </div>
    </section>
  );
}

export function HomePricing() {
  return (
    <section className="py-24 px-4" id="pricing">
      <div className="container-x max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <span className="section-label">Pricing</span>
          <h2 className="text-4xl sm:text-5xl font-display font-bold mt-4 mb-4 tracking-tight">
            Start Creating Today
          </h2>
          <p className="text-[var(--fg-muted)] text-lg">One plan, everything included.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {/* Free tier */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8">
            <div className="text-[var(--fg-muted)] font-medium mb-3">Free</div>
            <div className="text-5xl font-bold mb-1">$0</div>
            <div className="text-[var(--fg-dim)] text-sm mb-8">forever</div>
            <ul className="space-y-3 mb-8 text-sm text-[var(--fg-muted)]">
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[var(--mint)] shrink-0" /> 3 directed Moments / month</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[var(--mint)] shrink-0" /> 5 basic effects</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[var(--mint)] shrink-0" /> 720p export</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[var(--mint)] shrink-0" /> Community access</li>
            </ul>
            <Link href="/create" className="btn btn-ghost w-full text-center text-sm">Start Free</Link>
          </div>

          {/* Founding Studio */}
          <div className="bg-[var(--card)] border-2 border-[var(--mint)] rounded-2xl p-8 relative shadow-[0_0_40px_rgba(203,255,61,0.1)]">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[var(--mint)] text-black text-[0.65rem] font-bold uppercase tracking-wider px-4 py-1 rounded-full">Most Popular</div>
            <div className="text-[var(--fg-muted)] font-medium mb-3">Founding Studio</div>
            <div className="text-5xl font-bold mb-1">$49</div>
            <div className="text-[var(--fg-dim)] text-sm mb-8">per month</div>
            <ul className="space-y-3 mb-8 text-sm text-[var(--fg-muted)]">
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[var(--mint)] shrink-0" /> 9 directed Moments / month</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[var(--mint)] shrink-0" /> All 10+ premium effects</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[var(--mint)] shrink-0" /> 4K video export</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[var(--mint)] shrink-0" /> Priority processing</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[var(--mint)] shrink-0" /> Commercial license</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[var(--mint)] shrink-0" /> Early access to new effects</li>
            </ul>
            <Link href="/pricing" className="btn btn-primary w-full text-center text-sm">Get Started</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
