import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AgeVerification from "@/components/AgeVerification";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import { PopunderAd } from "@/components/ads";
import Analytics from "@/components/Analytics";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "KinkTube - Extreme BDSM & Hardcore Fetish Videos",
    template: "%s | KinkTube",
  },
  description:
    "The underground destination for extreme BDSM, hardcore femdom, intense bondage, and severe fetish content. Explore mummification, predicament bondage, brutal discipline, and more. 100% free.",
  keywords: [
    "extreme BDSM",
    "hardcore femdom",
    "intense bondage",
    "severe discipline",
    "brutal domination",
    "predicament bondage",
    "sensory deprivation",
    "mummification",
    "tight bondage",
    "harsh punishment",
    "cruel mistress",
    "extreme fetish",
    "torture",
    "BDSM videos",
    "fetish",
    "bondage",
    "femdom",
    "kink",
    "dominatrix",
    "submission",
    "slave",
  ],
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
    siteName: "KinkTube",
    title: "KinkTube - Extreme BDSM & Hardcore Fetish Videos",
    description:
      "The underground destination for extreme BDSM, hardcore femdom, intense bondage, and severe fetish content.",
  },
  twitter: {
    card: "summary_large_image",
    title: "KinkTube - Extreme BDSM & Hardcore Fetish Videos",
    description:
      "The underground destination for extreme BDSM, hardcore femdom, intense bondage, and severe fetish content.",
  },
  verification: {
    // Add your verification codes here
    // google: 'your-google-verification-code',
  },
  other: {
    "rating": "adult",
    "RATING": "RTA-5042-1996-1400-1577-RTA",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* RTA Label for adult content filtering */}
        <meta name="rating" content="adult" />
        <meta name="RATING" content="RTA-5042-1996-1400-1577-RTA" />
      </head>
      <body className="min-h-screen flex flex-col bg-background text-foreground antialiased">
        <Analytics />
        <AgeVerification>
          <DisclaimerBanner />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <PopunderAd />
        </AgeVerification>
      </body>
    </html>
  );
}
