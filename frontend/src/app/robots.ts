import { MetadataRoute } from "next";
import { getPublicSiteSettingsServer } from "@/lib/api";
import { fallbackPublicSiteSettings } from "@/lib/site-settings";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getPublicSiteSettingsServer().catch(() => fallbackPublicSiteSettings);
  const siteURL = settings.seo.site_url || fallbackPublicSiteSettings.seo.site_url;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/portal/", "/search?"],
      },
      {
        userAgent: ["GPTBot", "ChatGPT-User", "CCBot", "anthropic-ai"],
        disallow: ["/"],
      },
    ],
    sitemap: `${siteURL}/sitemap.xml`,
  };
}
