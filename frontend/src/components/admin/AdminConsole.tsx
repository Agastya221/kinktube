"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getAdminImportStatus,
  getAdminContactMessages,
  getAdminSession,
  getAdminSettings,
  getCategories,
  getStats,
  generateAdminSEO,
  getAISEOStatus,
  getAISEOLogs,
  startSEOBackfill,
  stopSEOBackfill,
  loginAdmin,
  logoutAdmin,
  triggerAdminImport,
  updateAdminContactMessageStatus,
  updateAdminSettings,
} from "@/lib/api";
import type { AdminImportStatusResponse, AdminSEOGenerateResponse, AdminSessionResponse, AISEOStatusResponse, AISEOLog, CategoriesResponse, ContactSubmission, SiteSettings, StatsResponse } from "@/lib/types";

const tabs = [
  "overview",
  "branding",
  "theme",
  "content",
  "ads",
  "seo",
  "ai seo",
  "affiliates",
  "legal",
  "messages",
  "import",
] as const;

type Tab = typeof tabs[number];
type AdSlotKey = "banner" | "sidebar" | "native" | "popunder" | "video_banner" | "mobile_banner";

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-background-secondary p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? <p className="text-sm text-foreground-muted mt-1">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  multiline = false,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  multiline?: boolean;
  type?: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {multiline ? (
        <textarea
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
          rows={8}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
        />
      ) : (
        <input
          type={type}
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
        />
      )}
    </label>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-3 py-3">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[rgb(var(--color-accent))]"
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000"}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-16 rounded-lg border border-border bg-background"
        />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
        />
      </div>
    </label>
  );
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function AdminConsole() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [session, setSession] = useState<AdminSessionResponse | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [categories, setCategories] = useState<CategoriesResponse | null>(null);
  const [importStatus, setImportStatus] = useState<AdminImportStatusResponse | null>(null);
  const [messages, setMessages] = useState<ContactSubmission[]>([]);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [seoVideoId, setSeoVideoId] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoCategories, setSeoCategories] = useState("bdsm");
  const [seoTags, setSeoTags] = useState("");
  const [seoSave, setSeoSave] = useState(false);
  const [seoGenerating, setSeoGenerating] = useState(false);
  const [seoResult, setSeoResult] = useState<AdminSEOGenerateResponse | null>(null);

  // AI SEO dashboard state
  const [aiSeoStatus, setAiSeoStatus] = useState<AISEOStatusResponse | null>(null);
  const [aiSeoLogs, setAiSeoLogs] = useState<AISEOLog[]>([]);
  const [aiSeoLogsTotal, setAiSeoLogsTotal] = useState(0);
  const [aiSeoLogsPage, setAiSeoLogsPage] = useState(1);
  const [aiSeoFilter, setAiSeoFilter] = useState<string>("");
  const [aiSeoActionLoading, setAiSeoActionLoading] = useState(false);
  const [aiSeoActionMsg, setAiSeoActionMsg] = useState<string | null>(null);
  const [aiSeoExpanded, setAiSeoExpanded] = useState<number | null>(null);

  const isAuthenticated = !!session?.authenticated;

  async function loadAdminData() {
    const [sessionData, settingsData, statsData, categoriesData, importData, messagesData] = await Promise.all([
      getAdminSession(),
      getAdminSettings(),
      getStats(),
      getCategories(),
      getAdminImportStatus(),
      getAdminContactMessages(),
    ]);

    setSession(sessionData);
    setSettings(settingsData);
    setStats(statsData);
    setCategories(categoriesData);
    setImportStatus(importData);
    setMessages(messagesData.messages);
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const sessionData = await getAdminSession();
        if (cancelled) return;
        setSession(sessionData);
        setUsername(sessionData.username || "admin");

        if (sessionData.authenticated) {
          await loadAdminData();
        }
      } catch {
        if (!cancelled) {
          setSession({ authenticated: false, username: "admin" });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-load AI SEO data when tab is active, refresh every 10s while running
  useEffect(() => {
    if (activeTab !== "ai seo" || !isAuthenticated) return;
    loadAiSeoData();
    const interval = setInterval(() => {
      loadAiSeoData();
    }, 10000);
    return () => clearInterval(interval);
  }, [activeTab, isAuthenticated]);

  const keywordText = useMemo(
    () => settings?.seo.default_keywords.join(", ") || "",
    [settings]
  );

  const setNestedValue = (section: keyof SiteSettings, key: string, value: unknown) => {
    setSettings((prev) => {
      if (!prev) return prev;
      const currentSection = prev[section] as unknown as Record<string, unknown>;
      return {
        ...prev,
        [section]: {
          ...currentSection,
          [key]: value,
        },
      } as SiteSettings;
    });
  };

  const setAdSlotValue = (slotKey: AdSlotKey, key: "enabled" | "label" | "zone_id", value: boolean | string) => {
    setSettings((prev) => {
      if (!prev) return prev;

      const nextSlot = {
        ...prev.ads[slotKey],
        [key]: value,
      };

      if (key === "zone_id" && typeof value === "string" && value.trim() !== "") {
        nextSlot.enabled = true;
      }

      return {
        ...prev,
        ads: {
          ...prev.ads,
          [slotKey]: nextSlot,
        },
      };
    });
  };

  const setLegalValue = (doc: keyof SiteSettings["legal"], key: "title" | "content", value: string) => {
    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        legal: {
          ...prev.legal,
          [doc]: {
            ...prev.legal[doc],
            [key]: value,
          },
        },
      };
    });
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice(null);
    setLoading(true);

    try {
      const nextSession = await loginAdmin(username, password);
      setSession(nextSession);
      setPassword("");
      await loadAdminData();
      setNotice("Admin login successful.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutAdmin().catch(() => null);
    setSession({ authenticated: false, username: username || "admin" });
    setSettings(null);
    setStats(null);
    setCategories(null);
    setImportStatus(null);
    setMessages([]);
    setNotice("Logged out.");
  };

  const updateMessageStatus = async (id: number, status: ContactSubmission["status"]) => {
    try {
      const response = await updateAdminContactMessageStatus(id, status);
      setMessages((current) => current.map((message) => message.id === id ? response.message : message));
      setNotice("Message updated.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to update message.");
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setNotice(null);

    try {
      const payload: SiteSettings = {
        ...settings,
        seo: {
          ...settings.seo,
          default_keywords: keywordText
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        },
      };
      const response = await updateAdminSettings(payload);
      setSettings(response.settings);
      setNotice("Settings saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerImport = async (light = false) => {
    try {
      const response = await triggerAdminImport(light);
      setNotice(response.message);
      setImportStatus({ running: true });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to trigger import.");
    }
  };

  const handleGenerateSEO = async () => {
    setSeoGenerating(true);
    setSeoResult(null);
    setNotice(null);

    try {
      const response = await generateAdminSEO({
        video_id: seoVideoId.trim() || undefined,
        title: seoTitle.trim() || undefined,
        categories: splitList(seoCategories),
        tags: splitList(seoTags),
        save: seoSave,
      });
      setSeoResult(response);
      setNotice(response.saved ? "Generated SEO description saved." : "Generated SEO preview ready.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to generate SEO metadata.");
    } finally {
      setSeoGenerating(false);
    }
  };

  const loadAiSeoData = async (filter = aiSeoFilter, page = aiSeoLogsPage) => {
    try {
      const [statusData, logsData] = await Promise.all([
        getAISEOStatus(),
        getAISEOLogs(filter, page, 20),
      ]);
      setAiSeoStatus(statusData);
      setAiSeoLogs(logsData.logs);
      setAiSeoLogsTotal(logsData.total);
    } catch {
      // silently ignore
    }
  };

  const handleAiSeoFilterChange = (filter: string) => {
    setAiSeoFilter(filter);
    setAiSeoLogsPage(1);
    setAiSeoExpanded(null);
    loadAiSeoData(filter, 1);
  };

  const handleAiSeoPageChange = (page: number) => {
    setAiSeoLogsPage(page);
    setAiSeoExpanded(null);
    loadAiSeoData(aiSeoFilter, page);
  };

  const handleStartBackfill = async () => {
    setAiSeoActionLoading(true);
    setAiSeoActionMsg(null);
    try {
      const res = await startSEOBackfill();
      setAiSeoActionMsg(res.message || "Backfill started");
      setTimeout(() => loadAiSeoData(), 1500);
    } catch (e: unknown) {
      setAiSeoActionMsg((e as Error).message || "Failed to start backfill");
    } finally {
      setAiSeoActionLoading(false);
    }
  };

  const handleStopBackfill = async () => {
    setAiSeoActionLoading(true);
    setAiSeoActionMsg(null);
    try {
      const res = await stopSEOBackfill();
      setAiSeoActionMsg(res.message || "Backfill stopped");
      setTimeout(() => loadAiSeoData(), 1500);
    } catch (e: unknown) {
      setAiSeoActionMsg((e as Error).message || "Failed to stop backfill");
    } finally {
      setAiSeoActionLoading(false);
    }
  };

  const handleResetBackfill = async (timeframe: "today" | "all") => {
    if (!confirm(`Are you sure you want to revert AI descriptions and delete logs for ${timeframe}? This cannot be undone.`)) {
      return;
    }
    setAiSeoActionLoading(true);
    setAiSeoActionMsg(null);
    try {
      const { resetSEOBackfill } = await import("@/lib/api");
      const res = await resetSEOBackfill(timeframe);
      setAiSeoActionMsg(res.message || `Reset ${timeframe} AI SEO data`);
      setTimeout(() => loadAiSeoData(), 1500);
    } catch (e: unknown) {
      setAiSeoActionMsg((e as Error).message || "Failed to reset AI SEO data");
    } finally {
      setAiSeoActionLoading(false);
    }
  };

  // ── Export helpers ─────────────────────────────────────────────────────────
  const [exportLoading, setExportLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  const handleCopyEntry = async (entry: AISEOLog) => {
    const text = JSON.stringify({
      video_id: entry.video_id,
      title: entry.video_title,
      status: entry.status,
      safety_notes: entry.safety_notes || null,
      old_description: entry.old_description || null,
      new_description: entry.new_description || null,
    }, null, 2);
    await copyToClipboard(text);
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Fetch ALL logs matching current filter and export as CSV or JSON
  const handleExport = async (format: "csv" | "json") => {
    setExportLoading(true);
    try {
      const data = await getAISEOLogs(aiSeoFilter, 1, 5000);
      const logs = data.logs;
      if (format === "json") {
        const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `seo-logs-${aiSeoFilter || "all"}-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // CSV
        const header = ["video_id","video_title","status","new_description","safety_notes","processed_at"];
        const rows = logs.map((l) => [
          l.video_id,
          `"${(l.video_title || "").replace(/"/g, '""')}"`,
          l.status,
          `"${(l.new_description || "").replace(/"/g, '""')}"`,
          `"${(l.safety_notes || "").replace(/"/g, '""')}"`,
          l.processed_at,
        ]);
        const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `seo-logs-${aiSeoFilter || "all"}-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      alert("Export failed — try again");
    } finally {
      setExportLoading(false);
    }
  };

  const handleCopyAllVisible = async () => {
    const text = JSON.stringify(aiSeoLogs.map((l) => ({
      video_id: l.video_id,
      title: l.video_title,
      status: l.status,
      new_description: l.new_description || null,
      safety_notes: l.safety_notes || null,
    })), null, 2);
    await copyToClipboard(text);
    setAiSeoActionMsg("Copied current page to clipboard!");
    setTimeout(() => setAiSeoActionMsg(null), 2000);
  };

  if (loading && !session) {
    return <div className="min-h-screen bg-background text-foreground p-8">Loading admin…</div>;
  }

  if (!isAuthenticated || !settings) {
    return (
      <div className="min-h-screen bg-background text-foreground px-4 py-10">
        <div className="mx-auto max-w-md rounded-3xl border border-border bg-background-secondary p-8 shadow-2xl">
          <p className="text-xs uppercase tracking-[0.25em] text-accent/80">Hidden Admin</p>
          <h1 className="mt-3 text-3xl font-bold">Admin Login</h1>
          <p className="mt-2 text-sm text-foreground-muted">
            This route is intentionally hidden. Sign in to manage branding, ads, legal pages, affiliates, and import settings.
          </p>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <TextField label="Username" value={username} onChange={setUsername} />
            <TextField label="Password" value={password} onChange={setPassword} type="password" />
            <button
              type="submit"
              className="w-full rounded-xl bg-accent px-4 py-3 font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Sign In
            </button>
          </form>

          {notice ? <p className="mt-4 text-sm text-foreground-muted">{notice}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 rounded-3xl border border-border bg-background-secondary p-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-accent/80">Private Admin</p>
            <h1 className="mt-2 text-3xl font-bold">{settings.branding.site_name} Control Room</h1>
            <p className="mt-2 text-sm text-foreground-muted">
              Hidden route, no public link. Manage brand, ads, SEO, legal pages, affiliates, and importer settings here.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save All Settings"}
            </button>
            <button
              type="button"
              onClick={() => handleTriggerImport(false)}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:border-accent hover:text-accent"
            >
              Run Full Import
            </button>
            <button
              type="button"
              onClick={() => handleTriggerImport(true)}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:border-accent hover:text-accent"
            >
              Run Light Import
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground-muted hover:border-accent hover:text-accent"
            >
              Logout
            </button>
          </div>
        </div>

        {notice ? (
          <div className="mt-4 rounded-2xl border border-border bg-background-secondary px-4 py-3 text-sm text-foreground-muted">
            {notice}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-accent text-white"
                  : "bg-background-secondary text-foreground-muted hover:text-foreground"
              }`}
            >
              {tab.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-6">
          {activeTab === "overview" && (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <SectionCard title="Indexed Videos">
                  <p className="text-3xl font-bold">{stats?.total_videos.toLocaleString() || "0"}</p>
                </SectionCard>
                <SectionCard title="Categories">
                  <p className="text-3xl font-bold">{categories?.categories.length || 0}</p>
                </SectionCard>
                <SectionCard title="Importer">
                  <p className={`text-lg font-semibold ${importStatus?.running ? "text-accent" : "text-foreground"}`}>
                    {importStatus?.running ? "Running" : "Idle"}
                  </p>
                  {importStatus?.seo_backfill_running ? (
                    <p className="mt-1 text-sm text-foreground-muted">AI SEO backfill running</p>
                  ) : null}
                </SectionCard>
                <SectionCard title="Page Size">
                  <p className="text-3xl font-bold">{settings.content.videos_per_page}</p>
                </SectionCard>
                <SectionCard title="New Messages">
                  <p className="text-3xl font-bold">{messages.filter((message) => message.status === "new").length}</p>
                </SectionCard>
              </div>

              <SectionCard title="Current Snapshot">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-foreground-muted">Brand</p>
                    <p className="mt-2 text-xl font-semibold">{settings.branding.site_name}</p>
                    <p className="mt-2 text-sm text-foreground-muted">{settings.branding.site_tagline}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-foreground-muted">Ad Network</p>
                    <p className="mt-2 text-xl font-semibold capitalize">{settings.ads.network}</p>
                    <p className="mt-2 text-sm text-foreground-muted">
                      Banner: {settings.ads.banner.enabled ? "On" : "Off"} • Sidebar: {settings.ads.sidebar.enabled ? "On" : "Off"} • Native: {settings.ads.native.enabled ? "On" : "Off"}
                    </p>
                  </div>
                </div>
              </SectionCard>
            </>
          )}

          {activeTab === "branding" && (
            <SectionCard title="Branding" description="Control the visible brand name, hero copy, and footer text.">
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="Site Name" value={settings.branding.site_name} onChange={(value) => setNestedValue("branding", "site_name", value)} />
                <TextField label="Copyright Label" value={settings.branding.copyright_label} onChange={(value) => setNestedValue("branding", "copyright_label", value)} />
                <TextField label="Logo Primary" value={settings.branding.logo_primary} onChange={(value) => setNestedValue("branding", "logo_primary", value)} />
                <TextField label="Logo Secondary" value={settings.branding.logo_secondary} onChange={(value) => setNestedValue("branding", "logo_secondary", value)} />
                <TextField label="Site Tagline" value={settings.branding.site_tagline} onChange={(value) => setNestedValue("branding", "site_tagline", value)} multiline />
                <TextField label="Footer Description" value={settings.branding.footer_description} onChange={(value) => setNestedValue("branding", "footer_description", value)} multiline />
                <TextField label="Hero Accent Word" value={settings.branding.hero_accent} onChange={(value) => setNestedValue("branding", "hero_accent", value)} />
                <TextField label="Hero Title" value={settings.branding.hero_title} onChange={(value) => setNestedValue("branding", "hero_title", value)} />
              </div>
              <TextField label="Hero Description" value={settings.branding.hero_description} onChange={(value) => setNestedValue("branding", "hero_description", value)} multiline />
            </SectionCard>
          )}

          {activeTab === "theme" && (
            <SectionCard title="Theme" description="These colors drive the live site through runtime CSS variables.">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <ColorField label="Background" value={settings.theme.background} onChange={(value) => setNestedValue("theme", "background", value)} />
                <ColorField label="Background Secondary" value={settings.theme.background_secondary} onChange={(value) => setNestedValue("theme", "background_secondary", value)} />
                <ColorField label="Background Tertiary" value={settings.theme.background_tertiary} onChange={(value) => setNestedValue("theme", "background_tertiary", value)} />
                <ColorField label="Foreground" value={settings.theme.foreground} onChange={(value) => setNestedValue("theme", "foreground", value)} />
                <ColorField label="Foreground Muted" value={settings.theme.foreground_muted} onChange={(value) => setNestedValue("theme", "foreground_muted", value)} />
                <ColorField label="Accent" value={settings.theme.accent} onChange={(value) => setNestedValue("theme", "accent", value)} />
                <ColorField label="Accent Hover" value={settings.theme.accent_hover} onChange={(value) => setNestedValue("theme", "accent_hover", value)} />
                <ColorField label="Accent Light" value={settings.theme.accent_light} onChange={(value) => setNestedValue("theme", "accent_light", value)} />
                <ColorField label="Border" value={settings.theme.border} onChange={(value) => setNestedValue("theme", "border", value)} />
                <ColorField label="Border Hover" value={settings.theme.border_hover} onChange={(value) => setNestedValue("theme", "border_hover", value)} />
              </div>
            </SectionCard>
          )}

          {activeTab === "content" && (
            <SectionCard title="Content & UX" description="Tune pagination, related videos, age gate, and disclaimer behavior.">
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="Videos Per Page" type="number" value={settings.content.videos_per_page} onChange={(value) => setNestedValue("content", "videos_per_page", Number(value))} />
                <TextField label="Related Videos Count" type="number" value={settings.content.related_videos} onChange={(value) => setNestedValue("content", "related_videos", Number(value))} />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <ToggleField label="Show Disclaimer Banner" checked={settings.content.show_disclaimer} onChange={(value) => setNestedValue("content", "show_disclaimer", value)} />
                <ToggleField label="Enable Age Gate" checked={settings.content.enable_age_gate} onChange={(value) => setNestedValue("content", "enable_age_gate", value)} />
                <ToggleField label="Enable Popunder Ads" checked={settings.content.enable_popunder_ads} onChange={(value) => setNestedValue("content", "enable_popunder_ads", value)} />
              </div>
              <TextField label="Disclaimer Text" value={settings.content.disclaimer_text} onChange={(value) => setNestedValue("content", "disclaimer_text", value)} multiline />
            </SectionCard>
          )}

          {activeTab === "ads" && (
            <SectionCard title="Ads" description="Manage ad network and zone IDs without a rebuild.">
              <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground-muted">
                Admin values are the source of truth. Environment variables only fill blank ad settings as fallback.
              </div>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">Ad Network</span>
                <select
                  value={settings.ads.network}
                  onChange={(event) => setNestedValue("ads", "network", event.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="exoclick">ExoClick</option>
                  <option value="trafficjunky">TrafficJunky</option>
                  <option value="juicyads">JuicyAds</option>
                  <option value="custom">Custom</option>
                </select>
              </label>
              <div className="grid gap-4 lg:grid-cols-2">
                {([
                  ["banner", "Banner"],
                  ["sidebar", "Sidebar"],
                  ["native", "Native"],
                  ["popunder", "Popunder"],
                  ["video_banner", "Video Player Ad"],
                  ["mobile_banner", "Mobile Banner"],
                ] as const).map(([key, label]) => {
                  const slot = settings.ads[key];
                  return (
                    <div key={key} className="rounded-2xl border border-border bg-background p-4 space-y-3">
                      <ToggleField label={`${label} Enabled`} checked={slot.enabled} onChange={(value) => setAdSlotValue(key, "enabled", value)} />
                      <TextField label={`${label} Label`} value={slot.label} onChange={(value) => setAdSlotValue(key, "label", value)} />
                      <TextField label={`${label} Zone ID`} value={slot.zone_id} onChange={(value) => setAdSlotValue(key, "zone_id", value)} />
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
              >
                {saving ? "Saving Ads..." : "Save Ads Settings"}
              </button>
            </SectionCard>
          )}

          {activeTab === "seo" && (
            <>
              <SectionCard title="AI SEO Test" description="Generate neutral adult catalog text for a video page.">
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField label="Video ID or External ID" value={seoVideoId} onChange={setSeoVideoId} />
                  <ToggleField label="Save To Video Description" checked={seoSave} onChange={setSeoSave} />
                </div>
                <TextField label="Title Override" value={seoTitle} onChange={setSeoTitle} />
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField label="Categories" value={seoCategories} onChange={setSeoCategories} />
                  <TextField label="Tags" value={seoTags} onChange={setSeoTags} />
                </div>
                <button
                  type="button"
                  onClick={handleGenerateSEO}
                  disabled={seoGenerating}
                  className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
                >
                  {seoGenerating ? "Generating..." : "Generate SEO"}
                </button>

                {seoResult ? (
                  <div className="rounded-2xl border border-border bg-background p-4 text-sm">
                    <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-foreground-muted">
                      <span>{seoResult.provider}</span>
                      <span>{seoResult.model}</span>
                      <span>{seoResult.saved ? "saved" : seoResult.ok ? "preview" : "rejected"}</span>
                    </div>
                    <h3 className="mt-3 text-base font-semibold">{seoResult.seo.title}</h3>
                    <p className="mt-2 text-foreground-muted">{seoResult.seo.meta_description}</p>
                    <p className="mt-3 whitespace-pre-line leading-relaxed text-foreground">{seoResult.seo.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-foreground-muted">
                      {seoResult.seo.tags.map((tag) => (
                        <span key={tag} className="rounded-full border border-border px-2 py-1">
                          {tag}
                        </span>
                      ))}
                    </div>
                    {seoResult.seo.safety_notes ? (
                      <p className="mt-3 text-sm text-foreground-muted">{seoResult.seo.safety_notes}</p>
                    ) : null}
                  </div>
                ) : null}
              </SectionCard>

              <SectionCard title="SEO" description="Runtime metadata, sitemap domain, and social copy.">
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField label="Site URL" value={settings.seo.site_url} onChange={(value) => setNestedValue("seo", "site_url", value)} />
                  <TextField label="Title Template" value={settings.seo.title_template} onChange={(value) => setNestedValue("seo", "title_template", value)} />
                  <TextField label="Default Title" value={settings.seo.default_title} onChange={(value) => setNestedValue("seo", "default_title", value)} />
                  <TextField label="Open Graph Title" value={settings.seo.open_graph_title} onChange={(value) => setNestedValue("seo", "open_graph_title", value)} />
                  <TextField label="Twitter Title" value={settings.seo.twitter_title} onChange={(value) => setNestedValue("seo", "twitter_title", value)} />
                </div>
                <TextField label="Default Description" value={settings.seo.default_description} onChange={(value) => setNestedValue("seo", "default_description", value)} multiline />
                <TextField label="Open Graph Description" value={settings.seo.open_graph_description} onChange={(value) => setNestedValue("seo", "open_graph_description", value)} multiline />
                <TextField label="Twitter Description" value={settings.seo.twitter_description} onChange={(value) => setNestedValue("seo", "twitter_description", value)} multiline />
                <TextField label="Default Keywords (comma separated)" value={keywordText} onChange={(value) => setSettings((prev) => prev ? ({ ...prev, seo: { ...prev.seo, default_keywords: value.split(",").map((item) => item.trim()).filter(Boolean) } }) : prev)} multiline />
              </SectionCard>
            </>
          )}

          {activeTab === "ai seo" && (
            <>
              {/* Status Header */}
              <SectionCard title="AI SEO Backfill Status" description="Real-time monitoring of the automated video description generation pipeline.">
                {aiSeoStatus ? (
                  <div className="space-y-5">
                    {/* Running indicator + controls */}
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`h-3 w-3 rounded-full flex-shrink-0 ${aiSeoStatus.running ? "bg-green-500 animate-pulse" : "bg-foreground-muted/40"}`} />
                      <span className="text-sm font-semibold">
                        {aiSeoStatus.running ? "Backfill Running" : "Backfill Idle / Paused"}
                      </span>
                      <div className="ml-auto flex items-center gap-2">
                        {!aiSeoStatus.running ? (
                          <button
                            id="btn-seo-backfill-start"
                            onClick={handleStartBackfill}
                            disabled={aiSeoActionLoading}
                            className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
                          >
                            {aiSeoActionLoading ? "Starting…" : "▶ Start Backfill"}
                          </button>
                        ) : (
                          <button
                            id="btn-seo-backfill-stop"
                            onClick={handleStopBackfill}
                            disabled={aiSeoActionLoading}
                            className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
                          >
                            {aiSeoActionLoading ? "Stopping…" : "⏹ Stop Backfill"}
                          </button>
                        )}
                        <div className="h-6 w-px bg-border mx-1"></div>
                        <button
                          type="button"
                          onClick={() => handleResetBackfill("today")}
                          disabled={aiSeoActionLoading || aiSeoStatus.running}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-background hover:border-yellow-500 hover:text-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Revert today's AI updates and clear today's logs"
                        >
                          ↺ Reset Today
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResetBackfill("all")}
                          disabled={aiSeoActionLoading || aiSeoStatus.running}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-background hover:border-red-500 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Revert ALL AI updates ever made and clear ALL logs"
                        >
                          ⚠️ Reset ALL
                        </button>
                      </div>
                    </div>
                    {aiSeoActionMsg && (
                      <p className="text-xs px-3 py-1.5 rounded-lg bg-background border border-border text-foreground-muted">
                        {aiSeoActionMsg}
                      </p>
                    )}

                    {/* Token Budget Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-foreground-muted">
                        <span>Daily Token Budget</span>
                        <span>
                          {(aiSeoStatus.tokens_used / 1_000_000).toFixed(2)}M / {(aiSeoStatus.tokens_budget / 1_000_000).toFixed(1)}M
                          ({aiSeoStatus.tokens_percent.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-background overflow-hidden border border-border">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${Math.min(aiSeoStatus.tokens_percent, 100)}%`,
                            background: aiSeoStatus.tokens_percent > 90
                              ? "linear-gradient(90deg, #ef4444, #dc2626)"
                              : aiSeoStatus.tokens_percent > 60
                              ? "linear-gradient(90deg, #f59e0b, #eab308)"
                              : "linear-gradient(90deg, rgb(var(--color-accent)), rgb(var(--color-accent-hover)))",
                          }}
                        />
                      </div>
                      <p className="text-xs text-foreground-muted">
                        ~{aiSeoStatus.videos_remaining.toLocaleString()} videos can still be processed today
                      </p>
                    </div>

                    {/* Stat Cards */}
                    <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                      <div className="rounded-xl border border-border bg-background p-3 text-center">
                        <p className="text-2xl font-bold">{aiSeoStatus.total_processed.toLocaleString()}</p>
                        <p className="text-xs text-foreground-muted mt-1">Total Processed</p>
                      </div>
                      <div className="rounded-xl border border-border bg-background p-3 text-center">
                        <p className="text-2xl font-bold text-green-500">{aiSeoStatus.total_updated.toLocaleString()}</p>
                        <p className="text-xs text-foreground-muted mt-1">Updated</p>
                      </div>
                      <div className="rounded-xl border border-border bg-background p-3 text-center">
                        <p className="text-2xl font-bold text-yellow-500">{aiSeoStatus.total_rejected.toLocaleString()}</p>
                        <p className="text-xs text-foreground-muted mt-1">Rejected</p>
                      </div>
                      <div className="rounded-xl border border-border bg-background p-3 text-center">
                        <p className="text-2xl font-bold text-red-500">{aiSeoStatus.total_errors.toLocaleString()}</p>
                        <p className="text-xs text-foreground-muted mt-1">Errors</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-foreground-muted">Loading status...</p>
                )}
              </SectionCard>

              {/* Activity Log */}
              <SectionCard title="Activity Log" description="Every video processed by the AI SEO pipeline with before and after descriptions.">
                {/* Filter tabs + Export controls */}
                <div className="flex flex-wrap gap-2 items-center">
                  {[
                    { label: "All", value: "" },
                    { label: "Updated", value: "updated" },
                    { label: "Rejected", value: "rejected" },
                    { label: "Errors", value: "error" },
                  ].map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => handleAiSeoFilterChange(f.value)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        aiSeoFilter === f.value
                          ? "bg-accent text-white"
                          : "bg-background text-foreground-muted hover:text-foreground border border-border"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                  <span className="text-xs text-foreground-muted self-center">
                    {aiSeoLogsTotal.toLocaleString()} entries
                  </span>

                  {/* Export + Copy controls */}
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      id="btn-copy-visible-logs"
                      type="button"
                      onClick={handleCopyAllVisible}
                      disabled={aiSeoLogs.length === 0}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-background hover:border-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      📋 Copy Page
                    </button>
                    <button
                      id="btn-export-csv"
                      type="button"
                      onClick={() => handleExport("csv")}
                      disabled={exportLoading || aiSeoLogsTotal === 0}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-background hover:border-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {exportLoading ? "…" : "⬇ CSV"}
                    </button>
                    <button
                      id="btn-export-json"
                      type="button"
                      onClick={() => handleExport("json")}
                      disabled={exportLoading || aiSeoLogsTotal === 0}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-background hover:border-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {exportLoading ? "…" : "⬇ JSON"}
                    </button>
                  </div>
                </div>

                {/* Log entries */}
                {aiSeoLogs.length === 0 ? (
                  <p className="text-sm text-foreground-muted py-4">No activity logs yet. Start the backfill to see entries here.</p>
                ) : (
                  <div className="space-y-2">
                    {aiSeoLogs.map((entry) => (
                      <div key={entry.id} className="rounded-xl border border-border bg-background overflow-hidden">
                        {/* Collapsed row */}
                        <button
                          type="button"
                          onClick={() => setAiSeoExpanded(aiSeoExpanded === entry.id ? null : entry.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-background-secondary/50 transition-colors"
                        >
                          <span className={`h-2 w-2 rounded-full flex-shrink-0 ${
                            entry.status === "updated" ? "bg-green-500" :
                            entry.status === "rejected" ? "bg-yellow-500" : "bg-red-500"
                          }`} />
                          <span className="flex-1 text-sm font-medium truncate">{entry.video_title}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            entry.status === "updated" ? "bg-green-500/10 text-green-500" :
                            entry.status === "rejected" ? "bg-yellow-500/10 text-yellow-500" : "bg-red-500/10 text-red-500"
                          }`}>
                            {entry.status}
                          </span>
                          <span className="text-xs text-foreground-muted flex-shrink-0">
                            ID:{entry.video_id}
                          </span>
                          <span className="text-xs text-foreground-muted flex-shrink-0">
                            {new Date(entry.processed_at).toLocaleString()}
                          </span>
                          <svg className={`w-4 h-4 text-foreground-muted transition-transform ${aiSeoExpanded === entry.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Expanded detail */}
                        {aiSeoExpanded === entry.id && (
                          <div className="px-4 pb-4 border-t border-border space-y-3">
                            {entry.safety_notes && (
                              <div className="mt-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20 px-3 py-2">
                                <p className="text-xs font-medium text-yellow-500">Safety Note</p>
                                <p className="text-sm text-foreground-muted mt-1">{entry.safety_notes}</p>
                              </div>
                            )}

                            <div className="grid gap-4 md:grid-cols-2 mt-3">
                              <div>
                                <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider mb-2">Before (Old Description)</p>
                                <div className="rounded-lg border border-border bg-background-secondary p-3 text-sm text-foreground-muted min-h-[80px] max-h-[200px] overflow-y-auto">
                                  {entry.old_description || <span className="italic opacity-50">Empty — no description</span>}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-green-500 uppercase tracking-wider mb-2">After (New Description)</p>
                                <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 text-sm text-foreground min-h-[80px] max-h-[200px] overflow-y-auto">
                                  {entry.new_description || <span className="italic opacity-50">No description generated</span>}
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-4 text-xs text-foreground-muted items-center">
                              <span>Tokens: ~{entry.tokens_used}</span>
                              <span>Processed: {new Date(entry.processed_at).toLocaleString()}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyEntry(entry)}
                                className="ml-auto px-3 py-1 rounded-lg border border-border bg-background hover:border-accent text-xs font-medium transition-colors"
                              >
                                {copiedId === entry.id ? "✓ Copied!" : "📋 Copy Entry"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {aiSeoLogsTotal > 20 && (
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => handleAiSeoPageChange(aiSeoLogsPage - 1)}
                      disabled={aiSeoLogsPage <= 1}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-accent disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ← Previous
                    </button>
                    <span className="text-xs text-foreground-muted">
                      Page {aiSeoLogsPage} of {Math.ceil(aiSeoLogsTotal / 20)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAiSeoPageChange(aiSeoLogsPage + 1)}
                      disabled={aiSeoLogsPage >= Math.ceil(aiSeoLogsTotal / 20)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-accent disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </SectionCard>
            </>
          )}

          {activeTab === "affiliates" && (
            <SectionCard title="Affiliate IDs" description="Manage affiliate tracking IDs without touching env files again.">
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="KinkyDollars ID" value={settings.affiliates.kinkydollars_id} onChange={(value) => setNestedValue("affiliates", "kinkydollars_id", value)} />
                <TextField label="ClubDomCash ID" value={settings.affiliates.clubdomcash_id} onChange={(value) => setNestedValue("affiliates", "clubdomcash_id", value)} />
                <TextField label="Femdom Empire ID" value={settings.affiliates.femdomempire_id} onChange={(value) => setNestedValue("affiliates", "femdomempire_id", value)} />
                <TextField label="Device Bondage ID" value={settings.affiliates.devicebondage_id} onChange={(value) => setNestedValue("affiliates", "devicebondage_id", value)} />
                <TextField label="Hogtied ID" value={settings.affiliates.hogtied_id} onChange={(value) => setNestedValue("affiliates", "hogtied_id", value)} />
                <TextField label="Whipped Ass ID" value={settings.affiliates.whippedass_id} onChange={(value) => setNestedValue("affiliates", "whippedass_id", value)} />
                <TextField label="Sadistic Rope ID" value={settings.affiliates.sadisticrope_id} onChange={(value) => setNestedValue("affiliates", "sadisticrope_id", value)} />
                <TextField label="Default Fallback ID" value={settings.affiliates.default_id} onChange={(value) => setNestedValue("affiliates", "default_id", value)} />
              </div>
            </SectionCard>
          )}

          {activeTab === "legal" && (
            <div className="space-y-6">
              {([
                ["terms", "Terms"],
                ["privacy", "Privacy"],
                ["dmca", "DMCA"],
                ["compliance_2257", "2257 Compliance"],
                ["acceptable_content", "Acceptable Content"],
                ["content_removal", "Content Removal"],
              ] as const).map(([key, label]) => (
                <SectionCard key={key} title={label}>
                  <TextField label="Page Title" value={settings.legal[key].title} onChange={(value) => setLegalValue(key, "title", value)} />
                  <TextField label="Page Content" value={settings.legal[key].content} onChange={(value) => setLegalValue(key, "content", value)} multiline />
                </SectionCard>
              ))}
            </div>
          )}

          {activeTab === "messages" && (
            <SectionCard title="Messages" description="Content removal, DMCA, privacy, and general messages submitted through the site form.">
              {messages.length === 0 ? (
                <p className="text-sm text-foreground-muted">No messages yet.</p>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <article key={message.id} className="rounded-2xl border border-border bg-background p-4 space-y-3">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-background-secondary px-2.5 py-1 text-xs font-medium uppercase text-foreground-muted">
                              {message.type.replace("_", " ")}
                            </span>
                            <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground-muted">
                              {message.status}
                            </span>
                          </div>
                          <h3 className="mt-3 text-lg font-semibold">{message.subject}</h3>
                          <p className="mt-1 text-xs text-foreground-muted">
                            {new Date(message.created_at).toLocaleString()}
                            {message.name ? ` • ${message.name}` : ""}
                            {message.reply_to ? ` • ${message.reply_to}` : ""}
                          </p>
                        </div>
                        <select
                          value={message.status}
                          onChange={(event) => updateMessageStatus(message.id, event.target.value as ContactSubmission["status"])}
                          className="rounded-xl border border-border bg-background-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                        >
                          <option value="new">New</option>
                          <option value="reviewing">Reviewing</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>

                      <p className="whitespace-pre-line text-sm leading-relaxed text-foreground-muted">{message.message}</p>

                      <div className="space-y-1 text-xs text-foreground-muted">
                        {message.page_url ? (
                          <p>
                            KinkTube URL:{" "}
                            <a className="text-accent hover:underline" href={message.page_url} target="_blank" rel="noreferrer">
                              {message.page_url}
                            </a>
                          </p>
                        ) : null}
                        {message.source_url ? (
                          <p>
                            Source URL:{" "}
                            <a className="text-accent hover:underline" href={message.source_url} target="_blank" rel="noreferrer">
                              {message.source_url}
                            </a>
                          </p>
                        ) : null}
                        <p>IP: {message.ip_address || "n/a"}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </SectionCard>
          )}

          {activeTab === "import" && (
            <SectionCard title="Import Settings" description="Control importer depth and runtime behavior.">
              <ToggleField label="Enable Scheduled Importing" checked={settings.import.import_enabled} onChange={(value) => setNestedValue("import", "import_enabled", value)} />
              <div className="grid gap-4 md:grid-cols-3">
                <TextField label="Import Max Pages" type="number" value={settings.import.import_max_pages} onChange={(value) => setNestedValue("import", "import_max_pages", Number(value))} />
                <TextField label="Light Import Max Pages" type="number" value={settings.import.light_import_max_pages} onChange={(value) => setNestedValue("import", "light_import_max_pages", Number(value))} />
                <TextField label="Light Import Keywords" type="number" value={settings.import.light_import_keywords} onChange={(value) => setNestedValue("import", "light_import_keywords", Number(value))} />
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
