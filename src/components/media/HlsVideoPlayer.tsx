"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  AlertCircle,
  Settings,
  Check,
  Loader2,
  PictureInPicture,
  RotateCcw,
  RotateCw,
} from "lucide-react";

export interface HlsVideoPlayerProps {
  src?: string;
  videoId?: string;
  title?: string;
  autoPlay?: boolean;
  onVideoElementReady?: (videoEl: HTMLVideoElement | null) => void;
  onPlayStateChange?: (playing: boolean) => void;
  className?: string;
}

export interface QualityLevel {
  id: number;
  label: string;
  height: number;
  bitrate?: number;
}

// Safe maximum volume ceiling to prevent sudden bursts
const SAFE_MAX_VOLUME = 0.85;

export const HlsVideoPlayer: React.FC<HlsVideoPlayerProps> = ({
  src,
  videoId,
  title = "Media Player",
  autoPlay = true,
  onVideoElementReady,
  onPlayStateChange,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [resolvedSrc, setResolvedSrc] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [userVolume, setUserVolume] = useState<number>(0.6);

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
  const [qualities, setQualities] = useState<QualityLevel[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<number>(-1); // -1 = Auto
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  // Helper to postMessage commands to YouTube embed iframe
  const sendIframeCommand = useCallback((func: string, args: any = "") => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        const payload = JSON.stringify({
          event: "command",
          func: func,
          args: args === "" ? [] : Array.isArray(args) ? args : [args],
        });
        iframeRef.current.contentWindow.postMessage(payload, "*");
      } catch (err) {
        console.warn("[HlsVideoPlayer] iframe postMessage error:", err);
      }
    }
  }, []);

  // Synchronize YouTube Iframe Player status with custom controls
  useEffect(() => {
    if (!youtubeId) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        let data = event.data;
        if (typeof data === "string") {
          try {
            data = JSON.parse(data);
          } catch {
            return;
          }
        }
        if (!data) return;

        // YouTube infoDelivery contains currentTime, duration, playerState
        if (data.event === "infoDelivery" && data.info) {
          const info = data.info;
          if (typeof info.currentTime === "number") {
            setCurrentTime(info.currentTime);
          }
          if (typeof info.duration === "number" && info.duration > 0) {
            setDuration(info.duration);
          }
          if (typeof info.videoLoadedFraction === "number" && info.duration) {
            setBuffered(info.videoLoadedFraction * info.duration);
          }
          if (typeof info.playerState === "number") {
            // 1 = playing, 2 = paused, 0 = ended, 3 = buffering
            if (info.playerState === 1) {
              setIsPlaying(true);
              setIsLoading(false);
              onPlayStateChange?.(true);
            } else if (info.playerState === 2 || info.playerState === 0) {
              setIsPlaying(false);
              setIsLoading(false);
              onPlayStateChange?.(false);
            } else if (info.playerState === 3) {
              setIsLoading(true);
            }
          }
        }
      } catch (_) {}
    };

    window.addEventListener("message", handleMessage);

    // Initial handshake to start listening to YouTube API messages
    const pingTimer = setInterval(() => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        try {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: "listening" }),
            "*"
          );
        } catch (_) {}
      }
    }, 1000);

    return () => {
      window.removeEventListener("message", handleMessage);
      clearInterval(pingTimer);
    };
  }, [youtubeId, onPlayStateChange]);

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
      // Clean up previous video playback immediately to prevent overlapping audio
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = "";
      }

      setIsLoading(true);
      setErrorMsg(null);
      setCurrentTime(0);
      setDuration(0);
      setBuffered(0);
      setResolvedSrc("");
      setYoutubeId(null);

      // Extract YouTube Video ID from videoId or src
      const ytCandidate = videoId || src || "";
      const ytMatch = ytCandidate.match(
        /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/))([a-zA-Z0-9_-]{11})/
      );
      const directYtId =
        !ytMatch && /^[a-zA-Z0-9_-]{11}$/.test(ytCandidate.trim())
          ? ytCandidate.trim()
          : ytMatch
          ? ytMatch[1]
          : null;

      if (directYtId) {
        if (!isCancelled) {
          setYoutubeId(directYtId);
          setStatusMsg("YouTube HD");
          setIsLoading(false);
          setIsPlaying(true);
          onPlayStateChange?.(true);
        }
        return;
      }

      // Direct playable stream (.m3u8, .mp4, etc.)
      if (src) {
        if (!isCancelled) {
          setResolvedSrc(src);
          setStatusMsg(src.includes(".m3u8") ? "Live HLS Stream" : "Video Ready");
          setIsLoading(false);
        }
        return;
      }
    }

    resolve();
    return () => {
      isCancelled = true;
    };
  }, [src, videoId, onPlayStateChange]);

  // Apply safe scaled volume when user changes volume slider or mutes
  useEffect(() => {
    applySafeVolume(userVolume, isMuted);
  }, [userVolume, isMuted, applySafeVolume]);

  // 2. Attach HLS.js or HTML5 Video
  useEffect(() => {
    if (youtubeId) return;

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
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
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
          bitrate: lvl.bitrate,
        }));
        setQualities(levels);

        if (autoPlay) {
          video
            .play()
            .then(() => {
              setIsPlaying(true);
              onPlayStateChange?.(true);
            })
            .catch((e) => console.log("Autoplay paused by policy:", e));
        }
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
      setStatusMsg("Video Player");
      setQualities([
        { id: 0, label: "1080p Full HD", height: 1080 },
        { id: 1, label: "720p HD", height: 720 },
        { id: 2, label: "480p SD", height: 480 },
      ]);
      if (autoPlay) {
        video
          .play()
          .then(() => {
            setIsPlaying(true);
            onPlayStateChange?.(true);
          })
          .catch(() => {});
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [resolvedSrc, youtubeId, onVideoElementReady, applySafeVolume, autoPlay, onPlayStateChange]);

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

  // Dedicated, 100% Reliable Play/Pause Toggle
  const togglePlay = () => {
    if (youtubeId) {
      if (isPlaying) {
        sendIframeCommand("pauseVideo");
        setIsPlaying(false);
        onPlayStateChange?.(false);
      } else {
        sendIframeCommand("playVideo");
        setIsPlaying(true);
        onPlayStateChange?.(true);
      }
      resetControlsTimer();
      return;
    }

    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          onPlayStateChange?.(true);
        })
        .catch((e) => console.warn("Play error:", e));
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      onPlayStateChange?.(false);
    }
    resetControlsTimer();
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (youtubeId) {
      sendIframeCommand(nextMuted ? "mute" : "unMute");
    } else {
      applySafeVolume(userVolume, nextMuted);
    }
    resetControlsTimer();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setUserVolume(val);
    const nextMuted = val === 0;
    setIsMuted(nextMuted);
    if (youtubeId) {
      sendIframeCommand("setVolume", [Math.round(val * 100)]);
      if (nextMuted) sendIframeCommand("mute");
      else sendIframeCommand("unMute");
    } else {
      applySafeVolume(val, nextMuted);
    }
    resetControlsTimer();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (youtubeId) {
      sendIframeCommand("seekTo", [time, true]);
    } else if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    resetControlsTimer();
  };

  const skipTime = (seconds: number) => {
    const target = Math.max(0, Math.min(duration || Infinity, currentTime + seconds));
    setCurrentTime(target);
    if (youtubeId) {
      sendIframeCommand("seekTo", [target, true]);
    } else if (videoRef.current) {
      videoRef.current.currentTime = target;
    }
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
    if (youtubeId) {
      sendIframeCommand("setPlaybackRate", [spd]);
    } else if (videoRef.current) {
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

  const originUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimer}
      onMouseLeave={() => isPlaying && !isSettingsOpen && setControlsVisible(false)}
      className={`relative rounded-2xl overflow-hidden bg-black border border-border shadow-2xl group select-none ${className}`}
    >
      {/* Viewport (Click on entire screen toggles play/pause smoothly) */}
      <div
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        className="relative aspect-video w-full bg-zinc-950 flex items-center justify-center cursor-pointer overflow-hidden"
      >
        {youtubeId ? (
          <iframe
            ref={iframeRef}
            key={youtubeId}
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&enablejsapi=1&controls=0&modestbranding=1&rel=0&playsinline=1&iv_load_policy=3&disablekb=1&fs=0&origin=${originUrl}`}
            title={title}
            onLoad={() => {
              sendIframeCommand("listening");
              sendIframeCommand("setVolume", [Math.round(userVolume * 100)]);
            }}
            className="w-full h-full border-0 aspect-video pointer-events-none"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
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
        )}

        {/* Loading Spinner for buffering */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs gap-3 z-10 pointer-events-none">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <span className="text-xs text-zinc-200 font-mono tracking-wider">{statusMsg}</span>
          </div>
        )}

        {/* Center Play Button Overlay (Shown when paused) */}
        {!isPlaying && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all duration-300 z-10 pointer-events-none">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center shadow-xl transform group-hover:scale-110 transition-all duration-300">
              <Play className="w-8 h-8 fill-current ml-1" />
            </div>
          </div>
        )}

        {/* Top Header Row with Title */}
        <div
          className={`absolute top-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between transition-opacity duration-300 z-20 ${
            controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-white drop-shadow truncate max-w-[220px] sm:max-w-md">
              {title}
            </span>
          </div>

          {(!duration || duration === 0) && (
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-red-600/90 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Live
              </span>
            </div>
          )}
        </div>

        {/* Error Overlay */}
        {errorMsg && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/95 p-6 text-center gap-3 z-30">
            <AlertCircle className="w-8 h-8 text-rose-500" />
            <p className="text-xs text-rose-300 font-medium">{errorMsg}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setResolvedSrc(src || "");
              }}
              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 rounded-xl border border-zinc-700 transition"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* ── SLEEK BOTTOM CONTROLS (Unified for BOTH IPTV and YouTube) ── */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/95 via-black/80 to-transparent flex flex-col gap-2.5 transition-opacity duration-300 z-20 ${
          controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Scrubber Row: Video Progress + Seek Bar */}
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] sm:text-xs font-mono font-semibold text-zinc-200 shrink-0">
            {formatTime(currentTime)} <span className="text-zinc-500">/</span>{" "}
            {duration > 0 ? formatTime(duration) : "LIVE"}
          </span>

          <div className="relative flex-1 flex items-center group/scrubber cursor-pointer h-3">
            {duration > 0 && (
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-zinc-700/60 rounded-full pointer-events-none transition-all"
                style={{ width: `${Math.min(100, (buffered / duration) * 100)}%` }}
              />
            )}

            {duration > 0 && (
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full pointer-events-none transition-all"
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
              className="w-full h-1 bg-zinc-800/80 rounded-full appearance-none cursor-pointer accent-primary group-hover/scrubber:h-2 transition-all opacity-0 group-hover/scrubber:opacity-100"
            />
          </div>
        </div>

        {/* Action Controls Row */}
        <div className="flex items-center justify-between gap-2">
          {/* Left Controls: Play/Pause, Rewind, Forward, Volume */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={togglePlay}
              className="p-1.5 sm:p-2 rounded-full hover:bg-white/20 text-white transition-all cursor-pointer"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-white" />
              ) : (
                <Play className="w-5 h-5 fill-white ml-0.5" />
              )}
            </button>

            {duration > 0 && (
              <>
                <button
                  onClick={() => skipTime(-10)}
                  className="p-1.5 rounded-full hover:bg-white/15 text-zinc-300 hover:text-white transition-all cursor-pointer hidden sm:block"
                  title="Replay 10s"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => skipTime(10)}
                  className="p-1.5 rounded-full hover:bg-white/15 text-zinc-300 hover:text-white transition-all cursor-pointer hidden sm:block"
                  title="Forward 10s"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Volume Control */}
            <div className="flex items-center gap-1.5 group/volume">
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-full hover:bg-white/15 text-white transition-all cursor-pointer"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || userVolume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : userVolume}
                onChange={handleVolumeChange}
                className="w-14 sm:w-20 h-1 bg-zinc-700 accent-primary rounded-full cursor-pointer transition-all"
              />

              <span className="text-[10px] font-mono font-bold text-primary min-w-[28px]">
                {isMuted ? "0%" : `${Math.round(userVolume * 100)}%`}
              </span>
            </div>
          </div>

          {/* Right Controls: Settings, PiP, Fullscreen */}
          <div className="flex items-center gap-1 sm:gap-2 relative">
            {/* Settings Popup Trigger */}
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`p-1.5 sm:p-2 rounded-full hover:bg-white/15 transition cursor-pointer ${
                isSettingsOpen ? "text-primary bg-white/10" : "text-zinc-300"
              }`}
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Settings Popup Menu */}
            {isSettingsOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-10 right-0 w-48 bg-zinc-900/95 border border-zinc-700/80 rounded-xl p-2 shadow-2xl backdrop-blur-md z-30 text-xs text-zinc-200"
              >
                {/* Speed Controls */}
                <div className="mb-2 pb-2 border-b border-zinc-800">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                    Playback Speed
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    {speeds.map((spd) => (
                      <button
                        key={spd}
                        onClick={() => handleSpeedChange(spd)}
                        className={`px-1.5 py-1 rounded text-center font-mono ${
                          playbackSpeed === spd
                            ? "bg-primary text-primary-foreground font-bold"
                            : "bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300"
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quality Controls for HLS */}
                {qualities.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                      Quality
                    </span>
                    <button
                      onClick={() => handleQualityChange(-1)}
                      className={`w-full text-left px-2 py-1 rounded mb-1 flex items-center justify-between ${
                        selectedQuality === -1
                          ? "bg-primary/20 text-primary font-bold"
                          : "hover:bg-zinc-800 text-zinc-300"
                      }`}
                    >
                      <span>Auto</span>
                      {selectedQuality === -1 && <Check className="w-3 h-3" />}
                    </button>
                    {qualities.map((q) => (
                      <button
                        key={q.id}
                        onClick={() => handleQualityChange(q.id)}
                        className={`w-full text-left px-2 py-1 rounded flex items-center justify-between ${
                          selectedQuality === q.id
                            ? "bg-primary/20 text-primary font-bold"
                            : "hover:bg-zinc-800 text-zinc-300"
                        }`}
                      >
                        <span>{q.label}</span>
                        {selectedQuality === q.id && <Check className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PiP Button (Only for native video) */}
            {!youtubeId && (
              <button
                onClick={togglePiP}
                className="p-1.5 sm:p-2 rounded-full hover:bg-white/15 text-zinc-300 hover:text-white transition cursor-pointer hidden sm:block"
                title="Picture in Picture"
              >
                <PictureInPicture className="w-4 h-4" />
              </button>
            )}

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 sm:p-2 rounded-full hover:bg-white/15 text-white transition cursor-pointer"
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
