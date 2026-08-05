# AIT-30 design system result

**Date:** 2026-08-06  
**Routes:** `/dev/design-system`, `/brand` (alias)  
**Component:** `components/BrandKit.tsx`

## Tokens used

### Canvas & companions
| Token | Value | Notes |
|---|---|---|
| `--bg` | `#0a0a0a` | Soft-launch main canvas (unchanged) |
| `--cream` | `#FFF8E7` | Milk white paper |
| `--noir` | `#1A1A2E` | Black-gold companion deep |

### 8-color palette × 7 steps (`50/100/200/400/600/800/900`)
| Prefix | Role | Base (400) |
|---|---|---|
| `--pink-*` | 主色 · pastelpop | `#FFB6D9` |
| `--purple-*` | 主色 · violet | `#C77DFF` |
| `--gold-*` | 主色 · black-gold | `#FFC857` |
| `--neon-*` | 强调 · neon green | `#39FF14` |
| `--flash-*` | 强调 · fluoro yellow | `#F5FF40` |
| `--electric-*` | 强调 · electric blue | `#00F0FF` |
| `--ink-*` | 中性 · ink black | `#0E0E12` (800) |
| `--fog-*` | 中性 · fog gray | `#8B8B95` |

All mapped into Tailwind v4 `@theme inline` as `--color-{prefix}-{step}` (e.g. `bg-pink-400`, `text-neon-400`).

Legacy aliases (`--mint`, `--lime`, `--brand`) now resolve to `--neon-400` so existing UI keeps working.

### Type (next/font)
| Role | Face | CSS var | Weights |
|---|---|---|---|
| Display | Plus Jakarta Sans | `--font-display` ← `--font-plus-jakarta` | 400–800 |
| Body | DM Sans | `--font-sans` ← `--font-dm-sans` | 400–700 |

Loaded in `app/layout.tsx` with `display: "swap"` (no CLS).

### Cards (globals.css)
| Class | Purpose |
|---|---|
| `.collection-card` | Speckles + pink/violet halo |
| `.result-card` | Result preview; hover scale + sheen sweep |
| `.pricing-card` / `.pricing-card--featured` | Pricing; featured tilt gold ribbon |
| `.status-card` (+ `--ok/--warn/--err/--info`) | Task status; large radius + left rail |

### Motion tokens & utilities
| Spec | Token / class |
|---|---|
| Hover scale 1.02 + shadow · 200ms | `--motion-hover` · `.motion-hover` |
| Press scale 0.98 · 80ms | `--motion-press` · `.motion-press` |
| State fade + slide 12px · 240ms | `--motion-state` · `.motion-state-in` |
| Card enter 320ms ease-out, stagger 40ms | `--motion-enter` / `--motion-stagger` · `.motion-enter` / `.motion-stagger` |

`prefers-reduced-motion` disables card motion and enter animations.

## Screenshots
- `full-desktop.png` — full page desktop
- `hero-viewport.png` — above-the-fold
- `cards-viewport.png` — card recipes
- `full-mobile.png` — mobile full page

## Constraints honored
- `lib/site.ts` TDH copy untouched
- Compatible with `#0a0a0a` background
- Pure CSS + Tailwind; no extra JS motion libraries
- Design-system routes `robots: noindex`

## Gradient identity
`--grad` uses pink → purple → gold (collectible clash), not generic blue SaaS gradients.
