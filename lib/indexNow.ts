/**
 * IndexNow — notify Bing / Yandex / compatible engines of new/updated URLs.
 * Key file lives at /public/{INDEXNOW_KEY}.txt (content = key only).
 * Google Search Console is separate (no IndexNow) — submit sitemap there.
 */

import { site } from "@/lib/site";

/** UTF-8 key; must match public/{key}.txt body exactly. */
export const INDEXNOW_KEY = "a01c61cbb6aae8e81ca62f4e66ebd5ba";

export function indexNowKeyLocation() {
  return `${site.url}/${INDEXNOW_KEY}.txt`;
}

/** Endpoints that accept the IndexNow protocol. */
export const INDEXNOW_ENDPOINTS = [
  "https://api.indexnow.org/indexnow",
  "https://www.bing.com/indexnow",
  "https://yandex.com/indexnow",
] as const;

export function indexNowPayload(urlList: string[]) {
  const urls = [...new Set(urlList)].filter((u) =>
    u.startsWith(`${site.url}/`) || u === site.url
  );
  return {
    host: site.domain,
    key: INDEXNOW_KEY,
    keyLocation: indexNowKeyLocation(),
    urlList: urls.slice(0, 10000),
  };
}
