"use client";

import React, { useState, useEffect, useRef } from "react";
import { HlsVideoPlayer } from "./HlsVideoPlayer";
import { AudioVisualizer } from "./AudioVisualizer";
import { useWienerFilter, HalalFilterMode } from "@/hooks/useWienerFilter";
import { useHalalMLEngine } from "@/hooks/useHalalMLEngine";
import { 
  Volume2, Sliders, Activity, Mic, TreePine, Tv, Video,
  Bird, CloudRain, Droplets, Disc3
} from "lucide-react";

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

export const HalalExperimentSection: React.FC = () => {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [halalEnabled, setHalalEnabled] = useState<boolean>(true);
  const [gainDb, setGainDb] = useState<number>(0); // 0dB neutral calibrated safe default
  const [mode, setMode] = useState<HalalFilterMode>("dsp");
  const [variant, setVariant] = useState<"voice" | "nature">("voice");

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

  // ALL News & Lyrics Music Test Videos
  const testVideos: MediaItem[] = [
    {
      type: "video",
      id: "v_music_pop",
      name: "🎵 Pop Lyrics Song (Vocals + Pop Beat)",
      category: "মিউজিক টেস্ট",
      streamUrl: "https://media.w3.org/2010/05/sintel/trailer.mp4",
      thumbnail: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&auto=format&fit=crop&q=60",
      source: "Lyrics Music Track",
      isMusic: true
    },
    {
      type: "video",
      id: "v_music_acoustic",
      name: "🎸 Acoustic Vocals & Guitar Beat",
      category: "মিউজিক টেস্ট",
      streamUrl: "https://download.blender.org/durian/trailer/sintel_trailer-480p.mp4",
      thumbnail: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=150&auto=format&fit=crop&q=60",
      source: "Acoustic Beat Track",
      isMusic: true
    },
    {
      type: "video",
      id: "v1",
      name: "আপনাকে কেন ভালবাসি, ইয়া রাসুলাল্লাহ (সঃ)?",
      category: "ইসলামিক",
      streamUrl: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
      thumbnail: "https://img.youtube.com/vi/5zWTInJqD5k/hqdefault.jpg",
      source: "Baseera Media"
    },
    {
      type: "video",
      id: "v2",
      name: "অর্থনীতি ও ব্যাংক খাতের সর্বশেষ পরিস্থিতি ও আপডেট",
      category: "অর্থনীতি",
      streamUrl: "https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8",
      thumbnail: "https://img.youtube.com/vi/qB29pIkJMoQ/hqdefault.jpg",
      source: "Somoy TV"
    },
    {
      type: "video",
      id: "v3",
      name: "আপনাকে কেন ভালবাসি, ইয়া রাসুলাল্লাহ? — পর্ব ২",
      category: "ইসলামিক",
      streamUrl: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
      thumbnail: "https://img.youtube.com/vi/5zWTInJqD5k/hqdefault.jpg",
      source: "Baseera Media"
    },
    {
      type: "video",
      id: "v4",
      name: "সিরাহ ১১ - মে'রাজ: এক বিস্ময়কর যাত্রা",
      category: "সিরাহ",
      streamUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      thumbnail: "https://img.youtube.com/vi/mDTAjCMb70A/hqdefault.jpg",
      source: "Baseera Media"
    },
    {
      type: "video",
      id: "v5",
      name: "সিরাহ বিশেষ পর্ব — রাসুলুল্লাহ (সাঃ) এর নবুওয়াত",
      category: "সিরাহ",
      streamUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      thumbnail: "https://img.youtube.com/vi/mDTAjCMb70A/hqdefault.jpg",
      source: "Baseera Media"
    },
    {
      type: "video",
      id: "v6",
      name: "🔴 Makkah Live | মক্কার লাইভ সম্প্রচার",
      category: "লাইভ",
      streamUrl: "https://tvsen5.aynaott.com/somoytv/index.m3u8",
      thumbnail: "https://img.youtube.com/vi/5jp4fb7HyoQ/hqdefault.jpg",
      source: "Al Islamic Network TV"
    },
    {
      type: "video",
      id: "v7",
      name: "স্বাস্থ্য ও পরিবেশ বিষয়ক বিশেষ অনুসন্ধানী রিপোর্ট",
      category: "স্বাস্থ্য",
      streamUrl: "https://tvsen5.aynaott.com/RtvHD/index.m3u8",
      thumbnail: "https://img.youtube.com/vi/vPunUbzbhag/hqdefault.jpg",
      source: "RTV News"
    },
    {
      type: "video",
      id: "v8",
      name: "গ্রিন এনার্জি ও বৈজ্ঞানিক অগ্রগতির তাজা খবর",
      category: "বিজ্ঞান",
      streamUrl: "https://tvsen5.aynaott.com/banglavision/index.m3u8",
      thumbnail: "https://img.youtube.com/vi/yXCMU72z0Ms/hqdefault.jpg",
      source: "বিজ্ঞান সংবাদ"
    }
  ];

  const [activeMedia, setActiveMedia] = useState<MediaItem>(testChannels[0]);

  // Connect Real-Time Wiener & Audio Worklet Hook (Acoustically Normalized)
  const { 
    isActive, 
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

  // Connect ML Deep Learning Engine (MDX-Net / Bandit-v2 Worker)
  const {
    isModelLoading,
    isModelReady,
    backend
  } = useHalalMLEngine({
    workletNode,
    enabled: halalEnabled && mode === "ml"
  });

  // Ambient Nature Sound Bed Player (Automatic in Vocal+Natural mode)
  useEffect(() => {
    if (variant === "nature" && isActive) {
      if (!natureAudioRef.current) {
        const audio = new Audio(selectedNature.url);
        audio.loop = true;
        audio.volume = natureVolume;
        natureAudioRef.current = audio;
        audio.play().catch(() => {});
      } else {
        natureAudioRef.current.src = selectedNature.url;
        natureAudioRef.current.volume = natureVolume;
        natureAudioRef.current.play().catch(() => {});
      }
    } else {
      if (natureAudioRef.current) {
        natureAudioRef.current.pause();
        natureAudioRef.current = null;
      }
    }

    return () => {
      if (natureAudioRef.current) {
        natureAudioRef.current.pause();
        natureAudioRef.current = null;
      }
    };
  }, [variant, isActive, selectedNature, natureVolume]);

  const handleToggleHalal = async () => {
    const next = !halalEnabled;
    setHalalEnabled(next);
    await toggleFilter(next);
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
    setActiveMedia(item);
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
          <div className={`w-8 sm:w-9 h-4.5 sm:h-5 rounded-full transition-colors duration-300 p-0.5 flex items-center ${
            isActive ? "bg-emerald-500 shadow-xs" : "bg-muted-foreground/30"
          }`}>
            <div className={`w-3.5 sm:w-4 h-3.5 sm:h-4 rounded-full bg-white dark:bg-zinc-950 shadow-xs transform transition-transform duration-300 flex items-center justify-center ${
              isActive ? "translate-x-3.5 sm:translate-x-4" : "translate-x-0"
            }`}>
              <span className={`w-1 h-1 rounded-full ${isActive ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
            </div>
          </div>
        </div>
      </div>

      {/* ── UNIFIED COMPACT 2X2 TOOLBAR ON MOBILE (4 COLS ON DESKTOP) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2.5 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-muted/40 border border-border/70 mb-3 sm:mb-4 text-xs">
        
        {/* 1. Audio Target */}
        <div className="flex flex-col gap-1 p-1.5 rounded-lg sm:rounded-xl bg-card border border-border/60 justify-between">
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Sliders className="w-2.5 h-2.5 text-emerald-500" /> Target:
          </span>
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => handleVariantSelect("voice")}
              className={`py-1 px-1 rounded-md sm:rounded-lg font-bold text-[8px] sm:text-[10px] transition-all flex items-center justify-center gap-0.5 cursor-pointer truncate ${
                variant === "voice"
                  ? "bg-emerald-500 text-black shadow-xs"
                  : "bg-muted hover:bg-muted/80 text-foreground"
              }`}
            >
              <Mic className="w-2.5 h-2.5" /> Vocal Only
            </button>
            <button
              onClick={() => handleVariantSelect("nature")}
              className={`py-1 px-1 rounded-md sm:rounded-lg font-bold text-[8px] sm:text-[10px] transition-all flex items-center justify-center gap-0.5 cursor-pointer truncate ${
                variant === "nature"
                  ? "bg-emerald-500 text-black shadow-xs"
                  : "bg-muted hover:bg-muted/80 text-foreground"
              }`}
            >
              <TreePine className="w-2.5 h-2.5" /> + Nature
            </button>
          </div>
        </div>

        {/* 2. Natural Sound Bed Presets */}
        <div className="flex flex-col gap-1 p-1.5 rounded-lg sm:rounded-xl bg-card border border-border/60 justify-between">
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <TreePine className="w-2.5 h-2.5 text-emerald-500" /> Nature Bed:
          </span>
          <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
            {naturePresets.map((n) => {
              const Icon = n.icon;
              const isSel = selectedNature.id === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => setSelectedNature(n)}
                  className={`py-1 px-0.5 rounded-md font-bold text-[8px] sm:text-[9px] truncate transition-all flex items-center justify-center gap-0.5 cursor-pointer ${
                    isSel && variant === "nature"
                      ? "bg-emerald-500/20 border border-emerald-500 text-emerald-600 dark:text-emerald-400"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-transparent"
                  }`}
                  title={n.label}
                >
                  <Icon className="w-2 h-2" />
                  {n.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Vocal Gain Boost (Safe 0dB Default, 0-6dB max) */}
        <div className="flex flex-col gap-1 p-1.5 rounded-lg sm:rounded-xl bg-card border border-border/60 justify-between">
          <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span className="flex items-center gap-1">
              <Volume2 className="w-2.5 h-2.5 text-emerald-500" /> Boost:
            </span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">+{gainDb} dB</span>
          </div>
          <div className="flex items-center gap-1">
            <input
              type="range"
              min="0"
              max="6"
              step="1"
              value={gainDb}
              onChange={handleGainChange}
              className="w-full accent-emerald-500 h-1 bg-muted rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* 4. Smooth Zero-Lag Wave Visualizer */}
        <div className="flex flex-col gap-1 p-1.5 rounded-lg sm:rounded-xl bg-card border border-border/60 justify-between">
          <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span className="flex items-center gap-1">
              <Activity className="w-2.5 h-2.5 text-emerald-500" /> Wave:
            </span>
            <span className={`font-mono text-[8px] sm:text-[9px] font-bold ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
              {isActive ? "LIVE (0MS)" : "OFF"}
            </span>
          </div>
          <AudioVisualizer
            getVisualizerData={getVisualizerData}
            isActive={isActive}
            className="w-full"
          />
        </div>

      </div>

      {/* ── VIDEO PLAYER VIEWPORT ── */}
      <div className="w-full max-w-4xl mx-auto rounded-xl sm:rounded-2xl overflow-hidden shadow-md border border-border mb-3 sm:mb-5">
        <HlsVideoPlayer
          src={activeMedia.streamUrl}
          title={activeMedia.name}
          halalActive={isActive}
          onToggleHalal={handleToggleHalal}
          onVideoElementReady={(el) => setVideoElement(el)}
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
              {testChannels.length} LIVE
            </span>
          </div>

          {/* Independent Vertical Scroll Container (Shows 3 Rows) */}
          <div className="max-h-[160px] sm:max-h-[180px] overflow-y-auto pr-0.5 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
              {testChannels.map((ch) => {
                const isSelected = activeMedia.id === ch.id;
                return (
                  <div
                    key={ch.id}
                    onClick={() => handleSelectMedia(ch)}
                    className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl border flex items-center gap-1.5 cursor-pointer transition-all ${
                      isSelected
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
              {testVideos.length} TRACKS
            </span>
          </div>

          {/* Independent Vertical Scroll Container (Shows 3 Rows) */}
          <div className="max-h-[160px] sm:max-h-[180px] overflow-y-auto pr-0.5 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
              {testVideos.map((v) => {
                const isSelected = activeMedia.id === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => handleSelectMedia(v)}
                    className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl border flex items-center gap-1.5 cursor-pointer transition-all ${
                      isSelected
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
