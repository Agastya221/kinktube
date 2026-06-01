"use client";

import { usePathname } from "next/navigation";

import AgeVerification from "./AgeVerification";
import { SiteSettingsProvider } from "./SiteSettingsProvider";
import { themeStyleFromSettings } from "@/lib/site-settings";
import type { PublicSiteSettings } from "@/lib/types";

interface ChromeGateProps {
  settings: PublicSiteSettings;
  children: React.ReactNode;
  header: React.ReactNode;
  footer: React.ReactNode;
  popunder: React.ReactNode;
  stickyMobile: React.ReactNode;
  inPagePush: React.ReactNode;
  interstitial: React.ReactNode;
  aboveFooterAd: React.ReactNode;
  analytics: React.ReactNode;
}

export default function ChromeGate({
  settings,
  children,
  header,
  footer,
  popunder,
  stickyMobile,
  inPagePush,
  interstitial,
  aboveFooterAd,
  analytics,
}: ChromeGateProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/portal/");

  const siteBody = (
    <>
      {analytics}
      {header}
      <main className="flex-1">{children}</main>
      {aboveFooterAd}
      {footer}
      {popunder}
      {stickyMobile}
      {inPagePush}
      {interstitial}
    </>
  );

  return (
    <SiteSettingsProvider initialSettings={settings}>
      <div
        style={themeStyleFromSettings(settings)}
        className="min-h-screen flex flex-col bg-background text-foreground antialiased"
      >
        {isAdminRoute ? children : (
          settings.content.enable_age_gate ? <AgeVerification>{siteBody}</AgeVerification> : siteBody
        )}
      </div>
    </SiteSettingsProvider>
  );
}
