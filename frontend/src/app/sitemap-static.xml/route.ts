import { serveSitemapFile } from "@/lib/sitemap-files";
import { buildStaticSitemapXml } from "@/lib/sitemap-static";

export const runtime = "nodejs";
export const revalidate = 300;

export async function GET(request: Request): Promise<Response> {
  return serveSitemapFile(request, "sitemap-static.xml", () =>
    buildStaticSitemapXml(new Date())
  );
}
