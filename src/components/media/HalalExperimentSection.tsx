"use client";

import React, { useState, useEffect, useRef } from "react";
import { HlsVideoPlayer } from "./HlsVideoPlayer";
import { AudioVisualizer } from "./AudioVisualizer";
import { useWienerFilter, HalalFilterMode } from "@/hooks/useWienerFilter";
import { useHalalMLEngine } from "@/hooks/useHalalMLEngine";
import {
  Volume2, Sliders, Activity, Mic, TreePine, Tv, Video,
  Bird, CloudRain, Droplets, Disc3, ChevronDown, ChevronUp, Cpu, Sparkles, Settings2,
  Download, Zap, RefreshCw, CheckCircle2, ShieldCheck, HardDrive
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface MediaItem {
  type: "channel" | "video";
  id: string;
  name: string;
  category: string;
  streamUrl: string;
  thumbnail?: string;
  source?: string;
  logoColor?: string;
  logoText?: string;
  isMusic?: boolean;
}

export function getChannelLogoMeta(name: string, id?: string): { logoColor: string; logoText: string } {
  const n = (name || "").toLowerCase();
  if (id === "c1" || n.includes("jamuna") || n.includes("যমুনা")) {
    return { logoColor: "from-blue-600 to-blue-800", logoText: "JTV" };
  }
  if (id === "c2" || n.includes("somoy") || n.includes("সময়")) {
    return { logoColor: "from-orange-500 to-orange-700", logoText: "সময়" };
  }
  if (id === "c3" || n.includes("channel 24") || n.includes("২৪")) {
    return { logoColor: "from-emerald-600 to-teal-800", logoText: "C24" };
  }
  if (id === "c4" || n.includes("news24") || n.includes("নিউজ ২৪")) {
    return { logoColor: "from-red-700 to-rose-900", logoText: "N24" };
  }
  if (id === "c5" || n.includes("ekattor") || n.includes("একাত্তর")) {
    return { logoColor: "from-green-700 to-emerald-900", logoText: "৭১" };
  }
  if (id === "c6" || n.includes("independent") || n.includes("ইন্ডিপেনডেন্ট")) {
    return { logoColor: "from-slate-800 to-zinc-900", logoText: "i" };
  }
  if (id === "c7" || n.includes("rtv") || n.includes("আরটিভি")) {
    return { logoColor: "from-red-600 to-red-800", logoText: "rtv" };
  }
  if (id === "c8" || n.includes("banglavision") || n.includes("বাংলাভিশন")) {
    return { logoColor: "from-sky-600 to-blue-800", logoText: "BV" };
  }
  if (id === "c9" || n.includes("desh") || n.includes("দেশ")) {
    return { logoColor: "from-teal-700 to-emerald-800", logoText: "দেশ" };
  }
  if (id === "c10" || n.includes("al jazeera") || n.includes("জাজিরা")) {
    return { logoColor: "from-amber-600 to-yellow-800", logoText: "AJ" };
  }
  if (id === "c11" || n.includes("dw")) {
    return { logoColor: "from-sky-700 to-indigo-800", logoText: "DW" };
  }
  if (id === "c12" || n.includes("sky")) {
    return { logoColor: "from-rose-700 to-red-900", logoText: "sky" };
  }
  if (id === "c13" || n.includes("dbc")) {
    return { logoColor: "from-purple-700 to-indigo-800", logoText: "DBC" };
  }
  if (id === "c14" || n.includes("channel i") || n.includes("চ্যানেল আই")) {
    return { logoColor: "from-emerald-700 to-teal-800", logoText: "i" };
  }
  return { logoColor: "from-zinc-700 to-zinc-900", logoText: "TV" };
}

export const HalalExperimentSection: React.FC = () => {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [halalEnabled, setHalalEnabled] = useState<boolean>(false);
  const [gainDb, setGainDb] = useState<number>(0); // 0dB neutral calibrated safe default
  const [mode, setMode] = useState<HalalFilterMode>("dsp");
  const [variant, setVariant] = useState<"voice" | "nature">("voice");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);

  // 3 Natural Sound Bed Presets
  const naturePresets = [
    { id: "birds", label: "পাখি", url: "/sounds/birds.m4a", icon: Bird },
    { id: "water", label: "ঝর্ণা", url: "/sounds/water.m4a", icon: Droplets },
    { id: "storm", label: "বৃষ্টি", url: "/sounds/storm.m4a", icon: CloudRain }
  ];
  const [selectedNature, setSelectedNature] = useState(naturePresets[0]);
  const [natureVolume, setNatureVolume] = useState<number>(0.15); // soft ambient volume
  const natureAudioRef = useRef<HTMLAudioElement | null>(null);

  // ALL 14 Channels from Media Page
  const testChannels: MediaItem[] = [
    {
      type: "channel",
      id: "c1",
      name: "Jamuna TV (যমুনা টিভি)",
      category: "জাতীয় সংবাদ",
      streamUrl: "https://tvsen5.aynaott.com/banglavision/index.m3u8",
      logoColor: "from-blue-600 to-blue-800",
      logoText: "JTV",
      source: "24/7 লাইভ এইচডি"
    },
    {
      type: "channel",
      id: "c2",
      name: "Somoy TV (সময় টিভি)",
      category: "ব্রেকিং নিউজ",
      streamUrl: "https://tvsen5.aynaott.com/somoytv/index.m3u8",
      logoColor: "from-orange-500 to-orange-700",
      logoText: "সময়",
      source: "24/7 লাইভ এইচডি"
    },
    {
      type: "channel",
      id: "c3",
      name: "Channel 24 (চ্যানেল ২৪)",
      category: "সংবাদ ২৪",
      streamUrl: "https://tvsen5.aynaott.com/xV4jEKf3D9zc/index.m3u8",
      logoColor: "from-emerald-600 to-teal-800",
      logoText: "C24",
      source: "24/7 লাইভ এইচডি"
    },
    {
      type: "channel",
      id: "c4",
      name: "News24 (নিউজ ২৪)",
      category: "ব্রেকিং নিউজ",
      streamUrl: "https://tvsen5.aynaott.com/somoytv/index.m3u8",
      logoColor: "from-red-700 to-rose-900",
      logoText: "N24",
      source: "24/7 লাইভ"
    },
    {
      type: "channel",
      id: "c5",
      name: "Ekattor TV (একাত্তর টিভি)",
      category: "জাতীয়",
      streamUrl: "https://tvsen5.aynaott.com/RtvHD/index.m3u8",
      logoColor: "from-green-700 to-emerald-900",
      logoText: "৭১",
      source: "24/7 লাইভ এইচডি"
    },
    {
      type: "channel",
      id: "c6",
      name: "Independent TV (ইন্ডিপেনডেন্ট)",
      category: "বাংলাদেশ",
      streamUrl: "https://tvsen5.aynaott.com/banglavision/index.m3u8",
      logoColor: "from-slate-800 to-zinc-900",
      logoText: "i",
      source: "24/7 লাইভ"
    },
    {
      type: "channel",
      id: "c7",
      name: "RTV News (আরটিভি)",
      category: "জাতীয় সংবাদ",
      streamUrl: "https://tvsen5.aynaott.com/RtvHD/index.m3u8",
      logoColor: "from-red-600 to-red-800",
      logoText: "rtv",
      source: "24/7 লাইভ"
    },
    {
      type: "channel",
      id: "c8",
      name: "Banglavision (বাংলাভিশন)",
      category: "সংবাদ ও খবর",
      streamUrl: "https://tvsen5.aynaott.com/banglavision/index.m3u8",
      logoColor: "from-sky-600 to-blue-800",
      logoText: "BV",
      source: "24/7 লাইভ"
    },
    {
      type: "channel",
      id: "c9",
      name: "Desh TV (দেশ টিভি)",
      category: "খবর ও রাজনীতি",
      streamUrl: "https://deshitv.deshitv24.net/live/myStream/playlist.m3u8",
      logoColor: "from-teal-700 to-emerald-800",
      logoText: "দেশ",
      source: "24/7 লাইভ"
    },
    {
      type: "channel",
      id: "c10",
      name: "Al Jazeera (আল জাজিরা)",
      category: "আন্তর্জাতিক",
      streamUrl: "https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8",
      logoColor: "from-amber-600 to-yellow-800",
      logoText: "AJ",
      source: "Global Live HD"
    },
    {
      type: "channel",
      id: "c11",
      name: "DW News (ডিডব্লিউ নিউজ)",
      category: "বিশ্ব সংবাদ",
      streamUrl: "https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8",
      logoColor: "from-sky-700 to-indigo-800",
      logoText: "DW",
      source: "Global Live HD"
    },
    {
      type: "channel",
      id: "c12",
      name: "Sky News (স্কাই নিউজ)",
      category: "আন্তর্জাতিক",
      streamUrl: "https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8",
      logoColor: "from-rose-700 to-red-900",
      logoText: "sky",
      source: "Global Live HD"
    },
    {
      type: "channel",
      id: "c13",
      name: "NTV HD (এনটিভি)",
      category: "বিনোদন ও সংবাদ",
      streamUrl: "https://tvsen5.aynaott.com/xV4jEKf3D9zc/index.m3u8",
      logoColor: "from-blue-600 to-indigo-800",
      logoText: "NTV",
      source: "24/7 লাইভ"
    },
    {
      type: "channel",
      id: "c14",
      name: "T Sports (টি স্পোর্টস)",
      category: "খেলাধুলা",
      streamUrl: "https://tvsen5.aynaott.com/TnMn5kZz8aLm/index.m3u8",
      logoColor: "from-emerald-600 to-teal-800",
      logoText: "TS",
      source: "24/7 লাইভ"
    }
  ];

  // ALL Authentic News & Lyrics Music Test Videos (using genuine YouTube source URLs)
  const testVideos: MediaItem[] = [
    {
      type: "video",
      id: "v_music_pop",
      name: "🎵 Alan Walker - On My Way (Vocals + Pop Music)",
      category: "মিউজিক টেস্ট",
      streamUrl: "https://www.youtube.com/watch?v=dhYOPzcsbGM",
      thumbnail: "https://img.youtube.com/vi/dhYOPzcsbGM/hqdefault.jpg",
      source: "YouTube Music",
      isMusic: true
    },
    {
      type: "video",
      id: "v1",
      name: "৮ মাসে বন্ধের চেয়ে দ্বিগুণ নতুন পোশাক কারখানা চালু",
      category: "অর্থনীতি",
      streamUrl: "https://www.youtube.com/watch?v=xQYPxb5iwi4",
      thumbnail: "https://img.youtube.com/vi/xQYPxb5iwi4/hqdefault.jpg",
      source: "যমুনা টিভি রিপোর্ট"
    },
    {
      type: "video",
      id: "v2",
      name: "ডাকসু নির্বাচনের ১ বছর; প্রতিশ্রুতি পূরণে কতটা সফল ছাত্রনেতারা?",
      category: "রাজনীতি",
      streamUrl: "https://www.youtube.com/watch?v=cqTCa8NhM-M",
      thumbnail: "https://img.youtube.com/vi/cqTCa8NhM-M/hqdefault.jpg",
      source: "বিশেষ সংবাদ প্রতিবেদন"
    },
    {
      type: "video",
      id: "v3",
      name: "গ্যাস-জ্বালানি বৈশ্বিক সংকট, সমাধান একা সম্ভব নয়: জ্বালানি বিশেষজ্ঞ",
      category: "জ্বালানি ও বিদ্যুৎ",
      streamUrl: "https://www.youtube.com/watch?v=2lVBzxoof0U",
      thumbnail: "https://img.youtube.com/vi/2lVBzxoof0U/hqdefault.jpg",
      source: "সাক্ষাৎকার প্রতিবেদন"
    },
    {
      type: "video",
      id: "v4",
      name: "ত্যাগী ও নির্যাতিত নেতাদের স্মরণ ও রাজনৈতিক দৃষ্টিভঙ্গি",
      category: "রাজনীতি",
      streamUrl: "https://www.youtube.com/watch?v=ffxM3qF50OE",
      thumbnail: "https://img.youtube.com/vi/ffxM3qF50OE/hqdefault.jpg",
      source: "বিশেষ আলোচনা"
    },
    {
      type: "video",
      id: "v5",
      name: "সমসাময়িক রাজনৈতিক পরিস্থিতি ও দেশের সামগ্রিক প্রেক্ষাপট",
      category: "জাতীয়",
      streamUrl: "https://www.youtube.com/watch?v=Nia-x6xY0BI",
      thumbnail: "https://img.youtube.com/vi/Nia-x6xY0BI/hqdefault.jpg",
      source: "DBC News প্রতিবেদন"
    },
    {
      type: "video",
      id: "v6",
      name: "পানামা খালে পানি সরবরাহ নিয়ে বিশেষ প্রতিবেদন",
      category: "আন্তর্জাতিক",
      streamUrl: "https://www.youtube.com/watch?v=EZ81qPzajLI",
      thumbnail: "https://img.youtube.com/vi/EZ81qPzajLI/hqdefault.jpg",
      source: "আন্তর্জাতিক রিপোর্ট"
    },
    {
      type: "video",
      id: "v7",
      name: "বাংলাভিশন সংবাদ বুলেটিন ও দিনের প্রধান খবর",
      category: "সংবাদ বুলেটিন",
      streamUrl: "https://www.youtube.com/watch?v=-N8ewR65kas",
      thumbnail: "https://img.youtube.com/vi/-N8ewR65kas/hqdefault.jpg",
      source: "বাংলাভিশন বুলেটিন"
    }
  ];

  const [channelList, setChannelList] = useState<MediaItem[]>(testChannels);
  const [videoList, setVideoList] = useState<MediaItem[]>(testVideos);
  const [activeMedia, setActiveMedia] = useState<MediaItem>(testChannels[0]);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);

  // Sync real-time channels and videos from Admin Media Database (Supabase)
  useEffect(() => {
    fetch("/api/admin/media-channels")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success) {
          if (data.channels && data.channels.length > 0) {
            const mappedChannels: MediaItem[] = data.channels.map((ch: any) => {
              const meta = getChannelLogoMeta(ch.title, ch.id);
              return {
                type: "channel",
                id: ch.id,
                name: ch.title,
                category: ch.category || "লাইভ টিভি",
                streamUrl: ch.url,
                logoColor: meta.logoColor,
                logoText: meta.logoText,
                source: ch.stream_type === "iptv" || ch.url?.includes(".m3u8") ? "24/7 লাইভ" : "লাইভ এইচডি",
              };
            });
            setChannelList(mappedChannels);
            setActiveMedia((prev) => {
              const matched = mappedChannels.find((c) => c.id === prev.id || c.name === prev.name);
              return matched || mappedChannels[0];
            });
          }
          if (data.videos && data.videos.length > 0) {
            const mappedVideos: MediaItem[] = data.videos.map((v: any) => {
              let thumb = v.thumbnail;
              const ytMatch = (v.url || "").match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/))([\w-]{11})/);
              if (ytMatch && ytMatch[1] && !thumb) {
                thumb = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
              }
              return {
                type: "video",
                id: v.id,
                name: v.title,
                category: v.category || "সংবাদ",
                streamUrl: v.url, // Keep genuine source YouTube URL directly!
                thumbnail: thumb || (ytMatch ? `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg` : "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600"),
                source: v.description?.slice(0, 30) || "ভিডিও প্রতিবেদন",
                isMusic: v.category?.toLowerCase().includes("music") || v.category?.toLowerCase().includes("গান") || v.title?.toLowerCase().includes("beat") || v.title?.toLowerCase().includes("lyrics") || v.title?.toLowerCase().includes("alan walker"),
              };
            });
            setVideoList(mappedVideos);
          }
        }
      })
      .catch(() => { });
  }, []);

  // Connect Real-Time Wiener & Audio Worklet Hook (Acoustically Normalized)
  const {
    isActive,
    isContextSuspended,
    workletNode,
    error,
    toggleFilter,
    setGainDb: updateGain,
    setMode: updateMode,
    setVariant: updateVariant,
    getVisualizerData
  } = useWienerFilter({
    videoElement,
    enabled: halalEnabled,
    mode,
    variant: variant === "nature" ? "nature" : "voice",
    gainDb
  });

  // Connect ML Deep Learning Engine (MDX-Net Worker)
  const {
    isModelLoading,
    isModelReady,
    isModelCached,
    mlPrimed,
    mlBufferedSeconds,
    mlPreprocessPercent,
    modelStatus,
    backend,
    modelProgress,
    prepareModel
  } = useHalalMLEngine({
    workletNode,
    enabled: halalEnabled && mode === "ml"
  });

  const [cacheCleared, setCacheCleared] = useState<boolean>(false);
  const handleClearCache = async () => {
    try {
      if (typeof window !== "undefined" && typeof caches !== "undefined") {
        await caches.delete("kahf-model-cache-v1");
        setCacheCleared(true);
        setTimeout(() => setCacheCleared(false), 3000);
      }
    } catch (_) { }
  };

  const duckFactorRef = useRef<number>(1.0);

  // Listen for VOCEX_STATS from AudioWorklet to dynamically duck Nature Bed during active speech
  useEffect(() => {
    if (!workletNode) return;

    const handleWorkletMessage = (e: MessageEvent) => {
      const data = e.data;
      if (data && data.type === "VOCEX_STATS") {
        if (typeof data.rmsDb === "number") {
          if (data.rmsDb > -20) {
            // Voice active: duck nature bed volume to 0.4x factor
            duckFactorRef.current = 0.4;
          } else if (data.rmsDb < -30) {
            // Voice pause/silence: restore nature bed volume to 1.0x factor
            duckFactorRef.current = 1.0;
          }
          if (natureAudioRef.current) {
            const targetVol = Math.max(0, Math.min(1, natureVolume * duckFactorRef.current));
            natureAudioRef.current.volume = targetVol;
          }
        }
      }
    };

    workletNode.port.addEventListener("message", handleWorkletMessage);
    return () => {
      workletNode.port.removeEventListener("message", handleWorkletMessage);
    };
  }, [workletNode, natureVolume]);

  // Ambient Nature Sound Bed Player (Plays ONLY when video is actively playing)
  useEffect(() => {
    let fadeInterval: NodeJS.Timeout | null = null;

    if (variant === "nature" && isActive && isVideoPlaying) {
      const targetVol = Math.max(0, Math.min(1, natureVolume * duckFactorRef.current));
      if (!natureAudioRef.current) {
        const audio = new Audio(selectedNature.url);
        audio.loop = true;
        audio.volume = 0;
        natureAudioRef.current = audio;
        audio.play().then(() => {
          let step = 0;
          const totalSteps = 10;
          fadeInterval = setInterval(() => {
            step++;
            if (natureAudioRef.current) {
              natureAudioRef.current.volume = (step / totalSteps) * targetVol;
            }
            if (step >= totalSteps && fadeInterval) clearInterval(fadeInterval);
          }, 50); // 0.5s fade in
        }).catch(() => { });
      } else {
        natureAudioRef.current.src = selectedNature.url;
        natureAudioRef.current.volume = targetVol;
        natureAudioRef.current.play().catch(() => { });
      }
    } else {
      if (natureAudioRef.current) {
        const audio = natureAudioRef.current;
        let step = 10;
        fadeInterval = setInterval(() => {
          step--;
          if (audio) {
            audio.volume = Math.max(0, (step / 10) * audio.volume);
          }
          if (step <= 0) {
            if (fadeInterval) clearInterval(fadeInterval);
            audio.pause();
            natureAudioRef.current = null;
          }
        }, 30); // 0.3s fade out
      }
    }

    return () => {
      if (fadeInterval) clearInterval(fadeInterval);
    };
  }, [variant, isActive, isVideoPlaying, selectedNature, natureVolume]);

  const handleToggleHalal = async () => {
    const next = !halalEnabled;
    setHalalEnabled(next);
    await toggleFilter(next);
  };

  const handleModeSelect = (m: HalalFilterMode) => {
    setMode(m);
    updateMode(m);
    if (m === "ml" && !isModelReady && !isModelLoading) {
      prepareModel();
    }
  };

  const handleGainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setGainDb(val);
    updateGain(val);
  };

  const handleVariantSelect = (v: "voice" | "nature") => {
    setVariant(v);
    updateVariant(v);
  };

  const handleSelectMedia = (item: MediaItem) => {
    if (natureAudioRef.current) {
      natureAudioRef.current.pause();
      natureAudioRef.current = null;
    }
    setActiveMedia(item);
    if (workletNode && isActive) {
      workletNode.port.postMessage({ type: "ML_FULL_RESET" });
      workletNode.port.postMessage({ type: "VIDEO_START_TIME", time: 0 });
    }
  };

  return (
    <section className="mt-8 sm:mt-10 mb-12 sm:mb-16 p-3 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl bg-card text-card-foreground border border-border/80 shadow-xl relative overflow-hidden transition-colors">

      {/* ── TOP HEADER & THEMED SLIDER TOGGLE ── */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/70 mb-3 sm:mb-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-xs sm:text-sm md:text-base font-bold text-foreground tracking-tight truncate">
              Halal Media Studio (Test)
            </h3>
            <span className="text-[8px] sm:text-[9px] px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-mono font-bold uppercase shrink-0">
              Dev in Progress
            </span>
          </div>
          <p className="text-[9px] sm:text-xs text-muted-foreground truncate mt-0.5">
            লাইভ টিভি ও ভিডিওর উপর রিয়েল-টাইম হালাল সাউন্ড ও মিউজিক ফিল্টার
          </p>
        </div>

        {/* Compact Themed Slider Toggle Switch */}
        <div
          onClick={handleToggleHalal}
          className="flex items-center gap-1.5 p-1 pl-2 pr-1.5 rounded-xl bg-muted/60 hover:bg-muted border border-border transition-all cursor-pointer select-none shadow-xs shrink-0"
        >
          <span className="text-[9px] sm:text-[11px] font-semibold text-foreground hidden xs:inline">
            Halal:
          </span>
          <span className={`text-[9px] sm:text-[11px] font-mono font-bold ${isActive ? "text-emerald-500" : "text-muted-foreground"}`}>
            {isActive ? "ON" : "OFF"}
          </span>

          {/* Slider Switch */}
          <div className={`w-8 sm:w-9 h-4.5 sm:h-5 rounded-full transition-colors duration-300 p-0.5 flex items-center ${isActive ? "bg-emerald-500 shadow-xs" : "bg-muted-foreground/30"
            }`}>
            <div className={`w-3.5 sm:w-4 h-3.5 sm:h-4 rounded-full bg-white dark:bg-zinc-950 shadow-xs transform transition-transform duration-300 flex items-center justify-center ${isActive ? "translate-x-3.5 sm:translate-x-4" : "translate-x-0"
              }`}>
              <span className={`w-1 h-1 rounded-full ${isActive ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
            </div>
          </div>
        </div>
      </div>

      {/* ── SIMPLIFIED ALWAYS-VISIBLE PRIMARY CONTROL BAR ── */}
      <div className="flex items-center justify-between gap-2 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-muted/40 border border-border/70 mb-3 sm:mb-4 text-xs flex-wrap">

        {/* Engine Mode Tabs (DSP vs Neural AI) */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleModeSelect("dsp")}
            className={`py-1.5 px-2.5 sm:px-3 rounded-lg font-bold text-[9px] sm:text-xs transition-all flex items-center gap-1 cursor-pointer ${mode === "dsp"
              ? "bg-emerald-500 text-black shadow-xs font-bold"
              : "bg-muted hover:bg-muted/80 text-foreground border border-border/60"
              }`}
          >
            <Zap className="w-3 h-3" /> DSP (0ms)
          </button>
          <button
            onClick={() => handleModeSelect("ml")}
            className={`py-1.5 px-2.5 sm:px-3 rounded-lg font-bold text-[9px] sm:text-xs transition-all flex items-center gap-1 cursor-pointer ${mode === "ml"
              ? "bg-teal-500 text-black shadow-xs font-bold"
              : "bg-muted hover:bg-muted/80 text-foreground border border-border/60"
              }`}
          >
            <Cpu className="w-3 h-3" /> Neural AI
          </button>
        </div>

        {/* Target Buttons (Vocal Only vs Nature Bed) */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleVariantSelect("voice")}
            className={`py-1.5 px-2 sm:px-2.5 rounded-lg text-[9px] sm:text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${variant === "voice"
              ? "bg-primary/20 text-primary border border-primary/30"
              : "bg-muted/60 hover:bg-muted text-muted-foreground border border-transparent"
              }`}
          >
            <Mic className="w-3 h-3" /> Vocal Only
          </button>
          <button
            onClick={() => handleVariantSelect("nature")}
            className={`py-1.5 px-2 sm:px-2.5 rounded-lg text-[9px] sm:text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${variant === "nature"
              ? "bg-primary/20 text-primary border border-primary/30"
              : "bg-muted/60 hover:bg-muted text-muted-foreground border border-transparent"
              }`}
          >
            <TreePine className="w-3 h-3" /> + Nature Bed
          </button>
        </div>

        {/* Status Pill & Advanced Toggle */}
        <div className="flex items-center gap-2">
          {isContextSuspended ? (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[9px] sm:text-[10px] font-mono font-bold animate-pulse">
              <span>Tap video to activate</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-card border border-border text-[9px] sm:text-[10px] font-mono font-bold">
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : "bg-zinc-500"}`} />
              {mode === "dsp" ? (
                <span className="text-emerald-600 dark:text-emerald-400">DSP Active (0ms)</span>
              ) : isModelLoading ? (
                <span className="text-amber-500 animate-pulse">Neural AI: {modelProgress}%</span>
              ) : isModelReady ? (
                <span className="text-teal-500">Neural AI: Ready ({backend})</span>
              ) : (
                <span className="text-muted-foreground">Neural AI: Setup Needed</span>
              )}
            </div>
          )}

          <button
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-card hover:bg-muted border border-border text-[10px] sm:text-xs font-semibold text-foreground transition-all cursor-pointer shadow-xs"
          >
            <Settings2 className="w-3 h-3 text-emerald-500" />
            <span>Advanced</span>
            {isAdvancedOpen ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
          </button>
        </div>
      </div>

      {/* ── PREPARE AI NEURAL ENGINE BANNER (Shown when Neural AI mode is active but not prepared) ── */}
      {mode === "ml" && (!isModelReady || isModelLoading) && (
        <div className="mb-3 sm:mb-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-teal-500/10 border border-teal-500/30 text-card-foreground">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-xl bg-teal-500/20 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2 flex-wrap">
                  <span>In-Browser Neural AI Audio Isolation (MDX-Net)</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-600 dark:text-teal-400 font-mono font-bold">~66 MB</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">WebGPU / WASM</span>
                </div>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 leading-relaxed">
                  ব্রাউজার এক্সটেনশন ছাড়াই আপনার ডিভাইসের GPU/WASM ব্যবহার করে রিয়েল-টাইম এআই মডেল রান করে। একবার ডাউনলোড হলে এটি ব্রাউজার স্টোরেজে সেইভ থাকবে।
                </p>
              </div>
            </div>

            <div className="w-full md:w-auto shrink-0">
              {isModelLoading ? (
                <div className="flex flex-col gap-1.5 w-full md:w-60">
                  <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                    <span className="truncate">{modelStatus}</span>
                    <span className="font-bold text-teal-500">{modelProgress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-teal-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${modelProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={prepareModel}
                  className="w-full md:w-auto bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs gap-1.5 shadow-sm rounded-xl cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isModelCached ? "Load Cached AI Model" : "Prepare AI for this Device"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── COLLAPSIBLE ACCORDION FOR ADVANCED SETTINGS ── */}
      {isAdvancedOpen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-card border border-border/80 mb-3 sm:mb-4 text-xs animate-in fade-in slide-in-from-top-2 duration-200">

          {/* 1. Vocal Gain Boost */}
          <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-muted/30 border border-border/60 justify-between">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <span className="flex items-center gap-1">
                <Volume2 className="w-3 h-3 text-emerald-500" /> Voice Boost:
              </span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">+{gainDb} dB</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="6"
                step="1"
                value={gainDb}
                onChange={handleGainChange}
                className="w-full accent-emerald-500 h-1.5 bg-muted rounded-lg cursor-pointer"
              />
            </div>
            <span className="text-[9px] text-muted-foreground">Calibrated level to restore dialogue loudness</span>
          </div>

          {/* 2. Device Hardware & Cache Status */}
          <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-muted/30 border border-border/60 justify-between">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <span className="flex items-center gap-1">
                <HardDrive className="w-3 h-3 text-teal-500" /> Device Acceleration:
              </span>
              <span className="font-mono text-teal-500 font-bold uppercase text-[9px]">{backend}</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">Model Cache:</span>
              <span className={`font-mono font-bold ${isModelCached ? "text-emerald-500" : "text-amber-500"}`}>
                {isModelCached ? "Saved on Device" : "Not Cached"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-1 pt-0.5">
              <button
                onClick={handleClearCache}
                className="text-[9px] text-muted-foreground hover:text-red-500 underline cursor-pointer"
              >
                {cacheCleared ? "Cache Cleared!" : "Clear Cache"}
              </button>
              {isModelCached && !isModelReady && (
                <button
                  onClick={prepareModel}
                  className="text-[9px] font-bold text-teal-500 hover:underline cursor-pointer"
                >
                  Activate Now
                </button>
              )}
            </div>
          </div>

          {/* 3. Real-Time Audio Visualizer */}
          <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-muted/30 border border-border/60 justify-between sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3 text-emerald-500" /> Spectrum Visualizer:
              </span>
              <span className={`font-mono text-[9px] font-bold ${isActive ? "text-emerald-500" : "text-muted-foreground"}`}>
                {isActive ? "LIVE" : "OFF"}
              </span>
            </div>
            <AudioVisualizer
              getVisualizerData={getVisualizerData}
              isActive={isActive}
              className="w-full"
            />
          </div>

        </div>
      )}

      {/* ── VIDEO PLAYER VIEWPORT (Fully Responsive 16:9 Scale & Seamless Card Alignment) ── */}
      <div className="w-full rounded-xl sm:rounded-2xl overflow-hidden shadow-lg border border-border/80 mb-3 sm:mb-5 bg-black">
        <HlsVideoPlayer
          src={activeMedia.streamUrl}
          title={activeMedia.name}
          halalActive={isActive}
          onToggleHalal={handleToggleHalal}
          onVideoElementReady={(el) => setVideoElement(el)}
          onPlayStateChange={(playing) => {
            setIsVideoPlaying(playing);
            if (workletNode) {
              workletNode.port.postMessage({ type: "PLAY_STATE", playing });
            }
          }}
          mode={mode}
          isModelReady={isModelReady}
          modelProgress={modelProgress}
          mlStatus={modelStatus}
          mlPrimed={mlPrimed}
          mlBufferedSeconds={mlBufferedSeconds}
          mlPreprocessPercent={mlPreprocessPercent}
          className="w-full"
        />
      </div>

      {/* ── 2-COLUMN SIDE-BY-SIDE GRID (PERMANENTLY LEFT & RIGHT ACROSS ALL SCREENS) ── */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 pt-3 border-t border-border/70">

        {/* LEFT COLUMN: লাইভ টিভি চ্যানেল (Independent Vertical Scroll) */}
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center justify-between pb-1 border-b border-border/60">
            <span className="text-[10px] sm:text-xs font-bold text-foreground flex items-center gap-1 uppercase tracking-wide truncate">
              <Tv className="w-3 h-3 text-red-500 animate-pulse shrink-0" /> লাইভ টিভি:
            </span>
            <span className="text-[8px] sm:text-[9px] font-mono font-bold text-red-500 bg-red-500/10 px-1 py-0.2 rounded-full border border-red-500/20 shrink-0">
              {channelList.length} LIVE
            </span>
          </div>

          {/* Independent Vertical Scroll Container (Shows 3 Rows) */}
          <div className="max-h-[160px] sm:max-h-[180px] overflow-y-auto pr-0.5 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
              {channelList.map((ch) => {
                const isSelected = activeMedia.id === ch.id;
                return (
                  <div
                    key={ch.id}
                    onClick={() => handleSelectMedia(ch)}
                    className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl border flex items-center gap-1.5 cursor-pointer transition-all ${isSelected
                      ? "bg-red-500/10 border-red-500 shadow-xs ring-1 ring-red-500/40"
                      : "bg-muted/40 hover:bg-muted/80 border-border/70"
                      }`}
                  >
                    <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-gradient-to-br ${ch.logoColor} flex items-center justify-center text-white font-black text-[8px] sm:text-[10px] shrink-0 shadow-xs`}>
                      {ch.logoText}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-[9px] sm:text-[11px] text-foreground block truncate">
                        {ch.name}
                      </span>
                      <span className="text-[7px] sm:text-[9px] text-red-500 font-semibold flex items-center gap-0.5 mt-0.2">
                        <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" /> {ch.source}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: আরও ভিডিও ও মিউজিক টেস্ট (Independent Vertical Scroll) */}
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center justify-between pb-1 border-b border-border/60">
            <span className="text-[10px] sm:text-xs font-bold text-foreground flex items-center gap-1 uppercase tracking-wide truncate">
              <Video className="w-3 h-3 text-emerald-500 shrink-0" /> ভিডিও ও মিউজিক:
            </span>
            <span className="text-[8px] sm:text-[9px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-1 py-0.2 rounded-full border border-emerald-500/20 shrink-0">
              {videoList.length} TRACKS
            </span>
          </div>

          {/* Independent Vertical Scroll Container (Shows 3 Rows) */}
          <div className="max-h-[160px] sm:max-h-[180px] overflow-y-auto pr-0.5 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
              {videoList.map((v) => {
                const isSelected = activeMedia.id === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => handleSelectMedia(v)}
                    className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl border flex items-center gap-1.5 cursor-pointer transition-all ${isSelected
                      ? "bg-emerald-500/10 border-emerald-500 shadow-xs ring-1 ring-emerald-500/40"
                      : "bg-muted/40 hover:bg-muted/80 border-border/70"
                      }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={v.thumbnail}
                        alt={v.name}
                        className="w-8 h-6 sm:w-10 sm:h-8 rounded-md sm:rounded-lg object-cover bg-black border border-border"
                      />
                      {v.isMusic && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 text-black flex items-center justify-center font-bold text-[6px]">
                          <Disc3 className="w-1.5 h-1.5 animate-spin" />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-[9px] sm:text-[11px] text-foreground block truncate">
                        {v.name}
                      </span>
                      <span className="text-[7px] sm:text-[9px] text-muted-foreground block truncate mt-0.2">
                        {v.category}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {error && (
        <p className="mt-3 text-xs text-rose-500 bg-rose-500/10 p-2 rounded-xl border border-rose-500/30 text-center font-medium">
          {error}
        </p>
      )}
    </section>
  );
};

export default HalalExperimentSection;
