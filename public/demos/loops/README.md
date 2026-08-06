# IP motion loops (HF-style swap)

Place generated 潮玩 videos here to auto-upgrade wall stills to playable motion:

```
public/demos/loops/{id}.mp4
public/demos/loops/{id}.webm   # optional
```

IDs match `lib/homeAttractionFeed.ts` / `VIDEO_READY_SLOTS.json`, e.g.:

- `fx-mecha-neon.mp4`
- `jp-anime-scale.mp4`
- `us-urban-vinyl.mp4`

Homepage wall detects files at build/runtime and plays them automatically.
