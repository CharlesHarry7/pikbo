import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const imgDir =
  '/Users/x/.grok/sessions/%2FUsers%2Fx/019f88f5-0d4a-7ee2-ad35-49f3a675aaa7/images';
// flashy batch 19-26 (parallel order may vary — install by number then verify sizes)
const ids = [
  { n: 19, id: 'fx-mecha-neon' },
  { n: 20, id: 'fx-vinyl-neon' },
  { n: 21, id: 'fx-scale-rays' },
  { n: 22, id: 'fx-blindbox-holo' },
  { n: 23, id: 'fx-action-blast' },
  { n: 24, id: 'fx-sofubi-glow' },
  { n: 25, id: 'fx-pop-led' },
  { n: 26, id: 'fx-shelf-led' },
];

const studio = 'public/collectibles/studio';
const coll = 'public/collectibles';
const loops = 'public/demos/loops';
fs.mkdirSync(studio, { recursive: true });
fs.mkdirSync(loops, { recursive: true });

const installed = [];
for (const { n, id } of ids) {
  const src = path.join(imgDir, `${n}.jpg`);
  if (!fs.existsSync(src)) {
    console.log('skip missing', n);
    continue;
  }
  await sharp(src)
    .resize({ width: 1400, withoutEnlargement: true })
    .jpeg({ quality: 92 })
    .toFile(path.join(studio, `${id}.jpg`));
  await sharp(src)
    .resize({ width: 1080, height: 1350, fit: 'cover', position: 'centre' })
    .webp({ quality: 90 })
    .toFile(path.join(coll, `${id}.webp`));
  installed.push(id);
  console.log('ok', id, fs.statSync(path.join(coll, `${id}.webp`)).size);
}

// also refresh demo posters to flashy variants where sensible
const posterMap = {
  'orbit-still.webp': 'fx-mecha-neon',
  'moon-float.webp': 'fx-blindbox-holo',
  'scout-still.webp': 'fx-scale-rays',
  'beatbot-still.webp': 'fx-vinyl-neon',
};
for (const [demo, id] of Object.entries(posterMap)) {
  const jpg = path.join(studio, `${id}.jpg`);
  if (!fs.existsSync(jpg)) continue;
  await sharp(jpg)
    .resize({ width: 1200 })
    .webp({ quality: 90 })
    .toFile(path.join('public/demos', demo));
  console.log('poster', demo);
}

fs.writeFileSync(
  path.join(coll, 'FLASHY_MANIFEST.json'),
  JSON.stringify({ installed, at: new Date().toISOString() }, null, 2)
);
console.log('done', installed.length);
