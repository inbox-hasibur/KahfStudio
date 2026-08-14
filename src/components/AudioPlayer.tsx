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

      if (pref === "EN") {
        if (wantFull && audioUrls?.en_full) setAudioMode("en_full");
        else if (audioUrls?.en_summary) setAudioMode("en_summary");
        else if (audioUrls?.en_full) setAudioMode("en_full");
        else setAudioMode("bn_summary");
      } else {
        if (wantFull && audioUrls?.bn_full) setAudioMode("bn_full");
        else if (audioUrls?.bn_summary) setAudioMode("bn_summary");
        else if (audioUrls?.bn_full) setAudioMode("bn_full");
        else if (audioUrls?.en_summary) setAudioMode("en_summary");
        else setAudioMode("bn_summary");
      }

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

  // Sync index change to activeTrack
  useEffect(() => {
    if (playlist.length > 0 && playlist[currentIndex]) {
      setActiveTrack(playlist[currentIndex]);
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

    window.speechSynthesis?.cancel();
    if (audioRef.current) audioRef.current.pause();

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
        if (audioRef.current) {
          setDuration(audioRef.current.duration);
          setCurrentTime(0);
          setProgress(0);
        }
      };

      audioRef.current.ontimeupdate = () => {
        if (audioRef.current && audioRef.current.duration) {
          setCurrentTime(audioRef.current.currentTime);
          setProgress(audioRef.current.currentTime / audioRef.current.duration);
        }
      };

      audioRef.current.onended = () => handleNext();

      if (isPlaying) {
        audioRef.current.play().catch(console.error);
      }
    } else {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        setProgress(0);
        setCurrentTime(0);
        setDuration(25);

        const text = activeTrack.text || activeTrack.title;
        const utterance = new SpeechSynthesisUtterance(text);
        const isEnglish = audioMode.includes("en") || getSiteLanguage() === "EN";
        const matchedVoice = voices.find((v) =>
          isEnglish ? v.lang.startsWith("en") : v.lang.startsWith("bn")
        );
        if (matchedVoice) utterance.voice = matchedVoice;

        utterance.rate = ttsSettings.speed || 1.0;
        utterance.volume = isMuted ? 0 : volume;
        utterance.onend = () => handleNext();
        utterance.onboundary = (event) => {
          if (text.length > 0) setProgress(event.charIndex / text.length);
        };

        utteranceRef.current = utterance;
        if (isPlaying) window.speechSynthesis.speak(utterance);
      }
    }

    return () => {
      window.speechSynthesis?.cancel();
      if (audioRef.current) audioRef.current.pause();
    };
  }, [activeTrack?.id, audioMode]);

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
  const hasGeminiAudio = !!currentAudioUrl && currentAudioUrl.includes("_gemini_");

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
            initial={{ y: 100, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.95 }}
            className="fixed bottom-20 sm:bottom-24 md:bottom-28 left-1/2 -translate-x-1/2 z-[140] w-[95%] sm:w-[92%] max-w-lg bg-card/95 backdrop-blur-2xl border border-border p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col gap-2.5 sm:gap-3.5 text-foreground select-none"
          >
            {/* Top Bar: Clean Static Icon, Title, Dynamic Interactive Model Badge & Single Close Button */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 sm:gap-3 overflow-hidden">
                {/* Clean AI Bot Icon (Synced with 3-dot bar) */}
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 border border-primary/20 rounded-xl sm:rounded-2xl flex items-center justify-center text-primary shrink-0">
                  <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-1.5 sm:gap-2">
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
                        title="Playing via Browser Native Voice Fallback - Click to change settings"
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
            <div className="flex items-center gap-1.5 sm:gap-2 bg-muted/50 border border-border rounded-xl p-1 sm:p-1.5">
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
                  সংবাদ সারসংক্ষেপ (Bangla)
                </option>
                <option value="en_summary" className="bg-card text-foreground">
                  News Summary (English)
                </option>
                {activeTrack.audioUrls?.bn_full && (
                  <option value="bn_full" className="bg-card text-foreground">
                    সম্পূর্ণ সংবাদ (Bangla)
                  </option>
                )}
                {activeTrack.audioUrls?.en_full && (
                  <option value="en_full" className="bg-card text-foreground">
                    English Full News (English)
                  </option>
                )}
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

            {/* Main Player Bottom Bar */}
            <div className="flex items-center justify-between pt-0.5">
              {/* Left: Volume Slider */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    setVolume(parseFloat(e.target.value));
                    if (isMuted) setIsMuted(false);
                  }}
                  className="w-12 sm:w-16 h-1 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full"
                />
              </div>

              {/* Center: Playback Controls & 10s Skip */}
              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                <button
                  onClick={() => skipSeconds(-10)}
                  className="p-1 sm:p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-all"
                  title="Rewind 10s"
                >
                  <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                <button
                  onClick={handlePrev}
                  className="p-1.5 sm:p-2 text-foreground/80 hover:text-foreground hover:bg-muted rounded-full transition-all"
                  title="Previous News"
                >
                  <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                <button
                  onClick={togglePlay}
                  className="p-2.5 sm:p-3.5 bg-primary text-primary-foreground font-black rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                >
                  {isPlaying ? <Pause className="w-4 h-4 sm:w-6 sm:h-6 fill-current" /> : <Play className="w-4 h-4 sm:w-6 sm:h-6 fill-current ml-0.5" />}
                </button>

                <button
                  onClick={handleNext}
                  className="p-1.5 sm:p-2 text-foreground/80 hover:text-foreground hover:bg-muted rounded-full transition-all"
                  title="Next News"
                >
                  <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                <button
                  onClick={() => skipSeconds(10)}
                  className="p-1.5 sm:p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-all"
                  title="Forward 10s"
                >
                  <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>

              {/* Right: Speed Button (1x), Settings (Model selection), Earbuds Icon */}
              <div className="flex items-center gap-1 sm:gap-1.5">
                {/* Speed Button (Cycles 1x -> 1.25x -> 1.5x -> 0.75x) */}
                <button
                  onClick={cycleSpeed}
                  className="px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg bg-muted hover:bg-muted/80 border border-border text-[10px] sm:text-[11px] font-mono font-bold text-primary transition-colors"
                  title="Playback Speed"
                >
                  {ttsSettings.speed || 1.0}x
                </button>

                {/* Model Selection / Settings Icon */}
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-1 sm:p-1.5 rounded-lg bg-muted hover:bg-muted/80 border border-border text-muted-foreground hover:text-foreground transition-colors"
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
