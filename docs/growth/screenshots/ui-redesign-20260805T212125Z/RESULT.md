# UI redesign screenshots — Login vault ritual

**Timestamp:** 2026-08-05T21:21:32Z  
**Branch:** agent/grok/login-vault-ritual-main  
**Base:** main@bd559e6 (#167 Pop Mart tokens)

## Focus
Sign-in gate (`/login`) rebuilt as a **collector vault ritual** so the required private-shelf path matches 潮玩 visual language already on Home/Create/Library/Pricing.

## Deliverables
| File | Viewport | Notes |
|------|----------|-------|
| login-desktop.png | 1440×900 | Gradient H1, stickers, status-card steps, collection-card vault |
| login-mobile.png | 390×844 | Stacked vault capsule |
| home-desktop.png | 1440×900 | Context after #167 |
| create-guest-desktop.png | 1440×900 | Guest honesty path |
| library-guest-desktop.png | 1440×900 | |
| pricing-desktop.png | 1440×900 | |

## Interaction
- Pink magic-link primary CTA
- Electric Google secondary when configured
- Guest product-first: Preview Street Power-Up (cached / not-your-toy / 0 credits)
- No auth logic change; magic-link + OAuth payloads preserved

## Frozen TDH
`lib/site.ts` homeH1 untouched: **One toy photo. More ways to sell.**
