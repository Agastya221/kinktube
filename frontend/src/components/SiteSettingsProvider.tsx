"use client";

import { createContext, useContext } from "react";

import { fallbackPublicSiteSettings } from "@/lib/site-settings";
import type { PublicSiteSettings } from "@/lib/types";

const SiteSettingsContext = createContext<PublicSiteSettings>(fallbackPublicSiteSettings);

export function SiteSettingsProvider({
  initialSettings,
  children,
}: {
  initialSettings: PublicSiteSettings;
  children: React.ReactNode;
}) {
  return (
    <SiteSettingsContext.Provider value={initialSettings}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
