import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Lock, ShieldCheck } from "lucide-react";
import BdsmQuiz from "@/components/BdsmQuiz";
import {
  bdsmGuideLinks,
  bdsmTestFaqs,
  bdsmQuizResults,
} from "@/lib/bdsm-seo-content";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://kinktube.fun"
).replace(/\/+$/, "");

const pageUrl = `${SITE_URL}/bdsm-test`;

export const metadata: Metadata = {
  title: "BDSM Test - Free BDSM Quiz for Kink Preferences",
  description:
    "Take a private BDSM test to explore bondage, dominance, submission, sensation play, and fetish interests. Browser-only BDSM quiz with instant results.",
  keywords: [
    "bdsm test",
    "bdsm quiz",
    "what is a bdsm test",
    "bdsm preference test",
    "kink quiz",
    "bdsm meaning",
  ],
  alternates: {
    canonical: "/bdsm-test",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "BDSM Test - Free BDSM Quiz for Kink Preferences",
    description:
      "Explore your adult BDSM interests with a private, browser-only quiz and instant category suggestions.",
    url: pageUrl,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "BDSM Test - Free BDSM Quiz",
    description:
      "A private BDSM quiz for exploring bondage, power exchange, sensation play, and fetish interests.",
  },
};

function buildJsonLd() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": SITE_URL,
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "BDSM Test",
          "item": pageUrl,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": bdsmTestFaqs.map((faq) => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer,
        },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      "url": pageUrl,
      "name": "BDSM Test - Free BDSM Quiz for Kink Preferences",
      "description":
        "A private browser-only BDSM test that helps adults explore broad kink preference areas.",
      "isFamilyFriendly": false,
      "contentRating": "Adult Only",
      "inLanguage": "en",
      "about": ["BDSM test", "BDSM quiz", "kink preferences"],
    },
  ];
}

export default function BdsmTestPage() {
  const jsonLd = buildJsonLd();

  return (
    <>
      {jsonLd.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <section className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            BDSM quiz
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-foreground sm:text-4xl lg:text-5xl">
            BDSM Test: Explore Your Kink Preferences
          </h1>
          <p className="mt-4 text-base leading-relaxed text-foreground-muted sm:text-lg">
            This free BDSM test is a private self-reflection quiz for adults who want to
            understand broad kink interests like bondage, dominance and submission,
            sensation play, and fetish style. It runs in your browser and gives an
            instant result with related KinkTube categories to browse next.
          </p>
        </section>

        <section className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-background-secondary p-4">
            <ShieldCheck className="h-5 w-5 text-accent" aria-hidden="true" />
            <h2 className="mt-3 text-sm font-semibold text-foreground">Consent-first</h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
              The quiz treats BDSM as consensual adult fantasy, roleplay, and media interest.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background-secondary p-4">
            <Lock className="h-5 w-5 text-accent" aria-hidden="true" />
            <h2 className="mt-3 text-sm font-semibold text-foreground">Browser-only</h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
              Answers are not sent to the backend. Your result is calculated on this page.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background-secondary p-4">
            <CheckCircle2 className="h-5 w-5 text-accent" aria-hidden="true" />
            <h2 className="mt-3 text-sm font-semibold text-foreground">Fast result</h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
              Get a result type and direct links into the most relevant BDSM video categories.
            </p>
          </div>
        </section>

        <div className="mt-8">
          <BdsmQuiz />
        </div>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h2 className="text-2xl font-bold text-foreground">How this BDSM quiz works</h2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-foreground-muted sm:text-base">
              <p>
                The questions group your answers into broad areas: bondage and restraint,
                power exchange, sensation play, fetish aesthetics, or wide BDSM exploration.
                The result is not a label you have to keep. It is a starting point for
                finding the terms and categories that match what you already notice.
              </p>
              <p>
                If you are new to BDSM, start with the meaning guide before browsing deeper
                categories. Understanding terms like switch, brat, rigger, CNC, limits,
                safewords, and consent makes the search experience clearer and safer.
              </p>
            </div>
          </div>

          <aside className="rounded-lg border border-border bg-background-secondary p-5">
            <h2 className="text-lg font-semibold text-foreground">Possible result areas</h2>
            <div className="mt-4 space-y-3">
              {bdsmQuizResults.map((result) => (
                <Link
                  key={result.id}
                  href={result.categoryHref}
                  className="block rounded-md border border-border bg-background-tertiary p-3 transition-colors hover:border-accent"
                >
                  <span className="block text-sm font-semibold text-foreground">
                    {result.title}
                  </span>
                  <span className="mt-1 block text-xs text-foreground-muted">
                    Browse {result.categoryLabel}
                  </span>
                </Link>
              ))}
            </div>
          </aside>
        </section>

        <section className="mt-10 border-t border-border pt-8">
          <h2 className="text-2xl font-bold text-foreground">BDSM test FAQ</h2>
          <div className="mt-5 grid gap-4">
            {bdsmTestFaqs.map((faq) => (
              <article key={faq.question} className="rounded-lg border border-border bg-background-secondary p-5">
                <h3 className="text-base font-semibold text-foreground">{faq.question}</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 border-t border-border pt-8">
          <h2 className="text-xl font-semibold text-foreground">Related BDSM guides and categories</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {bdsmGuideLinks.map((link) => (
              <Link key={link.href} href={link.href} className="category-pill">
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

