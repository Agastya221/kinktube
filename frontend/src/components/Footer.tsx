import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-background-secondary border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="text-xl font-bold">
              <span className="text-accent">Kink</span>
              <span className="text-foreground">Tube</span>
            </Link>
            <p className="mt-2 text-foreground-muted text-sm max-w-md">
              The premier destination for BDSM, kink, and fetish video content.
              All videos are embedded from external sources.
            </p>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Categories</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/category/femdom"
                  className="text-foreground-muted hover:text-accent transition-colors"
                >
                  Femdom
                </Link>
              </li>
              <li>
                <Link
                  href="/category/bondage"
                  className="text-foreground-muted hover:text-accent transition-colors"
                >
                  Bondage
                </Link>
              </li>
              <li>
                <Link
                  href="/category/medical-bondage"
                  className="text-foreground-muted hover:text-accent transition-colors"
                >
                  Medical Bondage
                </Link>
              </li>
              <li>
                <Link
                  href="/category/vacbed"
                  className="text-foreground-muted hover:text-accent transition-colors"
                >
                  Vacbed
                </Link>
              </li>
              <li>
                <Link
                  href="/category/strapon"
                  className="text-foreground-muted hover:text-accent transition-colors"
                >
                  Strapon
                </Link>
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
                  href="/2257"
                  className="text-foreground-muted hover:text-accent transition-colors"
                >
                  18 U.S.C. 2257
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
              &copy; {currentYear} KinkTube. All rights reserved.
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
