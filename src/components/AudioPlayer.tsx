"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  X,
  Radio,
  Sliders,
  FileAudio,
  Headphones,
  RotateCcw,
  RotateCw,
  Zap,
  Mic,
  Bot,
} from "lucide-react";
import AudioSettingsModal, { TTSSettings } from "./AudioSettingsModal";

export interface AudioUrls {
  bn_summary?: string;
  bn_full?: string;
  en_summary?: string;
  en_full?: string;
}

export interface AudioTrack {
  id?: string;
  title: string;
  text?: string;
  summary?: string;
  category?: string;
  source?: string;
  imageUrl?: string;
  audioUrls?: AudioUrls;
}

interface AudioPlayerProps {
  storiesCount?: number;
  newsItems?: any[];
}

export default function AudioPlayer({ newsItems = [] }: AudioPlayerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Playlist & Active Track
  const [playlist, setPlaylist] = useState<AudioTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTrack, setActiveTrack] = useState<AudioTrack | null>(null);

  // Audio Mode Selection
  type AudioMode = "bn_summary" | "en_summary" | "bn_full" | "en_full";
  const [audioMode, setAudioMode] = useState<AudioMode>("bn_summary");

  // Settings
  const [ttsSettings, setTtsSettings] = useState<TTSSettings>({
    model: "gemini-3.1-flash-tts",
    voiceGender: "female",
    voiceStyle: "radio-host",
    speed: 1.0,
    languagePreference: "auto",
  });

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sessionCounterRef = useRef(0);

  // Helper for language detection
  const getSiteLanguage = (): "EN" | "BN" => {
    if (typeof window === "undefined") return "BN";
    if (document.cookie.includes("googtrans=/bn/en") || localStorage.getItem("kahf-language") === "EN") {
      return "EN";
    }
    return "BN";
  };

  // 1. Initialize Playlist from props
  useEffect(() => {
    if (newsItems && newsItems.length > 0) {
      const formatted: AudioTrack[] = newsItems.map((item) => ({
        id: item.id,
        title: item.title || item.headline || "সংবাদ",
        text: `${item.title || item.headline || ""}. ${item.ai_summary || item.summary || ""}`,
        summary: item.ai_summary || item.summary || "",
        category: item.category || "General",
        source: item.source || "KahfNews",
        imageUrl: item.image_url || item.imageUrl,
        audioUrls: {
          bn_summary: item.audio_bn_summary,
          bn_full: item.audio_bn_full,
          en_summary: item.audio_en_summary,
          en_full: item.audio_en_full,
        },
      }));
      setPlaylist(formatted);
      if (!activeTrack && formatted.length > 0) {
        setActiveTrack(formatted[0]);
      }
    }
  }, [newsItems]);

  // 2. Load Settings & Voices
  useEffect(() => {
    const saved = localStorage.getItem("kahf-tts-settings");
    if (saved) {
      try {
        setTtsSettings(JSON.parse(saved));
      } catch (e) {}
    }

    const handleSettingsChange = (e: any) => {
      if (e.detail) setTtsSettings(e.detail);
    };

    window.addEventListener("audio-settings-changed", handleSettingsChange);

    if (typeof window !== "undefined" && window.speechSynthesis) {
      const loadV = () => setVoices(window.speechSynthesis.getVoices());
      loadV();
      window.speechSynthesis.onvoiceschanged = loadV;
    }

    return () => {
      window.removeEventListener("audio-settings-changed", handleSettingsChange);
    };
  }, []);

  // 3. Custom Event Listeners
  useEffect(() => {
    const handlePlayAudio = (e: any) => {
      const { title, summary, audioUrls, id, imageUrl, source, preferredLang, preferredType } = e.detail;
      const textToPlay = `${title}. ${summary || ""}`;

      const newTrack: AudioTrack = {
        id: id || `track-${Date.now()}`,
        title,
        text: textToPlay,
        summary,
        imageUrl,
        source: source || "KahfNews",
        audioUrls: audioUrls || {},
      };

      setActiveTrack(newTrack);
      setPlaylist((prev) => [newTrack, ...prev.filter((p) => p.title !== title)]);
      setCurrentIndex(0);

      const siteLang = preferredLang || getSiteLanguage();
      const pref = ttsSettings.languagePreference === "auto" ? siteLang : ttsSettings.languagePreference.toUpperCase();
      const wantFull = preferredType === "full";

      let targetMode: AudioMode = "bn_summary";
      if (wantFull) {
        targetMode = pref === "EN" ? "en_full" : "bn_full";
      } else {
        if (pref === "EN") {
          targetMode = audioUrls?.en_summary ? "en_summary" : "bn_summary";
        } else {
          targetMode = audioUrls?.bn_summary ? "bn_summary" : "en_summary";
        }
      }
      setAudioMode(targetMode);

      setIsOpen(true);
      setIsPlaying(true);
    };

    const handleOpenSettings = () => setIsSettingsOpen(true);
    const handleTogglePlayer = () => setIsOpen((prev) => !prev);

    window.addEventListener("play-audio", handlePlayAudio);
    window.addEventListener("open-audio-settings", handleOpenSettings);
    window.addEventListener("toggle-audio-player", handleTogglePlayer);

    return () => {
      window.removeEventListener("play-audio", handlePlayAudio);
      window.removeEventListener("open-audio-settings", handleOpenSettings);
      window.removeEventListener("toggle-audio-player", handleTogglePlayer);
    };
  }, [ttsSettings]);

  // Sync index change to activeTrack & auto select available audio mode
  useEffect(() => {
    if (playlist.length > 0 && playlist[currentIndex]) {
      const track = playlist[currentIndex];
      setActiveTrack(track);

      // Auto-pick best available Gemini TTS URL if current mode has no URL for this track (summary only)
      const urls = track.audioUrls;
      if (urls && !audioMode.endsWith("_full")) {
        if (!urls[audioMode as keyof AudioUrls]) {
          if (urls.bn_summary) setAudioMode("bn_summary");
          else if (urls.en_summary) setAudioMode("en_summary");
        }
      }
    }
  }, [currentIndex, playlist]);

  // 4. MediaSession Earbuds & Lockscreen controls
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator) || !activeTrack) return;

    const hasAudioFile = !!activeTrack.audioUrls?.[audioMode as keyof AudioUrls];
    const modelTag = hasAudioFile ? "Gemini 3.1 Flash" : "Native Voice";

    navigator.mediaSession.metadata = new MediaMetadata({
      title: activeTrack.title,
      artist: `KahfNews AI • ${modelTag} (${activeTrack.source || "Radio"})`,
      album: audioMode.includes("en") ? "News Summary (English)" : "সংবাদ সারসংক্ষেপ (Bangla)",
      artwork: [
        { src: activeTrack.imageUrl || "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: activeTrack.imageUrl || "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
    });

    navigator.mediaSession.setActionHandler("play", () => setIsPlaying(true));
    navigator.mediaSession.setActionHandler("pause", () => setIsPlaying(false));
    navigator.mediaSession.setActionHandler("nexttrack", () => handleNext());
    navigator.mediaSession.setActionHandler("previoustrack", () => handlePrev());
    navigator.mediaSession.setActionHandler("seekforward", () => skipSeconds(10));
    navigator.mediaSession.setActionHandler("seekbackward", () => skipSeconds(-10));
  }, [activeTrack, currentIndex, playlist, audioMode]);

  // 5. Volume & Speed sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.playbackRate = ttsSettings.speed || 1.0;
    }
    if (utteranceRef.current) {
      utteranceRef.current.volume = isMuted ? 0 : volume;
      utteranceRef.current.rate = ttsSettings.speed || 1.0;
    }
  }, [volume, isMuted, ttsSettings.speed]);

  // 6. Playback Logic
  useEffect(() => {
    if (!activeTrack) return;

    const currentSessionId = ++sessionCounterRef.current;

    window.speechSynthesis?.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.ontimeupdate = null;
    }

    const currentUrl = activeTrack.audioUrls?.[audioMode as keyof AudioUrls];

    if (currentUrl) {
      if (!audioRef.current) {
        audioRef.current = new Audio(currentUrl);
      } else {
        audioRef.current.src = currentUrl;
      }

      audioRef.current.playbackRate = ttsSettings.speed || 1.0;
      audioRef.current.volume = isMuted ? 0 : volume;

      audioRef.current.onloadedmetadata = () => {
        if (sessionCounterRef.current === currentSessionId && audioRef.current) {
          setDuration(audioRef.current.duration);
          setCurrentTime(0);
          setProgress(0);
        }
      };

      audioRef.current.ontimeupdate = () => {
        if (sessionCounterRef.current === currentSessionId && audioRef.current && audioRef.current.duration) {
          setCurrentTime(audioRef.current.currentTime);
          setProgress(audioRef.current.currentTime / audioRef.current.duration);
        }
      };

      audioRef.current.onended = () => {
        if (sessionCounterRef.current === currentSessionId) {
          handleNext();
        }
      };

      if (isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            if (err.name !== "AbortError") {
              console.warn("Audio playback exception:", err);
            }
          });
        }
      }
    } else {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        // Clean text thoroughly of any markdown symbols or hashtags
        const rawText = activeTrack.text || activeTrack.title;
        const cleanedForSpeech = rawText
          .replace(/#{1,6}\s+/g, ' ') // Strip ###, ##, #
          .replace(/!\[.*?\]\([^\s)]+\)/g, ' ') // Strip images
          .replace(/\[([^\]]+)\]\([^\s)]+\)/g, '$1') // Convert links
          .replace(/[*_~`[\]()<>\\\/^=+]/g, ' ') // Strip markdown symbols
          .replace(/https?:\/\/\S+/gi, ' ') // Strip URLs
          .replace(/\s+/g, ' ')
          .trim();

        // Split text into safe short sentence chunks (~100-120 chars) to prevent Chrome 15s freeze
        const rawSentences = cleanedForSpeech.split(/(?<=[।?!.\n;])/g).map((s) => s.trim()).filter(Boolean);
        const speechChunks: string[] = [];
        let curBuffer = '';
        for (const s of rawSentences) {
          if (curBuffer && curBuffer.length + s.length > 120) {
            speechChunks.push(curBuffer);
            curBuffer = s;
          } else {
            curBuffer = curBuffer ? `${curBuffer} ${s}` : s;
          }
        }
        if (curBuffer) speechChunks.push(curBuffer);
        if (speechChunks.length === 0) speechChunks.push(cleanedForSpeech || activeTrack.title);

        const estDuration = Math.max(8, Math.round((cleanedForSpeech.length || 100) / 12));
        setProgress(0);
        setCurrentTime(0);
        setDuration(estDuration);

        const isEnglish = audioMode.includes("en") || getSiteLanguage() === "EN";
        const matchedVoice = voices.find((v) =>
          isEnglish ? v.lang.startsWith("en") : v.lang.startsWith("bn")
        );

        const speakChunk = (idx: number) => {
          if (sessionCounterRef.current !== currentSessionId) return;

          if (idx >= speechChunks.length) {
            setCurrentTime(estDuration);
            setProgress(1);
            if (sessionCounterRef.current === currentSessionId) {
              handleNext();
            }
            return;
          }

          const chunkText = speechChunks[idx];
          const utterance = new SpeechSynthesisUtterance(chunkText);
          if (matchedVoice) utterance.voice = matchedVoice;
          utterance.rate = ttsSettings.speed || 1.0;
          utterance.volume = isMuted ? 0 : volume;

          utterance.onend = () => {
            if (sessionCounterRef.current !== currentSessionId) return;
            const p = (idx + 1) / speechChunks.length;
            setProgress(p);
            setCurrentTime(Math.min(estDuration, Math.round(p * estDuration)));
            speakChunk(idx + 1);
          };

          utterance.onerror = (err: any) => {
            if (sessionCounterRef.current !== currentSessionId) return;
            if (err.error === "canceled" || err.error === "interrupted") return;
            console.warn("Speech synthesis chunk error:", err);
            speakChunk(idx + 1);
          };

          utteranceRef.current = utterance;
          window.speechSynthesis.speak(utterance);
        };

        if (isPlaying) {
          speakChunk(0);
        }
      }
    }

    return () => {
      ++sessionCounterRef.current;
      window.speechSynthesis?.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.onended = null;
      }
    };
  }, [activeTrack?.id, audioMode]);

  // 6.5 WebSpeech Active Ticker (Smoothly increments currentTime 0:01, 0:02... during native voice playback)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const hasAudioFile = !!activeTrack?.audioUrls?.[audioMode as keyof AudioUrls];

    if (isPlaying && !hasAudioFile && duration > 0) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev < duration) {
            const next = prev + 1;
            setProgress(next / duration);
            return next;
          }
          return prev;
        });
      }, 1000 / (ttsSettings.speed || 1.0));
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, activeTrack?.id, audioMode, duration, ttsSettings.speed]);

  // 7. Play/Pause toggle
  useEffect(() => {
    if (!activeTrack) return;

    if (audioRef.current && activeTrack.audioUrls?.[audioMode as keyof AudioUrls]) {
      if (isPlaying) audioRef.current.play().catch(console.error);
      else audioRef.current.pause();
    } else if (typeof window !== "undefined" && window.speechSynthesis) {
      if (isPlaying) window.speechSynthesis.resume();
      else window.speechSynthesis.pause();
    }
  }, [isPlaying]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const handleNext = () => {
    if (playlist.length <= 1) return;
    const nextIdx = (currentIndex + 1) % playlist.length;
    setCurrentIndex(nextIdx);
    setActiveTrack(playlist[nextIdx]);
    setIsPlaying(true);
  };

  const handlePrev = () => {
    if (playlist.length <= 1) return;
    const prevIdx = (currentIndex - 1 + playlist.length) % playlist.length;
    setCurrentIndex(prevIdx);
    setActiveTrack(playlist[prevIdx]);
    setIsPlaying(true);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setProgress(val);
    if (audioRef.current && duration > 0) {
      const targetTime = val * duration;
      audioRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const skipSeconds = (delta: number) => {
    if (audioRef.current && duration > 0) {
      const nextTime = Math.min(Math.max(0, audioRef.current.currentTime + delta), duration);
      audioRef.current.currentTime = nextTime;
      setCurrentTime(nextTime);
      setProgress(nextTime / duration);
    }
  };

  const cycleSpeed = () => {
    const speeds = [1.0, 1.25, 1.5, 0.75];
    const current = ttsSettings.speed || 1.0;
    const next = speeds[(speeds.indexOf(current) + 1) % speeds.length];
    const newSettings = { ...ttsSettings, speed: next };
    setTtsSettings(newSettings);
    localStorage.setItem("kahf-tts-settings", JSON.stringify(newSettings));
  };

  const handleClose = () => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    window.speechSynthesis?.cancel();
    setIsOpen(false);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "0:00";
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder < 10 ? "0" : ""}${remainder}`;
  };

  // Dynamic & Interactive Model Badge
  const currentAudioUrl = activeTrack?.audioUrls?.[audioMode as keyof AudioUrls];
  const hasGeminiAudio = !!currentAudioUrl;

  return (
    <>
      <button
        id="global-audio-trigger"
        className="hidden"
        onClick={() => {
          setIsOpen(true);
          setIsPlaying(true);
        }}
      />

      <AudioSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Floating Audio Player Card with Unified Theme Background (bg-card border-border) */}
      <AnimatePresence>
        {isOpen && activeTrack && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100vw-24px)] sm:w-[420px] md:w-[460px] max-w-[460px] bg-card/95 backdrop-blur-2xl border border-border/80 rounded-2xl sm:rounded-3xl shadow-2xl p-3.5 sm:p-4 text-foreground font-sans overflow-hidden select-none"
          >
            {/* Header / Active Track Info */}
            <div className="flex items-center justify-between gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl overflow-hidden bg-primary/10 border border-primary/20 shrink-0 flex items-center justify-center">
                  {activeTrack.imageUrl ? (
                    <img src={activeTrack.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-primary animate-pulse" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* DYNAMIC MODEL BADGE */}
                    {hasGeminiAudio ? (
                      <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 hover:bg-emerald-500/25 transition-colors cursor-pointer"
                        title="Playing via Gemini 3.1 Flash AI Audio - Click to change settings"
                      >
                        <Zap className="w-2.5 h-2.5 fill-current" />
                        Gemini 3.1 Flash TTS
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 hover:bg-amber-500/25 transition-colors cursor-pointer"
                        title="Playing via Browser Native Voice - Click to change settings"
                      >
                        <Mic className="w-2.5 h-2.5" />
                        Browser Native Voice
                      </button>
                    )}

                    <span className="text-[10px] sm:text-[11px] text-muted-foreground">
                      {currentIndex + 1} of {playlist.length}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-foreground truncate mt-0.5">{activeTrack.title}</p>
                </div>
              </div>

              {/* Single Clean Close Button */}
              <button
                onClick={handleClose}
                title="Close Audio"
                className="p-1.5 sm:p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            {/* Audio Dropdown Options */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-muted/50 border border-border rounded-xl p-1 sm:p-1.5 mb-3">
              <FileAudio className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0 ml-1" />
              <select
                value={audioMode}
                onChange={(e) => {
                  setAudioMode(e.target.value as AudioMode);
                  setIsPlaying(true);
                }}
                className="w-full text-[11px] sm:text-xs font-semibold bg-transparent text-foreground focus:outline-none cursor-pointer truncate"
              >
                <option value="bn_summary" className="bg-card text-foreground">
                  সংবাদ সারসংক্ষেপ {activeTrack.audioUrls?.bn_summary ? "(Gemini 3.1 Flash AI)" : "(Bangla Summary)"}
                </option>
                <option value="bn_full" className="bg-card text-foreground">
                  সম্পূর্ণ সংবাদ (Full News - Native Voice)
                </option>
                <option value="en_summary" className="bg-card text-foreground">
                  News Summary {activeTrack.audioUrls?.en_summary ? "(Gemini 3.1 Flash AI)" : "(English)"}
                </option>
                <option value="en_full" className="bg-card text-foreground">
                  English Full News (Native Voice)
                </option>
              </select>
            </div>

            {/* Progress Bar & Clean Timestamps */}
            <div className="space-y-1">
              <div className="relative h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden group cursor-pointer">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.001}
                  value={progress}
                  onChange={handleSeek}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div
                  className="h-full bg-gradient-to-r from-primary via-emerald-400 to-primary transition-all duration-100"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-muted-foreground">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Main Player Bottom Bar - 3-Column Equal Grid for Absolute Container Centering */}
            <div className="grid grid-cols-3 items-center w-full pt-1 gap-2">
              {/* Left Column: Volume Slider with Floating Tooltip & Progress Track */}
              <div className="flex items-center gap-1.5 sm:gap-2 justify-start min-w-0">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" />
                  ) : (
                    <Volume2 className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${volume > 1.0 ? "text-amber-400 animate-pulse" : "text-primary"}`} />
                  )}
                </button>

                <div className="relative flex items-center w-14 sm:w-20 group/vol">
                  {/* Floating Volume % Tooltip (Appears on Hover / Change Above Slider) */}
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-popover border border-border text-[10px] font-mono font-bold text-popover-foreground opacity-0 group-hover/vol:opacity-100 transition-all pointer-events-none shadow-md whitespace-nowrap z-30">
                    {Math.round((isMuted ? 0 : volume) * 100)}%
                  </div>

                  {/* Slider Progress Bar Background Track */}
                  <div className="absolute inset-y-0 my-auto h-1.5 w-full bg-muted rounded-full overflow-hidden pointer-events-none">
                    <div
                      className={`h-full transition-all ${
                        volume > 1.0
                          ? "bg-gradient-to-r from-primary to-amber-400"
                          : "bg-primary"
                      }`}
                      style={{ width: `${(isMuted ? 0 : volume / 1.2) * 100}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1.2}
                    step={0.01}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      setVolume(parseFloat(e.target.value));
                      if (isMuted) setIsMuted(false);
                    }}
                    className="relative z-10 w-full h-3 opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              {/* Center Column: Playback Controls (Play/Pause Button ABSOLUTELY Centered in AudioPlayer Container) */}
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                <button
                  onClick={handlePrev}
                  className="p-1.5 sm:p-2 text-foreground/80 hover:text-foreground hover:bg-muted rounded-full transition-all cursor-pointer"
                  title="Previous News"
                >
                  <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                <button
                  onClick={togglePlay}
                  className="p-2.5 sm:p-3.5 bg-primary text-primary-foreground font-black rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 cursor-pointer shrink-0"
                >
                  {isPlaying ? <Pause className="w-4 h-4 sm:w-6 sm:h-6 fill-current" /> : <Play className="w-4 h-4 sm:w-6 sm:h-6 fill-current ml-0.5" />}
                </button>

                <button
                  onClick={handleNext}
                  className="p-1.5 sm:p-2 text-foreground/80 hover:text-foreground hover:bg-muted rounded-full transition-all cursor-pointer"
                  title="Next News"
                >
                  <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              {/* Right Column: Speed Button (1x), Settings (Model Selection with Sliders Icon), Earbuds Icon */}
              <div className="flex items-center justify-end gap-1 sm:gap-1.5">
                {/* Speed Button (Cycles 1x -> 1.25x -> 1.5x -> 0.75x) */}
                <button
                  onClick={cycleSpeed}
                  className="px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg bg-muted hover:bg-muted/80 border border-border text-[10px] sm:text-[11px] font-mono font-bold text-primary transition-colors cursor-pointer"
                  title="Playback Speed"
                >
                  {ttsSettings.speed || 1.0}x
                </button>

                {/* Model Selection / Settings Icon (Synced Sliders Icon) */}
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-1 sm:p-1.5 rounded-lg bg-muted hover:bg-muted/80 border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="TTS Model & Voice Settings"
                >
                  <Sliders className="w-3.5 h-3.5" />
                </button>

                <div className="hidden sm:flex items-center text-muted-foreground" title="Earbuds ready">
                  <Headphones className="w-3.5 h-3.5 text-primary/70 ml-0.5" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
