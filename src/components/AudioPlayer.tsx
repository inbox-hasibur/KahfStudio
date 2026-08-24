"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Zap,
  Mic,
  RotateCcw,
  RotateCw,
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
  raw_content?: string;
  category?: string;
  source?: string;
  imageUrl?: string;
  audioUrls?: AudioUrls;
  isPodcast?: boolean;
}

interface AudioPlayerProps {
  storiesCount?: number;
  newsItems?: any[];
}

export type AudioMode = "bn_summary" | "en_summary" | "bn_full" | "en_full";

// Helper to strip markdown and noise for natural speech
function cleanTextForSpeech(text: string): string {
  if (!text) return "";
  return text
    .replace(/!\[.*?\]\([^\s)]+\)/g, " ") // Strip markdown images
    .replace(/\[([^\]]+)\]\([^\s)]+\)/g, "$1") // Strip links but keep text
    .replace(/#{1,6}\s+/g, " ") // Strip headings
    .replace(/[*_~`[\]()<>\\\/^=+]/g, " ") // Strip symbols
    .replace(/https?:\/\/\S+/gi, " ") // Strip raw URLs
    .replace(/\s+/g, " ")
    .trim();
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

  // Active playback engine: "gemini" (HTML5 audio) or "webspeech" (browser synthesis)
  const [activeEngine, setActiveEngine] = useState<"gemini" | "webspeech">("gemini");
  const [playTrigger, setPlayTrigger] = useState(0);

  // Playlist & Active Track
  const [playlist, setPlaylist] = useState<AudioTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTrack, setActiveTrack] = useState<AudioTrack | null>(null);

  // Audio Mode Selection
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
  
  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sessionCounterRef = useRef(0);
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const webSpeechTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speechChunksRef = useRef<string[]>([]);
  const currentChunkIndexRef = useRef(0);
  const isSpeakingRef = useRef(false);

  // Helper for language detection
  const getSiteLanguage = useCallback((): "EN" | "BN" => {
    if (typeof window === "undefined") return "BN";
    if (
      document.cookie.includes("googtrans=/bn/en") ||
      localStorage.getItem("kahf-language") === "EN"
    ) {
      return "EN";
    }
    return "BN";
  }, []);

  // 1. Initialize Playlist from props
  useEffect(() => {
    if (newsItems && newsItems.length > 0) {
      const formatted: AudioTrack[] = newsItems.map((item) => ({
        id: item.id || item._id,
        title: item.title || item.headline || "সংবাদ",
        text: item.raw_content || `${item.title || item.headline || ""}. ${item.ai_summary || item.summary || ""}`,
        summary: item.ai_summary || item.summary || "",
        raw_content: item.raw_content || item.content || "",
        category: item.category || "General",
        source: item.source || "KahfNews",
        imageUrl: item.image_url || item.imageUrl,
        audioUrls: {
          bn_summary: item.audio_bn_summary || item.audioUrls?.bn_summary,
          bn_full: item.audio_bn_full || item.audioUrls?.bn_full,
          en_summary: item.audio_en_summary || item.audioUrls?.en_summary,
          en_full: item.audio_en_full || item.audioUrls?.en_full,
        },
      }));
      setPlaylist(formatted);
      if (!activeTrack && formatted.length > 0) {
        setActiveTrack(formatted[0]);
      }
    }
  }, [newsItems]);

  // 2. Load Settings & Browser Voices
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
      const loadVoices = () => {
        const available = window.speechSynthesis.getVoices();
        if (available.length > 0) setVoices(available);
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      window.removeEventListener("audio-settings-changed", handleSettingsChange);
    };
  }, []);

  // 3. Custom Event Listener for Global "play-audio"
  useEffect(() => {
    const handlePlayAudio = (e: any) => {
      const {
        title,
        summary,
        raw_content,
        audioUrls,
        id,
        imageUrl,
        source,
        preferredLang,
        preferredType,
      } = e.detail;

      const newTrack: AudioTrack = {
        id: id || `track-${Date.now()}`,
        title,
        text: raw_content || `${title}. ${summary || ""}`,
        summary: summary || "",
        raw_content: raw_content || "",
        imageUrl,
        source: source || "KahfNews",
        audioUrls: audioUrls || {},
        isPodcast: id === "daily-podcast" || source?.toLowerCase().includes("podcast"),
      };

      setActiveTrack(newTrack);
      setPlaylist((prev) => {
        const filtered = prev.filter((p) => p.id !== newTrack.id && p.title !== newTrack.title);
        return [newTrack, ...filtered];
      });
      setCurrentIndex(0);

      const siteLang = preferredLang || getSiteLanguage();
      const pref =
        ttsSettings.languagePreference === "auto"
          ? siteLang
          : ttsSettings.languagePreference.toUpperCase();
      const wantFull = preferredType === "full";

      let targetMode: AudioMode = "bn_summary";
      if (wantFull) {
        targetMode = pref === "EN" ? "en_full" : "bn_full";
      } else {
        targetMode = pref === "EN" ? "en_summary" : "bn_summary";
      }
      setAudioMode(targetMode);

      setIsOpen(true);
      setIsPlaying(true);
      // Trigger fresh start from beginning
      setPlayTrigger(Date.now());
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
  }, [ttsSettings, getSiteLanguage]);

  // 4. MediaSession Lockscreen & Earbuds Integration
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator) || !activeTrack) return;

    const modelTag =
      activeEngine === "gemini" ? "Gemini 3.1 Flash AI" : "Device WebSpeech TTS";

    navigator.mediaSession.metadata = new MediaMetadata({
      title: activeTrack.title,
      artist: `KahfNews AI • ${modelTag} (${activeTrack.source || "Radio"})`,
      album: audioMode.includes("en") ? "English News" : "বাংলা সংবাদ",
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
  }, [activeTrack, activeEngine, audioMode]);

  // 5. Volume & Playback Rate Synchronizer
  useEffect(() => {
    const currentVol = isMuted ? 0 : volume;
    const currentRate = ttsSettings.speed || 1.0;

    if (audioRef.current) {
      audioRef.current.volume = currentVol;
      audioRef.current.playbackRate = currentRate;
    }
  }, [volume, isMuted, ttsSettings.speed]);

  // Stop both engines completely
  const stopAllEngines = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    if (webSpeechTimerRef.current) {
      clearInterval(webSpeechTimerRef.current);
      webSpeechTimerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onloadedmetadata = null;
      audioRef.current.ontimeupdate = null;
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.src = "";
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      isSpeakingRef.current = false;
      window.speechSynthesis.cancel();
    }
  }, []);

  // WebSpeech Synthesis Starter
  const startWebSpeech = useCallback(
    (track: AudioTrack, mode: AudioMode, sessionId: number, resumeFromChunk = 0) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;

      stopAllEngines();
      setActiveEngine("webspeech");

      // Determine text to read based on mode
      let rawText = "";
      if (mode === "bn_full" || mode === "en_full") {
        rawText = track.raw_content || track.text || `${track.title}. ${track.summary || ""}`;
      } else {
        rawText = `${track.title}. ${track.summary || ""}`;
      }

      const cleanText = cleanTextForSpeech(rawText) || track.title;

      // Sentence chunking to safely bypass browser 15s freeze
      const isEnglish = mode.includes("en");
      const sentences = cleanText
        .split(/(?<=[।?!.\n;])/g)
        .map((s) => s.trim())
        .filter(Boolean);

      const chunks: string[] = [];
      let buffer = "";
      for (const s of sentences) {
        if (buffer && buffer.length + s.length > 120) {
          chunks.push(buffer);
          buffer = s;
        } else {
          buffer = buffer ? `${buffer} ${s}` : s;
        }
      }
      if (buffer) chunks.push(buffer);
      if (chunks.length === 0) chunks.push(cleanText);

      speechChunksRef.current = chunks;
      currentChunkIndexRef.current = resumeFromChunk;

      // Realistic speech duration calculation (Bangla ~13 chars/sec, English ~15 chars/sec)
      const charsPerSec = isEnglish ? 15 : 13;
      const speed = ttsSettings.speed || 1.0;
      const totalEstimatedDuration = Math.max(6, Math.round(cleanText.length / (charsPerSec * speed)));

      setDuration(totalEstimatedDuration);
      const initialTime = Math.round((resumeFromChunk / chunks.length) * totalEstimatedDuration);
      setCurrentTime(initialTime);
      setProgress(resumeFromChunk / chunks.length);

      // Find appropriate voice
      const currentVoices = window.speechSynthesis.getVoices();
      const matchedVoice =
        currentVoices.find((v) =>
          isEnglish
            ? v.lang.toLowerCase().startsWith("en")
            : v.lang.toLowerCase().startsWith("bn")
        ) ||
        (isEnglish
          ? null
          : currentVoices.find((v) => v.lang.toLowerCase().startsWith("hi") || v.default));

      const speakChunk = (chunkIdx: number) => {
        if (sessionCounterRef.current !== sessionId) return;

        if (chunkIdx >= chunks.length) {
          isSpeakingRef.current = false;
          setCurrentTime(totalEstimatedDuration);
          setProgress(1);
          if (sessionCounterRef.current === sessionId) {
            if (track.id === "daily-podcast" || track.isPodcast) {
              setIsPlaying(false);
            } else {
              handleNext();
            }
          }
          return;
        }

        currentChunkIndexRef.current = chunkIdx;
        const utterance = new SpeechSynthesisUtterance(chunks[chunkIdx]);
        if (matchedVoice) utterance.voice = matchedVoice;
        utterance.rate = ttsSettings.speed || 1.0;
        utterance.volume = isMuted ? 0 : volume;

        utterance.onstart = () => {
          if (sessionCounterRef.current !== sessionId) return;
          isSpeakingRef.current = true;
        };

        utterance.onend = () => {
          if (sessionCounterRef.current !== sessionId) return;
          speakChunk(chunkIdx + 1);
        };

        utterance.onerror = (e) => {
          if (sessionCounterRef.current !== sessionId) return;
          if (e.error === "canceled" || e.error === "interrupted") return;
          console.warn("WebSpeech chunk error:", e);
          speakChunk(chunkIdx + 1);
        };

        window.speechSynthesis.speak(utterance);
      };

      // Start speaking
      speakChunk(resumeFromChunk);

      // WebSpeech progress ticker (advances smoothly every 100ms)
      const startTime = Date.now() - (resumeFromChunk / chunks.length) * totalEstimatedDuration * 1000;
      webSpeechTimerRef.current = setInterval(() => {
        if (sessionCounterRef.current !== sessionId) return;
        if (!isSpeakingRef.current) return;

        const elapsed = (Date.now() - startTime) / 1000;
        const clamped = Math.min(totalEstimatedDuration, elapsed);
        setCurrentTime(clamped);
        setProgress(clamped / totalEstimatedDuration);
      }, 100);
    },
    [stopAllEngines, ttsSettings.speed, isMuted, volume]
  );

  // HTML5 Audio Starter for Gemini TTS
  const startGeminiAudio = useCallback(
    (audioUrl: string, track: AudioTrack, sessionId: number) => {
      stopAllEngines();
      setActiveEngine("gemini");

      const audio = new Audio();
      audioRef.current = audio;
      audio.preload = "auto";
      audio.volume = isMuted ? 0 : volume;
      audio.playbackRate = ttsSettings.speed || 1.0;

      let hasStarted = false;

      // 2-Second Fallback Timer: If audio cannot load/play within 2s, switch to WebSpeech
      fallbackTimerRef.current = setTimeout(() => {
        if (sessionCounterRef.current === sessionId && !hasStarted) {
          console.warn("Gemini audio timed out after 2s, falling back to WebSpeech");
          startWebSpeech(track, "bn_summary", sessionId);
        }
      }, 2000);

      audio.onloadedmetadata = () => {
        if (sessionCounterRef.current === sessionId) {
          setDuration(audio.duration || 0);
        }
      };

      audio.oncanplay = () => {
        if (sessionCounterRef.current === sessionId && fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
          fallbackTimerRef.current = null;
        }
      };

      audio.onplaying = () => {
        if (sessionCounterRef.current === sessionId) {
          hasStarted = true;
          if (fallbackTimerRef.current) {
            clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
          }
        }
      };

      audio.ontimeupdate = () => {
        if (sessionCounterRef.current === sessionId && audio.duration) {
          setCurrentTime(audio.currentTime);
          setProgress(audio.currentTime / audio.duration);
        }
      };

      audio.onended = () => {
        if (sessionCounterRef.current === sessionId) {
          if (track.id === "daily-podcast" || track.isPodcast) {
            setIsPlaying(false);
            setProgress(1);
          } else {
            handleNext();
          }
        }
      };

      audio.onerror = (e) => {
        if (sessionCounterRef.current === sessionId) {
          console.warn("Gemini audio error, falling back to WebSpeech:", e);
          if (fallbackTimerRef.current) {
            clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
          }
          startWebSpeech(track, "bn_summary", sessionId);
        }
      };

      audio.src = audioUrl;
      audio.load();

      if (isPlaying) {
        audio.play().catch((err) => {
          if (err.name !== "AbortError") {
            console.warn("Audio play error, falling back to WebSpeech:", err);
            startWebSpeech(track, "bn_summary", sessionId);
          }
        });
      }
    },
    [stopAllEngines, isMuted, volume, ttsSettings.speed, isPlaying, startWebSpeech]
  );

  // 6. Main Orchestrator: Runs whenever activeTrack or audioMode changes
  useEffect(() => {
    if (!activeTrack) return;

    const currentSessionId = ++sessionCounterRef.current;
    setCurrentTime(0);
    setProgress(0);
    setDuration(0);

    const userForcedWebSpeech = ttsSettings.model === "browser-native";

    // ONLY bn_summary uses Gemini Audio; other 3 modes (en_summary, bn_full, en_full) use WebSpeech
    if (audioMode === "bn_summary" && !userForcedWebSpeech) {
      const geminiUrl = activeTrack.audioUrls?.bn_summary;
      if (geminiUrl) {
        startGeminiAudio(geminiUrl, activeTrack, currentSessionId);
      } else {
        // Fallback directly to WebSpeech if no URL exists
        startWebSpeech(activeTrack, "bn_summary", currentSessionId);
      }
    } else {
      // en_summary, bn_full, en_full or user picked WebSpeech
      startWebSpeech(activeTrack, audioMode, currentSessionId);
    }

    return () => {
      stopAllEngines();
    };
  }, [activeTrack?.id, audioMode, ttsSettings.model, playTrigger]);

  // 7. Play / Pause Control
  useEffect(() => {
    if (!activeTrack) return;

    if (activeEngine === "gemini" && audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    } else if (activeEngine === "webspeech" && typeof window !== "undefined" && window.speechSynthesis) {
      if (isPlaying) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
          isSpeakingRef.current = true;
        } else if (!window.speechSynthesis.speaking) {
          startWebSpeech(activeTrack, audioMode, sessionCounterRef.current, currentChunkIndexRef.current);
        }
      } else {
        window.speechSynthesis.pause();
        isSpeakingRef.current = false;
      }
    }
  }, [isPlaying, activeEngine]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const handleNext = useCallback(() => {
    setPlaylist((currentPlaylist) => {
      if (currentPlaylist.length === 0) return currentPlaylist;
      setCurrentIndex((prevIdx) => {
        const nextIdx = (prevIdx + 1) % currentPlaylist.length;
        setActiveTrack(currentPlaylist[nextIdx]);
        setIsPlaying(true);
        return nextIdx;
      });
      return currentPlaylist;
    });
  }, []);

  const handlePrev = useCallback(() => {
    setPlaylist((currentPlaylist) => {
      if (currentPlaylist.length === 0) return currentPlaylist;
      setCurrentIndex((prevIdx) => {
        const prevIndex = (prevIdx - 1 + currentPlaylist.length) % currentPlaylist.length;
        setActiveTrack(currentPlaylist[prevIndex]);
        setIsPlaying(true);
        return prevIndex;
      });
      return currentPlaylist;
    });
  }, []);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setProgress(val);

    if (duration > 0) {
      const targetTime = val * duration;
      setCurrentTime(targetTime);

      if (activeEngine === "gemini" && audioRef.current) {
        audioRef.current.currentTime = targetTime;
      } else if (activeEngine === "webspeech" && activeTrack && speechChunksRef.current.length > 0) {
        const targetChunk = Math.min(
          speechChunksRef.current.length - 1,
          Math.floor(val * speechChunksRef.current.length)
        );
        startWebSpeech(activeTrack, audioMode, sessionCounterRef.current, targetChunk);
      }
    }
  };

  const skipSeconds = (delta: number) => {
    if (duration <= 0) return;
    const nextTime = Math.min(Math.max(0, currentTime + delta), duration);
    setCurrentTime(nextTime);
    setProgress(nextTime / duration);

    if (activeEngine === "gemini" && audioRef.current) {
      audioRef.current.currentTime = nextTime;
    } else if (activeEngine === "webspeech" && activeTrack && speechChunksRef.current.length > 0) {
      const targetChunk = Math.min(
        speechChunksRef.current.length - 1,
        Math.floor((nextTime / duration) * speechChunksRef.current.length)
      );
      startWebSpeech(activeTrack, audioMode, sessionCounterRef.current, targetChunk);
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
    stopAllEngines();
    setIsOpen(false);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "0:00";
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder < 10 ? "0" : ""}${remainder}`;
  };

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

      {/* Floating Audio Player Card */}
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
                    {activeEngine === "gemini" ? (
                      <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center gap-1 hover:bg-emerald-500/25 transition-colors cursor-pointer"
                        title="Playing via Gemini 3.1 Flash AI Audio - Click for settings"
                      >
                        <Zap className="w-2.5 h-2.5 fill-current" />
                        Gemini 3.1 Flash TTS
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center gap-1 hover:bg-amber-500/25 transition-colors cursor-pointer"
                        title="Playing via Browser Native WebSpeech Voice - Click for settings"
                      >
                        <Mic className="w-2.5 h-2.5" />
                        Device WebSpeech TTS
                      </button>
                    )}

                    <span className="text-[10px] sm:text-[11px] text-muted-foreground">
                      {currentIndex + 1} of {playlist.length}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-foreground truncate mt-0.5">
                    {activeTrack.title}
                  </p>
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

            {/* Audio Dropdown Options - Clean 2 Options based on Active Language Mode */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-muted/50 border border-border rounded-xl p-1 sm:p-1.5 mb-3">
              <FileAudio className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0 ml-1" />
              {audioMode.startsWith("en") || getSiteLanguage() === "EN" ? (
                <select
                  value={audioMode.startsWith("en") ? audioMode : "en_summary"}
                  onChange={(e) => {
                    setAudioMode(e.target.value as AudioMode);
                    setIsPlaying(true);
                  }}
                  className="w-full text-[11px] sm:text-xs font-semibold bg-transparent text-foreground focus:outline-none cursor-pointer truncate"
                >
                  <option value="en_summary" className="bg-card text-foreground">
                    English Summary
                  </option>
                  <option value="en_full" className="bg-card text-foreground">
                    English Full News
                  </option>
                </select>
              ) : (
                <select
                  value={audioMode.startsWith("bn") ? audioMode : "bn_summary"}
                  onChange={(e) => {
                    setAudioMode(e.target.value as AudioMode);
                    setIsPlaying(true);
                  }}
                  className="w-full text-[11px] sm:text-xs font-semibold bg-transparent text-foreground focus:outline-none cursor-pointer truncate"
                >
                  <option value="bn_summary" className="bg-card text-foreground">
                    বাংলা সারসংক্ষেপ (Bangla Summary)
                  </option>
                  <option value="bn_full" className="bg-card text-foreground">
                    সম্পূর্ণ সংবাদ (Bangla Full News)
                  </option>
                </select>
              )}
            </div>

            {/* Progress Bar & Clean Timestamps */}
            <div className="space-y-1">
              <div className="relative h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden group cursor-pointer">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.001}
                  value={progress || 0}
                  onChange={handleSeek}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div
                  className="h-full bg-gradient-to-r from-primary via-emerald-400 to-primary transition-all duration-100"
                  style={{ width: `${Math.min(100, Math.max(0, (progress || 0) * 100))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-muted-foreground">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Main Player Bottom Bar */}
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
                    <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                  )}
                </button>

                <div className="relative flex items-center w-14 sm:w-20 group/vol">
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-popover border border-border text-[10px] font-mono font-bold text-popover-foreground opacity-0 group-hover/vol:opacity-100 transition-all pointer-events-none shadow-md whitespace-nowrap z-30">
                    {Math.round((isMuted ? 0 : volume) * 100)}%
                  </div>

                  <div className="absolute inset-y-0 my-auto h-1.5 w-full bg-muted rounded-full overflow-hidden pointer-events-none">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                    />
                  </div>
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
                    className="relative z-10 w-full h-3 opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              {/* Center Column: Playback Controls (Centrally Aligned) */}
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
                  {isPlaying ? (
                    <Pause className="w-4 h-4 sm:w-6 sm:h-6 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 sm:w-6 sm:h-6 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  onClick={handleNext}
                  className="p-1.5 sm:p-2 text-foreground/80 hover:text-foreground hover:bg-muted rounded-full transition-all cursor-pointer"
                  title="Next News"
                >
                  <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              {/* Right Column: Speed Button, Settings, Headphones */}
              <div className="flex items-center justify-end gap-1 sm:gap-1.5">
                <button
                  onClick={cycleSpeed}
                  className="px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg bg-muted hover:bg-muted/80 border border-border text-[10px] sm:text-[11px] font-mono font-bold text-primary transition-colors cursor-pointer"
                  title="Playback Speed"
                >
                  {ttsSettings.speed || 1.0}x
                </button>

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
