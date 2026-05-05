#!/usr/bin/env tsx
/**
 * Submit generated sitemap URLs through IndexNow.
 *
 * IndexNow is supported by Bing and Yandex and submitted URLs are shared with
 * participating search engines. This complements XML sitemaps; it does not
 * guarantee indexing.
 */

import * as fs from "fs";
import * as path from "path";

const SITE_URL = (
  process.env.SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://kinktube.fun"
).replace(/\/+$/, "");

const HOST = new URL(SITE_URL).host;
const PUBLIC_DIR = path.resolve(__dirname, "..", "public");

const INDEXNOW_KEY =
  process.env.INDEXNOW_KEY || "a4f9c2d8e6b1430fa91c7d35b8e2046c";
const INDEXNOW_KEY_LOCATION =
  process.env.INDEXNOW_KEY_LOCATION || `${SITE_URL}/${INDEXNOW_KEY}.txt`;

const DEFAULT_ENDPOINTS = [
  "https://api.indexnow.org/indexnow",
  "https://www.bing.com/indexnow",
  "https://yandex.com/indexnow",
];

const INDEXNOW_ENDPOINTS = (
  process.env.INDEXNOW_ENDPOINTS || DEFAULT_ENDPOINTS.join(",")
)
  .split(",")
  .map((endpoint) => endpoint.trim())
  .filter(Boolean);

const MAX_URLS_PER_REQUEST = 10_000;
const DRY_RUN = process.env.INDEXNOW_DRY_RUN === "true";

function readXml(filename: string): string {
  return fs.readFileSync(path.join(PUBLIC_DIR, filename), "utf-8");
}

function extractLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) =>
    match[1].trim()
  );
}

function getUrlList(): string[] {
  const sitemapFiles = [
    "sitemap-static.xml",
    "sitemap-categories.xml",
    ...fs
      .readdirSync(PUBLIC_DIR)
      .filter((filename) => /^sitemap-videos-\d+\.xml$/.test(filename))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
  ];

  const urls = new Set<string>();

  for (const filename of sitemapFiles) {
    const filepath = path.join(PUBLIC_DIR, filename);
    if (!fs.existsSync(filepath)) continue;

    for (const loc of extractLocs(readXml(filename))) {
      if (loc.startsWith(`${SITE_URL}/`)) {
        urls.add(loc);
      }
    }
  }

  return [...urls];
}

async function submitChunk(endpoint: string, urlList: string[]): Promise<void> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: INDEXNOW_KEY_LOCATION,
      urlList,
    }),
  });

  if (!response.ok && response.status !== 202) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `${endpoint} returned ${response.status}${body ? `: ${body}` : ""}`
    );
  }

  console.log(`  OK ${endpoint} (${response.status})`);
}

async function main() {
  const urls = getUrlList();

  if (!urls.length) {
    throw new Error("No sitemap URLs found. Run npm run generate:sitemap first.");
  }

  console.log("IndexNow submission");
  console.log(`  Site: ${SITE_URL}`);
  console.log(`  Key:  ${INDEXNOW_KEY_LOCATION}`);
  console.log(`  URLs: ${urls.length}`);

  if (DRY_RUN) {
    console.log("  Dry run: not submitting to IndexNow endpoints.");
    console.log(`  First URL: ${urls[0]}`);
    console.log(`  Last URL:  ${urls[urls.length - 1]}`);
    return;
  }

  for (let start = 0; start < urls.length; start += MAX_URLS_PER_REQUEST) {
    const chunk = urls.slice(start, start + MAX_URLS_PER_REQUEST);

    for (const endpoint of INDEXNOW_ENDPOINTS) {
      await submitChunk(endpoint, chunk);
    }
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error("IndexNow submission failed:", err);
  process.exit(1);
});
