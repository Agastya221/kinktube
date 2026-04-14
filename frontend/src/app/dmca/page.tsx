import { Metadata } from "next";

export const metadata: Metadata = {
  title: "DMCA Notice & Takedown Policy",
  description: "KinkTube DMCA Notice and Takedown Policy for copyright holders.",
  robots: { index: true, follow: true },
};

export default function DMCAPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-8">DMCA Notice & Takedown Policy</h1>

      <div className="prose prose-invert prose-zinc max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Overview</h2>
          <p className="text-foreground-muted leading-relaxed">
            KinkTube respects the intellectual property rights of others and expects its users to
            do the same. In accordance with the Digital Millennium Copyright Act of 1998 (DMCA),
            we will respond expeditiously to claims of copyright infringement.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Important Notice</h2>
          <div className="bg-background-tertiary border border-border rounded-lg p-4">
            <p className="text-foreground-muted leading-relaxed">
              <strong className="text-foreground">KinkTube does not host any video content.</strong>{" "}
              All videos are embedded from third-party websites using their official embed codes.
              If you wish to have video content removed, you must contact the original host website
              directly.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            For Embedded Content Removal
          </h2>
          <p className="text-foreground-muted leading-relaxed mb-4">
            If you are the copyright owner of content that is embedded on our site and you wish
            to have it removed from our index, please provide the following information:
          </p>
          <ol className="list-decimal list-inside text-foreground-muted space-y-2">
            <li>
              A physical or electronic signature of the copyright owner or authorized
              representative
            </li>
            <li>
              Identification of the copyrighted work claimed to have been infringed
            </li>
            <li>
              The URL(s) on our site where the embedded content appears
            </li>
            <li>
              Your contact information (name, address, telephone number, email)
            </li>
            <li>
              A statement that you have a good faith belief that the use is not authorized
            </li>
            <li>
              A statement under penalty of perjury that the information is accurate and you are
              authorized to act on behalf of the copyright owner
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            For Actual Video Removal
          </h2>
          <p className="text-foreground-muted leading-relaxed">
            Since we do not host any video files, to have the actual video content removed,
            you must contact the hosting platform directly. Videos embedded on our site are
            typically hosted on platforms such as Eporner. Please file your DMCA notice with
            the original host.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Submit DMCA Notice</h2>
          <p className="text-foreground-muted leading-relaxed mb-4">
            To submit a DMCA takedown notice for content indexed on our site, please send your
            notice to:
          </p>
          <div className="bg-background-tertiary border border-border rounded-lg p-4">
            <p className="text-foreground-muted">
              <strong className="text-foreground">DMCA Agent</strong>
              <br />
              Email: dmca@[yourdomain].com
              <br />
              <br />
              Please include &quot;DMCA Takedown Request&quot; in the subject line.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Response Time</h2>
          <p className="text-foreground-muted leading-relaxed">
            Upon receipt of a valid DMCA notice, we will remove the indexed content from our site
            within 24-48 hours. We will also notify the user who submitted the content (if
            applicable) and provide them with an opportunity to file a counter-notification.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Counter-Notification</h2>
          <p className="text-foreground-muted leading-relaxed">
            If you believe your content was wrongly removed due to a DMCA notice, you may submit
            a counter-notification. The counter-notification must include your contact
            information, identification of the removed content, a statement under penalty of
            perjury that you have a good faith belief the content was removed in error, and your
            consent to jurisdiction.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Repeat Infringers</h2>
          <p className="text-foreground-muted leading-relaxed">
            It is our policy to terminate, in appropriate circumstances, accounts or access of
            repeat infringers.
          </p>
        </section>

        <p className="text-sm text-foreground-muted mt-8">
          Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </p>
      </div>
    </div>
  );
}
