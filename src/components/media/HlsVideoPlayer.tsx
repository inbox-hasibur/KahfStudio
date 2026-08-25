"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { 
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, AlertCircle, 
  Settings, Check, Loader2, Sparkles, PictureInPicture,
  RotateCcw, RotateCw, Gauge
} from "lucide-react";

export interface HlsVideoPlayerProps {
  src?: string;
  videoId?: string;
  title?: string;
  autoPlay?: boolean;
  onVideoElementReady?: (videoEl: HTMLVideoElement | null) => void;
  onPlayStateChange?: (playing: boolean) => void;
  className?: string;
  halalActive?: boolean;
  onToggleHalal?: () => void;
  mode?: string;
  mlStatus?: string;
  mlPrimed?: boolean;
}

export interface QualityLevel {
  id: number;
  label: string;
  height: number;
  bitrate?: number;
}

// Safe max audio multiplier (prevents loud ear-hurting sound bursts)
const SAFE_MAX_VOLUME = 0.65;

export const HlsVideoPlayer: React.FC<HlsVideoPlayerProps> = ({
  src,
  videoId,
  title = "Media Player",
  autoPlay = true,
  onVideoElementReady,
  onPlayStateChange,
  className = "",
  halalActive = false,
  onToggleHalal,
  mode = "dsp",
  mlStatus = "",
  mlPrimed = false
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [resolvedSrc, setResolvedSrc] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  
  // Displayed volume 0.0 to 1.0 (default 0.35 = safe pleasant listening)
  const [userVolume, setUserVolume] = useState<number>(0.35);

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [buffered, setBuffered] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusMsg, setStatusMsg] = useState<string>("Loading...");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [controlsVisible, setControlsVisible] = useState<boolean>(true);

  // Settings Menu state
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settingsTab, setSettingsTab] = useState<"main" | "quality" | "speed">("main");
  const [qualities, setQualities] = useState<QualityLevel[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<number>(-1); // -1 = Auto
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  // Apply safe scaled volume to video element
  const applySafeVolume = useCallback((val: number, muted: boolean) => {
    if (!videoRef.current) return;
    videoRef.current.muted = muted;
    videoRef.current.volume = muted ? 0 : Math.min(SAFE_MAX_VOLUME, val * SAFE_MAX_VOLUME);
  }, []);

  // 1. Resolve source when src or videoId changes
  useEffect(() => {
    let isCancelled = false;

    async function resolve() {
      setIsLoading(true);
      setErrorMsg(null);
      setCurrentTime(0);
      setDuration(0);
      setBuffered(0);

      if (src) {
        setResolvedSrc(src);
        setStatusMsg(src.includes(".m3u8") ? "Live HLS Stream" : "Video Ready");
        setIsLoading(false);
        return;
      }

      if (videoId) {
        setStatusMsg("Connecting stream...");
        try {
          const res = await fetch(`/api/yt-stream?v=${videoId}`);
          const data = await res.json();
          if (!isCancelled) {
            if (data.success && data.streamUrl) {
              setResolvedSrc(data.streamUrl);
              setStatusMsg(data.isLive ? "Live Stream (HLS)" : "Video Stream (MP4)");
            } else {
              setErrorMsg(data.error || "Stream unavailable");
            }
          }
        } catch (err: any) {
          if (!isCancelled) {
            setErrorMsg(err.message || "Failed to load stream");
          }
        } finally {
          if (!isCancelled) setIsLoading(false);
        }
      }
    }

    resolve();
    return () => { isCancelled = true; };
  }, [src, videoId]);

  // 2. Attach HLS.js or HTML5 Video with Low-Latency Buffer Configuration
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !resolvedSrc) return;

    video.crossOrigin = "anonymous";
    applySafeVolume(userVolume, isMuted);

    if (onVideoElementReady) {
      onVideoElementReady(video);
    }

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = resolvedSrc.includes(".m3u8") || resolvedSrc.includes("manifest");

    if (isHls && Hls.isSupported()) {
      setIsLoading(true);
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 10,
        maxBufferLength: 10,
        maxMaxBufferLength: 20,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6
      });
      hlsRef.current = hls;

      video.crossOrigin = "anonymous";
      hls.loadSource(resolvedSrc);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        setIsLoading(false);
        setStatusMsg("HLS Live HD");
        
        const levels: QualityLevel[] = data.levels.map((lvl, index) => ({
          id: index,
          label: `${lvl.height}p`,
          height: lvl.height,
          bitrate: lvl.bitrate
        }));
        setQualities(levels);

        video.play()
          .then(() => setIsPlaying(true))
          .catch((e) => console.log("Autoplay waiting:", e));
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        const lvl = hls.levels[data.level];
        if (lvl) {
          setStatusMsg(`${lvl.height}p HD`);
        }
      });

      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data.fatal) {
          setIsLoading(false);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setStatusMsg("Network retry...");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setStatusMsg("Recovering stream...");
              hls.recoverMediaError();
              break;
            default:
              setErrorMsg("Stream playback error");
              hls.destroy();
              break;
          }
        }
      });
    } else {
      video.src = resolvedSrc;
      video.load();
      setStatusMsg("1080p MP4");
      setQualities([
        { id: 0, label: "1080p Full HD", height: 1080 },
        { id: 1, label: "720p HD", height: 720 },
        { id: 2, label: "480p SD", height: 480 }
      ]);
      video.play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [resolvedSrc, onVideoElementReady, applySafeVolume, userVolume, isMuted]);

  // Autohide controls on idle
  const resetControlsTimer = useCallback(() => {
    setControlsVisible(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    hideControlsTimerRef.current = setTimeout(() => {
      if (isPlaying && !isSettingsOpen) {
        setControlsVisible(false);
      }
    }, 2800);
  }, [isPlaying, isSettingsOpen]);

  // Fullscreen listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);
    if (!isNaN(videoRef.current.duration) && isFinite(videoRef.current.duration)) {
      setDuration(videoRef.current.duration);
    }

    if (videoRef.current.buffered.length > 0) {
      const bufEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      setBuffered(bufEnd);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch((e) => console.warn("Play error:", e));
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    resetControlsTimer();
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    applySafeVolume(userVolume, nextMuted);
    resetControlsTimer();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setUserVolume(val);
    const nextMuted = val === 0;
    setIsMuted(nextMuted);
    applySafeVolume(val, nextMuted);
    resetControlsTimer();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    resetControlsTimer();
  };

  const skipTime = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration || Infinity, videoRef.current.currentTime + seconds));
    resetControlsTimer();
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
    resetControlsTimer();
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (e) {
      console.warn("PiP failed:", e);
    }
  };

  const handleQualityChange = (levelId: number) => {
    setSelectedQuality(levelId);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelId;
    }
    setIsSettingsOpen(false);
  };

  const handleSpeedChange = (spd: number) => {
    setPlaybackSpeed(spd);
    if (videoRef.current) {
      videoRef.current.playbackRate = spd;
    }
    setIsSettingsOpen(false);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs)) return "00:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={resetControlsTimer}
      onMouseLeave={() => isPlaying && !isSettingsOpen && setControlsVisible(false)}
      className={`relative rounded-2xl overflow-hidden bg-black border border-border shadow-2xl group select-none ${className}`}
    >
      {/* Viewport */}
      <div 
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        className="relative aspect-video w-full bg-zinc-950 flex items-center justify-center cursor-pointer overflow-hidden"
      >
        <video
          ref={videoRef}
          crossOrigin="anonymous"
          className="w-full h-full object-contain pointer-events-none"
          playsInline
          onPlay={() => {
            setIsPlaying(true);
            onPlayStateChange?.(true);
          }}
          onPause={() => {
            setIsPlaying(false);
            onPlayStateChange?.(false);
          }}
          onEnded={() => {
            setIsPlaying(false);
            onPlayStateChange?.(false);
          }}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleTimeUpdate}
          onWaiting={() => setIsLoading(true)}
          onPlaying={() => {
            setIsLoading(false);
            onPlayStateChange?.(true);
          }}
        />

        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs gap-3 z-10">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
            <span className="text-xs text-zinc-200 font-mono tracking-wider">{statusMsg}</span>
          </div>
        )}

        {/* Center Play Button */}
        {!isPlaying && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all duration-300 z-10">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center shadow-[0_0_35px_rgba(16,185,129,0.5)] transform group-hover:scale-110 transition-all duration-300">
              <Play className="w-8 h-8 fill-black ml-1" />
            </div>
          </div>
        )}

        {/* Top Header Badge */}
        <div className={`absolute top-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between transition-opacity duration-300 z-20 ${controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-white drop-shadow truncate max-w-[160px] sm:max-w-xs">
              {title}
            </span>

            {/* Neural ML Status Overlay Pill */}
            {halalActive && mode === "ml" && (
              !mlPrimed ? (
                <div className="px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-300 text-[9px] sm:text-[10px] font-mono font-semibold flex items-center gap-1 shadow-md backdrop-blur-md animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>AI Warming up (DSP active)...</span>
                </div>
              ) : (
                <div className="px-2 py-0.5 rounded-full bg-teal-950/80 border border-teal-500/50 text-teal-300 text-[9px] sm:text-[10px] font-mono font-semibold flex items-center gap-1 shadow-md backdrop-blur-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                  <span>Neural AI: Separating music ✓</span>
                </div>
              )
            )}
          </div>

          <div className="flex items-center gap-2">
            {halalActive ? (
              <div 
                onClick={(e) => { e.stopPropagation(); onToggleHalal?.(); }}
                className="px-2.5 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 text-[10px] sm:text-xs font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-md cursor-pointer hover:bg-emerald-900 transition-all animate-pulse"
              >
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>HALAL AUDIO ON</span>
              </div>
            ) : (
              <button 
                onClick={(e) => { e.stopPropagation(); onToggleHalal?.(); }}
                className="px-2.5 py-1 rounded-full bg-zinc-900/80 border border-zinc-700 text-zinc-400 text-[10px] sm:text-xs font-medium flex items-center gap-1.5 shadow-lg backdrop-blur-md cursor-pointer hover:text-white hover:border-emerald-500/60 transition-all"
              >
                <Sparkles className="w-3 h-3" />
                <span>HALAL OFF</span>
              </button>
            )}
          </div>
        </div>

        {/* Error Overlay */}
        {errorMsg && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/95 p-6 text-center gap-3 z-30">
            <AlertCircle className="w-8 h-8 text-rose-500" />
            <p className="text-xs text-rose-300 font-medium">{errorMsg}</p>
            <button
              onClick={(e) => { e.stopPropagation(); setResolvedSrc(src || ""); }}
              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 rounded-xl border border-zinc-700 transition"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* ── SLEEK BOTTOM OVERLAY CONTROLS ── */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/95 via-black/80 to-transparent flex flex-col gap-2.5 transition-opacity duration-300 z-20 ${controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        {/* Scrubber Row: Video Progress Time Display + Seek Bar in Same Row */}
        <div className="flex items-center gap-2.5">
          {/* Video Progress Number (Left of Scrubber) */}
          <span className="text-[10px] sm:text-xs font-mono font-semibold text-zinc-200 shrink-0">
            {formatTime(currentTime)} <span className="text-zinc-500">/</span> {duration > 0 ? formatTime(duration) : "LIVE"}
          </span>

          {/* Scrubber Bar */}
          <div className="relative flex-1 flex items-center group/scrubber cursor-pointer h-3">
            {duration > 0 && (
              <div 
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-zinc-700/60 rounded-full pointer-events-none transition-all"
                style={{ width: `${Math.min(100, (buffered / duration) * 100)}%` }}
              />
            )}

            {duration > 0 && (
              <div 
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-emerald-400 rounded-full pointer-events-none transition-all shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                style={{ width: `${Math.min(100, (currentTime / duration) * 100)}%` }}
              />
            )}

            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-zinc-800/80 rounded-full appearance-none cursor-pointer accent-emerald-400 group-hover/scrubber:h-2 transition-all opacity-0 group-hover/scrubber:opacity-100"
            />
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between gap-2">
          {/* Left Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={togglePlay}
              className="p-1.5 sm:p-2 rounded-full hover:bg-white/20 text-white transition-all cursor-pointer"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-white" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white ml-0.5" />}
            </button>

            <button
              onClick={() => skipTime(-10)}
              className="p-1.5 rounded-full hover:bg-white/15 text-zinc-300 hover:text-white transition-all cursor-pointer hidden sm:block"
              title="Replay 10s"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => skipTime(10)}
              className="p-1.5 rounded-full hover:bg-white/15 text-zinc-300 hover:text-white transition-all cursor-pointer hidden sm:block"
              title="Forward 10s"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {/* Volume Control with Sound % Display */}
            <div className="flex items-center gap-1.5 group/volume">
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-full hover:bg-white/15 text-white transition-all cursor-pointer"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || userVolume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : userVolume}
                onChange={handleVolumeChange}
                className="w-14 sm:w-20 h-1 bg-zinc-700 accent-emerald-400 rounded-full cursor-pointer transition-all"
              />

              {/* Sound Percentage Number (Beside Volume Slider) */}
              <span className="text-[10px] font-mono font-bold text-emerald-400 min-w-[28px]">
                {isMuted ? "0%" : `${Math.round(userVolume * 100)}%`}
              </span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 relative">
            <span className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-bold bg-zinc-800/80 text-emerald-400 border border-zinc-700">
              {selectedQuality === -1 ? "AUTO" : qualities.find(q => q.id === selectedQuality)?.label || "HD"}
            </span>

            {/* Settings */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsSettingsOpen(!isSettingsOpen);
                  setSettingsTab("main");
                }}
                className={`p-1.5 sm:p-2 rounded-full hover:bg-white/20 text-white transition-all cursor-pointer ${isSettingsOpen ? "bg-white/20 text-emerald-400 rotate-45" : ""}`}
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>

              {isSettingsOpen && (
                <div className="absolute bottom-12 right-0 w-56 sm:w-64 rounded-2xl bg-zinc-900/95 border border-zinc-700 shadow-2xl backdrop-blur-2xl p-2.5 text-xs text-zinc-200 z-50">
                  {settingsTab === "main" && (
                    <div className="space-y-1">
                      <button
                        onClick={() => setSettingsTab("quality")}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5 text-zinc-300">
                          <Gauge className="w-3.5 h-3.5 text-emerald-400" /> Resolution
                        </span>
                        <span className="font-mono text-emerald-400 font-bold">
                          {selectedQuality === -1 ? "Auto" : qualities.find(q => q.id === selectedQuality)?.label || "Auto"} →
                        </span>
                      </button>

                      <button
                        onClick={() => setSettingsTab("speed")}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5 text-zinc-300">
                          <RotateCw className="w-3.5 h-3.5 text-teal-400" /> Speed
                        </span>
                        <span className="font-mono text-teal-400 font-bold">
                          {playbackSpeed === 1.0 ? "Normal" : `${playbackSpeed}x`} →
                        </span>
                      </button>
                    </div>
                  )}

                  {settingsTab === "quality" && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between px-2 py-1 border-b border-zinc-800 mb-1">
                        <button onClick={() => setSettingsTab("main")} className="text-[10px] text-zinc-400 hover:text-white">← Back</button>
                        <span className="text-[10px] font-bold text-emerald-400">Resolution</span>
                      </div>
                      <button
                        onClick={() => handleQualityChange(-1)}
                        className={`w-full flex items-center justify-between px-2 py-1 rounded transition ${selectedQuality === -1 ? "bg-emerald-500/20 text-emerald-300 font-bold" : "hover:bg-zinc-800"}`}
                      >
                        <span>Auto (Adaptive)</span>
                        {selectedQuality === -1 && <Check className="w-3 h-3 text-emerald-400" />}
                      </button>
                      {qualities.map((q) => (
                        <button
                          key={q.id}
                          onClick={() => handleQualityChange(q.id)}
                          className={`w-full flex items-center justify-between px-2 py-1 rounded transition ${selectedQuality === q.id ? "bg-emerald-500/20 text-emerald-300 font-bold" : "hover:bg-zinc-800"}`}
                        >
                          <span>{q.label}</span>
                          {selectedQuality === q.id && <Check className="w-3 h-3 text-emerald-400" />}
                        </button>
                      ))}
                    </div>
                  )}

                  {settingsTab === "speed" && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between px-2 py-1 border-b border-zinc-800 mb-1">
                        <button onClick={() => setSettingsTab("main")} className="text-[10px] text-zinc-400 hover:text-white">← Back</button>
                        <span className="text-[10px] font-bold text-teal-400">Speed</span>
                      </div>
                      {speeds.map((spd) => (
                        <button
                          key={spd}
                          onClick={() => handleSpeedChange(spd)}
                          className={`w-full flex items-center justify-between px-2 py-1 rounded transition ${playbackSpeed === spd ? "bg-teal-500/20 text-teal-300 font-bold" : "hover:bg-zinc-800"}`}
                        >
                          <span>{spd === 1.0 ? "Normal" : `${spd}x`}</span>
                          {playbackSpeed === spd && <Check className="w-3 h-3 text-teal-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={togglePiP}
              className="p-1.5 rounded-full hover:bg-white/20 text-white transition-all cursor-pointer hidden sm:block"
              title="Picture in Picture"
            >
              <PictureInPicture className="w-4 h-4" />
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-full hover:bg-white/20 text-white transition-all cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HlsVideoPlayer;
