"use client";

import Link from "next/link";

import { useSiteSettings } from "./SiteSettingsProvider";

export default function Footer() {
  const siteSettings = useSiteSettings();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-background-secondary border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="text-xl font-bold">
              <span className="text-accent">{siteSettings.branding.logo_primary}</span>
              <span className="text-foreground">{siteSettings.branding.logo_secondary}</span>
            </Link>
            <p className="mt-2 text-foreground-muted text-sm max-w-md">
              {siteSettings.branding.footer_description}
            </p>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Top Categories</h3>
            <div className="grid grid-cols-2 gap-x-4">
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/category/femdom" className="text-foreground-muted hover:text-accent transition-colors">Femdom</Link>
                </li>
                <li>
                  <Link href="/category/bondage" className="text-foreground-muted hover:text-accent transition-colors">Bondage</Link>
                </li>
                <li>
                  <Link href="/category/shibari" className="text-foreground-muted hover:text-accent transition-colors">Shibari</Link>
                </li>
                <li>
                  <Link href="/category/slave" className="text-foreground-muted hover:text-accent transition-colors">Slave</Link>
                </li>
                <li>
                  <Link href="/category/latex" className="text-foreground-muted hover:text-accent transition-colors">Latex</Link>
                </li>
              </ul>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/category/strapon" className="text-foreground-muted hover:text-accent transition-colors">Strapon</Link>
                </li>
                <li>
                  <Link href="/category/spanking" className="text-foreground-muted hover:text-accent transition-colors">Spanking</Link>
                </li>
                <li>
                  <Link href="/category/medical-bondage" className="text-foreground-muted hover:text-accent transition-colors">Medical</Link>
                </li>
                <li>
                  <Link href="/category/vacbed" className="text-foreground-muted hover:text-accent transition-colors">Vacbed</Link>
                </li>
                <li>
                  <Link href="/category/cbt" className="text-foreground-muted hover:text-accent transition-colors">CBT</Link>
                </li>
              </ul>
            </div>
          </div>

          {/* BDSM Styles */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Niche Fetish</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/category/mummification" className="text-foreground-muted hover:text-accent transition-colors">Mummification</Link>
              </li>
              <li>
                <Link href="/category/pet-play" className="text-foreground-muted hover:text-accent transition-colors">Pet Play</Link>
              </li>
              <li>
                <Link href="/category/chastity" className="text-foreground-muted hover:text-accent transition-colors">Chastity</Link>
              </li>
              <li>
                <Link href="/category/sensory-deprivation" className="text-foreground-muted hover:text-accent transition-colors">Sensory Deprivation</Link>
              </li>
              <li>
                <Link href="/category/extreme-bondage" className="text-foreground-muted hover:text-accent transition-colors">Extreme Bondage</Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/terms"
                  className="text-foreground-muted hover:text-accent transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-foreground-muted hover:text-accent transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-foreground-muted hover:text-accent transition-colors"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="/2257"
                  className="text-foreground-muted hover:text-accent transition-colors"
                >
                  18 U.S.C. 2257
                </Link>
              </li>
              <li>
                <Link
                  href="/acceptable-content"
                  className="text-foreground-muted hover:text-accent transition-colors"
                >
                  Acceptable Content
                </Link>
              </li>
              <li>
                <Link
                  href="/content-removal"
                  className="text-foreground-muted hover:text-accent transition-colors"
                >
                  Content Removal
                </Link>
              </li>
              <li>
                <Link
                  href="/dmca"
                  className="text-foreground-muted hover:text-accent transition-colors"
                >
                  DMCA
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-foreground-muted text-sm">
              &copy; {currentYear} {siteSettings.branding.copyright_label}. All rights reserved.
            </p>
            <p className="text-foreground-muted text-xs">
              This site contains adult content. You must be 18+ to enter.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
