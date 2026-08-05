# AIT-128 · Pricing free-tier 390px proof

Date: 2026-08-06  
Viewport: **390 × 844** (deviceScaleFactor 2)  
Local: `next dev` → `/pricing`

## Browser metrics

| Check | Result |
|---|---|
| Horizontal overflow (`scrollWidth - innerWidth`) | **0** |
| Free Lab Viewer card present (`data-pricing-tier=free`) | yes |
| Founding Studio card present | yes |
| Free CTA href | `/explore` |
| Free CTA label | Watch Lab demos |
| Paid closed path (`data-billing-cta=closed-intent`) | yes |
| Card right edge ≤ 390 | free/paid right = 374 |

## Screenshots

- `pricing-390-cards.png` — above-the-fold viewport
- `pricing-390-full.png` — full page

## Source smoke

```bash
npm run pricing-free-tier-smoke
```

Locks free shelf tokens, Explore CTA, closed-intent paid CTA, and 390-safe CSS.
