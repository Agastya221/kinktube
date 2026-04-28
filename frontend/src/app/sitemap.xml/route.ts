import { serveSitemapFile } from "@/lib/sitemap-files";
import { buildSitemapIndexXml } from "@/lib/sitemap-static";

export const runtime = "nodejs";
export const revalidate = 300;

export async function GET(request: Request): Promise<Response> {
  return serveSitemapFile(request, "sitemap.xml", () =>
    buildSitemapIndexXml(0, new Date())
  );
}
