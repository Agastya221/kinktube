"use client";

import { useEffect, useState } from "react";

import { submitContactMessage } from "@/lib/api";
import type { ContactSubmissionRequest } from "@/lib/types";

type ContactType = ContactSubmissionRequest["type"];

const contactTypes: Array<{ value: ContactType; label: string }> = [
  { value: "feedback", label: "Help improve this site" },
  { value: "content_removal", label: "Content removal" },
  { value: "dmca", label: "DMCA / copyright" },
  { value: "privacy", label: "Privacy request" },
  { value: "general", label: "General message" },
];

export default function ContactForm({ defaultType = "feedback" }: { defaultType?: ContactType }) {
  const [form, setForm] = useState<ContactSubmissionRequest>({
    type: defaultType,
    name: "",
    reply_to: "",
    page_url: "",
    source_url: "",
    subject: "",
    message: "",
    website: "",
  });
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setForm((current) => {
      if (current.page_url || typeof window === "undefined") return current;
      return { ...current, page_url: window.location.href };
    });
  }, []);

  const updateField = (key: keyof ContactSubmissionRequest, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);

    try {
      const response = await submitContactMessage(form);
      setStatus(response.message || "Message saved.");
      setForm({
        type: defaultType,
        name: "",
        reply_to: "",
        page_url: "",
        source_url: "",
        subject: "",
        message: "",
        website: "",
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save your message.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 rounded-2xl border border-border bg-background-secondary p-5 space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Request type</span>
          <select
            value={form.type}
            onChange={(event) => updateField("type", event.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
          >
            {contactTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Your name</span>
          <input
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">Reply contact</span>
        <input
          value={form.reply_to}
          onChange={(event) => updateField("reply_to", event.target.value)}
          placeholder="Email, Telegram, or another way to reach you"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">KinkTube page URL</span>
          <input
            value={form.page_url}
            onChange={(event) => updateField("page_url", event.target.value)}
            placeholder="https://..."
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Source URL</span>
          <input
            value={form.source_url}
            onChange={(event) => updateField("source_url", event.target.value)}
            placeholder="Eporner/source link if known"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none"
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">Subject</span>
        <input
          required
          value={form.subject}
          onChange={(event) => updateField("subject", event.target.value)}
          placeholder="Broken video, search issue, missing category, or suggestion"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">Message</span>
        <textarea
          required
          rows={7}
          value={form.message}
          onChange={(event) => updateField("message", event.target.value)}
          placeholder="Tell us what felt broken, confusing, missing, or worth improving."
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
        />
      </label>

      <label className="hidden">
        Website
        <input value={form.website} onChange={(event) => updateField("website", event.target.value)} tabIndex={-1} autoComplete="off" />
      </label>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-foreground-muted">
          Messages are saved to the site admin dashboard for review.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {submitting ? "Submitting..." : "Submit Message"}
        </button>
      </div>

      {status ? <p className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground-muted">{status}</p> : null}
    </form>
  );
}
