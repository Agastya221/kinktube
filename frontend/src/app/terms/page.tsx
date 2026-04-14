import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "KinkTube Terms of Service - Rules and guidelines for using our adult video platform.",
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>

      <div className="prose prose-invert prose-zinc max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
          <p className="text-foreground-muted leading-relaxed">
            By accessing and using KinkTube (&quot;the Site&quot;), you accept and agree to be bound by
            the terms and provision of this agreement. This Site contains adult content and is
            intended solely for adults who are at least 18 years of age or the age of majority
            in their jurisdiction, whichever is greater.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">2. Adult Content Disclaimer</h2>
          <p className="text-foreground-muted leading-relaxed">
            This Site contains sexually explicit material including, but not limited to, images
            and videos depicting BDSM, bondage, fetish activities, and other adult content. By
            entering this Site, you affirm that you are at least 18 years of age and are legally
            permitted to view such content in your jurisdiction.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">3. Third-Party Content</h2>
          <p className="text-foreground-muted leading-relaxed">
            KinkTube does not host any video content. All videos displayed on this Site are
            embedded from third-party sources using their official embed codes. We do not upload,
            store, or distribute any video files. We are not responsible for the content, accuracy,
            or availability of any third-party websites or content.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">4. User Conduct</h2>
          <p className="text-foreground-muted leading-relaxed mb-4">
            You agree not to use this Site to:
          </p>
          <ul className="list-disc list-inside text-foreground-muted space-y-2">
            <li>Violate any applicable local, state, national, or international law</li>
            <li>Distribute, share, or facilitate access to minors</li>
            <li>Attempt to gain unauthorized access to our systems</li>
            <li>Engage in any activity that disrupts or interferes with the Site</li>
            <li>Scrape, copy, or redistribute our content without permission</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">5. Intellectual Property</h2>
          <p className="text-foreground-muted leading-relaxed">
            All content on this Site, including but not limited to text, graphics, logos, and
            software, is the property of KinkTube or its content suppliers and is protected by
            copyright laws. Video content is owned by respective third-party providers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">6. Disclaimer of Warranties</h2>
          <p className="text-foreground-muted leading-relaxed">
            This Site is provided &quot;as is&quot; without any representations or warranties,
            express or implied. KinkTube makes no representations or warranties regarding the
            accuracy, completeness, or availability of the Site or its content.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">7. Limitation of Liability</h2>
          <p className="text-foreground-muted leading-relaxed">
            In no event shall KinkTube be liable for any indirect, incidental, special,
            consequential, or punitive damages arising out of or relating to your use of the Site.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">8. Changes to Terms</h2>
          <p className="text-foreground-muted leading-relaxed">
            We reserve the right to modify these terms at any time. Your continued use of the
            Site following any changes constitutes acceptance of those changes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">9. Contact Information</h2>
          <p className="text-foreground-muted leading-relaxed">
            For questions about these Terms of Service, please contact us through our official
            channels.
          </p>
        </section>

        <p className="text-sm text-foreground-muted mt-8">
          Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </p>
      </div>
    </div>
  );
}
