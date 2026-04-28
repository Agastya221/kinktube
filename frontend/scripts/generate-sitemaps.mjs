#!/usr/bin/env node

import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { gzip as gzipCallback } from "node:zlib";

const gzip = promisify(gzipCallback);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, "..");
const publicDir = path.join(frontendRoot, "public");
const outputDir = publicDir;
const tempDir = path.join(frontendRoot, `sitemap-build-${process.pid}-${Date.now()}`);
let workingDir = tempDir;

const MAX_URLS_PER_SITEMAP = Math.min(
  Math.max(Number(process.env.SITEMAP_MAX_URLS || "10000"), 1),
  10000
);
const API_LIMIT = MAX_URLS_PER_SITEMAP;
const STATIC_ONLY =
  process.argv.includes("--static-only") ||
  process.env.SITEMAP_STATIC_ONLY === "true";

const SITE_URL = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "https://kinktube.fun"
);

const API_BASE_URL = normalizeSiteUrl(
  process.env.SITEMAP_API_URL ||
    process.env.INTERNAL_API_URL ||
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8080"
);

const categories = [
  "bdsm",
  "femdom",
  "bondage",
  "dominatrix",
  "submission",
  "slave",
  "spanking",
  "caning",
  "whipping",
  "shibari",
  "device-bondage",
  "medical-bondage",
  "vacbed",
  "extreme-bondage",
  "predicament",
  "mummification",
  "latex",
  "leather",
  "strapon",
  "facesitting",
  "foot-fetish",
  "cbt",
  "chastity",
  "public-humiliation",
  "sensory-deprivation",
  "severe-discipline",
  "pet-play",
];

const legalPaths = [
  "/terms",
  "/privacy",
  "/contact",
  "/dmca",
  "/2257",
  "/acceptable-content",
  "/content-removal",
];

function normalizeSiteUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

function buildUrlSetXml(urls) {
  const body = urls
    .map((entry) => {
      const lines = [
        "  <url>",
        `    <loc>${escapeXml(entry.loc)}</loc>`,
      ];

      if (entry.lastmod) {
        lines.push(`    <lastmod>${formatDate(entry.lastmod)}</lastmod>`);
      }
      if (entry.changefreq) {
        lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
      }
      if (typeof entry.priority === "number") {
        lines.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
      }

      lines.push("  </url>");
      return lines.join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    body,
    "</urlset>",
    "",
  ].join("\n");
}

function buildSitemapIndexXml(videoSitemapCount, lastmod) {
  const locs = [
    `${SITE_URL}/sitemap-static.xml`,
    ...Array.from(
      { length: videoSitemapCount },
      (_, index) => `${SITE_URL}/sitemap-videos-${index + 1}.xml`
    ),
  ];

  const body = locs
    .map((loc) =>
      [
        "  <sitemap>",
        `    <loc>${escapeXml(loc)}</loc>`,
        `    <lastmod>${formatDate(lastmod)}</lastmod>`,
        "  </sitemap>",
      ].join("\n")
    )
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    body,
    "</sitemapindex>",
    "",
  ].join("\n");
}

function buildStaticSitemapXml(generatedAt) {
  return buildUrlSetXml([
    {
      loc: SITE_URL,
      lastmod: generatedAt,
      changefreq: "hourly",
      priority: 1.0,
    },
    {
      loc: `${SITE_URL}/search`,
      lastmod: generatedAt,
      changefreq: "daily",
      priority: 0.8,
    },
    ...legalPaths.map((urlPath) => ({
      loc: `${SITE_URL}${urlPath}`,
      lastmod: generatedAt,
      changefreq: "monthly",
      priority: 0.3,
    })),
    ...categories.map((category) => ({
      loc: `${SITE_URL}/category/${category}`,
      lastmod: generatedAt,
      changefreq: "daily",
      priority: 0.9,
    })),
  ]);
}

async function writeXmlFile(filename, xml) {
  const xmlPath = path.join(workingDir, filename);
  await writeFile(xmlPath, xml, "utf8");
  await writeFile(`${xmlPath}.gz`, await gzip(xml, { level: 9 }));
}

