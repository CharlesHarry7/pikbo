#!/usr/bin/env node
/**
 * Submit pikbo.ai sitemap URLs via IndexNow (Bing / Yandex / api.indexnow.org).
 * Usage: node scripts/indexnow-submit.mjs
 * Requires production deploy with public/{key}.txt live.
 */

const SITE = "https://pikbo.ai";
const KEY = "a01c61cbb6aae8e81ca62f4e66ebd5ba";
const KEY_LOCATION = `${SITE}/${KEY}.txt`;
const ENDPOINTS = [
  "https://api.indexnow.org/indexnow",
  "https://www.bing.com/indexnow",
];

async function fetchSitemapUrls() {
  const res = await fetch(`${SITE}/sitemap.xml`, {
    headers: { "User-Agent": "PikboIndexNow/1.0" },
  });
  if (!res.ok) throw new Error(`sitemap ${res.status}`);
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  if (!urls.includes(SITE)) urls.unshift(SITE);
  return [...new Set(urls)];
}

async function verifyKey() {
  const res = await fetch(KEY_LOCATION, { headers: { "User-Agent": "PikboIndexNow/1.0" } });
  const text = (await res.text()).trim();
  if (!res.ok || text !== KEY) {
    throw new Error(
      `IndexNow key file missing or wrong (http=${res.status} body=${JSON.stringify(text.slice(0, 40))}). Deploy public/${KEY}.txt first.`
    );
  }
}

async function submitBatch(endpoint, urlList) {
  const body = {
    host: "pikbo.ai",
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList,
  };
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "User-Agent": "PikboIndexNow/1.0",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text().catch(() => "");
  return { endpoint, status: res.status, body: text.slice(0, 200) };
}

async function main() {
  console.log("IndexNow · verify key…");
  await verifyKey();
  console.log("key OK:", KEY_LOCATION);

  const urls = await fetchSitemapUrls();
  console.log("urls from sitemap:", urls.length);

  // IndexNow allows large batches; keep chunks of 100 for friendliness.
  const chunk = 100;
  for (const endpoint of ENDPOINTS) {
    for (let i = 0; i < urls.length; i += chunk) {
      const batch = urls.slice(i, i + chunk);
      const r = await submitBatch(endpoint, batch);
      console.log(JSON.stringify(r));
      // 200 / 202 accepted; 422 key issue
      if (r.status >= 400 && r.status !== 202) {
        console.error("submit soft-fail", r);
      }
    }
  }
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
