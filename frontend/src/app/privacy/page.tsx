import { Metadata } from "next";

import LegalContactCta from "@/components/LegalContactCta";
import { getPublicSiteSettingsServer } from "@/lib/api";
import { fallbackPublicSiteSettings } from "@/lib/site-settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSiteSettingsServer().catch(() => fallbackPublicSiteSettings);
  return {
    title: settings.legal.privacy.title,
    description: `${settings.branding.site_name} ${settings.legal.privacy.title}`,
    robots: { index: true, follow: true },
  };
}

export default async function PrivacyPage() {
  const settings = await getPublicSiteSettingsServer().catch(() => fallbackPublicSiteSettings);
  const doc = settings.legal.privacy;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-8">{doc.title}</h1>
      <div className="prose prose-invert prose-zinc max-w-none">
        <div className="text-foreground-muted leading-relaxed whitespace-pre-line">
          {doc.content}
        </div>
      </div>
      <LegalContactCta />
    </div>
  );
}
