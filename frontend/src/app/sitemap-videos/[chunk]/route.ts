import { serveSitemapFile } from "@/lib/sitemap-files";

export const runtime = "nodejs";
export const revalidate = 300;

interface RouteContext {
  params: Promise<{
    chunk: string;
  }>;
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { chunk } = await context.params;

  if (!/^[1-9]\d*$/.test(chunk)) {
    return new Response("Not found", {
      status: 404,
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  }

  return serveSitemapFile(request, `sitemap-videos-${chunk}.xml`);
}