async function cleanGeneratedFiles(directory, keepFiles = new Set()) {
  const entries = await readdir(directory).catch((error) => {
    if (error?.code === "ENOENT") {
      return [];
    }
    throw error;
  });

  await Promise.all(
    entries
      .filter(
        (entry) =>
          !keepFiles.has(entry) &&
          (/^sitemap(?:-|\.xml)/.test(entry) ||
            entry === "sitemap-manifest.json")
      )
      .map((entry) => rm(path.join(directory, entry), { force: true }))
  );
}

async function fetchSitemapVideos(cursor) {
  const url = new URL("/api/sitemap/videos", API_BASE_URL);
  url.searchParams.set("cursor", String(cursor));
  url.searchParams.set("limit", String(API_LIMIT));

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Sitemap API failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const videos = Array.isArray(data.videos) ? data.videos : [];
  const fallbackCursor = videos.length > 0 ? Number(videos[videos.length - 1].id) : cursor;

  return {
    videos,
    nextCursor: Number(data.next_cursor || fallbackCursor),
    hasMore: Boolean(data.has_more),
  };
}

async function generateVideoSitemaps() {
  let cursor = 0;
  let chunk = [];
  let videoSitemapCount = 0;
  let totalVideoUrls = 0;

  while (true) {
    const batch = await fetchSitemapVideos(cursor);

    if (batch.videos.length === 0) {
      break;
    }

    for (const video of batch.videos) {
      if (!video?.id) {
        continue;
      }

      chunk.push({
        loc: `${SITE_URL}/video/${encodeURIComponent(String(video.id))}`,
        lastmod: video.last_modified || new Date(),
        changefreq: "weekly",
        priority: 0.7,
      });
      totalVideoUrls++;

      if (chunk.length === MAX_URLS_PER_SITEMAP) {
        videoSitemapCount++;
        await writeXmlFile(
          `sitemap-videos-${videoSitemapCount}.xml`,
          buildUrlSetXml(chunk)
        );
        chunk = [];
      }
    }

    if (batch.nextCursor <= cursor) {
      throw new Error(`Sitemap API cursor did not advance from ${cursor}`);
    }
    cursor = batch.nextCursor;

    if (!batch.hasMore) {
      break;
    }
  }

  if (chunk.length > 0) {
    videoSitemapCount++;
    await writeXmlFile(
      `sitemap-videos-${videoSitemapCount}.xml`,
      buildUrlSetXml(chunk)
    );
  }

  return { videoSitemapCount, totalVideoUrls };
}

async function main() {
  const generatedAt = new Date();
  await rm(tempDir, { recursive: true, force: true });
  await mkdir(tempDir, { recursive: true });

  let videoSitemapCount = 0;
  let totalVideoUrls = 0;

  await writeXmlFile("sitemap-static.xml", buildStaticSitemapXml(generatedAt));

  if (!STATIC_ONLY) {
    const videoResult = await generateVideoSitemaps();
    videoSitemapCount = videoResult.videoSitemapCount;
    totalVideoUrls = videoResult.totalVideoUrls;
  }

  await writeXmlFile("sitemap.xml", buildSitemapIndexXml(videoSitemapCount, generatedAt));

  await writeFile(
    path.join(workingDir, "sitemap-manifest.json"),
    `${JSON.stringify(
      {
        generated_at: generatedAt.toISOString(),
        site_url: SITE_URL,
        api_base_url: STATIC_ONLY ? null : API_BASE_URL,
        max_urls_per_sitemap: MAX_URLS_PER_SITEMAP,
        static_sitemap_count: 1,
        video_sitemap_count: videoSitemapCount,
        total_video_urls: totalVideoUrls,
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  const generatedFiles = await readdir(tempDir);
  await Promise.all(
    generatedFiles.map(async (entry) => {
      const bytes = await readFile(path.join(tempDir, entry));
      await writeFile(path.join(outputDir, entry), bytes);
    })
  );
  await cleanGeneratedFiles(outputDir, new Set(generatedFiles));
  await rm(tempDir, { recursive: true, force: true });

  console.log(
    `Generated sitemap index, static sitemap, ${videoSitemapCount} video sitemap(s), and gzip copies in ${path.relative(
      frontendRoot,
      outputDir
    )}`
  );
  console.log(`Video URLs: ${totalVideoUrls.toLocaleString()}`);
}

main().catch(async (error) => {
  await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  console.error(error);
  process.exitCode = 1;
});
