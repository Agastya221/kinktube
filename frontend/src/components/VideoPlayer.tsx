"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Settings,
  RotateCcw,
  Loader2,
  MonitorPlay,
} from "lucide-react";
import { getDisplayThumbnailUrl } from "@/lib/media";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StreamResponse {
  url: string;
  type: "hls" | "mp4";
  external_id: string;
  embed_url?: string;
  cached: boolean;
}

interface StreamError {
  error: string;
  embed_url?: string;
}

interface VideoPlayerProps {
  embedUrl: string;
  title: string;
  thumbnailUrl?: string;
  autoplay?: boolean;
  videoId?: number;
  externalId?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/+$/, "");

// ─── Component ────────────────────────────────────────────────────────────────

export default function VideoPlayer({
  embedUrl,
  title,
  thumbnailUrl,
  autoplay = false,
  videoId,
  externalId,
}: VideoPlayerProps) {
  // refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hlsRef = useRef<unknown>(null);

  // loading/state
  const [phase, setPhase] = useState<
    "idle" | "resolving" | "ready" | "error" | "iframe_fallback"
  >("idle");
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [streamType, setStreamType] = useState<"hls" | "mp4">("hls");
  const [fallbackEmbedUrl, setFallbackEmbedUrl] = useState<string>(embedUrl);


  // playback controls state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [qualityLevels, setQualityLevels] = useState<string[]>([]);
  const [showQuality, setShowQuality] = useState(false);

  // ── thumbnail URL ─────────────────────────────────────────────────────────
  const displayThumbnail = getDisplayThumbnailUrl(thumbnailUrl);

  // ── resolve stream URL from backend ──────────────────────────────────────
  const resolveStream = useCallback(async () => {
    setPhase("resolving");

    const identifier = videoId ?? externalId;
    if (!identifier) {
      // Nothing to resolve — fall straight to iframe embed
      setPhase("iframe_fallback");
      return;
    }

    // Abort if the backend hasn't responded within 8 seconds
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(`${API_BASE}/api/videos/${identifier}/stream`, {
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        const err: StreamError = await res.json().catch(() => ({ error: "unknown" }));
        if (err.embed_url) {
          setFallbackEmbedUrl(err.embed_url);
        }
        setPhase("iframe_fallback");
        return;
      }

      const data: StreamResponse = await res.json();
      setStreamUrl(data.url);
      setStreamType(data.type);
      setPhase("ready");
    } catch {
      clearTimeout(timer);
      // Network error or timeout — use iframe embed as fallback
      setPhase("iframe_fallback");
    }
  }, [videoId, externalId]);

  // ── HLS.js integration ───────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "ready" || !streamUrl || !videoRef.current) return;

    const video = videoRef.current;

    // Watchdog: if canplay never fires within 10s, fall back to iframe
    let watchdog: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      setPhase("iframe_fallback");
    }, 10000);

    const clearWatchdog = () => {
      if (watchdog) { clearTimeout(watchdog); watchdog = null; }
    };

    const onCanPlayOnce = () => {
      clearWatchdog();
      setIsBuffering(false);
    };
    video.addEventListener("canplay", onCanPlayOnce, { once: true });

    const attachDirect = () => {
      video.src = streamUrl;
      if (autoplay) video.play().catch(() => {});
    };

    if (streamType === "mp4") {
      attachDirect();
      return () => { clearWatchdog(); video.removeEventListener("canplay", onCanPlayOnce); };
    }

    // HLS stream
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari — native HLS support
      attachDirect();
      return () => { clearWatchdog(); video.removeEventListener("canplay", onCanPlayOnce); };
    }

    // Other browsers — use hls.js
    import("hls.js").then(({ default: Hls }) => {
      if (!Hls.isSupported()) {
        attachDirect();
        return;
      }

      const hls = new Hls({
        enableWorker: true,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        // Pass Referer so Eporner CDN accepts segment requests
        xhrSetup: (xhr: XMLHttpRequest) => {
          xhr.setRequestHeader("Referer", "https://www.eporner.com/");
        },
      });

      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        const levels = data.levels.map(
          (l: { height?: number; width?: number }) =>
            l.height ? `${l.height}p` : l.width ? `${l.width}w` : "auto"
        );
        setQualityLevels(["auto", ...levels]);
        if (autoplay) video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_, data: { fatal?: boolean }) => {
        if (data.fatal) {
          // Don't mark video as permanently unavailable — HLS may fail due to
          // CORS/CDN restrictions. Just silently fall back to the embed iframe.
          clearWatchdog();
          const hlsInst = hlsRef.current as { destroy?: () => void } | null;
          if (hlsInst?.destroy) hlsInst.destroy();
          hlsRef.current = null;
          setPhase("iframe_fallback");
        }
      });
    });

    return () => {
      clearWatchdog();
      video.removeEventListener("canplay", onCanPlayOnce);
      const hls = hlsRef.current as { destroy?: () => void } | null;
      if (hls?.destroy) hls.destroy();
      hlsRef.current = null;
    };
  }, [phase, streamUrl, streamType, autoplay, videoId]);

  // ── video element event handlers ─────────────────────────────────────────
  const onPlay = () => setIsPlaying(true);
  const onPause = () => setIsPlaying(false);
  const onWaiting = () => setIsBuffering(true);
  const onCanPlay = () => setIsBuffering(false);
  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    if (v.buffered.length > 0) {
      setBuffered(v.buffered.end(v.buffered.length - 1));
    }
  };
  const onDurationChange = () => {
    const v = videoRef.current;
    if (v) setDuration(v.duration);
  };
  const onVolumeChange = () => {
    const v = videoRef.current;
    if (!v) return;
    setIsMuted(v.muted);
    setVolume(v.volume);
  };

  // ── fullscreen sync ───────────────────────────────────────────────────────
  useEffect(() => {
    const onFsChange = () =>
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // ── controls auto-hide ────────────────────────────────────────────────────
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowControls(false);
    }, 3000);
  }, []);

  // ── control actions ───────────────────────────────────────────────────────
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); } else { v.pause(); }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
  };

  const changeVolume = (val: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = val;
    v.muted = val === 0;
  };

  const seek = (val: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = val;
  };

  const skip = (secs: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + secs));
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement === el) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {/* ignore */ }
  };

  // ── keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "ready") return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "m":
          toggleMute();
          break;
        case "ArrowRight":
          skip(10);
          break;
        case "ArrowLeft":
          skip(-10);
          break;
        case "f":
          toggleFullscreen();
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── progress bar percentage helpers ──────────────────────────────────────
  const playPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufPct = duration > 0 ? (buffered / duration) * 100 : 0;

  // ─── RENDER ───────────────────────────────────────────────────────────────

  // ── [A] Idle — show thumbnail + big play button ───────────────────────────
  if (phase === "idle") {
    return (
      <div className="video-player-wrapper relative">
        <div
          className="relative w-full overflow-hidden rounded-lg bg-black"
          style={{ aspectRatio: "16 / 9" }}
        >
          {thumbnailUrl && (
            <Image
              src={displayThumbnail}
              alt={title}
              fill
              sizes="100vw"
              className="object-cover"
              priority
              unoptimized
            />
          )}
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/50" />

          {/* Play button */}
          <button
            onClick={resolveStream}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 group"
            aria-label="Play video"
          >
            <div
              className="
                w-20 h-20 sm:w-24 sm:h-24 rounded-full
                bg-accent/90 group-hover:bg-accent group-hover:scale-110
                flex items-center justify-center
                transition-all duration-300 shadow-2xl shadow-accent/50
              "
            >
              <Play className="w-10 h-10 sm:w-12 sm:h-12 text-white fill-white ml-1" />
            </div>
            <span className="text-white/80 text-sm font-medium bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
              Click to play
            </span>
          </button>
        </div>
      </div>
    );
  }

  // ── [B] Resolving stream URL ──────────────────────────────────────────────
  if (phase === "resolving") {
    return (
      <div className="video-player-wrapper relative">
        <div
          className="relative w-full overflow-hidden rounded-lg bg-black"
          style={{ aspectRatio: "16 / 9" }}
        >
          {thumbnailUrl && (
            <Image
              src={displayThumbnail}
              alt={title}
              fill
              sizes="100vw"
              className="object-cover opacity-40"
              unoptimized
            />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-10 h-10 text-accent animate-spin" />
            <p className="text-white/80 text-sm">Loading player…</p>
          </div>
        </div>
      </div>
    );
  }

  // ── [C] Iframe fallback (stream resolve failed or HLS error) ─────────────
  if (phase === "iframe_fallback") {
    const iframeUrl = (() => {
      try {
        const u = new URL(fallbackEmbedUrl);
        u.searchParams.set("autoplay", "1");
        return u.toString();
      } catch {
        return fallbackEmbedUrl;
      }
    })();

    return (
      <div className="video-player-wrapper relative">
        <div
          ref={containerRef}
          className={`relative w-full overflow-hidden bg-black ${isFullscreen ? "fixed inset-0 z-50" : "rounded-lg"}`}
          style={{ aspectRatio: "16 / 9" }}
        >
          <iframe
            src={iframeUrl}
            title={title}
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            className="absolute inset-0 w-full h-full"
            referrerPolicy="no-referrer-when-downgrade"
          />
          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="absolute bottom-4 right-4 p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white transition-colors opacity-0 hover:opacity-100"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-foreground-muted">
          <MonitorPlay className="w-3.5 h-3.5" />
          <span>Playing via embed</span>
        </div>
      </div>
    );
  }

  // ── [E] Custom player (HLS / MP4 ready) ──────────────────────────────────
  return (
    <div className="video-player-wrapper relative">
      <div
        ref={containerRef}
        onMouseMove={resetControlsTimer}
        onMouseEnter={resetControlsTimer}
        className={`
          group relative w-full overflow-hidden bg-black select-none
          ${isFullscreen ? "fixed inset-0 z-50 rounded-none" : "rounded-lg"}
        `}
        style={isFullscreen ? {} : { aspectRatio: "16 / 9" }}
      >
        {/* ── Video element ─────────────────────────────────────────────── */}
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          playsInline
          preload="metadata"
          onPlay={onPlay}
          onPause={onPause}
          onWaiting={onWaiting}
          onCanPlay={onCanPlay}
          onTimeUpdate={onTimeUpdate}
          onDurationChange={onDurationChange}
          onVolumeChange={onVolumeChange}
          onEnded={() => setIsPlaying(false)}
          onClick={togglePlay}
        />

        {/* ── Buffering spinner ─────────────────────────────────────────── */}
        {isBuffering && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Loader2 className="w-10 h-10 text-white/80 animate-spin drop-shadow-lg" />
          </div>
        )}

        {/* ── Centre play/pause flash ───────────────────────────────────── */}
        {!isPlaying && !isBuffering && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center"
            aria-label="Play"
          >
            <div className="w-16 h-16 rounded-full bg-black/60 flex items-center justify-center">
              <Play className="w-8 h-8 text-white fill-white ml-1" />
            </div>
          </button>
        )}

        {/* ── Controls bar ──────────────────────────────────────────────── */}
        <div
          className={`
            absolute bottom-0 left-0 right-0
            transition-opacity duration-300
            ${showControls || !isPlaying ? "opacity-100" : "opacity-0"}
          `}
        >
          {/* Gradient bg */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

          <div className="relative px-3 pb-3 pt-8 space-y-2">
            {/* ── Progress bar ────────────────────────────────────────── */}
            <div className="flex items-center gap-2">
              <span className="text-white/80 text-xs tabular-nums min-w-[3.5rem]">
                {formatTime(currentTime)}
              </span>

              <div className="relative flex-1 h-1 group/progress cursor-pointer">
                {/* Track */}
                <div className="absolute inset-0 rounded-full bg-white/20 overflow-hidden">
                  {/* Buffered */}
                  <div
                    className="absolute inset-y-0 left-0 bg-white/30"
                    style={{ width: `${bufPct}%` }}
                  />
                  {/* Played */}
                  <div
                    className="absolute inset-y-0 left-0 bg-accent transition-[width]"
                    style={{ width: `${playPct}%` }}
                  />
                </div>
                {/* Clickable input */}
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => seek(Number(e.target.value))}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
                  aria-label="Seek"
                />
              </div>

              <span className="text-white/60 text-xs tabular-nums min-w-[3.5rem] text-right">
                {formatTime(duration)}
              </span>
            </div>

            {/* ── Button row ──────────────────────────────────────────── */}
            <div className="flex items-center gap-1">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="p-1.5 rounded-md hover:bg-white/10 text-white transition-colors"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying
                  ? <Pause className="w-5 h-5 fill-white" />
                  : <Play className="w-5 h-5 fill-white ml-0.5" />
                }
              </button>

              {/* Skip back 10s */}
              <button
                onClick={() => skip(-10)}
                className="p-1.5 rounded-md hover:bg-white/10 text-white transition-colors"
                aria-label="Rewind 10 seconds"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Volume */}
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-md hover:bg-white/10 text-white transition-colors"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0
                  ? <VolumeX className="w-5 h-5" />
                  : <Volume2 className="w-5 h-5" />
                }
              </button>

              {/* Volume slider */}
              <div className="relative w-20 h-1 group/vol cursor-pointer hidden sm:block">
                <div className="absolute inset-0 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-white"
                    style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => changeVolume(Number(e.target.value))}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer"
                  aria-label="Volume"
                />
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Quality selector */}
              {qualityLevels.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowQuality((v) => !v)}
                    className="p-1.5 rounded-md hover:bg-white/10 text-white transition-colors"
                    aria-label="Quality settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  {showQuality && (
                    <div className="absolute bottom-8 right-0 bg-black/90 rounded-lg py-1 min-w-[80px] border border-white/10">
                      {qualityLevels.map((q) => (
                        <button
                          key={q}
                          className="block w-full text-left px-3 py-1.5 text-xs text-white hover:bg-white/10"
                          onClick={() => setShowQuality(false)}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="p-1.5 rounded-md hover:bg-white/10 text-white transition-colors"
                aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {isFullscreen
                  ? <Minimize2 className="w-5 h-5" />
                  : <Maximize2 className="w-5 h-5" />
                }
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Below-player row */}
      <div className="mt-2 flex items-center gap-2 text-xs text-foreground-muted">
        <MonitorPlay className="w-3.5 h-3.5 text-accent" />
        <span>
          {streamType === "hls" ? "HD Stream" : "Direct Video"} · Keyboard: Space/K = play, M = mute,
          ← → = skip, F = fullscreen
        </span>
      </div>
    </div>
  );
}
