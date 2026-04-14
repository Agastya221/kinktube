import { Metadata } from "next";

export const metadata: Metadata = {
  title: "18 U.S.C. 2257 Compliance Statement",
  description: "KinkTube 18 U.S.C. 2257 Record-Keeping Requirements Compliance Statement.",
  robots: { index: true, follow: true },
};

export default function Page2257() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-8">18 U.S.C. 2257 Compliance Statement</h1>

      <div className="prose prose-invert prose-zinc max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Record-Keeping Requirements Compliance Statement
          </h2>
          <p className="text-foreground-muted leading-relaxed">
            KinkTube is not a producer (primary or secondary) of any content found on this
            website. With respect to the records as per 18 USC 2257 for any content found on
            this site, please direct your request to the site for which the content was produced.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Content Hosting</h2>
          <p className="text-foreground-muted leading-relaxed">
            KinkTube is a video aggregation platform. We do not produce, host, upload, or store
            any video content on our servers. All videos displayed on this website are embedded
            from third-party websites using their official embed codes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Third-Party Content</h2>
          <p className="text-foreground-muted leading-relaxed">
            All video content is produced and hosted by third-party websites. These third-party
            producers are solely responsible for maintaining records in compliance with 18 U.S.C.
            2257 and related regulations.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Content Provider Compliance
          </h2>
          <p className="text-foreground-muted leading-relaxed mb-4">
            The third-party websites from which we embed content maintain their own 2257
            compliance records. For record-keeping requests, please contact:
          </p>
          <ul className="list-disc list-inside text-foreground-muted space-y-2">
            <li>
              <strong>Eporner:</strong> Records available through their compliance page at
              eporner.com
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Our Commitment</h2>
          <p className="text-foreground-muted leading-relaxed">
            KinkTube is committed to ensuring that all content displayed on our platform comes
            from legitimate sources that comply with all applicable laws, including 18 U.S.C.
            2257. We only embed content from established platforms that maintain proper
            record-keeping and verification procedures.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Content Concerns</h2>
          <p className="text-foreground-muted leading-relaxed">
            If you have concerns about any content displayed on this website, please contact us
            immediately. We take all concerns seriously and will investigate promptly. Content
            that violates our policies or applicable laws will be removed from our index.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Contact Information</h2>
          <p className="text-foreground-muted leading-relaxed">
            For compliance inquiries or concerns, please contact us through our official channels.
          </p>
        </section>

        <p className="text-sm text-foreground-muted mt-8">
          Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </p>
      </div>
    </div>
  );
}
