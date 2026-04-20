"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getAdminImportStatus,
  getAdminSession,
  getAdminSettings,
  getCategories,
  getStats,
  loginAdmin,
  logoutAdmin,
  triggerAdminImport,
  updateAdminSettings,
} from "@/lib/api";
import type { AdminImportStatusResponse, AdminSessionResponse, CategoriesResponse, SiteSettings, StatsResponse } from "@/lib/types";

const tabs = [
  "overview",
  "branding",
  "theme",
  "content",
  "ads",
  "seo",
  "affiliates",
  "legal",
  "import",
] as const;

type Tab = typeof tabs[number];

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

export default function AdminConsole() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [session, setSession] = useState<AdminSessionResponse | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [categories, setCategories] = useState<CategoriesResponse | null>(null);
  const [importStatus, setImportStatus] = useState<AdminImportStatusResponse | null>(null);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isAuthenticated = !!session?.authenticated;

  async function loadAdminData() {
    const [sessionData, settingsData, statsData, categoriesData, importData] = await Promise.all([
      getAdminSession(),
      getAdminSettings(),
      getStats(),
      getCategories(),
      getAdminImportStatus(),
    ]);

    setSession(sessionData);
    setSettings(settingsData);
    setStats(statsData);
    setCategories(categoriesData);
    setImportStatus(importData);
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
    setNotice("Logged out.");
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
                </SectionCard>
                <SectionCard title="Page Size">
                  <p className="text-3xl font-bold">{settings.content.videos_per_page}</p>
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
                  ["video_banner", "Video Banner"],
                  ["mobile_banner", "Mobile Banner"],
                ] as const).map(([key, label]) => {
                  const slot = settings.ads[key];
                  return (
                    <div key={key} className="rounded-2xl border border-border bg-background p-4 space-y-3">
                      <ToggleField label={`${label} Enabled`} checked={slot.enabled} onChange={(value) => setSettings((prev) => prev ? ({ ...prev, ads: { ...prev.ads, [key]: { ...prev.ads[key], enabled: value } } }) : prev)} />
                      <TextField label={`${label} Label`} value={slot.label} onChange={(value) => setSettings((prev) => prev ? ({ ...prev, ads: { ...prev.ads, [key]: { ...prev.ads[key], label: value } } }) : prev)} />
                      <TextField label={`${label} Zone ID`} value={slot.zone_id} onChange={(value) => setSettings((prev) => prev ? ({ ...prev, ads: { ...prev.ads, [key]: { ...prev.ads[key], zone_id: value } } }) : prev)} />
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {activeTab === "seo" && (
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
              ] as const).map(([key, label]) => (
                <SectionCard key={key} title={label}>
                  <TextField label="Page Title" value={settings.legal[key].title} onChange={(value) => setLegalValue(key, "title", value)} />
                  <TextField label="Page Content" value={settings.legal[key].content} onChange={(value) => setLegalValue(key, "content", value)} multiline />
                </SectionCard>
              ))}
            </div>
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
