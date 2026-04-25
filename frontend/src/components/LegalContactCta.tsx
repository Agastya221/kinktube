import Link from "next/link";

export default function LegalContactCta() {
  return (
    <div className="mt-8 rounded-2xl border border-border bg-background-secondary p-5">
      <p className="text-sm text-foreground-muted">
        Need to report content, submit a DMCA notice, or send a privacy request?
      </p>
      <Link
        href="/contact"
        className="mt-4 inline-flex rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
      >
        Contact Us
      </Link>
    </div>
  );
}
