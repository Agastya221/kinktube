import { promises as fs } from "node:fs";
import path from "node:path";

const sitemapDir = path.join(process.cwd(), "public", "sitemaps");

const baseHeaders = {
  "Content-Type": "application/xml",
  "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
};

function isSafeSitemapFilename(filename: string): boolean {
  return /^[a-z0-9.-]+\.xml$/i.test(filename);
}

async function readFileIfExists(filePath: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(filePath);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function serveSitemapFile(
  request: Request,
  filename: string,
  fallbackXml?: () => string
): Promise<Response> {
  if (!isSafeSitemapFilename(filename)) {
    return new Response("Not found", {
      status: 404,
      headers: baseHeaders,
    });
  }

  const xmlPath = path.join(sitemapDir, filename);
  const wantsGzip = request.headers.get("accept-encoding")?.includes("gzip") ?? false;

  if (wantsGzip) {
    const gzipBytes = await readFileIfExists(`${xmlPath}.gz`);
    if (gzipBytes) {
      return new Response(new Uint8Array(gzipBytes), {
        headers: {
          ...baseHeaders,
          "Content-Encoding": "gzip",
          Vary: "Accept-Encoding",
        },
      });
    }
  }

  const xmlBytes = await readFileIfExists(xmlPath);
  if (xmlBytes) {
    return new Response(new Uint8Array(xmlBytes), {
      headers: {
        ...baseHeaders,
        Vary: "Accept-Encoding",
      },
    });
  }

  if (fallbackXml) {
    return new Response(fallbackXml(), {
      headers: baseHeaders,
    });
  }

  return new Response("Not found", {
    status: 404,
    headers: baseHeaders,
  });
}
