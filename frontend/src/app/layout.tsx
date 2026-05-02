import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ChromeGate from "@/components/ChromeGate";
import HeaderWrapper from "@/components/HeaderWrapper";
import Footer from "@/components/Footer";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import { PopunderAd, StickyMobileBanner, InPagePush, InterstitialAd, AboveFooterAd } from "@/components/ads";
import Analytics from "@/components/Analytics";
import { getPublicSiteSettingsServer } from "@/lib/api";
import { fallbackPublicSiteSettings } from "@/lib/site-settings";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export async function generateMetadata(): Promise<Metadata> {
  let settings = fallbackPublicSiteSettings;

  try {
    settings = await getPublicSiteSettingsServer();
  } catch {
    settings = fallbackPublicSiteSettings;
  }

  const siteURL = settings.seo.site_url || "https://kinktube.fun";

  return {
    metadataBase: new URL(siteURL),
    title: {
      default: settings.seo.default_title,
      template: settings.seo.title_template || `%s | ${settings.branding.site_name}`,
    },
    description: settings.seo.default_description,
    keywords: settings.seo.default_keywords,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: settings.branding.site_name,
      title: settings.seo.open_graph_title,
      description: settings.seo.open_graph_description,
    },
    twitter: {
      card: "summary_large_image",
      title: settings.seo.twitter_title,
      description: settings.seo.twitter_description,
    },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "48x48" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon.png", sizes: "180x180", type: "image/png" },
      ],
      shortcut: "/favicon.ico",
      apple: "/apple-touch-icon.png",
    },
    other: {
      rating: "adult",
      RATING: "RTA-5042-1996-1400-1577-RTA",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let siteSettings = fallbackPublicSiteSettings;

  try {
    siteSettings = await getPublicSiteSettingsServer();
  } catch {
    siteSettings = fallbackPublicSiteSettings;
  }

  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Anti-FOUC script for Age Verification */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var stored = localStorage.getItem('kinktube_age_verified');
                if (stored) {
                  var data = JSON.parse(stored);
                  var isExpired = Date.now() - data.timestamp > 30 * 24 * 60 * 60 * 1000;
                  if (!isExpired && data.verified) {
                    document.documentElement.classList.add('age-verified');
                  }
                }
              } catch (e) {}
            `,
          }}
        />
        {/* RTA Label for adult content filtering */}
        <meta name="rating" content="adult" />
        <meta name="RATING" content="RTA-5042-1996-1400-1577-RTA" />
        <meta
          httpEquiv="Accept-CH"
          content="Sec-CH-UA, Sec-CH-UA-Mobile, Sec-CH-UA-Platform, Sec-CH-UA-Arch, Sec-CH-UA-Model"
        />
        {/* Google Analytics (GA4) */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-P4CFF7KKH9"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-P4CFF7KKH9');
            `,
          }}
        />
        {/* Schema.org WebSite & Organization (Logo snippet) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "KinkTube",
              "url": "https://kinktube.fun",
              "publisher": {
                "@type": "Organization",
                "name": "KinkTube",
                "logo": {
                  "@type": "ImageObject",
                  "url": "https://kinktube.fun/logo.jpeg"
                }
              }
            })
          }}
        />
      </head>
      <body>
        <ChromeGate
          settings={siteSettings}
          analytics={<Analytics />}
          disclaimer={<DisclaimerBanner />}
          header={<HeaderWrapper />}
          footer={<Footer />}
          popunder={<PopunderAd />}
          stickyMobile={<StickyMobileBanner />}
          inPagePush={<InPagePush />}
          interstitial={<InterstitialAd />}
          aboveFooterAd={
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 hidden md:block">
              <AboveFooterAd />
            </div>
          }
        >
          {children}
        </ChromeGate>
      </body>
    </html>
  );
}
