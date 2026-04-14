import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "KinkTube Privacy Policy - How we collect, use, and protect your information.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>

      <div className="prose prose-invert prose-zinc max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">1. Information We Collect</h2>
          <p className="text-foreground-muted leading-relaxed mb-4">
            We collect minimal information to provide and improve our services:
          </p>
          <ul className="list-disc list-inside text-foreground-muted space-y-2">
            <li>
              <strong>Usage Data:</strong> Pages visited, time spent, referral sources, and
              general browsing patterns
            </li>
            <li>
              <strong>Device Information:</strong> Browser type, operating system, and device type
            </li>
            <li>
              <strong>Cookies:</strong> Age verification status and basic preferences
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">2. How We Use Information</h2>
          <p className="text-foreground-muted leading-relaxed mb-4">
            We use collected information for:
          </p>
          <ul className="list-disc list-inside text-foreground-muted space-y-2">
            <li>Providing and maintaining our service</li>
            <li>Improving user experience</li>
            <li>Analyzing site traffic and usage patterns</li>
            <li>Displaying relevant advertisements</li>
            <li>Preventing abuse and ensuring compliance</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">3. Third-Party Services</h2>
          <p className="text-foreground-muted leading-relaxed mb-4">
            We use third-party services that may collect information:
          </p>
          <ul className="list-disc list-inside text-foreground-muted space-y-2">
            <li>
              <strong>Video Providers:</strong> Embedded videos from third-party platforms may
              set their own cookies
            </li>
            <li>
              <strong>Advertising Partners:</strong> Ad networks may use cookies for targeted
              advertising
            </li>
            <li>
              <strong>Analytics:</strong> We may use analytics services to understand site usage
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">4. Cookies</h2>
          <p className="text-foreground-muted leading-relaxed">
            We use cookies for age verification, session management, and to remember your
            preferences. Third-party services may also set cookies. You can control cookie
            settings through your browser, but this may affect site functionality.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">5. Data Security</h2>
          <p className="text-foreground-muted leading-relaxed">
            We implement reasonable security measures to protect your information. However, no
            method of transmission over the Internet is 100% secure. We do not store personal
            identification information beyond what is necessary for site operation.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">6. Children&apos;s Privacy</h2>
          <p className="text-foreground-muted leading-relaxed">
            This Site is strictly for adults 18 years of age or older. We do not knowingly
            collect information from anyone under 18. If we discover that we have collected
            information from a minor, we will delete it immediately.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">7. Your Rights</h2>
          <p className="text-foreground-muted leading-relaxed mb-4">
            Depending on your jurisdiction, you may have rights to:
          </p>
          <ul className="list-disc list-inside text-foreground-muted space-y-2">
            <li>Access the personal information we hold about you</li>
            <li>Request correction of inaccurate information</li>
            <li>Request deletion of your information</li>
            <li>Opt-out of certain data collection practices</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">8. Changes to This Policy</h2>
          <p className="text-foreground-muted leading-relaxed">
            We may update this Privacy Policy from time to time. Changes will be posted on this
            page with an updated revision date.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">9. Contact Us</h2>
          <p className="text-foreground-muted leading-relaxed">
            If you have questions about this Privacy Policy, please contact us through our
            official channels.
          </p>
        </section>

        <p className="text-sm text-foreground-muted mt-8">
          Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </p>
      </div>
    </div>
  );
}
