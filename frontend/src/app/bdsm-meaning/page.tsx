import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, CheckCircle2, ShieldCheck } from "lucide-react";
import { bdsmGuideLinks, bdsmMeaningFaqs } from "@/lib/bdsm-seo-content";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://kinktube.fun"
).replace(/\/+$/, "");

const pageUrl = `${SITE_URL}/bdsm-meaning`;

export const metadata: Metadata = {
  title: "BDSM Meaning - What BDSM Stands For",
  description:
    "Learn what BDSM means, what BDSM stands for, and common terms like rigger, brat, switch, CNC, bondage, dominance, and submission.",
  keywords: [
    "bdsm meaning",
    "what is bdsm",
    "what does bdsm stand for",
    "what does bdsm mean",
    "what is a rigger bdsm",
    "what is a brat in bdsm",
    "what is cnc bdsm",
    "what is a switch bdsm",
  ],
  alternates: {
    canonical: "/bdsm-meaning",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "BDSM Meaning - What BDSM Stands For",
    description:
      "A clear adult guide to BDSM meaning, common BDSM terms, and related KinkTube categories.",
    url: pageUrl,
    type: "article",
  },
  twitter: {
    card: "summary",
    title: "BDSM Meaning - What BDSM Stands For",
    description:
      "Clear definitions for BDSM, rigger, brat, switch, CNC, and other common search terms.",
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
          "name": "BDSM Meaning",
          "item": pageUrl,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": bdsmMeaningFaqs.map((faq) => ({
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
      "@type": "Article",
      "@id": `${pageUrl}#article`,
      "headline": "BDSM Meaning - What BDSM Stands For",
      "description":
        "An educational adult guide to BDSM meaning, core terms, and related KinkTube categories.",
      "url": pageUrl,
      "isFamilyFriendly": false,
      "contentRating": "Adult Only",
      "inLanguage": "en",
      "mainEntityOfPage": pageUrl,
      "publisher": {
        "@type": "Organization",
        "name": "KinkTube",
        "logo": {
          "@type": "ImageObject",
          "url": `${SITE_URL}/logo.jpeg`,
        },
      },
    },
  ];
}

export default function BdsmMeaningPage() {
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
            BDSM meaning
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-foreground sm:text-4xl lg:text-5xl">
            What Is BDSM? Meaning, Stand For, and Common Terms
          </h1>
          <p className="mt-4 text-base leading-relaxed text-foreground-muted sm:text-lg">
            BDSM is a broad adult term for consensual kink interests around bondage,
            discipline, dominance, submission, sadism, and masochism. This guide explains
            what BDSM stands for, what the most searched BDSM terms mean, and where those
            interests connect to KinkTube video categories.
          </p>
        </section>

        <section className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-background-secondary p-4">
            <BookOpen className="h-5 w-5 text-accent" aria-hidden="true" />
            <h2 className="mt-3 text-sm font-semibold text-foreground">Simple definitions</h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
              Clear answers for what BDSM means, what it stands for, and why the term covers several interests.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background-secondary p-4">
            <ShieldCheck className="h-5 w-5 text-accent" aria-hidden="true" />
            <h2 className="mt-3 text-sm font-semibold text-foreground">Consent context</h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
              BDSM content and terms are framed around adult consent, negotiated limits, and stop signals.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background-secondary p-4">
            <CheckCircle2 className="h-5 w-5 text-accent" aria-hidden="true" />
            <h2 className="mt-3 text-sm font-semibold text-foreground">Category links</h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
              Each definition connects naturally to related BDSM, bondage, femdom, and fetish pages.
            </p>
          </div>
        </section>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="space-y-6 text-sm leading-relaxed text-foreground-muted sm:text-base">
            <div>
              <h2 className="text-2xl font-bold text-foreground">What does BDSM stand for?</h2>
              <p className="mt-3">
                BDSM is usually read as three paired ideas: bondage and discipline,
                dominance and submission, and sadism and masochism. A person can be
                interested in one area without being interested in all of them. That is
                why BDSM works best as an umbrella keyword rather than a single narrow category.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-foreground">What does BDSM mean in adult media?</h2>
              <p className="mt-3">
                On a tube site, BDSM usually describes scenes built around restraint, control,
                power exchange, fetish styling, discipline, or controlled sensation. Someone
                searching for BDSM porn may want a broad category, while someone searching
                for shibari, femdom, spanking, or latex usually wants a more specific style.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-foreground">Common BDSM terms</h2>
              <dl className="mt-4 grid gap-4">
                <div className="rounded-lg border border-border bg-background-secondary p-4">
                  <dt className="font-semibold text-foreground">Rigger</dt>
                  <dd className="mt-1">
                    A rigger ties, restrains, or suspends a consenting adult partner. If the
                    visual focus is rope and restraint, start with{" "}
                    <Link href="/category/shibari" className="text-accent hover:underline">
                      shibari
                    </Link>{" "}
                    or{" "}
                    <Link href="/category/bondage" className="text-accent hover:underline">
                      bondage
                    </Link>
                    .
                  </dd>
                </div>
                <div className="rounded-lg border border-border bg-background-secondary p-4">
                  <dt className="font-semibold text-foreground">Brat</dt>
                  <dd className="mt-1">
                    A brat enjoys playful resistance inside agreed boundaries. It often belongs
                    near dom/sub, discipline, or{" "}
                    <Link href="/category/femdom" className="text-accent hover:underline">
                      femdom
                    </Link>{" "}
                    dynamics.
                  </dd>
                </div>
                <div className="rounded-lg border border-border bg-background-secondary p-4">
                  <dt className="font-semibold text-foreground">Switch</dt>
                  <dd className="mt-1">
                    A switch enjoys more than one role, such as dominant in one scene and
                    submissive in another. The main{" "}
                    <Link href="/category/bdsm" className="text-accent hover:underline">
                      BDSM category
                    </Link>{" "}
                    is usually the best starting point.
                  </dd>
                </div>
                <div className="rounded-lg border border-border bg-background-secondary p-4">
                  <dt className="font-semibold text-foreground">CNC</dt>
                  <dd className="mt-1">
                    CNC means consensual non-consent roleplay. It must be negotiated clearly
                    between adults, with limits and stop signals agreed before any scene.
                  </dd>
                </div>
              </dl>
            </div>
          </article>

          <aside className="rounded-lg border border-border bg-background-secondary p-5 self-start">
            <h2 className="text-lg font-semibold text-foreground">Explore the cluster</h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
              Use these links to move from definitions into the quiz or the main video categories.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {bdsmGuideLinks.map((link) => (
                <Link key={link.href} href={link.href} className="category-pill">
                  {link.label}
                </Link>
              ))}
            </div>
          </aside>
        </section>

        <section className="mt-10 border-t border-border pt-8">
          <h2 className="text-2xl font-bold text-foreground">BDSM meaning FAQ</h2>
          <div className="mt-5 grid gap-4">
            {bdsmMeaningFaqs.map((faq) => (
              <article key={faq.question} className="rounded-lg border border-border bg-background-secondary p-5">
                <h3 className="text-base font-semibold text-foreground">{faq.question}</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 border-t border-border pt-8">
          <h2 className="text-xl font-semibold text-foreground">Next step</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-foreground-muted sm:text-base">
            If you are still mapping your interests, take the{" "}
            <Link href="/bdsm-test" className="text-accent hover:underline">
              BDSM test
            </Link>
            . If you already know the style you want, browse the{" "}
            <Link href="/category/bdsm" className="text-accent hover:underline">
              BDSM video category
            </Link>
            .
          </p>
        </section>
      </main>
    </>
  );
}

