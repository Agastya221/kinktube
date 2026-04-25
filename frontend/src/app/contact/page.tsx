import { Metadata } from "next";

import ContactForm from "@/components/ContactForm";
import { getPublicSiteSettingsServer } from "@/lib/api";
import { fallbackPublicSiteSettings } from "@/lib/site-settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSiteSettingsServer().catch(() => fallbackPublicSiteSettings);
  return {
    title: "Contact",
    description: `Contact ${settings.branding.site_name}`,
    robots: { index: true, follow: true },
  };
}

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-4">Contact</h1>
      <p className="text-foreground-muted leading-relaxed">
        Use this form for content removal requests, DMCA notices, privacy requests, and general site messages.
      </p>
      <ContactForm defaultType="content_removal" />
    </div>
  );
}
