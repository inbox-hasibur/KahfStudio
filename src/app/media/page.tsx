"use client";

import React, { useState, useEffect } from "react";
import { 
  Tv, Video, Clock, ChevronDown, ChevronUp, Radio, Flame, Sparkles
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { HlsVideoPlayer } from "@/components/media/HlsVideoPlayer";

export interface MediaItem {
  id: string;
  type: "channel" | "video";
  name: string;
  category: string;
  videoId?: string;
  streamUrl?: string;
  thumbnail?: string;
  duration?: string;
  source: string;
  description?: string;
  logoColor?: string;
  logoText?: string;
}

export const defaultChannels: MediaItem[] = [
  { 
    id: "c1", 
    type: "channel",
    name: "Jamuna TV (যমুনা টিভি)", 
    category: "জাতীয় সংবাদ", 
    videoId: "0Q_IZvp_N5w",
    streamUrl: "https://tvsen5.aynaott.com/banglavision/index.m3u8",
    logoColor: "from-blue-600 to-blue-800",
    logoText: "JTV",
    source: "24/7 লাইভ এইচডি",
    description: "যমুনা টেলিভিশনের সার্বক্ষণিক লাইভ নিউজ ও ব্রেকিং নিউজ সম্প্রচার।"
  },
  { 
    id: "c2", 
    type: "channel",
    name: "Somoy TV (সময় টিভি)", 
    category: "ব্রেকিং নিউজ", 
    videoId: "i8VSQO6TlFc",
    streamUrl: "https://tvsen5.aynaott.com/somoytv/index.m3u8",
    logoColor: "from-orange-500 to-orange-700",
    logoText: "সময়",
    source: "24/7 লাইভ এইচডি",
    description: "সময় টিভির তাজা খবর, দেশ ও বিদেশের সর্বশেষ আপডেট।"
  },
  { 
    id: "c3", 
    type: "channel",
    name: "Channel 24 (চ্যানেল ২৪)", 
    category: "সংবাদ ২৪", 
    videoId: "LVPgC7LQOw0",
    streamUrl: "https://tvsen5.aynaott.com/xV4jEKf3D9zc/index.m3u8",
    logoColor: "from-emerald-600 to-teal-800",
    logoText: "24",
    source: "24/7 লাইভ এইচডি",
    description: "চ্যানেল ২৪-এর সরাসরি লাইভ সম্প্রচার ও অনুসন্ধানী প্রতিবেদন।"
  },
  { 
    id: "c4", 
    type: "channel",
    name: "News24 (নিউজ ২৪)", 
    category: "ব্রেকিং নিউজ", 
    videoId: "oCslIqfoOZw",
    streamUrl: "https://tvsen5.aynaott.com/news24/index.m3u8",
    logoColor: "from-red-600 to-rose-800",
    logoText: "N24",
    source: "24/7 লাইভ",
    description: "নিউজ ২৪ চ্যানেলের সরাসরি লাইভ সম্প্রচার।"
  },
  { 
    id: "c5", 
    type: "channel",
    name: "Ekattor TV (একাত্তর টিভি)", 
    category: "জাতীয়", 
    videoId: "2lVBzxoof0U",
    streamUrl: "https://tvsen5.aynaott.com/ekattor/index.m3u8",
    logoColor: "from-green-700 to-green-900",
    logoText: "৭১",
    source: "তাজা সংবাদ",
    description: "একাত্তর টেলিভিশনের দিনভর লাইভ খবর ও রাজনৈতিক আলোচনা।"
  },
  { 
    id: "c6", 
    type: "channel",
    name: "Independent TV (ইন্ডিপেনডেন্ট)", 
    category: "বাংলাদেশ", 
    videoId: "qREvoxxG6Nc",
    streamUrl: "https://tvsen5.aynaott.com/independent/index.m3u8",
    logoColor: "from-slate-800 to-zinc-900",
    logoText: "i",
    source: "24/7 লাইভ",
    description: "ইনডিপেনডেন্ট টেলিভিশনের লাইভ নিউজ ও বিশেষ বিশ্লেষণ।"
  },
  { 
    id: "c7", 
    type: "channel",
    name: "RTV News (আরটিভি)", 
    category: "জাতীয় সংবাদ", 
    videoId: "PtztZQi5hCg",
    streamUrl: "https://tvsen5.aynaott.com/rtv/index.m3u8",
    logoColor: "from-red-600 to-red-800",
    logoText: "rtv",
    source: "24/7 লাইভ",
    description: "আরটিভি নিউজের সরাসরি সম্প্রচার।"
  },
  { 
    id: "c8", 
    type: "channel",
    name: "Banglavision (বাংলাভিশন)", 
    category: "সংবাদ ও খবর", 
    videoId: "mCFcsPxkQrY",
    streamUrl: "https://tvsen5.aynaott.com/banglavision/index.m3u8",
    logoColor: "from-sky-500 to-sky-700",
    logoText: "BV",
    source: "24/7 লাইভ",
    description: "বাংলাভিশনের লাইভ নিউজ ও বুলেটিন।"
  },
  { 
    id: "c9", 
    type: "channel",
    name: "Desh TV (দেশ টিভি)", 
    category: "খবর ও রাজনীতি", 
    videoId: "V2oJukYnC40",
    streamUrl: "https://tvsen5.aynaott.com/deshtv/index.m3u8",
    logoColor: "from-teal-600 to-teal-800",
    logoText: "দেশ",
    source: "24/7 লাইভ",
    description: "দেশ টিভির সার্বক্ষণিক সংবাদ।"
  },
  { 
    id: "c13", 
    type: "channel",
    name: "DBC News (ডিবিসি)", 
    category: "জাতীয় সংবাদ", 
    videoId: "FsV_tzCDzic",
    streamUrl: "https://tvsen5.aynaott.com/dbcnews/index.m3u8",
    logoColor: "from-purple-600 to-indigo-800",
    logoText: "DBC",
    source: "24/7 লাইভ",
    description: "ডিবিসি নিউজের সরাসরি নিউজ বুলেটিন।"
  },
  { 
    id: "c14", 
    type: "channel",
    name: "Channel i (চ্যানেল আই)", 
    category: "সংবাদ ও ফিচার", 
    videoId: "UBesSUxhyog",
    streamUrl: "https://tvsen5.aynaott.com/channeli/index.m3u8",
    logoColor: "from-emerald-600 to-teal-800",
    logoText: "i",
    source: "সংবাদ ও ফিচার",
    description: "চ্যানেল আই সংবাদ ও বিশেষ আয়োজন।"
  },
  { 
    id: "c10", 
    type: "channel",
    name: "Al Jazeera English", 
    category: "আন্তর্জাতিক", 
    videoId: "gCNeDWCI0vo",
    logoColor: "from-amber-600 to-amber-800",
    logoText: "AJ",
    source: "Global Live HD",
    description: "24/7 Live World News from Al Jazeera English."
  },
  { 
    id: "c11", 
    type: "channel",
    name: "DW News", 
    category: "বিশ্ব সংবাদ", 
    videoId: "LuKwFajn37U",
    logoColor: "from-sky-600 to-blue-800",
    logoText: "DW",
    source: "Global Live HD",
    description: "International breaking news and analysis from Deutsche Welle."
  },
  { 
    id: "c12", 
    type: "channel",
    name: "Sky News", 
    category: "আন্তর্জাতিক", 
    videoId: "xDWQ3LkccY8",
    logoColor: "from-rose-600 to-red-700",
    logoText: "sky",
    source: "Global Live HD",
    description: "Sky News live UK and international broadcasts."
  }
];

export const defaultNewsVideos: MediaItem[] = [
  {
    id: "v1",
    type: "video",
    name: "পানামা খালে পানি সরবরাহ নিয়ে বিশেষ প্রতিবেদন",
    videoId: "EZ81qPzajLI",
    thumbnail: "https://img.youtube.com/vi/EZ81qPzajLI/hqdefault.jpg",
    category: "জাতীয়",
    duration: "০৩:৪৫",
    source: "Jamuna TV",
    description: "পানামা খালের রিও ইন্দিও প্রকল্পের মাধ্যমে পানি সরবরাহ উন্নয়ন নিয়ে যমুনা টিভির বিশেষ সংবাদ।"
  },
  {
    id: "v2",
    type: "video",
    name: "৮ মাসে বন্ধের চেয়ে দ্বিগুণ নতুন পোশাক কারখানা চালু",
    videoId: "xQYPxb5iwi4",
    thumbnail: "https://img.youtube.com/vi/xQYPxb5iwi4/hqdefault.jpg",
    category: "অর্থনীতি",
    duration: "০৪:১২",
    source: "Somoy TV",
    description: "বিকেএমইএ ও পোশাক শিল্পে নতুন কারখানার অগ্রগতি ও অর্থনৈতিক পরিস্থিতি নিয়ে সময় টিভির রিপোর্ট।"
  },
  {
    id: "v3",
    type: "video",
    name: "ডাকসু নির্বাচনের ১ বছর; প্রতিশ্রুতি পূরণে কতটা সফল ছাত্রনেতারা?",
    videoId: "cqTCa8NhM-M",
    thumbnail: "https://img.youtube.com/vi/cqTCa8NhM-M/hqdefault.jpg",
    category: "রাজনীতি",
    duration: "০৬:১৮",
    source: "Channel 24",
    description: "ডাকসু নির্বাচন ও ছাত্র রাজনীতির সার্বিক চালচিত্র নিয়ে চ্যানেল ২৪-এর বিশেষ অনুসন্ধানী প্রতিবেদন।"
  },
  {
    id: "v4",
    type: "video",
    name: "গ্যাস-জ্বালানি বৈশ্বিক সংকট, সমাধান একা সম্ভব নয়",
    videoId: "2lVBzxoof0U",
    thumbnail: "https://img.youtube.com/vi/2lVBzxoof0U/hqdefault.jpg",
    category: "জাতীয়",
    duration: "০৫:৩০",
    source: "Ekattor TV",
    description: "জ্বালানি ও গ্যাস সংকটের সামগ্রিক প্রেক্ষাপট নিয়ে একাত্তর টিভির বিশেষ কভারেজ।"
  },
  {
    id: "v5",
    type: "video",
    name: "গণমাধ্যম এখন যেকোনো সময়ের চেয়ে অনেক বেশি স্বাধীন",
    videoId: "tKgcXInssiQ",
    thumbnail: "https://img.youtube.com/vi/tKgcXInssiQ/hqdefault.jpg",
    category: "গণমাধ্যম",
    duration: "০৪:৫০",
    source: "Independent TV",
    description: "দেশের গণমাধ্যমের স্বাধীনতা ও সাংবাদিকতা নিয়ে ইনডিপেনডেন্ট টিভির মতামত ও রিপোর্ট।"
  },
  {
    id: "v6",
    type: "video",
    name: "ত্যাগী ও নির্যাতিত নেতাদের স্মরণ ও রাজনৈতিক দৃষ্টিভঙ্গি",
    videoId: "ffxM3qF50OE",
    thumbnail: "https://img.youtube.com/vi/ffxM3qF50OE/hqdefault.jpg",
    category: "রাজনীতি",
    duration: "০৫:১৫",
    source: "Desh TV",
    description: "সমসাময়িক রাজনৈতিক প্রেক্ষাপট ও দেশের পরিস্থিতি নিয়ে দেশ টিভির বিশেষ সংবাদ।"
  },
  {
    id: "v7",
    type: "video",
    name: "সমসাময়িক রাজনৈতিক পরিস্থিতি ও দেশের সামগ্রিক প্রেক্ষাপট",
    videoId: "Nia-x6xY0BI",
    thumbnail: "https://img.youtube.com/vi/Nia-x6xY0BI/hqdefault.jpg",
    category: "জাতীয়",
    duration: "০৪:০৫",
    source: "DBC News",
    description: "ডিবিসি নিউজের তাজা সংবাদ ও রাজনৈতিক খবরাখবর।"
  },
  {
    id: "v8",
    type: "video",
    name: "বাংলাভিশন সংবাদ বুলেটিন ও দিনের প্রধান খবর",
    videoId: "-N8ewR65kas",
    thumbnail: "https://img.youtube.com/vi/-N8ewR65kas/hqdefault.jpg",
    category: "বুলেটিন",
    duration: "০৭:২০",
    source: "Banglavision",
    description: "দেশের প্রধান প্রধান খবরের সংকলন নিয়ে বাংলাভিশনের দুপুর ও সন্ধ্যার বুলেটিন।"
  }
];

export default function MediaPage() {
  const [channels, setChannels] = useState<MediaItem[]>(defaultChannels);
  const [videos, setVideos] = useState<MediaItem[]>(defaultNewsVideos);
  const [activeMedia, setActiveMedia] = useState<MediaItem>(defaultChannels[0]);
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  // Dynamic IPTV fetch if available
  useEffect(() => {
    fetch("/api/iptv")
      .then((res) => res.json())
      .then((data) => {
        if (data?.channels && data.channels.length > 0) {
          const mappedChannels: MediaItem[] = data.channels.map((c: any) => ({
            id: c.id,
            type: "channel" as const,
            name: c.name,
            category: c.category || "লাইভ",
            videoId: c.videoId,
            streamUrl: c.streamUrl,
            source: c.source || "24/7 লাইভ",
            description: `${c.name} এর সার্বক্ষণিক লাইভ নিউজ সম্প্রচার।`,
            logoColor: c.color?.replace("bg-", "from-") || "from-blue-600 to-blue-800",
            logoText: c.name?.slice(0, 3) || "TV",
          }));
          setChannels(mappedChannels);
        }
        if (data?.videos && data.videos.length > 0) {
          const mappedVideos: MediaItem[] = data.videos.map((v: any) => ({
            id: v.id,
            type: "video" as const,
            name: v.title,
            category: v.category || "ভিডিও",
            videoId: v.videoId,
            thumbnail: v.thumbnail,
            duration: v.duration || "০৪:০০",
            source: v.source || "News",
            description: v.description,
          }));
          setVideos(mappedVideos);
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectMedia = (item: MediaItem) => {
    setActiveMedia(item);
  };

  return (
    <main className="max-w-[1240px] mx-auto px-3 sm:px-6 pt-16 sm:pt-24 md:pt-28 pb-12 space-y-4 notranslate">
      {/* 1. Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2 text-foreground tracking-tight">
          <Video className="w-6 h-6 sm:w-7 sm:h-7 text-primary shrink-0" />
          নিউজ <span className="text-primary">মিডিয়া</span>
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
          লাইভ টিভি চ্যানেল সম্প্রচার ও ভিডিও সংবাদের সার্বক্ষণিক আধুনিক ভিডিও প্লেয়ার।
        </p>
      </div>

      {/* 2. Main Primary Video Player (Fixes pause bug & eliminates Halal clutter) */}
      <div className="w-full">
        <HlsVideoPlayer
          key={activeMedia.id + (activeMedia.videoId || activeMedia.streamUrl)}
          src={activeMedia.streamUrl}
          videoId={activeMedia.videoId}
          title={activeMedia.name}
          autoPlay={true}
          className="w-full shadow-xl"
        />

        {/* Media Info Bar Below Player */}
        <div className="mt-2.5 px-3 py-2 rounded-xl bg-card border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Badge className="bg-primary/10 text-primary border-none text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide shrink-0">
              {activeMedia.category}
            </Badge>
            <h2 className="text-xs sm:text-sm font-bold text-foreground leading-tight truncate">
              {activeMedia.name}
            </h2>
            <span className="text-[10px] text-muted-foreground hidden sm:inline-block shrink-0">
              • {activeMedia.source}
            </span>
          </div>

          <button
            onClick={() => setIsDescExpanded(!isDescExpanded)}
            className="self-end sm:self-auto flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground font-semibold px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-muted border border-border transition-all shrink-0 cursor-pointer"
          >
            <span>{isDescExpanded ? "সংক্ষিপ্ত বিবরণ" : "বিস্তারিত"}</span>
            {isDescExpanded ? <ChevronUp className="w-3.5 h-3.5 text-primary" /> : <ChevronDown className="w-3.5 h-3.5 text-primary" />}
          </button>
        </div>

        {/* Expandable Description */}
        <AnimatePresence>
          {isDescExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-1.5 p-3 rounded-xl bg-card/60 border border-border text-xs text-muted-foreground leading-relaxed">
                {activeMedia.description || "এই সম্প্রচারের কোনো বিস্তারিত বিবরণ উপলব্ধ নেই।"}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. 2-COLUMN SIDE-BY-SIDE GRID (Live TV on Left, Video Clips on Right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* LEFT COLUMN: লাইভ টিভি চ্যানেল */}
        <div className="flex flex-col gap-2 bg-card/40 border border-border rounded-2xl p-3 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <span className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wide">
              <Tv className="w-4 h-4 text-red-500 shrink-0" />
              লাইভ টিভি চ্যানেল
            </span>
            <span className="text-[10px] font-mono font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
              {channels.length} LIVE
            </span>
          </div>

          {/* Independent Vertical Scrollable Container */}
          <div className="max-h-[360px] overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            {channels.map((ch) => {
              const isSelected = activeMedia.id === ch.id;
              return (
                <div
                  key={ch.id}
                  onClick={() => handleSelectMedia(ch)}
                  className={`p-2 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                    isSelected
                      ? "bg-red-500/10 border-red-500 shadow-sm ring-1 ring-red-500/40"
                      : "bg-card hover:bg-muted/80 border-border/80"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${ch.logoColor || "from-blue-600 to-blue-800"} flex items-center justify-center text-white font-black text-[10px] shrink-0 shadow-xs`}>
                    {ch.logoText || "TV"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-xs text-foreground block truncate">
                      {ch.name}
                    </span>
                    <span className="text-[10px] text-red-500 font-semibold flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      {ch.source}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20 shrink-0">
                      Playing
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: ভিডিও ও সংবাদ ক্লিপ */}
        <div className="flex flex-col gap-2 bg-card/40 border border-border rounded-2xl p-3 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <span className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wide">
              <Flame className="w-4 h-4 text-primary shrink-0" />
              সংবাদ ভিডিও ক্লিপ
            </span>
            <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
              {videos.length} VIDEOS
            </span>
          </div>

          {/* Independent Vertical Scrollable Container */}
          <div className="max-h-[360px] overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            {videos.map((v) => {
              const isSelected = activeMedia.id === v.id;
              return (
                <div
                  key={v.id}
                  onClick={() => handleSelectMedia(v)}
                  className={`p-2 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                    isSelected
                      ? "bg-primary/10 border-primary shadow-sm ring-1 ring-primary/40"
                      : "bg-card hover:bg-muted/80 border-border/80"
                  }`}
                >
                  <div className="relative shrink-0 w-14 h-10 rounded-lg overflow-hidden bg-black border border-border">
                    {v.thumbnail ? (
                      <img
                        src={v.thumbnail}
                        alt={v.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                        <Video className="w-4 h-4" />
                      </div>
                    )}
                    {v.duration && (
                      <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-white font-mono text-[8px] font-bold px-1 rounded">
                        {v.duration}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-xs text-foreground block truncate">
                      {v.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <span className="text-primary font-semibold">{v.category}</span> • {v.source}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 shrink-0">
                      Playing
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
