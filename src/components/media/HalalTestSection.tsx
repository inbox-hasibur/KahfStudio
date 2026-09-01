"use client";

import React, { useState, useEffect, useRef } from "react";
import { HlsVideoPlayer } from "./HlsVideoPlayer";
import { AudioVisualizer } from "./AudioVisualizer";
import { useWienerFilter, HalalFilterMode } from "@/hooks/useWienerFilter";
import { useHalalMLEngine } from "@/hooks/useHalalMLEngine";
import { 
  Sparkles, Volume2, ShieldCheck, ShieldAlert, Sliders, 
  Activity, Zap, Mic, TreePine, Tv, Video, Play, Music,
  Bird, CloudRain, Droplets, Cpu
} from "lucide-react";

export const HalalTestSection: React.FC = () => {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [halalEnabled, setHalalEnabled] = useState<boolean>(false);
  const [gainDb, setGainDb] = useState<number>(3);
  const [mode, setMode] = useState<HalalFilterMode>("dsp");
  const [variant, setVariant] = useState<"voice" | "nature">("voice");

  // Nature sound bed options
  const naturePresets = [
    { id: "birds", label: "পাখির কিচিরমিচির (Birds)", url: "/sounds/birds.m4a", icon: Bird },
    { id: "water", label: "ঝর্ণার কলতান (Water)", url: "/sounds/water.m4a", icon: Droplets },
    { id: "storm", label: "বৃষ্টির মৃদু শব্দ (Rain)", url: "/sounds/storm.m4a", icon: CloudRain }
  ];
  const [selectedNature, setSelectedNature] = useState(naturePresets[0]);
  const [natureVolume, setNatureVolume] = useState<number>(0.3);
  const natureAudioRef = useRef<HTMLAudioElement | null>(null);

  // 2 Live Channels for testing
  const testChannels = [
    {
      id: "c1",
      name: "Jamuna TV (যমুনা টিভি)",
      category: "জাতীয় সংবাদ",
      videoId: "4Wpv0HhFU1M",
      logoColor: "from-blue-600 to-blue-800",
      logoText: "JTV"
    },
    {
      id: "c2",
      name: "Somoy TV (সময় টিভি)",
      category: "ব্রেকিং নিউজ",
      videoId: "i8VSQO6TlFc",
      logoColor: "from-orange-500 to-orange-700",
      logoText: "সময়"
    }
  ];

  // 2 Real News Videos for testing
  const testVideos = [
    {
      id: "v1",
      title: "আপনাকে কেন ভালবাসি, ইয়া রাসুলাল্লাহ (সঃ)?",
      videoId: "5zWTInJqD5k",
      thumbnail: "https://img.youtube.com/vi/5zWTInJqD5k/hqdefault.jpg",
      category: "ইসলামিক",
      source: "Baseera Media"
    },
    {
      id: "v2",
      title: "অর্থনীতি ও ব্যাংক খাতের সর্বশেষ পরিস্থিতি ও বিশেষ আপডেট",
      videoId: "qB29pIkJMoQ",
      thumbnail: "https://img.youtube.com/vi/qB29pIkJMoQ/hqdefault.jpg",
      category: "অর্থনীতি",
      source: "Somoy TV"
    }
  ];

  // Currently active stream
  const [activeMedia, setActiveMedia] = useState<{
    type: "channel" | "video" | "sample";
    id: string;
    title: string;
    url?: string;
    videoId?: string;
  }>({
    type: "channel",
    id: "c1",
    title: "Jamuna TV Live",
    videoId: "4Wpv0HhFU1M"
  });

  // Connect Enhanced Wiener Audio Hook
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
    modelStatus,
    backend,
    modelProgress
  } = useHalalMLEngine({
    workletNode,
    enabled: halalEnabled && mode === "ml"
  });

  // Handle ambient nature sound bed when "Vocal + Natural" is active
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

  const handleModeSelect = (m: HalalFilterMode) => {
    setMode(m);
    updateMode(m);
  };

  return (
    <section className="mt-10 mb-16 p-4 sm:p-6 rounded-3xl bg-zinc-950/95 border border-emerald-500/30 shadow-[0_0_60px_rgba(16,185,129,0.08)] backdrop-blur-2xl relative overflow-hidden">
      {/* Background glow accent */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* ── TOP HEADER & MASTER HALAL BUTTON ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-black font-black shadow-lg shadow-emerald-500/25 shrink-0">
            <Sparkles className="w-5 h-5 fill-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-white tracking-tight">
                Halal Audio Studio <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 font-mono font-bold uppercase">Prototyping Lab</span>
              </h3>
            </div>
            <p className="text-xs text-zinc-400">
              লাইভ টিভি ও ভিডিওর উপর ক্লায়েন্ট-সাইড রিয়েল-টাইম হালাল মোড এক্সপেরিমেন্ট
            </p>
          </div>
        </div>

        {/* Master Halal Mode Toggle Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleHalal}
            className={`px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2.5 transition-all duration-300 shadow-xl cursor-pointer ${
              isActive
                ? "bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 text-black shadow-emerald-500/30 ring-4 ring-emerald-500/30 scale-105"
                : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 hover:border-zinc-500"
            }`}
          >
            {isActive ? (
              <>
                <ShieldCheck className="w-5 h-5 text-black animate-bounce" />
                <span>HALAL MODE: ACTIVE</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-5 h-5 text-zinc-400" />
                <span>HALAL MODE: OFF (BYPASS)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── UNIFIED CONTROL TOOLBAR ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 mb-5 text-xs">
        
        {/* 0. Filter Engine Mode (DSP Wiener vs Neural ML) */}
        <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/60 justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
            <Cpu className="w-3 h-3 text-emerald-400" /> Engine:
          </span>
          <div className="grid grid-cols-2 gap-1.5 h-full">
            <button
              onClick={() => handleModeSelect("dsp")}
              className={`py-1.5 px-2 rounded-lg font-bold text-[10px] transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate ${
                mode === "dsp"
                  ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              DSP (0ms)
            </button>
            <button
              onClick={() => handleModeSelect("ml")}
              className={`py-1.5 px-2 rounded-lg font-bold text-[10px] transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate ${
                mode === "ml"
                  ? "bg-teal-500 text-black shadow-md shadow-teal-500/20"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Neural AI
            </button>
          </div>
        </div>

        {/* 1. Exactly 2 Options: Vocal Only vs Vocal + Natural Sounds */}
        <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
            <Sliders className="w-3 h-3 text-emerald-400" /> Audio Mode:
          </span>
          <div className="grid grid-cols-2 gap-1.5 h-full">
            <button
              onClick={() => handleVariantSelect("voice")}
              className={`py-1.5 px-2 rounded-lg font-bold text-[10px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                variant === "voice"
                  ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Mic className="w-3 h-3" /> Vocal Only
            </button>
            <button
              onClick={() => handleVariantSelect("nature")}
              className={`py-1.5 px-2 rounded-lg font-bold text-[10px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                variant === "nature"
                  ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <TreePine className="w-3 h-3" /> Vocal + Natural
            </button>
          </div>
        </div>

        {/* 2. Natural Ambient Sound Selector (when Vocal+Natural selected) */}
        <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
            <TreePine className="w-3 h-3 text-emerald-400" /> Natural Sound Bed (3 Presets):
          </span>
          <div className="grid grid-cols-3 gap-1">
            {naturePresets.map((n) => {
              const Icon = n.icon;
              const isSel = selectedNature.id === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => setSelectedNature(n)}
                  className={`py-1.5 px-1 rounded-lg font-bold text-[9px] truncate transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    isSel
                      ? "bg-emerald-500/20 border border-emerald-500/60 text-emerald-300"
                      : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-transparent"
                  }`}
                  title={n.label}
                >
                  <Icon className="w-2.5 h-2.5" />
                  {n.id === "birds" ? "পাখি" : n.id === "water" ? "ঝর্ণা" : "বৃষ্টি"}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Vocal Gain Boost */}
        <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/60">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            <span className="flex items-center gap-1">
              <Volume2 className="w-3 h-3 text-emerald-400" /> Vocal Boost:
            </span>
            <span className="font-mono text-emerald-400 font-bold">+{gainDb} dB</span>
          </div>
          <div className="flex items-center gap-2 h-full">
            <input
              type="range"
              min="0"
              max="12"
              step="1"
              value={gainDb}
              onChange={handleGainChange}
              className="w-full accent-emerald-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* 4. Spectrum Equalizer Visualizer OR Loading Progress */}
        <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/60 justify-between">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-400" /> {isActive && mode === "ml" && isModelLoading ? "AI DOWNLOAD" : "Spectrum VU"}:
            </span>
            <span className={`font-mono text-[9px] ${isActive ? "text-emerald-400 font-bold" : "text-zinc-500"}`}>
              {isActive ? (mode === "ml" ? (isModelLoading ? `${modelProgress}%` : `ML READY (${backend})`) : "DSP FILTER (0ms)") : "BYPASS (OFF)"}
            </span>
          </div>
          {isActive && mode === "ml" && isModelLoading ? (
            <div className="w-full h-full flex flex-col justify-center px-1">
               <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                 <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${modelProgress}%` }}></div>
               </div>
               <p className="text-[9px] text-zinc-400 mt-1.5 text-center truncate">{modelStatus}</p>
            </div>
          ) : (
            <AudioVisualizer
              getVisualizerData={getVisualizerData}
              isActive={isActive}
              className="w-full"
            />
          )}
        </div>

      </div>

      {/* ── VIDEO PLAYER VIEWPORT ── */}
      <div className="w-full max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-zinc-800/90 mb-6">
        <HlsVideoPlayer
          videoId={activeMedia.videoId}
          src={activeMedia.url}
          title={activeMedia.title}
          halalActive={isActive}
          onToggleHalal={handleToggleHalal}
          onVideoElementReady={(el) => setVideoElement(el)}
          className="w-full"
        />
      </div>

      {/* ── MINI LIVE TV & VIDEO TESTING CARDS (Real-time Prototype Selector) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-zinc-800/80">
        
        {/* Section 1: ২ টি লাইভ টিভি চ্যানেল (Live Channels Test) */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
            <Tv className="w-4 h-4 text-red-500 animate-pulse" /> লাইভ টিভি চ্যানেল (Live Test Channels):
          </span>
          <div className="grid grid-cols-2 gap-2">
            {testChannels.map((ch) => {
              const isSelected = activeMedia.type === "channel" && activeMedia.id === ch.id;
              return (
                <div
                  key={ch.id}
                  onClick={() => setActiveMedia({
                    type: "channel",
                    id: ch.id,
                    title: ch.name,
                    videoId: ch.videoId
                  })}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                    isSelected
                      ? "bg-red-500/10 border-red-500 shadow-md ring-1 ring-red-500/40 scale-[1.02]"
                      : "bg-zinc-900/80 hover:bg-zinc-800/90 border-zinc-800"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${ch.logoColor} flex items-center justify-center text-white font-black text-xs shrink-0 shadow-sm`}>
                    {ch.logoText}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-xs text-white block truncate">
                      {ch.name}
                    </span>
                    <span className="text-[10px] text-red-400 font-semibold flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: ২ টি খবর ভিডিও (News Videos Test) */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
            <Video className="w-4 h-4 text-emerald-400" /> আরও ভিডিও (News Videos Test):
          </span>
          <div className="grid grid-cols-2 gap-2">
            {testVideos.map((v) => {
              const isSelected = activeMedia.type === "video" && activeMedia.id === v.id;
              return (
                <div
                  key={v.id}
                  onClick={() => setActiveMedia({
                    type: "video",
                    id: v.id,
                    title: v.title,
                    videoId: v.videoId
                  })}
                  className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                    isSelected
                      ? "bg-emerald-500/10 border-emerald-500 shadow-md ring-1 ring-emerald-500/40 scale-[1.02]"
                      : "bg-zinc-900/80 hover:bg-zinc-800/90 border-zinc-800"
                  }`}
                >
                  <img
                    src={v.thumbnail}
                    alt={v.title}
                    className="w-12 h-9 rounded-lg object-cover bg-black shrink-0 border border-zinc-700"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-[11px] text-white block truncate">
                      {v.title}
                    </span>
                    <span className="text-[10px] text-zinc-400 block truncate mt-0.5">
                      {v.source}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {error && (
        <p className="mt-3 text-xs text-rose-400 bg-rose-950/50 p-2.5 rounded-xl border border-rose-800/50 text-center font-medium">
          {error}
        </p>
      )}
    </section>
  );
};

export default HalalTestSection;
